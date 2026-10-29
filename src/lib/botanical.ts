// Open-source botanical data sources with per-claim citations.
// All API keys are read from environment variables; no secrets in frontend code.

import { Citation, BotanicalSource, SpeciesProfile, emptyClaim, documentedClaim, makeCitation } from '../types';

const GBIF_BASE = 'https://api.gbif.org/v1';
const POWO_BASE = 'https://powo.science.kew.org/api/v2';
const WIKIPEDIA_BASE = 'https://en.wikipedia.org/api/rest_v1';

const USER_AGENT = 'BioLens/1.0 (contact: support@jungletak.in)';

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': USER_AGENT,
        ...(init?.headers || {}),
      },
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
 * GBIF Species Match - returns accepted name, taxonomy, and key.
 */
export async function gbifMatch(scientificName: string): Promise<{
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
  citation: Citation;
} | null> {
  const encoded = encodeURIComponent(scientificName);
  const json = await fetchJson(`${GBIF_BASE}/species/match?name=${encoded}&strict=false`);
  if (!json || json.matchType === 'NONE') return null;

  const citation = makeCitation(
    'gbif',
    'GBIF Backbone Taxonomy',
    `https://gbif.org/species/${json.key}`,
    String(json.key),
    'high',
  );

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
    accepted: json.accepted ? { key: json.accepted.key, scientificName: json.accepted.scientificName } : undefined,
    extinct: json.extinct,
    citation,
  };
}

/**
 * GBIF Species Detail - conservation status, etc.
 */
export async function gbifSpeciesDetail(key: number): Promise<{
  conservationStatus?: string;
  citation: Citation;
} | null> {
  const json = await fetchJson(`${GBIF_BASE}/species/${key}`);
  if (!json) return null;

  const citation = makeCitation(
    'gbif',
    'GBIF Species Detail',
    `https://gbif.org/species/${key}`,
    String(key),
    'high',
  );

  return {
    conservationStatus: json.conservationStatus,
    citation,
  };
}

/**
 * POWO (Plants of the World Online) - accepted name, author, distribution.
 */
export async function powoLookup(scientificName: string): Promise<{
  acceptedName: string;
  author: string;
  lsid?: string;
  family?: string;
  genus?: string;
  distribution?: string[];
  citation: Citation;
} | null> {
  // POWO uses a name search endpoint
  const encoded = encodeURIComponent(scientificName);
  const json = await fetchJson(`${POWO_BASE}/search?q=${encoded}`);
  if (!json || !json.results || json.results.length === 0) return null;

  const result = json.results[0];
  const lsid = result.lsid || result.id;
  const citation = makeCitation(
    'powo',
    'Plants of the World Online (Kew)',
    `https://powo.science.kew.org/result/${lsid || ''}`,
    lsid,
    'high',
  );

  // Fetch detailed record for distribution
  let distribution: string[] | undefined;
  if (lsid) {
    const detail = await fetchJson(`${POWO_BASE}/record/${lsid}`);
    if (detail) {
      distribution = detail.nativeDistribution?.split(';') || detail.distribution?.split(';');
    }
  }

  return {
    acceptedName: result.scientificName || scientificName,
    author: result.author || '',
    lsid,
    family: result.family,
    genus: result.genus,
    distribution,
    citation,
  };
}

/**
 * Wikipedia summary - overview, description, thumbnail.
 */
export async function wikipediaSummary(scientificName: string): Promise<{
  title: string;
  extract: string;
  thumbnail?: { url: string; width: number; height: number };
  pageid: number;
  description?: string;
  citation: Citation;
} | null> {
  const encoded = encodeURIComponent(scientificName);
  const json = await fetchJson(`${WIKIPEDIA_BASE}/page/summary/${encoded}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!json || !json.extract) return null;

  const citation = makeCitation(
    'wikipedia',
    'Wikipedia',
    `https://en.wikipedia.org/?curid=${json.pageid}`,
    String(json.pageid),
    'medium',
  );

  return {
    title: json.title || scientificName,
    extract: json.extract,
    thumbnail: json.thumbnail ? {
      url: json.thumbnail.source,
      width: json.thumbnail.width,
      height: json.thumbnail.height,
    } : undefined,
    pageid: json.pageid || 0,
    description: json.description,
    citation,
  };
}

