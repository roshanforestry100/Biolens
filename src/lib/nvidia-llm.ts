// NVIDIA NIM LLM service for botanical enrichment.
//
// Takes the aggregated botanical research package (GBIF, Wikipedia, POWO,
// IPNI, PubMed, image observations) and produces a comprehensive,
// evidence-aware scientific profile. The LLM acts as a botanical information
// analyst - it organizes and explains retrieved evidence but never invents
// facts.

import {
  BotanicalResearchPackage,
} from './botanical-research';
import { TaxonomyResolutionResult } from './taxonomy';
import { IdentityCrossValidationResult } from './identity-validation';
import { ImageObservation } from '../types';

const API_KEY = process.env.NVIDIA_API_KEY || '';
const BASE_URL = process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const MODEL = process.env.NVIDIA_MODEL || 'meta/llama-3.1-70b-instruct';

export interface NVIDIAChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface NVIDIACompletionResponse {
  choices: {
    message: { role: string; content: string };
    finish_reason: string;
  }[];
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface LLMEnrichmentResult {
  overview: string;
  distinctive_characteristics: string;
  sections: {
    taxonomy?: string;
    morphology?: string;
    adaptations?: string;
    habitat_distribution?: string;
    ecology?: string;
    reproduction?: string;
    anatomy_physiology?: string;
    phytochemistry?: string;
    economic?: string;
    research_conservation?: string;
  };
  data_gaps: { category: string; field: string; reason: string }[];
  evidence_categories: {
    verified: string[];
    ai_explanation: string[];
    image_observation: string[];
    unavailable: string[];
  };
}

/**
 * Call NVIDIA NIM chat/completions API.
 */
export async function nvidiaChatCompletions(
  messages: NVIDIAChatMessage[],
  options?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    stream?: boolean;
  },
): Promise<string> {
  if (!API_KEY) {
    throw new Error('NVIDIA_API_KEY is not configured. Set NVIDIA_API_KEY in .env');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.max_tokens ?? 8000,
        top_p: options?.top_p ?? 0.9,
        stream: options?.stream ?? false,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`NVIDIA API error (${res.status}): ${errorText}`);
    }

    const data: NVIDIACompletionResponse = await res.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('NVIDIA API request timed out.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Build a comprehensive prompt from the botanical research package.
 * The LLM organizes and explains retrieved evidence without inventing facts.
 */
function buildEnrichmentPrompt(
  researchPackage: BotanicalResearchPackage,
  taxonomy: TaxonomyResolutionResult | null,
  identity: IdentityCrossValidationResult | null,
  imageObservations: ImageObservation[] = [],
): { systemPrompt: string; userPrompt: string } {
  const acceptedName = researchPackage.scientificName;
  const authorCitation = identity?.authorCitation || taxonomy?.authorCitation || '';
  const family = taxonomy?.taxonomy.family || '';
  const genus = taxonomy?.taxonomy.genus || '';
  const kingdom = taxonomy?.taxonomy.kingdom || '';
  const order = taxonomy?.taxonomy.order || '';
  const className = taxonomy?.taxonomy.class || '';
  const division = taxonomy?.taxonomy.phylum || '';
  const speciesEpithet = taxonomy?.taxonomy.species || '';

  const wiki = researchPackage.wikipedia;
  const powo = researchPackage.powo;
  const ipni = researchPackage.ipni;
  const pubmed = researchPackage.pubmed;

  // Build research evidence summary
  const researchEvidence: string[] = [];
  if (wiki?.extract) researchEvidence.push(`Wikipedia: ${wiki.extract}`);
  if (powo?.acceptedName) researchEvidence.push(`POWO: Accepted name ${powo.acceptedName}, author ${powo.author}`);
  if (powo?.distribution?.length) researchEvidence.push(`POWO Distribution: ${powo.distribution.join('; ')}`);
  if (powo?.nativeDistribution?.length) researchEvidence.push(`POWO Native: ${powo.nativeDistribution.join('; ')}`);
  if (ipni?.author) researchEvidence.push(`IPNI: Authorship ${ipni.author}, published ${ipni.publishedIn || ''} ${ipni.year || ''}`);
  if (pubmed.length > 0) {
    researchEvidence.push(`PubMed: ${pubmed.length} literature records found`);
    pubmed.forEach((p) => researchEvidence.push(`  - ${p.title} (${p.year || 'unknown year'})`));
  }
  if (taxonomy?.occurrenceCount) {
    researchEvidence.push(`GBIF: ${taxonomy.occurrenceCount} occurrence records across ${taxonomy.countries.length} countries`);
  }

  // Image observations
  const imageObsText = imageObservations.length > 0
    ? imageObservations.map((o) => `- ${o.feature}: ${o.observed_value} (confidence: ${o.confidence}, method: ${o.method})`).join('\n')
    : 'No image observations available. Image analysis not performed or no visible features detected.';

  // Confidence and warnings
  const idConfidence = identity?.confidence || 'low';
  const idWarnings = identity?.warnings || [];
  const idNote = identity?.identificationNote || '';

  const systemPrompt = `You are a senior botanical science editor for BioLens, a plant identification application used by students, researchers, and conservationists. Your role is to act as a botanical information analyst and scientific editor - organizing and explaining retrieved evidence into a comprehensive scientific profile.

CRITICAL EVIDENCE RULES - ABSOLUTELY NO EXCEPTIONS:

1. NEVER fabricate scientific names, taxonomic ranks, author citations, native distributions, conservation status, invasive status, morphological measurements, flowering periods, chemical constituents, or experimental results.
2. Only use information explicitly provided in the retrieved research data below.
3. If a field says "Not documented" or is missing, state that the information is not available in the consulted sources. Do NOT invent it.
4. CLEARLY DISTINGUISH between:
   - Documented species characteristics (from GBIF, Wikipedia, POWO, IPNI, PubMed)
   - Image observations (from the user's uploaded photograph)
   Never label a species-reference fact as something observed in the photograph.
5. Never turn genus-level information into species-level information without evidence.
6. Never convert uncertain information into a definitive statement.
7. Never invent conservation or invasive status without geographic evidence.
8. Never present traditional medicinal use as proof of clinical effectiveness.
9. Do not repeat the same paragraph across multiple scientific sections.
10. BE DETAILED AND LENGTHY. Write thorough explanations for each section (aim for 2-4 substantial paragraphs per section where data exists). Include context, explanations of botanical terminology, ecological significance, and connections between facts.
11. Output ONLY valid JSON with no markdown formatting, no code blocks, no explanatory text before or after.

JSON SCHEMA:
{
  "overview": "3-5 sentence comprehensive species introduction combining accepted name, family, growth habit, habitat, and ecological significance",
  "distinctive_characteristics": "Detailed description of key identifying features documented in the sources, explaining what makes this species unique",
  "sections": {
    "taxonomy": "Detailed hierarchical classification explanation with all available ranks",
    "morphology": "Comprehensive description of growth habit, stem, roots, leaves, inflorescence, flowers, fruit, and seeds",
    "adaptations": "Special biological adaptations if documented, otherwise state not available",
    "habitat_distribution": "Native range, habitat type, climate preferences, soil preferences",
    "ecology": "Ecosystem role, pollination relationships, ecological interactions, conservation status",
    "reproduction": "Reproductive strategy, flowering, pollination, fruit formation, seed dispersal, life cycle",
    "anatomy_physiology": "Plant tissues, vascular structure, leaf anatomy, photosynthesis if documented",
    "phytochemistry": "Chemical constituents, phytochemical classes, experimental findings if documented",
    "economic": "Agricultural applications, food production, ornamental use, commercial applications if documented",
    "research_conservation": "Conservation status, threats, population trends, research findings, scientific uncertainties"
  },
  "data_gaps": [
    {"category": "Morphology", "field": "Root system", "reason": "Not available from consulted sources and image does not show roots"}
  ],
  "evidence_categories": {
    "verified": ["taxonomy.family", "morphology.growth_habit"],
    "ai_explanation": ["overview", "sections.morphology"],
    "image_observation": ["image_observations.leaf_shape"],
    "unavailable": ["morphology.root_system", "anatomy_physiology.leaf_anatomy"]
  }
}`;

  const userPrompt = `RESEARCH DATA FOR SPECIES: ${acceptedName}

IDENTIFICATION STATUS:
- Input name: ${identity?.inputName || acceptedName}
- Accepted name: ${identity?.acceptedName || acceptedName}
- Author citation: ${authorCitation || 'Not available'}
- Identification confidence: ${idConfidence}
- GBIF match type: ${identity?.matchType || 'N/A'}
- Is accepted name: ${identity?.isAccepted || 'unknown'}
- Identification note: ${idNote}

IDENTIFICATION WARNINGS:
${idWarnings.length > 0 ? idWarnings.map((w) => `- ${w}`).join('\n') : 'None'}

TAXONOMY (from GBIF):
- Kingdom: ${kingdom || 'Not documented'}
- Division/Phylum: ${division || 'Not documented'}
- Class: ${className || 'Not documented'}
- Order: ${order || 'Not documented'}
- Family: ${family || 'Not documented'}
- Genus: ${genus || 'Not documented'}
- Species: ${speciesEpithet || 'Not documented'}
- Synonyms: ${identity && identity.synonyms && identity.synonyms.length > 0 ? identity.synonyms.join(', ') : 'None documented'}

GROWTH AND MORPHOLOGY (from retrieved sources):
- Growth habit: ${wiki?.extract ? 'Available in Wikipedia article' : 'Not documented'}
- Stem characteristics: Not documented in retrieved sources
- Root system: Not documented in retrieved sources
- Leaf arrangement: Not documented in retrieved sources
- Leaf type: Not documented in retrieved sources
- Leaf shape: Not documented in retrieved sources
- Leaf margin: Not documented in retrieved sources
- Leaf venation: Not documented in retrieved sources
- Leaf apex: Not documented in retrieved sources
- Leaf base: Not documented in retrieved sources
- Petiole: Not documented in retrieved sources
- Inflorescence: Not documented in retrieved sources
- Flower characteristics: Not documented in retrieved sources
- Fruit type: Not documented in retrieved sources
- Seed characteristics: Not documented in retrieved sources

HABITAT AND DISTRIBUTION:
- Native distribution: ${powo?.nativeDistribution?.join('; ') || wiki?.extract ? 'Available in retrieved sources' : 'Not documented'}
- Introduced distribution: ${powo?.distribution?.join('; ') || 'Not documented'}
- Habitat: Not documented in retrieved sources
- Climate preferences: Not documented in retrieved sources
- Soil preferences: Not documented in retrieved sources

ECOLOGY:
- Ecosystem role: Not documented in retrieved sources
- Pollination relationships: Not documented in retrieved sources
- Conservation status: Not evaluated (no verified assessment retrieved)
- Invasive status: Not assessed (requires geographic evidence)

REPRODUCTION AND LIFE CYCLE:
- Reproductive strategy: Not documented in retrieved sources
- Flowering: Not documented in retrieved sources
- Pollination method: Not documented in retrieved sources
- Fruit formation: Not documented in retrieved sources
- Seed dispersal: Not documented in retrieved sources
- Life cycle: Not documented in retrieved sources

ANATOMY AND PHYSIOLOGY:
- Plant tissues: Not documented in retrieved sources
- Vascular structure: Not documented in retrieved sources
- Leaf anatomy: Not documented in retrieved sources
- Photosynthetic pathway: Not documented in retrieved sources

PHYTOCHEMISTRY AND MEDICINAL RESEARCH:
- Chemical constituents: ${pubmed.length > 0 ? 'Literature records available in PubMed' : 'Not documented'}
- Phytochemical classes: Not documented in retrieved sources
- Experimental findings: Not documented in retrieved sources

ECONOMIC AND AGRICULTURAL IMPORTANCE:
- Agricultural applications: Not documented in retrieved sources
- Food production: Not documented in retrieved sources
- Ornamental use: Not documented in retrieved sources
- Commercial applications: Not documented in retrieved sources

RESEARCH EVIDENCE SUMMARY:
${researchEvidence.length > 0 ? researchEvidence.join('\n') : 'No substantive research data retrieved from any source.'}

IMAGE OBSERVATIONS (from user's uploaded photograph - DISTINCT from species reference data):
${imageObsText}

Please elaborate this into a complete botanical profile following the JSON schema above. Write detailed, lengthy explanations for each section. Do not fabricate any facts.`;

  return { systemPrompt, userPrompt };
}

/**
 * Elaborate botanical profile using NVIDIA LLM with evidence-aware processing.
 * Takes the full research package and produces a structured scientific profile.
 */
export async function elaborateBotanicalProfile(
  researchPackage: BotanicalResearchPackage,
  taxonomy: TaxonomyResolutionResult | null,
  identity: IdentityCrossValidationResult | null,
  imageObservations: ImageObservation[] = [],
): Promise<LLMEnrichmentResult> {
  const { systemPrompt, userPrompt } = buildEnrichmentPrompt(
    researchPackage,
    taxonomy,
    identity,
    imageObservations,
  );

  let response: string;
  try {
    response = await nvidiaChatCompletions(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.3, max_tokens: 8000 },
    );
  } catch (err: any) {
    // NVIDIA unavailable - return fallback structure
    return createFallbackResult(researchPackage, identity, imageObservations, err.message);
  }

  // Parse JSON response
  try {
    const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate required fields
    if (!parsed.overview || typeof parsed.overview !== 'string') {
      throw new Error('LLM response missing valid overview');
    }

    return parsed as LLMEnrichmentResult;
  } catch {
    return createFallbackResult(researchPackage, identity, imageObservations, 'LLM response could not be parsed');
  }
}

