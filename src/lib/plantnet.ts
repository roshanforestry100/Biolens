// Biological identification client.
//
// The original BioLens app never called PlantNet directly from the device:
// it posted a base64 JPEG to the Supabase Edge Function `identify`, which
// proxies PlantNet with the server-side API key.  It then called
// `enrich-basic` for the ecological profile.  Both behaviours are restored
// here.  When the enrichment function is unavailable we fall back to a local
// deterministic profile so the field flow never breaks.

import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from './supabase';

export interface IdentifyResponse {
  scientific_name?: string;
  common_name?: string;
  final_confidence?: number;
  confidence?: number;
  confidence_level?: string;
  region_valid?: boolean;
  tier?: string;
  note?: string;
  source?: string;
  error?: string;
  [key: string]: any;
}

export interface BasicEnrichment {
  overview: string;
  family?: string;
  genus?: string;
  native_status: string;
  invasive_threat_status: string;
  conservation_status: string;
  ecological_role: string;
  regions?: string[];
  uses?: string[];
  source: string;
  note?: string;
  [key: string]: any;
}

export interface PreparedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

/**
 * Resize + compress the captured photo before upload.
 * Mirrors the original app: width 1280, JPEG quality 0.8, base64 included.
 */
export async function prepareImage(uri: string): Promise<PreparedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    {
      compress: 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  if (!result.base64) {
    throw new Error('Could not process the captured image.');
  }

  return {
    uri: result.uri,
    base64: result.base64,
    width: result.width,
    height: result.height,
  };
}

/**
 * Call the Supabase `identify` Edge Function.
 */
export async function identifyPlant(imageBase64: string): Promise<IdentifyResponse> {
  const { data, error } = await supabase.functions.invoke('identify', {
    body: { image: imageBase64 },
  });

  if (error) {
    throw new Error(await readFunctionError(error));
  }

  const payload = (data || {}) as IdentifyResponse;
  if (payload.error) {
    throw new Error(payload.error);
  }
  return payload;
}

/**
 * Call `enrich-basic`.  If the function is missing or failing, build a local
 * ecological profile instead of blocking the identification.
 */
export async function enrichPlant(scientificName: string): Promise<BasicEnrichment> {
  try {
    const { data, error } = await supabase.functions.invoke('enrich-basic', {
      body: { scientific_name: scientificName },
    });

    if (error) throw error;
    const payload = data as any;
    if (!payload || payload.error) throw new Error('Enrichment unavailable');

    return normalizeEnrichment(payload, scientificName);
  } catch {
    return buildLocalEnrichment(scientificName);
  }
}

function normalizeEnrichment(payload: any, scientificName: string): BasicEnrichment {
  const basic = payload.basic ?? payload;
  const reg = getRegulatoryStatus(scientificName, basic.common_name || '');

  return {
    ...basic,
    overview:
      basic.overview ||
      basic.description ||
      `Ecological profile compiled for ${scientificName}.`,
    native_status: basic.native_status || reg.status,
    invasive_threat_status:
      basic.invasive_threat_status || (reg.isInvasive ? 'Invasive' : 'Not Invasive'),
    conservation_status: basic.conservation_status || 'Not Evaluated',
    ecological_role:
      basic.ecological_role ||
      'Contributes to local vegetation structure and pollinator networks.',
    source: 'BioLens Engine',
  };
}

/**
 * Known invasive species in the Indian subcontinent.  The original build used
 * this same list, matching on the genus token.
 */
const INVASIVE_SPECIES = [
  'Lantana camara',
  'Parthenium hysterophorus',
  'Prosopis juliflora',
  'Chromolaena odorata',
  'Mikania micrantha',
  'Eichhornia crassipes',
  'Ageratina adenophora',
  'Arundo donax',
  'Leucaena leucocephala',
  'Acacia mearnsii',
  'Ulex europaeus',
  'Cytisus scoparius',
  'Rubus niveus',
  'Opuntia stricta',
  'Argemone mexicana',
  'Cannabis sativa',
  'Calotropis gigantea',
  'Araucaria heterophylla',
];