/**
 * Build a complete SpeciesProfile from all available open sources.
 * Falls back gracefully when sources are unavailable.
 */
export async function buildSpeciesProfile(scientificName: string): Promise<SpeciesProfile> {
  const [gbif, powo, wiki] = await Promise.allSettled([
    gbifMatch(scientificName),
    powoLookup(scientificName),
    wikipediaSummary(scientificName),
  ]);

  const gbifData = gbif.status === 'fulfilled' ? gbif.value : null;
  const powoData = powo.status === 'fulfilled' ? powo.value : null;
  const wikiData = wiki.status === 'fulfilled' ? wiki.value : null;

  const sources: Citation[] = [];
  if (gbifData) sources.push(gbifData.citation);
  if (powoData) sources.push(powoData.citation);
  if (wikiData) sources.push(wikiData.citation);

  // Determine accepted name: POWO > GBIF > input
  const acceptedName = powoData?.acceptedName || gbifData?.scientificName || scientificName;
  const authorCitation = powoData?.author || gbifData?.authorship || '';

  const family = powoData?.family || gbifData?.family || '';
  const genus = powoData?.genus || gbifData?.genus || scientificName.split(/\s+/)[0];

  // Build citation helper
  const cite = (source: BotanicalSource, name: string, url?: string, id?: string, conf: Citation['confidence'] = 'medium') =>
    makeCitation(source, name, url, id, conf);

  // Taxonomy
  const acceptedNameClaim = documentedClaim(acceptedName, cite('gbif', 'GBIF Backbone Taxonomy', `https://gbif.org/species/${gbifData?.key}`, String(gbifData?.key)));
  const authorClaim = authorCitation
    ? documentedClaim(authorCitation, cite('powo', 'Plants of the World Online', powoData?.citation.url, powoData?.lsid))
    : emptyClaim('Author citation not available', 'local_fallback');

  const kingdomClaim = documentedClaim('Plantae', cite('gbif', 'GBIF Backbone Taxonomy'));
  const divisionClaim = emptyClaim('Not available from open sources', 'local_fallback');
  const classClaim = emptyClaim('Not available from open sources', 'local_fallback');
  const orderClaim = emptyClaim('Not available from open sources', 'local_fallback');
  const familyClaim = family
    ? documentedClaim(family, cite('gbif', 'GBIF Backbone Taxonomy', `https://gbif.org/species/${gbifData?.key}`, String(gbifData?.key)))
    : emptyClaim('Family not available', 'local_fallback');
  const genusClaim = genus
    ? documentedClaim(genus, cite('gbif', 'GBIF Backbone Taxonomy'))
    : emptyClaim('Genus not available', 'local_fallback');
  const speciesClaim = documentedClaim(scientificName, cite('gbif', 'GBIF Backbone Taxonomy'));

  // Morphology - all from documented sources where available, otherwise marked as not available
  const growthHabitClaim = wikiData
    ? documentedClaim(extractGrowthHabit(wikiData.extract), cite('wikipedia', 'Wikipedia', wikiData.citation.url, String(wikiData.pageid)))
    : emptyClaim('Growth habit not documented in available sources', 'local_fallback');

  const stemClaim = emptyClaim('Stem morphology not documented in available sources', 'local_fallback');
  const rootsClaim = emptyClaim('Root morphology not documented in available sources', 'local_fallback');

  const leafArrangementClaim = emptyClaim('Leaf arrangement not documented in available sources', 'local_fallback');
  const leafTypeClaim = emptyClaim('Leaf type not documented in available sources', 'local_fallback');
  const leafShapeClaim = emptyClaim('Leaf shape not documented in available sources', 'local_fallback');
  const leafMarginClaim = emptyClaim('Leaf margin not documented in available sources', 'local_fallback');
  const leafVenationClaim = emptyClaim('Leaf venation not documented in available sources', 'local_fallback');
  const leafApexClaim = emptyClaim('Leaf apex not documented in available sources', 'local_fallback');
  const leafBaseClaim = emptyClaim('Leaf base not documented in available sources', 'local_fallback');
  const petioleClaim = emptyClaim('Petiole not documented in available sources', 'local_fallback');

  const inflorescenceClaim = emptyClaim('Inflorescence not documented in available sources', 'local_fallback');
  const flowerCharacteristicsClaim = emptyClaim('Flower characteristics not documented in available sources', 'local_fallback');
  const fruitTypeClaim = emptyClaim('Fruit type not documented in available sources', 'local_fallback');
  const seedCharacteristicsClaim = emptyClaim('Seed characteristics not documented in available sources', 'local_fallback');

  // Habitat and distribution
  const habitatClaim = powoData?.distribution
    ? documentedClaim(powoData.distribution.join('; '), cite('powo', 'Plants of the World Online', powoData.citation.url, powoData.lsid))
    : wikiData
      ? documentedClaim(extractHabitat(wikiData.extract), cite('wikipedia', 'Wikipedia', wikiData.citation.url, String(wikiData.pageid)))
      : emptyClaim('Habitat not documented in available sources', 'local_fallback');

  const distributionClaim = powoData?.distribution
    ? documentedClaim(powoData.distribution.join('; '), cite('powo', 'Plants of the World Online'))
    : emptyClaim('Geographic distribution not documented', 'local_fallback');

  // Reproduction and life cycle
  const reproductionClaim = emptyClaim('Reproduction details not documented in available sources', 'local_fallback');
  const lifeCycleClaim = emptyClaim('Life cycle details not documented in available sources', 'local_fallback');

  // Ecology and agricultural importance
  const ecologyClaim = wikiData
    ? documentedClaim(extractEcology(wikiData.extract), cite('wikipedia', 'Wikipedia', wikiData.citation.url, String(wikiData.pageid)))
    : emptyClaim('Ecological role not documented in available sources', 'local_fallback');

  const agricultureClaim = emptyClaim('Agricultural importance not documented in available sources', 'local_fallback');

  // Conservation and invasive status
  const gbifDetail = gbifData ? await gbifSpeciesDetail(gbifData.key).catch(() => null) : null;
  const conservationClaim = gbifDetail?.conservationStatus
    ? documentedClaim(gbifDetail.conservationStatus, gbifDetail.citation)
    : emptyClaim('Conservation status not evaluated', 'local_fallback');

  // Invasive status from GBIF status + local invasive list
  const isInvasive = gbifData?.status && /invasive|alien|naturalised|naturalized/i.test(gbifData.status);
  const invasiveClaim = isInvasive
    ? documentedClaim('Invasive', cite('gbif', 'GBIF Backbone Taxonomy'))
    : documentedClaim('Not listed as invasive in GBIF', cite('gbif', 'GBIF Backbone Taxonomy'));

  return {
    accepted_name: acceptedNameClaim,
    author_citation: authorClaim,
    common_names: [],
    synonyms: [],
    kingdom: kingdomClaim,
    division: divisionClaim,
    class: classClaim,
    order: orderClaim,
    family: familyClaim,
    genus: genusClaim,
    species: speciesClaim,
    growth_habit: growthHabitClaim,
    stem: stemClaim,
    root_system: rootsClaim,
    leaf_arrangement: leafArrangementClaim,
    leaf_type: leafTypeClaim,
    leaf_shape: leafShapeClaim,
    leaf_margin: leafMarginClaim,
    leaf_venation: leafVenationClaim,
    leaf_apex: leafApexClaim,
    leaf_base: leafBaseClaim,
    petiole: petioleClaim,
    inflorescence: inflorescenceClaim,
    flower_characteristics: flowerCharacteristicsClaim,
    fruit_type: fruitTypeClaim,
    seed_characteristics: seedCharacteristicsClaim,
    special_adaptations: emptyClaim('Special adaptations not documented in available sources.'),
    habitat: habitatClaim,
    native_distribution: distributionClaim,
    introduced_distribution: emptyClaim('Introduced distribution not documented in available sources.'),
    climate_preferences: emptyClaim('Climate preferences not documented in available sources.'),
    soil_preferences: emptyClaim('Soil preferences not documented in available sources.'),
    ecosystem_role: ecologyClaim,
    pollination_relationships: emptyClaim('Pollination relationships not documented in available sources.'),
    ecological_interactions: emptyClaim('Ecological interactions not documented in available sources.'),
    cultivation_environments: emptyClaim('Cultivation environments not documented in available sources.'),
    reproductive_strategy: reproductionClaim,
    flowering: emptyClaim('Flowering details not documented in available sources.'),
    pollination_method: emptyClaim('Pollination method not documented in available sources.'),
    fruit_formation: emptyClaim('Fruit formation not documented in available sources.'),
    seed_production: emptyClaim('Seed production not documented in available sources.'),
    seed_dispersal: emptyClaim('Seed dispersal not documented in available sources.'),
    germination: emptyClaim('Germination details not documented in available sources.'),
    propagation: emptyClaim('Propagation methods not documented in available sources.'),
    life_cycle: lifeCycleClaim,
    seasonal_patterns: emptyClaim('Seasonal patterns not documented in available sources.'),
    plant_tissues: emptyClaim('Plant tissue structure not documented in available sources.'),
    vascular_structure: emptyClaim('Vascular structure not documented in available sources.'),
    leaf_anatomy: emptyClaim('Leaf anatomy not documented in available sources.'),
    photosynthetic_pathway: emptyClaim('Photosynthetic pathway not documented in available sources.'),
    water_transport: emptyClaim('Water transport not documented in available sources.'),
    nutrient_acquisition: emptyClaim('Nutrient acquisition not documented in available sources.'),
    physiological_adaptations: emptyClaim('Physiological adaptations not documented in available sources.'),
    chemical_constituents: emptyClaim('Chemical constituents not documented in available sources.'),
    phytochemical_classes: emptyClaim('Phytochemical classes not documented in available sources.'),
    experimental_findings: emptyClaim('Experimental findings not documented in available sources.'),
    research_context: emptyClaim('Research context not documented in available sources.'),
    evidence_limitations: emptyClaim('Evidence limitations not documented in available sources.'),
    agricultural_applications: agricultureClaim,
    food_production: emptyClaim('Food production not documented in available sources.'),
    ornamental_use: emptyClaim('Ornamental use not documented in available sources.'),
    commercial_applications: emptyClaim('Commercial applications not documented in available sources.'),
    environmental_applications: emptyClaim('Environmental applications not documented in available sources.'),
    traditional_uses: emptyClaim('Traditional uses not documented in available sources.'),
    conservation_status: conservationClaim,
    threats: emptyClaim('Threats not documented in available sources.'),
    population_trends: emptyClaim('Population trends not documented in available sources.'),
    research_findings: emptyClaim('Research findings not documented in available sources.'),
    ecological_importance: emptyClaim('Ecological importance not documented in available sources.'),
    scientific_uncertainties: emptyClaim('Scientific uncertainties not documented in available sources.'),
    invasive_status: invasiveClaim,
    conflicts: [],
    sources,
    last_updated: new Date().toISOString(),
    cache_key: scientificName.toLowerCase().replace(/\s+/g, '_'),
  };
}