/**
 * Create a fallback result when NVIDIA LLM is unavailable or returns invalid JSON.
 */
function createFallbackResult(
  researchPackage: BotanicalResearchPackage,
  identity: IdentityCrossValidationResult | null,
  imageObservations: ImageObservation[] = [],
  errorReason: string = 'LLM unavailable',
): LLMEnrichmentResult {
  const acceptedName = researchPackage.scientificName;
  const wiki = researchPackage.wikipedia;

  return {
    overview: `Botanical profile for ${acceptedName}. Data retrieved from ${researchPackage.sources.join(', ')} or local sources. ${wiki?.extract ? wiki.extract.slice(0, 300) : ''}`,
    distinctive_characteristics: 'Distinctive characteristics not available from consulted sources.',
    sections: {
      taxonomy: `Taxonomic classification for ${acceptedName} retrieved from GBIF Backbone Taxonomy.`,
      morphology: 'Morphological characteristics not fully documented in available sources.',
      adaptations: 'Special adaptations not documented in available sources.',
      habitat_distribution: 'Habitat and distribution data not fully available.',
      ecology: 'Ecological information not fully documented.',
      reproduction: 'Reproductive information not documented.',
      anatomy_physiology: 'Anatomy and physiology data not available.',
      phytochemistry: 'Phytochemistry data not available.',
      economic: 'Economic importance not documented.',
      research_conservation: 'Research and conservation data not available.',
    },
    data_gaps: [
      {
        category: 'AI Enrichment',
        field: 'All sections',
        reason: errorReason,
      },
    ],
    evidence_categories: {
      verified: [],
      ai_explanation: [],
      image_observation: imageObservations.length > 0 ? ['image observations'] : [],
      unavailable: ['overview', 'taxonomy', 'morphology', 'ecology', 'reproduction', 'anatomy_physiology', 'phytochemistry', 'economic', 'research_conservation'],
    },
  };
}
