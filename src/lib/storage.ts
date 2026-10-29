import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { ScanResult } from '../types';

// Keys recovered from the original APK bundle.
export const HISTORY_KEY = '@biolens_scan_history';
export const STATS_CACHE_KEY = '@biolens_stats_cache';

const LOCAL_HISTORY_LIMIT = 50;
const DB_HISTORY_LIMIT = 10;

export interface BioLensStats {
  totalScans: number;
  totalSpecies: number;
  totalRegions: number;
  activeRegion: string;
  lastScanText: string;
  highRiskCount: number;
  averageConfidence: number;
  isLatestInvasive: boolean;
  confidenceTrend: number[];
  recentScansCount: number;
  nativeCount: number;
}

const EMPTY_STATS: BioLensStats = {
  totalScans: 0,
  totalSpecies: 0,
  totalRegions: 0,
  activeRegion: 'India Match',
  lastScanText: 'No scans yet',
  highRiskCount: 0,
  averageConfidence: 0,
  isLatestInvasive: false,
  confidenceTrend: [],
  recentScansCount: 0,
  nativeCount: 0,
};

/**
 * Payload accepted by saveScan.  Mirrors the object the original
 * PlantIdentificationScreen handed to the storage module.
 */
export interface ScanInput {
  scientific_name?: string;
  scientificName?: string;
  common_name?: string;
  commonName?: string;
  confidence?: number;
  final_confidence?: number;
  region?: string;
  region_valid?: boolean;
  image_uri?: string;
  imageUri?: string;
  scan_date?: string;
  scanId?: string;
  [key: string]: any;
}

/**
 * Persist a scan to Supabase, update the user's all-time counters, prune the
 * cloud table to the newest 10 rows, and mirror the record into AsyncStorage
 * (newest 50).
 */
export async function saveScan(input: ScanInput): Promise<ScanResult> {
  const { data: { user } } = await supabase.auth.getUser();

  // Build the database row exactly like the original app did: known columns
  // are promoted, everything else becomes JSONB metadata.
  const rest: Record<string, any> = { ...input };
  [
    'scientific_name',
    'scientificName',
    'common_name',
    'commonName',
    'confidence',
    'final_confidence',
    'region',
    'region_valid',
    'imageUri',
    'image_uri',
    'scan_date',
    'scanId',
  ].forEach((key) => delete rest[key]);

  const row: Record<string, any> = {
    user_id: user?.id ?? null,
    scientific_name: input.scientific_name || input.scientificName || 'Unknown',
    common_name: input.common_name || input.commonName || 'Unknown Species',
    confidence: input.confidence ?? input.final_confidence ?? 0,
    region: input.region ?? (input.region_valid ? 'India Match' : 'Outside India'),
    image_uri: input.image_uri || input.imageUri || null,
    metadata: rest,
    scan_date: input.scan_date || new Date().toISOString(),
  };

  let savedId: string | null = null;

  if (user) {
    // 1. All-time counters live in auth.users.user_metadata.
    try {
      const meta = user.user_metadata || {};
      const totalScans = (Number(meta.all_time_total_scans) || 0) + 1;
      const speciesList: string[] = Array.isArray(meta.all_time_species_list)
        ? [...meta.all_time_species_list]
        : [];
      if (row.scientific_name && !speciesList.includes(row.scientific_name)) {
        speciesList.push(row.scientific_name);
      }

      const { error } = await supabase.auth.updateUser({
        data: {
          ...meta,
          all_time_total_scans: totalScans,
          all_time_species_list: speciesList,
        },
      });
      if (error) console.warn('saveScan: metadata update failed:', error.message);
    } catch (err) {
      console.warn('saveScan: metadata update threw:', err);
    }

    // 2. Insert the scan.
    try {
      const { data, error } = await supabase
        .from('scans')
        .insert([row])
        .select('id')
        .single();

      if (error) {
        console.warn('saveScan: insert failed:', error.message);
      } else {
        savedId = data?.id ?? null;
      }
    } catch (err) {
      console.warn('saveScan: insert threw:', err);
    }

    // 3. Keep only the newest 10 rows in the cloud table.
    if (savedId) {
      try {
        const { data: rows, error } = await supabase
          .from('scans')
          .select('id')
          .eq('user_id', user.id)
          .order('scan_date', { ascending: false });

        if (!error && rows && rows.length > DB_HISTORY_LIMIT) {
          const stale = rows.slice(DB_HISTORY_LIMIT).map((r: any) => r.id);
          if (stale.length > 0) {
            await supabase.from('scans').delete().eq('user_id', user.id).not('id', 'in', `(${stale.join(',')})`);
          }
        }
      } catch (err) {
        console.warn('saveScan: prune failed:', err);
      }
    }
  }

  // 4. Mirror into local history.
  const localScan: ScanResult = {
    ...(row as any),
    id: savedId || `${Date.now()}`,
    scanId: `${Date.now()}`,
    created_at: row.scan_date,
  };

  try {
    const existing = await getHistory();
    const next = [localScan, ...existing].slice(0, LOCAL_HISTORY_LIMIT);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch (err) {
    console.warn('saveScan: local history failed:', err);
  }

  return localScan;
}

/** Read the locally cached scan history. */
export async function getHistory(): Promise<ScanResult[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeScan);
  } catch {
    return [];
  }
}

