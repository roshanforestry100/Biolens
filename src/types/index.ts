export interface ScanResult {
  id: string;
  user_id: string;
  scientific_name: string;
  common_name: string;
  confidence: number;
  regulatory_status?: string;
  region?: string;
  image_uri?: string;         // actual column name in Supabase
  metadata?: Record<string, any>; // JSONB field
  scan_date?: string;
  created_at: string;
  scanId?: string;            // local-only identifier added by AsyncStorage mirror
  // Derived/local fields (not in DB, populated from metadata or enrichment)
  family?: string;
  genus?: string;
  description?: string;
  conservation_status?: string;
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
