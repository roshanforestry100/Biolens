export interface ScanResult {
  id: string;
  user_id: string;
  scientific_name: string;
  common_name: string;
  confidence: number;
  regulatory_status?: string;
  region?: string;
  image_uri?: string;
  metadata?: Record<string, any>;
  scan_date?: string;
  created_at: string;
  scanId?: string;
  family?: string;
  genus?: string;
  description?: string;
  conservation_status?: string;
  species_profile?: any;
  image_observations?: any[];
  enriched_profile?: any;
}

export interface Citation {
  source: BotanicalSource;
  source_name: string;
  url?: string;
  identifier?: string;
  accessed_at: string;
  confidence: 'high' | 'medium' | 'low';
}

export type BotanicalSource =
  | 'gbif'
  | 'powo'
  | 'wikipedia'
  | 'iucn'
  | 'image_analysis'
  | 'local_fallback'
  | 'supabase_edge_function'
  | 'plantnet'
  | 'ipni'
  | 'pubmed';

export type EvidenceCategory =
  | 'verified'
  | 'ai_explanation'
  | 'image_observation'
  | 'unverified'
  | 'unavailable';

export interface ClaimWithCitation<T = string> {
  value: T;
  citation: Citation | null;
  is_documented: boolean;
  evidence_category: EvidenceCategory;
}

export interface EnrichedField {
  label: string;
  value: string;
  type: 'documented' | 'image_observation' | 'not_available';
  confidence: 'high' | 'medium' | 'low';
  evidence_category: EvidenceCategory;
}

export interface ConflictRecord {
  field: string;
  source_a: string;
  value_a: string;
  source_b: string;
  value_b: string;
  resolved_value: string | null;
  resolution_note: string;
}

export interface DataGap {
  category: string;
  field: string;
  reason: string;
  missing_reason_type:
    | 'no_reference_record'
    | 'field_absent_from_sources'
    | 'image_does_not_show_structure'
    | 'image_quality_insufficient'
    | 'conflicting_reference_information'
    | 'specialist_testing_required'
    | 'not_applicable';
}

export interface SpeciesProfile {
  accepted_name: ClaimWithCitation<string>;
  author_citation: ClaimWithCitation<string>;
  common_names: string[];
  synonyms: string[];
  kingdom: ClaimWithCitation<string>;
  division: ClaimWithCitation<string>;
  class: ClaimWithCitation<string>;
  order: ClaimWithCitation<string>;
  family: ClaimWithCitation<string>;
  genus: ClaimWithCitation<string>;
  species: ClaimWithCitation<string>;
  growth_habit: ClaimWithCitation<string>;
  root_system: ClaimWithCitation<string>;
  stem: ClaimWithCitation<string>;
  leaf_arrangement: ClaimWithCitation<string>;
  leaf_type: ClaimWithCitation<string>;
  leaf_shape: ClaimWithCitation<string>;
  leaf_margin: ClaimWithCitation<string>;
  leaf_venation: ClaimWithCitation<string>;
  leaf_apex: ClaimWithCitation<string>;
  leaf_base: ClaimWithCitation<string>;
  petiole: ClaimWithCitation<string>;
  inflorescence: ClaimWithCitation<string>;
  flower_characteristics: ClaimWithCitation<string>;
  fruit_type: ClaimWithCitation<string>;
  seed_characteristics: ClaimWithCitation<string>;
  special_adaptations: ClaimWithCitation<string>;
  habitat: ClaimWithCitation<string>;
  native_distribution: ClaimWithCitation<string>;
  introduced_distribution: ClaimWithCitation<string>;
  climate_preferences: ClaimWithCitation<string>;
  soil_preferences: ClaimWithCitation<string>;
  ecosystem_role: ClaimWithCitation<string>;
  pollination_relationships: ClaimWithCitation<string>;
  ecological_interactions: ClaimWithCitation<string>;
  cultivation_environments: ClaimWithCitation<string>;
  reproductive_strategy: ClaimWithCitation<string>;
  flowering: ClaimWithCitation<string>;
  pollination_method: ClaimWithCitation<string>;
  fruit_formation: ClaimWithCitation<string>;
  seed_production: ClaimWithCitation<string>;
  seed_dispersal: ClaimWithCitation<string>;
  germination: ClaimWithCitation<string>;
  propagation: ClaimWithCitation<string>;
  life_cycle: ClaimWithCitation<string>;
  seasonal_patterns: ClaimWithCitation<string>;
  plant_tissues: ClaimWithCitation<string>;
  vascular_structure: ClaimWithCitation<string>;
  leaf_anatomy: ClaimWithCitation<string>;
  photosynthetic_pathway: ClaimWithCitation<string>;
  water_transport: ClaimWithCitation<string>;
  nutrient_acquisition: ClaimWithCitation<string>;
  physiological_adaptations: ClaimWithCitation<string>;
  chemical_constituents: ClaimWithCitation<string>;
  phytochemical_classes: ClaimWithCitation<string>;
  experimental_findings: ClaimWithCitation<string>;
  research_context: ClaimWithCitation<string>;
  evidence_limitations: ClaimWithCitation<string>;
  agricultural_applications: ClaimWithCitation<string>;
  food_production: ClaimWithCitation<string>;
  ornamental_use: ClaimWithCitation<string>;
  commercial_applications: ClaimWithCitation<string>;
  environmental_applications: ClaimWithCitation<string>;
  traditional_uses: ClaimWithCitation<string>;
  conservation_status: ClaimWithCitation<string>;
  threats: ClaimWithCitation<string>;
  population_trends: ClaimWithCitation<string>;
  research_findings: ClaimWithCitation<string>;
  ecological_importance: ClaimWithCitation<string>;
  scientific_uncertainties: ClaimWithCitation<string>;
  invasive_status: ClaimWithCitation<string>;
  sources: Citation[];
  conflicts: ConflictRecord[];
  last_updated: string;
  cache_key: string;
}

