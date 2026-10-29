// Species profile caching layer.
// Checks AsyncStorage first (fast, offline), then Supabase (shared cache),
// then fetches from open sources and writes back to both.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { SpeciesProfile } from '../types';
import { buildSpeciesProfile } from './botanical';
export type { SpeciesProfile };

const ASYNC_KEY = '@biolens_species_profile:';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
interface CachedProfile {
  profile: SpeciesProfile;
  fetched_at: number;
}

/**
 * Normalize a scientific name into a cache key.
 */
function normalizeKey(scientificName: string): string {
  return scientificName.toLowerCase().trim().replace(/\s+/g, '_');
}

/**
 * Get a cached species profile from AsyncStorage.
 */
async function getFromAsyncStorage(key: string): Promise<SpeciesProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(`${ASYNC_KEY}${key}`);
    if (!raw) return null;
    const cached: CachedProfile = JSON.parse(raw);
    const age = Date.now() - cached.fetched_at;
    if (age > CACHE_TTL_MS) {
      await AsyncStorage.removeItem(`${ASYNC_KEY}${key}`);
      return null;
    }
    return cached.profile;
  } catch {
    return null;
  }
}

/**
 * Store a species profile in AsyncStorage.
 */
async function setInAsyncStorage(key: string, profile: SpeciesProfile): Promise<void> {
  try {
    const cached: CachedProfile = { profile, fetched_at: Date.now() };
    await AsyncStorage.setItem(`${ASYNC_KEY}${key}`, JSON.stringify(cached));
  } catch {
    // non-fatal
  }
}

/**
 * Get a cached species profile from Supabase.
 */
async function getFromSupabase(key: string): Promise<SpeciesProfile | null> {
  try {
    const { data, error } = await supabase
      .from('species_profiles')
      .select('profile, last_updated')
      .eq('cache_key', key)
      .single();

    if (error || !data) return null;

    const age = Date.now() - new Date(data.last_updated).getTime();
    if (age > CACHE_TTL_MS) return null;

    return data.profile as SpeciesProfile;
  } catch {
    return null;
  }
}

/**
 * Upsert a species profile into Supabase.
 */
async function setInSupabase(key: string, scientificName: string, profile: SpeciesProfile): Promise<void> {
  try {
    await supabase.from('species_profiles').upsert({
      cache_key: key,
      scientific_name: scientificName,
      profile,
      sources: profile.sources,
      last_updated: new Date().toISOString(),
    });
  } catch {
    // non-fatal
  }
}

/**
 * Fetch a verified species profile, using cache when available.
 * Order: AsyncStorage -> Supabase -> open sources.
 */
export async function getSpeciesProfile(scientificName: string): Promise<SpeciesProfile> {
  const key = normalizeKey(scientificName);

  // 1. AsyncStorage (fastest, offline-capable)
  const fromAsync = await getFromAsyncStorage(key);
  if (fromAsync) return fromAsync;

  // 2. Supabase (shared across devices)
  const fromSupabase = await getFromSupabase(key);
  if (fromSupabase) {
    await setInAsyncStorage(key, fromSupabase);
    return fromSupabase;
  }

  // 3. Fetch from open sources (GBIF, POWO, Wikipedia)
  const profile = await buildSpeciesProfile(scientificName);

  // 4. Write back to both caches
  await setInAsyncStorage(key, profile);
  await setInSupabase(key, scientificName, profile);

  return profile;
}

/**
 * Prefetch a species profile in the background (fire and forget).
 */
export function prefetchSpeciesProfile(scientificName: string): void {
  void getSpeciesProfile(scientificName);
}

/**
 * Clear the local species profile cache.
 */
export async function clearSpeciesCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const profileKeys = keys.filter((k) => k.startsWith(ASYNC_KEY));
    if (profileKeys.length > 0) {
      await AsyncStorage.multiRemove(profileKeys);
    }
  } catch {
    // non-fatal
  }
}