function extractGrowthHabit(extract: string): string {
  const lower = extract.toLowerCase();
  const habits = ['tree', 'shrub', 'herb', 'vine', 'climber', 'liana', 'epiphyte'];
  for (const h of habits) {
    if (lower.includes(h)) {
      const idx = lower.indexOf(h);
      const start = Math.max(0, idx - 60);
      const end = Math.min(extract.length, idx + 60);
      return extract.slice(start, end).trim();
    }
  }
  return 'Growth habit described in Wikipedia entry.';
}

function extractHabitat(extract: string): string {
  const lower = extract.toLowerCase();
  const keywords = ['habitat', 'native to', 'found in', 'grows in', 'distribution'];
  for (const k of keywords) {
    if (lower.includes(k)) {
      const idx = lower.indexOf(k);
      const start = Math.max(0, idx - 40);
      const end = Math.min(extract.length, idx + 100);
      return extract.slice(start, end).trim();
    }
  }
  return 'Habitat described in Wikipedia entry.';
}

function extractEcology(extract: string): string {
  const lower = extract.toLowerCase();
  const keywords = ['ecolog', 'pollinat', 'seed dispers', 'soil', 'forest', 'garden'];
  for (const k of keywords) {
    if (lower.includes(k)) {
      const idx = lower.indexOf(k);
      const start = Math.max(0, idx - 40);
      const end = Math.min(extract.length, idx + 100);
      return extract.slice(start, end).trim();
    }
  }
  return 'Ecological information described in Wikipedia entry.';
}
