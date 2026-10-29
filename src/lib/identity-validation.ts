// Species identity cross-validation service.
//
// Cross-validates Pl@ntNet identification results against GBIF taxonomy,
// detecting conflicts, synonyms, and ambiguous matches. Preserves uncertainty
// rather than forcing a false consensus.

export interface IdentityCrossValidationResult {
  inputName: string;
  acceptedName: string;
  authorCitation?: string;
  gbifKey?: number;
  matchType: string;
  isAccepted: boolean;
  synonyms: string[];
  taxonomy: {
    kingdom?: string;
    phylum?: string;
    class?: string;
    order?: string;
    family?: string;
    genus?: string;
    species?: string;
  };
  status: string;
  confidence: 'high' | 'medium' | 'low';
  warnings: string[];
  conflicts: {
    field: string;
    plantnetValue: string;
    gbifValue: string;
    resolution: string;
  }[];
  identificationNote: string;
}

export interface IdentityConflict {
  field: string;
  plantnetValue: string;
  gbifValue: string;
  resolution: string;
}

/**
 * Cross-validate PlantNet identification against GBIF taxonomy.
 * Detects genus mismatches, synonyms, and conflicts.
 */
export function crossValidateIdentity(
  plantnetResult: {
    scientific_name: string;
    common_name?: string;
    confidence: number;
    confidence_level: string;
    candidates: any[];
  },
  gbifResult: {
    acceptedName: string;
    authorCitation?: string;
    gbifKey?: number;
    matchType: string;
    isAccepted: boolean;
    synonyms: string[];
    taxonomy: any;
    status: string;
    confidence: 'high' | 'medium' | 'low';
    warnings: string[];
  } | null,
): IdentityCrossValidationResult {
  const inputName = plantnetResult.scientific_name;
  const warnings: string[] = [];
  const conflicts: IdentityConflict[] = [];

  // Default: use PlantNet name if GBIF is unavailable
  let acceptedName = inputName;
  let authorCitation: string | undefined;
  let gbifKey: number | undefined;
  let matchType = 'NONE';
  let isAccepted = true;
  let synonyms: string[] = [];
  let taxonomy: any = {};
  let status = 'unknown';
  let confidence: 'high' | 'medium' | 'low' = 'low';

  if (gbifResult) {
    acceptedName = gbifResult.acceptedName || inputName;
    authorCitation = gbifResult.authorCitation;
    gbifKey = gbifResult.gbifKey;
    matchType = gbifResult.matchType;
    isAccepted = gbifResult.isAccepted;
    synonyms = gbifResult.synonyms;
    taxonomy = gbifResult.taxonomy;
    status = gbifResult.status;
    confidence = gbifResult.confidence;
    warnings.push(...gbifResult.warnings);

    // Check genus mismatch
    const plantnetGenus = inputName.split(/\s+/)[0]?.toLowerCase();
    const gbifGenus = taxonomy.genus?.toLowerCase() || acceptedName.split(/\s+/)[0]?.toLowerCase();

    if (plantnetGenus && gbifGenus && plantnetGenus !== gbifGenus) {
      conflicts.push({
        field: 'scientific_name',
        plantnetValue: inputName,
        gbifValue: acceptedName,
        resolution: 'Genus mismatch between PlantNet identification and GBIF accepted name. GBIF accepted name takes precedence.',
      });
      warnings.push(
        `Genus mismatch: PlantNet identified "${inputName}" but GBIF accepted name is "${acceptedName}".`,
      );
    }

    // Check if names are completely different
    if (inputName.toLowerCase() !== acceptedName.toLowerCase()) {
      const sameGenus = plantnetGenus === gbifGenus;
      if (!sameGenus) {
        confidence = 'low';
        warnings.push(
          'Taxonomic identity is uncertain. PlantNet and GBIF disagree on the genus.',
        );
      }
    }
  }

  // Factor in PlantNet confidence
  if (plantnetResult.confidence < 50) {
    if (confidence === 'high') confidence = 'medium';
    else if (confidence === 'medium') confidence = 'low';
    warnings.push(
      `PlantNet identification confidence is low (${plantnetResult.confidence}%). Expert verification recommended.`,
    );
  } else if (plantnetResult.confidence < 70) {
    if (confidence === 'high') confidence = 'medium';
    warnings.push(
      `PlantNet identification confidence is moderate (${plantnetResult.confidence}%). Verify before relying on this profile.`,
    );
  }

  // Build identification note
  let identificationNote: string;
  if (confidence === 'high') {
    identificationNote =
      'Identification verified against GBIF Backbone Taxonomy. Species identity is confirmed.';
  } else if (confidence === 'medium') {
    identificationNote =
      'Identification moderately confident. Cross-checked against available taxonomic sources. Some uncertainty remains.';
  } else {
    identificationNote =
      'Identification confidence is low. Treat taxonomic details as provisional pending expert verification.';
  }

  if (conflicts.length > 0) {
    identificationNote += ' ' + conflicts.map((c) => c.resolution).join(' ');
  }

  return {
    inputName,
    acceptedName,
    authorCitation,
    gbifKey,
    matchType,
    isAccepted,
    synonyms,
    taxonomy,
    status,
    confidence,
    warnings,
    conflicts,
    identificationNote,
  };
}