/**
 * Return merged local + cloud history for a user, newest first.
 */
export async function getUserScans(userId?: string): Promise<ScanResult[]> {
  const local = await getHistory();
  let remote: ScanResult[] = [];

  if (userId) {
    try {
      const { data, error } = await supabase
        .from('scans')
        .select('*')
        .eq('user_id', userId)
        .order('scan_date', { ascending: false });

      if (error) {
        console.warn('getUserScans:', error.message);
      } else {
        remote = (data || []).map(normalizeScan);
      }
    } catch (err) {
      console.warn('getUserScans threw:', err);
    }
  }

  const seen = new Set<string>();
  const merged: ScanResult[] = [];
  for (const scan of [...remote, ...local]) {
    // A scan written to the cloud is mirrored locally with the same id, so id
    // is a sufficient key. (Do NOT dedupe on species + date: two separate
    // observations of the same species on the same day are both valid.)
    const key = scan.id || scan.scanId;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(scan);
  }

  return merged.sort(
    (a, b) =>
      new Date(b.scan_date || b.created_at).getTime() -
      new Date(a.scan_date || a.created_at).getTime()
  );
}

/**
 * Regulatory helpers shared by the dashboard, history and stats.
 *
 * Enrichment stores the verdict in several places depending on whether the row
 * came from the cloud (denormalised columns) or the local cache (metadata).
 * "Not Invasive" contains the substring "invasive", so the negative forms are
 * excluded explicitly rather than relying on a plain `includes`.
 */
export function getRegulatoryLabel(scan?: Partial<ScanResult>): string {
  const meta = scan?.metadata;
  const basic = meta?.basic;
  return String(
    scan?.regulatory_status ||
      basic?.invasive_threat_status ||
      meta?.invasive_threat_status ||
      meta?.regulatory_status ||
      basic?.native_status ||
      meta?.native_status ||
      ''
  ).toLowerCase();
}

export function isInvasiveScan(scan?: Partial<ScanResult>): boolean {
  const raw = getRegulatoryLabel(scan);
  return raw.includes('invasive') && !/not[\s-]?invasive|non[\s-]?invasive/.test(raw);
}

export function isNativeScan(scan?: Partial<ScanResult>): boolean {
  // `regulatory_status` is usually the invasive verdict ("Not Invasive"), which
  // would mask a genuine native_status.  Check the native fields first.
  const meta = scan?.metadata;
  const basic = meta?.basic;
  const nativeRaw = String(basic?.native_status || meta?.native_status || '').toLowerCase();
  if (nativeRaw) {
    return (
      /(^|[^a-z])(native|indigenous)([^a-z]|$)/.test(nativeRaw) &&
      !/not[\s-]?native|non[\s-]?native/.test(nativeRaw)
    );
  }
  const raw = getRegulatoryLabel(scan);
  return (
    /(^|[^a-z])(native|indigenous)([^a-z]|$)/.test(raw) &&
    !/not[\s-]?native|non[\s-]?native/.test(raw)
  );
}

/**
 * Aggregate field statistics.  Total counters come from `auth.users`
 * metadata (all-time, never truncated); live details come from local history.
 */