export interface ImageObservation {
  feature: 'leaf_shape' | 'leaf_margin' | 'leaf_venation' | 'growth_habit' | 'flower_color' | 'fruit_type' | 'stem' | 'roots';
  observed_value: string;
  confidence: 'high' | 'medium' | 'low';
  method: 'color_analysis' | 'edge_detection' | 'histogram' | 'manual';
  note: string;
}

export interface EnrichedProfile {
  overview: string;
  distinctive_characteristics: string;
  native_range: string | null;
  key_facts: { label: string; value: string }[];
  quick_facts: { label: string; value: string }[];
  taxonomy: EnrichedField[];
  morphology: EnrichedField[];
  adaptations: EnrichedField[];
  habitat_distribution: EnrichedField[];
  ecology: EnrichedField[];
  reproduction: EnrichedField[];
  anatomy_physiology: EnrichedField[];
  phytochemistry: EnrichedField[];
  economic: EnrichedField[];
  research_conservation: EnrichedField[];
  dataGaps: DataGap[];
  accepted_name: string;
  author_citation: string | null;
  identification_confidence: number;
  validation: {
    isValid: boolean;
    confidence: 'high' | 'medium' | 'low';
    warnings: string[];
    matchedName: string;
    identification_note: string;
  };
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  total_scans: number;
  unique_species: number;
  field_hours: number;
  stars: number;
  regions_covered: number;
  ecological_impact: number;
  primary_expertise?: string;
  created_at: string;
}

export interface PlantNetResult {
  score: number;
  species: {
    scientificNameWithoutAuthor: string;
    scientificNameAuthorship: string;
    genus: { scientificNameWithoutAuthor: string };
    family: { scientificNameWithoutAuthor: string };
    commonNames: string[];
    gbif?: { id: string };
  };
  images: { url: { m: string; o: string } }[];
}

export interface PlantNetResponse {
  query: { project: string; images: string[]; organs: string[]; includeRelatedImages: boolean };
  language: string;
  preferedReferential: string;
  bestMatch: string;
  results: PlantNetResult[];
  remainingIdentificationRequests: number;
}

export type RegulatoryStatus = 'Invasive' | 'Native' | 'Exotic' | 'Unknown';

export type NavigationParamList = {
  Auth: undefined;
  Login: undefined;
  Signup: undefined;
  Main: undefined;
  Home: undefined;
  Identify: undefined;
  History: undefined;
  Profile: undefined;
  Result: { scan: ScanResult };
  About: undefined;
  Terms: undefined;
  Report: undefined;
  AgentProfile: undefined;
};

export function emptyClaim(value: string, source: BotanicalSource = 'local_fallback'): ClaimWithCitation {
  return {
    value,
    citation: null,
    is_documented: false,
    evidence_category: 'unavailable',
  };
}

export function documentedClaim(value: string, citation: Citation): ClaimWithCitation {
  return {
    value,
    citation,
    is_documented: true,
    evidence_category: 'verified',
  };
}

export function imageObservationClaim(value: string, citation: Citation | null): ClaimWithCitation {
  return {
    value,
    citation,
    is_documented: false,
    evidence_category: 'image_observation',
  };
}

export function makeCitation(
  source: BotanicalSource,
  source_name: string,
  url?: string,
  identifier?: string,
  confidence: Citation['confidence'] = 'medium',
): Citation {
  return {
    source,
    source_name,
    url,
    identifier,
    accessed_at: new Date().toISOString(),
    confidence,
  };
}
