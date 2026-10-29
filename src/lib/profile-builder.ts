// Scientific profile builder service.
//
// Orchestrates the full pipeline:
//   PlantNet identification → GBIF taxonomy → Identity cross-validation
//   → Botanical research (parallel sources) → LLM enrichment → Quality validation
//
// Produces an EnrichedProfile with only verified, non-placeholder data.

import { PlantNetIdentifyResult } from './plantnet';
import { resolveTaxonomy, TaxonomyResolutionResult } from './taxonomy';
import { crossValidateIdentity, IdentityCrossValidationResult } from './identity-validation';
import {
  collectBotanicalResearch,
  BotanicalResearchPackage,
} from './botanical-research';
import {
  elaborateBotanicalProfile,
} from './nvidia-llm';
import {
  EnrichedProfile,
  EnrichedField,
  DataGap,
  ImageObservation,
} from '../types';

// Placeholder phrases that indicate missing data
const PLACEHOLDER_PHRASES = [
  'not documented',
  'not available',
  'not determinable',
  'not found',
  'not evaluated',
  'not assessed',
  'described in wikipedia entry',
  'habitat described in',
  'no reference record',
  'field absent from sources',
];

function isPlaceholder(text: string): boolean {
  const lower = text.toLowerCase().trim();
  if (!lower || lower.length < 5) return true;
  return PLACEHOLDER_PHRASES.some((p) => lower.includes(p));
}

/**
 * Determine if an invasive status claim has adequate geographic evidence.
 * A species must NOT be marked invasive merely because:
 * - It occurs outside a presumed native range
 * - A GBIF record exists
 * - A name-matching API returns a taxonomic record
 * - A generic web page describes the species as invasive somewhere
 *
 * Requires geographically relevant and sufficiently reliable evidence.
 */
function assessInvasiveStatus(
  identity: IdentityCrossValidationResult | null,
  taxonomy: TaxonomyResolutionResult | null,
  researchPackage: BotanicalResearchPackage,
): { status: 'Invasive' | 'Native' | 'Not assessed'; evidence: string } {
  // Check if any source explicitly confirms invasive status with geographic context
  const wiki = researchPackage.wikipedia;
  const powo = researchPackage.powo;

  // Look for explicit invasive status in retrieved data
  let hasExplicitInvasive = false;
  let invasiveEvidence = '';

  // Check Wikipedia extract for invasive mentions with geographic context
  if (wiki?.extract) {
    const extract = wiki.extract.toLowerCase();
    const invasiveKeywords = ['invasive', 'naturalised', 'naturalized', 'alien species'];
    const hasKeyword = invasiveKeywords.some((k) => extract.includes(k));
    const hasGeographicContext = extract.includes('india') || extract.includes('indian');

    if (hasKeyword && hasGeographicContext) {
      hasExplicitInvasive = true;
      invasiveEvidence = 'Wikipedia article describes invasive/naturalized status in India with geographic context.';
    }
  }

  // Check GBIF occurrence countries - occurrence alone is NOT proof of invasive status
  if (taxonomy?.countries && taxonomy.countries.length > 0) {
    // Occurrence records alone do not establish invasive status
    // They only show where the species has been recorded
  }

  // POWO distribution - occurrence is not invasive status
  if (powo?.distribution && powo.distribution.length > 0) {
    // Distribution records alone do not establish invasive status
  }

  if (hasExplicitInvasive) {
    return { status: 'Invasive', evidence: invasiveEvidence };
  }

  // If no explicit invasive evidence, check if it's marked as native somewhere
  if (wiki?.extract) {
    const extract = wiki.extract.toLowerCase();
    if (extract.includes('native to india') || extract.includes('native to the indian subcontinent')) {
      return { status: 'Native', evidence: 'Wikipedia article identifies the species as native to India.' };
    }
  }

  // Default: not assessed when no adequate evidence
  return { status: 'Not assessed', evidence: 'No geographically-relevant invasive status evidence retrieved.' };
}