/** Species with strong cultural / ecological significance in India. */
const NOTABLE_SPECIES: Record<string, { family: string; overview: string; role: string }> = {
  azadirachta: {
    family: 'Meliaceae',
    overview:
      'Azadirachta indica (neem) is a fast-growing evergreen tree native to the Indian subcontinent. It is widely planted for shade, soil restoration and traditional medicine.',
    role: 'Provides shade and habitat, supports pollinators, and is used in sustainable agriculture.',
  },
  ficus: {
    family: 'Moraceae',
    overview:
      'Ficus species are keystone trees in Indian forests and urban landscapes, producing figs that sustain a wide range of birds and mammals.',
    role: 'Keystone resource for frugivores and pollinators; stabilises soil and microclimate.',
  },
  mangifera: {
    family: 'Anacardiaceae',
    overview:
      'Mangifera indica is a long-lived tropical tree native to South Asia, cultivated for fruit and valued in agroforestry systems.',
    role: 'Supports canopy structure, pollinators and local food webs.',
  },
  shorea: {
    family: 'Dipterocarpaceae',
    overview:
      'Shorea robusta (sal) forms some of the most extensive dry deciduous forests of northern and central India.',
    role: 'Dominant canopy species; critical for forest structure and wildlife habitat.',
  },
  bidens: {
    family: 'Asteraceae',
    overview:
      'Bidens is a widespread genus of herbaceous plants, several species of which behave as opportunistic weeds in disturbed habitats.',
    role: 'Early successional coloniser; provides nectar for generalist pollinators.',
  },
  vicia: {
    family: 'Fabaceae',
    overview:
      'Vicia species are leguminous herbs that fix atmospheric nitrogen and are important in pasture and crop rotations.',
    role: 'Nitrogen fixation and soil fertility; forage for pollinators.',
  },
};

const UNDETERMINED: BasicEnrichment = {
  overview:
    'This specimen was identified at genus level. Morphological and ecological details are limited without a species-level match.',
  native_status: 'Undetermined',
  invasive_threat_status: 'Not Invasive',
  conservation_status: 'Not Evaluated',
  ecological_role:
    'Contributes to local vegetation structure; detailed ecological role requires species-level verification.',
  source: 'BioLens local model',
};

/**
 * Build a conservative ecological profile without any network call.
 */
export function buildLocalEnrichment(scientificName: string): BasicEnrichment {
  const clean = (scientificName || '').trim();
  if (!clean) return { ...UNDETERMINED };

  const genus = clean.split(/\s+/)[0].toLowerCase();
  const reg = getRegulatoryStatus(clean, '');
  const notable = NOTABLE_SPECIES[genus];

  const overview = notable?.overview
    ? notable.overview
    : reg.isInvasive
      ? `${clean} is recorded as an invasive or naturalised species in Indian forest ecosystems. It can out-compete native vegetation and alter fire and nutrient cycles.`
      : `${clean} is recorded in the BioLens botanical index. A full species-level ecological profile requires a higher-confidence identification.`;

  return {
    overview,
    family: notable?.family,
    genus: clean.split(/\s+/)[0],
    native_status: reg.status,
    invasive_threat_status: reg.isInvasive ? 'Invasive' : 'Not Invasive',
    conservation_status: reg.isInvasive ? 'Management Required' : 'Not Evaluated',
    ecological_role:
      notable?.role ||
      (reg.isInvasive
        ? 'Competes with native flora; monitor spread and report dense patches to local forest authorities.'
        : 'Contributes to local vegetation structure and pollinator networks.'),
    regions: ['Indian Subcontinent'],
    source: 'BioLens local model',
    note: 'Compiled locally because the enrichment service was unavailable.',
  };
}

/**
 * Regulatory / invasive status.  Uses the list recovered from the original APK.
 */
export function getRegulatoryStatus(
  scientificName: string,
  commonName: string
): { status: string; label: string; isInvasive: boolean } {
  const haystack = `${scientificName || ''} ${commonName || ''}`.toLowerCase();

  const isInvasive = INVASIVE_SPECIES.some((species) => {
    const [genus, epithet] = species.toLowerCase().split(' ');
    return (
      haystack.includes(species.toLowerCase()) ||
      (haystack.includes(genus) && (!epithet || haystack.includes(epithet)))
    );
  });

  if (isInvasive) {
    return {
      status: 'Invasive',
      label:
        'Listed as invasive in Indian forest ecosystems. Active management and reporting recommended.',
      isInvasive: true,
    };
  }

  return {
    status: 'Native',
    label: 'No invasive status flagged for this species in Indian forest records.',
    isInvasive: false,
  };
}

/**
 * Extracts a useful message from a supabase-js FunctionsError.
 */
async function readFunctionError(error: any): Promise<string> {
  try {
    if (error?.context?.json) {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    }
    if (error?.context?.text) {
      const text = await error.context.text();
      if (text) return text;
    }
  } catch {
    // ignore and fall through
  }
  return error?.message || 'Identification service is unavailable.';
}
