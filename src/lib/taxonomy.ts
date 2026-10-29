// Taxonomy resolution service using GBIF.
//
// Resolves candidate scientific names against GBIF's backbone taxonomy,
// retrieves accepted names, authorship, synonyms, and higher classification.
// Also queries GBIF occurrence data for geographic distribution evidence
// (occurrence records are NOT treated as proof of native/invasive status).

const GBIF_BASE = 'https://api.gbif.org/v1';

export interface GBIFMatchResult {
  key: number;
  scientificName: string;
  canonicalName: string;
  authorship?: string;
  rank: string;
  status: string;
  family: string;
  genus: string;
  specificEpithet?: string;
  accepted?: { key: number; scientificName: string };
  extinct?: boolean;
  matchType: string;
}

export interface GBIFSpeciesDetail {
  key: number;
  scientificName: string;
  accepted?: { key: number; scientificName: string };
  taxonRank: string;
  taxonomicStatus: string;
  nomenclaturalStatus?: string;
  parent: { key: number; scientificName: string };
  kingdom: string;
  phylum?: string;
  class?: string;
  order?: string;
  family: string;
  genus: string;
  species?: string;
  extinction?: boolean;
  conservationStatus?: string;
}

export interface GBIFOccurrenceRecord {
  key: number;
  decimalLatitude?: number;
  decimalLongitude?: number;
  country?: string;
  countryCode?: string;
  stateProvince?: string;
  locality?: string;
  eventDate?: string;
  basisOfRecord?: string;
  institutionCode?: string;
}

export interface TaxonomyResolutionResult {
  inputName: string;
  acceptedName: string;
  authorCitation?: string;
  gbifKey?: number;
  matchType: string;
  taxonomy: {
    kingdom?: string;
    phylum?: string;
    class?: string;
    order?: string;
    family?: string;
    genus?: string;
    species?: string;
  };
  synonyms: string[];
  status: string;
  isAccepted: boolean;
  occurrenceCount?: number;
  occurrences: GBIFOccurrenceRecord[];
  countries: string[];
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
}

/**
 * Match a scientific name against GBIF backbone taxonomy.
 */
export async function gbifMatch(
  scientificName: string,
): Promise<GBIFMatchResult | null> {
  const encoded = encodeURIComponent(scientificName);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(
      `${GBIF_BASE}/species/match?name=${encoded}&strict=false`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      },
    );

    if (!res.ok) return null;
    const json = await res.json();
    if (!json || json.matchType === 'NONE') return null;

    return {
      key: json.key || 0,
      scientificName: json.scientificName || scientificName,
      canonicalName: json.canonicalName || scientificName,
      authorship: json.authorship,
      rank: json.rank || '',
      status: json.status || '',
      family: json.family || '',
      genus: json.genus || '',
      specificEpithet: json.specificEpithet,
      accepted: json.accepted
        ? { key: json.accepted.key, scientificName: json.accepted.scientificName }
        : undefined,
      extinct: json.extinct,
      matchType: json.matchType || '',
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Retrieve full GBIF species detail record.
 */
export async function gbifSpeciesDetail(
  key: number,
): Promise<GBIFSpeciesDetail | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${GBIF_BASE}/species/${key}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Query GBIF occurrences for a species to get geographic distribution evidence.
 * Returns occurrence records and unique country codes.
 * Occurrence records are geographic evidence only - NOT proof of native/invasive status.
 */
export async function gbifOccurrences(
  scientificName: string,
  limit: number = 200,
): Promise<{
  count: number;
  records: GBIFOccurrenceRecord[];
  countries: string[];
}> {
  const encoded = encodeURIComponent(scientificName);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(
      `${GBIF_BASE}/occurrence/search?scientific_name=${encoded}&limit=${limit}`,
      {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      },
    );

    if (!res.ok) {
      return { count: 0, records: [], countries: [] };
    }

    const json = await res.json();
    const results = json.results || [];
    const countries = new Set<string>();

    const records: GBIFOccurrenceRecord[] = results.map((r: any) => ({
      key: r.key,
      decimalLatitude: r.decimalLatitude,
      decimalLongitude: r.decimalLongitude,
      country: r.country,
      countryCode: r.countryCode,
      stateProvince: r.stateProvince,
      locality: r.locality,
      eventDate: r.eventDate,
      basisOfRecord: r.basisOfRecord,
      institutionCode: r.institutionCode,
    }));

    records.forEach((r) => {
      if (r.countryCode) countries.add(r.countryCode);
      if (r.country) countries.add(r.country);
    });

    return {
      count: json.count || results.length,
      records,
      countries: Array.from(countries),
    };
  } catch {
    return { count: 0, records: [], countries: [] };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Resolve a scientific name against GBIF taxonomy with full detail.
 * Performs match → detail lookup → occurrence query.
 */
export async function resolveTaxonomy(
  scientificName: string,
): Promise<TaxonomyResolutionResult> {
  const warnings: string[] = [];

  // Step 1: Match against GBIF backbone
  const match = await gbifMatch(scientificName);
  if (!match) {
    return {
      inputName: scientificName,
      acceptedName: scientificName,
      matchType: 'NONE',
      taxonomy: {},
      synonyms: [],
      status: 'unknown',
      isAccepted: false,
      confidence: 'low',
      warnings: ['No GBIF match found for this name.'],
      occurrenceCount: 0,
      occurrences: [],
      countries: [],
    };
  }

  const acceptedName = match.accepted
    ? match.accepted.scientificName
    : match.scientificName;
  const isAccepted =
    !match.accepted || match.accepted.key === match.key;

  if (match.accepted && match.accepted.key !== match.key) {
    warnings.push(
      `Input name "${scientificName}" is a synonym of accepted name "${acceptedName}".`,
    );
  }

  // Step 2: Get full species detail
  let detail: GBIFSpeciesDetail | null = null;
  if (match.key) {
    detail = await gbifSpeciesDetail(match.key);
  }

  // Step 3: Get occurrences for geographic context
  let occurrenceInfo: { count: number; records: GBIFOccurrenceRecord[]; countries: string[] } = {
    count: 0,
    records: [],
    countries: [],
  };
  if (match.key) {
    occurrenceInfo = await gbifOccurrences(match.scientificName);
  }

  // Build taxonomy hierarchy from detail or match
  const taxonomy: TaxonomyResolutionResult['taxonomy'] = {};
  if (detail) {
    taxonomy.kingdom = detail.kingdom || undefined;
    taxonomy.phylum = detail.phylum || undefined;
    taxonomy.class = detail.class || undefined;
    taxonomy.order = detail.order || undefined;
    taxonomy.family = detail.family || undefined;
    taxonomy.genus = detail.genus || undefined;
    taxonomy.species = detail.species || undefined;
  } else {
    taxonomy.family = match.family || undefined;
    taxonomy.genus = match.genus || undefined;
    taxonomy.species = match.specificEpithet || undefined;
  }

  // Synonyms from detail (GBIF detail doesn't include synonyms directly)
  const synonyms: string[] = [];

  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (match.matchType === 'EXACT') confidence = 'high';
  else if (match.matchType === 'FUZZY') confidence = 'medium';
  else confidence = 'low';

  return {
    inputName: scientificName,
    acceptedName,
    authorCitation: match.authorship,
    gbifKey: match.key,
    matchType: match.matchType,
    taxonomy,
    synonyms,
    status: match.status || 'unknown',
    isAccepted,
    occurrenceCount: occurrenceInfo.count,
    occurrences: occurrenceInfo.records,
    countries: occurrenceInfo.countries,
    confidence,
    warnings,
  };
}