export async function getStats(preloaded?: ScanResult[]): Promise<BioLensStats> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const cached = await readJson<{ totalScans: number; totalSpecies: number; speciesList: string[] }>(
      STATS_CACHE_KEY
    );
    // Cloud rows are the source of truth for a fresh install; only fall back to
    // the local mirror when the caller has nothing to hand us.
    const history = preloaded ?? (await getHistory());
    const meta: Record<string, any> = user?.user_metadata || {};

    let totalScans: number | undefined =
      typeof meta.all_time_total_scans === 'number' ? meta.all_time_total_scans : undefined;
    let speciesList: string[] | undefined = Array.isArray(meta.all_time_species_list)
      ? meta.all_time_species_list
      : undefined;

    // Fall back to the cloud table when the counters are missing.
    if (user && (totalScans === undefined || !speciesList)) {
      try {
        const { data, error } = await supabase
          .from('scans')
          .select('scientific_name')
          .eq('user_id', user.id);

        if (!error && data) {
          totalScans = data.length;
          speciesList = Array.from(
            new Set(data.map((r: any) => r.scientific_name).filter(Boolean))
          );
          await supabase.auth
            .updateUser({
              data: {
                ...meta,
                all_time_total_scans: totalScans,
                all_time_species_list: speciesList,
              },
            })
            .catch(() => undefined);
        }
      } catch {
        // offline — fall through to cache
      }
    }

    if (totalScans === undefined || !speciesList) {
      totalScans = cached?.totalScans ?? history.length;
      speciesList = cached?.speciesList ?? uniqueSpecies(history);
    }

    // Refresh the cache.
    try {
      await AsyncStorage.setItem(
        STATS_CACHE_KEY,
        JSON.stringify({
          totalScans,
          totalSpecies: speciesList.length,
          speciesList,
        })
      );
    } catch {
      // non-fatal
    }

    const regions = new Set(history.map((s) => s.region).filter(Boolean));
    const latest = history[0];

    let highRiskCount = 0;
    let nativeCount = 0;
    let confidenceSum = 0;

    for (const scan of history) {
      if (isInvasiveScan(scan)) highRiskCount += 1;
      if (isNativeScan(scan)) nativeCount += 1;
      confidenceSum += Number(scan.confidence) || 0;
    }

    const lastSeven = history.slice(0, 7).reverse();

    return {
      totalScans,
      totalSpecies: speciesList.length,
      totalRegions: regions.size,
      activeRegion: latest?.region || 'India Match',
      lastScanText: relativeTime(latest?.scan_date || latest?.created_at),
      highRiskCount,
      averageConfidence: history.length
        ? Math.round(confidenceSum / history.length)
        : 0,
      isLatestInvasive: isInvasiveScan(latest),
      confidenceTrend: lastSeven.map((s) => Number(s.confidence) || 0),
      recentScansCount: history.length,
      nativeCount,
    };
  } catch (err) {
    console.warn('getStats failed:', err);
    return { ...EMPTY_STATS };
  }
}

/** Delete the user's cloud rows and the local cache. */
export async function clearHistory(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('scans').delete().eq('user_id', user.id);
    }
    await AsyncStorage.removeItem(HISTORY_KEY);
    await AsyncStorage.removeItem(STATS_CACHE_KEY);
    return true;
  } catch (err) {
    console.warn('clearHistory failed:', err);
    return false;
  }
}

/** Lightweight connectivity probe against Supabase auth. */
export async function checkConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.auth.getSession();
    return !error;
  } catch {
    return false;
  }
}

function normalizeScan(row: any): ScanResult {
  const meta = row.metadata || {};
  return {
    ...row,
    id: row.id || row.scanId || `${Date.now()}`,
    confidence: Number(row.confidence) || 0,
    created_at: row.created_at || row.scan_date || new Date().toISOString(),
    family: meta.family || meta.basic?.family,
    genus: meta.genus || meta.basic?.genus,
    description: meta.description || meta.overview || meta.basic?.overview,
    conservation_status:
      meta.conservation_status || meta.basic?.conservation_status,
    regulatory_status:
      meta.regulatory_status ||
      meta.basic?.invasive_threat_status ||
      meta.basic?.native_status,
    species_profile: meta.species_profile,
    image_observations: meta.image_observations,
  };
}

function uniqueSpecies(scans: ScanResult[]): string[] {
  return Array.from(new Set(scans.map((s) => s.scientific_name).filter(Boolean)));
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function relativeTime(iso?: string): string {
  if (!iso) return 'No scans yet';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'No scans yet';
  const hours = Math.max(0, Math.floor((Date.now() - then) / 3_600_000));
  if (hours === 0) return 'Just now';
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}