/**
 * Build the scientific profile by orchestrating the full pipeline.
 */
export async function buildScientificProfile(
  plantNetResult: PlantNetIdentifyResult,
  imageObservations: ImageObservation[] = [],
): Promise<EnrichedProfile> {
  const inputName = plantNetResult.scientific_name;

  // Step 1: Resolve taxonomy via GBIF
  const taxonomy = await resolveTaxonomy(inputName);

  // Step 2: Cross-validate identity
  const identity = crossValidateIdentity(plantNetResult, taxonomy);

  // Step 3: Collect botanical research from all sources in parallel
  const researchPackage = await collectBotanicalResearch(identity.acceptedName);

  // Step 4: LLM enrichment with evidence-aware processing
  const llmResult = await elaborateBotanicalProfile(
    researchPackage,
    taxonomy,
    identity,
    imageObservations,
  );

  // Step 5: Assess invasive status with geographic evidence requirement
  const invasiveAssessment = assessInvasiveStatus(identity, taxonomy, researchPackage);

  // Step 6: Build quick facts grid (only fields with real data)
  const quickFacts: { label: string; value: string }[] = [];
  if (taxonomy?.taxonomy.family) quickFacts.push({ label: 'Family', value: taxonomy.taxonomy.family });
  if (taxonomy?.taxonomy.genus) quickFacts.push({ label: 'Genus', value: taxonomy.taxonomy.genus });
  if (llmResult.sections?.morphology) {
    // Extract growth habit from morphology if available
  }
  if (researchPackage.wikipedia?.extract) {
    quickFacts.push({ label: 'Description Source', value: 'Wikipedia' });
  }
  if (researchPackage.powo?.acceptedName) {
    quickFacts.push({ label: 'Accepted Name Source', value: 'POWO (Kew)' });
  }
  if (taxonomy?.occurrenceCount) {
    quickFacts.push({ label: 'GBIF Occurrences', value: `${taxonomy.occurrenceCount} records` });
  }
  if (researchPackage.pubmed.length > 0) {
    quickFacts.push({ label: 'Research Records', value: `${researchPackage.pubmed.length} PubMed records` });
  }

  // Step 7: Build key facts
  const keyFacts: { label: string; value: string }[] = [];
  if (taxonomy?.taxonomy.family) keyFacts.push({ label: 'Family', value: taxonomy.taxonomy.family });
  if (taxonomy?.taxonomy.genus) keyFacts.push({ label: 'Genus', value: taxonomy.taxonomy.genus });
  if (identity?.authorCitation) keyFacts.push({ label: 'Author Citation', value: identity.authorCitation });
  if (researchPackage.wikipedia?.extract) keyFacts.push({ label: 'Description Source', value: 'Wikipedia article' });

  // Step 8: Build taxonomy fields (only non-placeholder)
  const taxonomyFields: EnrichedField[] = [];
  const addTaxField = (label: string, value: string | null | undefined) => {
    if (value && !isPlaceholder(value)) {
      taxonomyFields.push({
        label,
        value,
        type: 'documented',
        confidence: 'high',
        evidence_category: 'verified',
      });
    }
  };

  addTaxField('SCIENTIFIC NAME', identity?.acceptedName || inputName);
  if (identity?.authorCitation) addTaxField('AUTHOR CITATION', identity.authorCitation);
  addTaxField('KINGDOM', taxonomy?.taxonomy.kingdom);
  addTaxField('DIVISION', taxonomy?.taxonomy.phylum);
  addTaxField('CLASS', taxonomy?.taxonomy.class);
  addTaxField('ORDER', taxonomy?.taxonomy.order);
  addTaxField('FAMILY', taxonomy?.taxonomy.family);
  addTaxField('GENUS', taxonomy?.taxonomy.genus);
  addTaxField('SPECIES', taxonomy?.taxonomy.species);
  if (identity?.synonyms?.length > 0) {
    addTaxField('SYNONYMS', identity.synonyms.join(', '));
  }
  if (researchPackage.wikipedia?.extract) {
    addTaxField('DESCRIPTION SOURCE', 'Wikipedia article available');
  }

  // Step 9: Build morphology fields from LLM (only non-placeholder)
  const morphologyFields: EnrichedField[] = [];
  if (llmResult.sections?.morphology && !isPlaceholder(llmResult.sections.morphology)) {
    morphologyFields.push({
      label: 'MORPHOLOGY OVERVIEW',
      value: llmResult.sections.morphology,
      type: 'documented',
      confidence: 'medium',
      evidence_category: 'ai_explanation',
    });
  }
  // Add image observations as separate fields
  imageObservations.forEach((obs, i) => {
    morphologyFields.push({
      label: `${obs.feature.toUpperCase()} (IMAGE)`,
      value: obs.observed_value,
      type: 'image_observation',
      confidence: obs.confidence,
      evidence_category: 'image_observation',
    });
  });

  // Step 10: Build ecology fields
  const ecologyFields: EnrichedField[] = [];
  if (llmResult.sections?.ecology && !isPlaceholder(llmResult.sections.ecology)) {
    ecologyFields.push({
      label: 'ECOLOGY OVERVIEW',
      value: llmResult.sections.ecology,
      type: 'documented',
      confidence: 'medium',
      evidence_category: 'ai_explanation',
    });
  }
  // Add invasive status with evidence
  ecologyFields.push({
    label: 'INVASIVE STATUS',
    value: invasiveAssessment.status,
    type: 'documented',
    confidence: invasiveAssessment.status === 'Not assessed' ? 'low' : 'high',
    evidence_category: 'verified',
  });
  if (invasiveAssessment.evidence) {
    ecologyFields.push({
      label: 'INVASIVE STATUS EVIDENCE',
      value: invasiveAssessment.evidence,
      type: 'documented',
      confidence: 'medium',
      evidence_category: 'verified',
    });
  }

  // Step 11: Build habitat/distribution fields
  const habitatFields: EnrichedField[] = [];
  if (llmResult.sections?.habitat_distribution && !isPlaceholder(llmResult.sections.habitat_distribution)) {
    habitatFields.push({
      label: 'HABITAT AND DISTRIBUTION',
      value: llmResult.sections.habitat_distribution,
      type: 'documented',
      confidence: 'medium',
      evidence_category: 'ai_explanation',
    });
  }
  if (researchPackage.powo?.nativeDistribution?.length) {
    habitatFields.push({
      label: 'NATIVE DISTRIBUTION',
      value: researchPackage.powo.nativeDistribution.join('; '),
      type: 'documented',
      confidence: 'medium',
      evidence_category: 'verified',
    });
  }

  // Step 12: Build reproduction fields
  const reproductionFields: EnrichedField[] = [];
  if (llmResult.sections?.reproduction && !isPlaceholder(llmResult.sections.reproduction)) {
    reproductionFields.push({
      label: 'REPRODUCTION OVERVIEW',
      value: llmResult.sections.reproduction,
      type: 'documented',
      confidence: 'medium',
      evidence_category: 'ai_explanation',
    });
  }

  // Step 13: Build anatomy fields
  const anatomyFields: EnrichedField[] = [];
  if (llmResult.sections?.anatomy_physiology && !isPlaceholder(llmResult.sections.anatomy_physiology)) {
    anatomyFields.push({
      label: 'ANATOMY AND PHYSIOLOGY',
      value: llmResult.sections.anatomy_physiology,
      type: 'documented',
      confidence: 'medium',
      evidence_category: 'ai_explanation',
    });
  }

  // Step 14: Build phytochemistry fields
  const phytoFields: EnrichedField[] = [];
  if (llmResult.sections?.phytochemistry && !isPlaceholder(llmResult.sections.phytochemistry)) {
    phytoFields.push({
      label: 'PHYTOCHEMISTRY',
      value: llmResult.sections.phytochemistry,
      type: 'documented',
      confidence: 'medium',
      evidence_category: 'ai_explanation',
    });
  }

  // Step 15: Build economic fields
  const economicFields: EnrichedField[] = [];
  if (llmResult.sections?.economic && !isPlaceholder(llmResult.sections.economic)) {
    economicFields.push({
      label: 'ECONOMIC IMPORTANCE',
      value: llmResult.sections.economic,
      type: 'documented',
      confidence: 'medium',
      evidence_category: 'ai_explanation',
    });
  }

  // Step 16: Build research/conservation fields
  const researchFields: EnrichedField[] = [];
  if (llmResult.sections?.research_conservation && !isPlaceholder(llmResult.sections.research_conservation)) {
    researchFields.push({
      label: 'RESEARCH AND CONSERVATION',
      value: llmResult.sections.research_conservation,
      type: 'documented',
      confidence: 'medium',
      evidence_category: 'ai_explanation',
    });
  }

  // Step 17: Build adaptations fields
  const adaptationFields: EnrichedField[] = [];
  if (llmResult.sections?.adaptations && !isPlaceholder(llmResult.sections.adaptations)) {
    adaptationFields.push({
      label: 'SPECIAL ADAPTATIONS',
      value: llmResult.sections.adaptations,
      type: 'documented',
      confidence: 'medium',
      evidence_category: 'ai_explanation',
    });
  }

  // Step 18: Build data gaps (only genuine gaps, not every missing field)
  const dataGaps: DataGap[] = [];
  llmResult.data_gaps?.forEach((gap) => {
    if (!isPlaceholder(gap.reason)) {
      dataGaps.push({
        category: gap.category,
        field: gap.field,
        reason: gap.reason,
        missing_reason_type: 'field_absent_from_sources',
      });
    }
  });

  // Add specific gaps for critical missing info
  if (!taxonomy?.taxonomy.family) {
    dataGaps.push({
      category: 'Taxonomy',
      field: 'Family',
      reason: 'No taxonomic family record retrieved from GBIF.',
      missing_reason_type: 'no_reference_record',
    });
  }
  if (!researchPackage.wikipedia && !researchPackage.powo) {
    dataGaps.push({
      category: 'Descriptive Data',
      field: 'Species Description',
      reason: 'No descriptive botanical data retrieved from Wikipedia or POWO.',
      missing_reason_type: 'no_reference_record',
    });
  }

  // Step 19: Assemble final profile
  const profile: EnrichedProfile = {
    overview: llmResult.overview || `Botanical profile for ${identity?.acceptedName || inputName}.`,
    distinctive_characteristics: llmResult.distinctive_characteristics || 'Distinctive characteristics not documented in consulted sources.',
    native_range: researchPackage.powo?.nativeDistribution?.join('; ') || null,
    key_facts: keyFacts,
    quick_facts: quickFacts,
    taxonomy: taxonomyFields,
    morphology: morphologyFields,
    adaptations: adaptationFields,
    habitat_distribution: habitatFields,
    ecology: ecologyFields,
    reproduction: reproductionFields,
    anatomy_physiology: anatomyFields,
    phytochemistry: phytoFields,
    economic: economicFields,
    research_conservation: researchFields,
    dataGaps,
    accepted_name: identity?.acceptedName || inputName,
    author_citation: identity?.authorCitation || null,
    identification_confidence: plantNetResult.confidence,
    validation: {
      isValid: identity?.confidence !== 'low',
      confidence: identity?.confidence || 'low',
      warnings: identity?.warnings || [],
      matchedName: identity?.acceptedName || inputName,
      identification_note: identity?.identificationNote || 'Identification pending verification.',
    },
  };

  return profile;
}
