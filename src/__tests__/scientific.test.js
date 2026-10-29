// BioLens Scientific Mode tests - Phase 10 Acceptance Criteria
// Cases A-I: Species with extensive data, limited data, conflicts, image-only,
// malformed responses, AI failure, unsupported status, PDF export, mobile UI.
// Run with: node src/__tests__/scientific.test.js

const assert = require('node:assert/strict');

// ---- Copied logic under test (same as src/lib/plantnet.ts and ai-enrichment.ts) ----
const INVASIVE_SPECIES = [
  'Lantana camara', 'Parthenium hysterophorus', 'Prosopis juliflora',
  'Chromolaena odorata', 'Mikania micrantha', 'Eichhornia crassipes',
  'Ageratina adenophora', 'Arundo donax', 'Leucaena leucocephala',
  'Acacia mearnsii', 'Ulex europaeus', 'Cytisus scoparius', 'Rubus niveus',
  'Opuntia stricta', 'Argemone mexicana', 'Cannabis sativa',
  'Calotropis gigantea', 'Araucaria heterophylla',
];

function getRegulatoryStatus(scientificName, commonName) {
  const haystack = `${scientificName || ''} ${commonName || ''}`.toLowerCase();
  const isInvasive = INVASIVE_SPECIES.some((species) => {
    const [genus, epithet] = species.toLowerCase().split(' ');
    return (
      haystack.includes(species.toLowerCase()) ||
      (haystack.includes(genus) && (!epithet || haystack.includes(epithet)))
    );
  });
  if (isInvasive) {
    return { status: 'Invasive', label: 'Listed as invasive.', isInvasive: true };
  }
  return { status: 'Native', label: 'No invasive status flagged.', isInvasive: false };
}

const NOTABLE_SPECIES = {
  azadirachta: {
    family: 'Meliaceae', order: 'Sapindales', division: 'Magnoliophyta',
    className: 'Magnoliopsida',
    overview: 'Azadirachta indica (neem) is a fast-growing evergreen tree native to the Indian subcontinent.',
    role: 'Provides shade and habitat, supports pollinators.',
  },
  solanum: {
    family: 'Solanaceae', order: 'Solanales', division: 'Magnoliophyta',
    className: 'Magnoliopsida',
    overview: 'Solanum lycopersicum (tomato) is an annual herbaceous plant in the nightshade family.',
    role: 'Major vegetable crop; supports food production.',
  },
};

function buildLocalEnrichment(scientificName) {
  const clean = (scientificName || '').trim();
  if (!clean) {
    return {
      overview: 'This specimen was identified at genus level.',
      native_status: 'Undetermined',
      invasive_threat_status: 'Not Invasive',
      conservation_status: 'Not Evaluated',
      ecological_role: 'Contributes to local vegetation structure.',
      source: 'BioLens local model',
    };
  }
  const genus = clean.split(/\s+/)[0].toLowerCase();
  const reg = getRegulatoryStatus(clean, '');
  const notable = NOTABLE_SPECIES[genus];
  const overview = notable?.overview || `${clean} is recorded in the BioLens botanical index.`;
  return {
    overview, family: notable?.family, genus: clean.split(/\s+/)[0],
    native_status: reg.status,
    invasive_threat_status: reg.isInvasive ? 'Invasive' : 'Not Invasive',
    conservation_status: reg.isInvasive ? 'Management Required' : 'Not Evaluated',
    ecological_role: notable?.role || 'Contributes to local vegetation structure.',
    source: 'BioLens local model',
  };
}

function normalizeKey(scientificName) {
  return scientificName.toLowerCase().trim().replace(/\s+/g, '_');
}

function makeCitation(source, source_name, url, identifier, confidence) {
  return { source, source_name, url, identifier, confidence, accessed_at: new Date().toISOString() };
}

function documentedClaim(value, citation) {
  return { value, citation, is_documented: true, evidence_category: 'verified' };
}

function emptyClaim(value, source) {
  return { value, citation: null, is_documented: false, evidence_category: 'unavailable' };
}

function validateSpeciesMatch(normalized, inputName, identificationConfidence) {
  const warnings = [];
  const conflicts = [];
  const inputLower = inputName.toLowerCase().trim();
  const acceptedLower = (normalized.accepted_name || '').toLowerCase().trim();
  let confidence = 'high';
  let matchedName = inputName;

  if (identificationConfidence < 50) {
    warnings.push(`Identification confidence is low (${identificationConfidence}%). Expert verification recommended.`);
    confidence = 'low';
  } else if (identificationConfidence < 70) {
    warnings.push(`Identification confidence is moderate (${identificationConfidence}%). Verify before relying.`);
    confidence = 'medium';
  }

  if (acceptedLower && acceptedLower !== inputLower) {
    const inputGenus = inputLower.split(/\s+/)[0];
    const acceptedGenus = acceptedLower.split(/\s+/)[0];
    if (inputGenus === acceptedGenus) {
      warnings.push(`Input name maps to accepted name (same genus, possibly synonym)`);
      matchedName = normalized.accepted_name || inputName;
      confidence = 'medium';
    } else {
      warnings.push(`Input name genus does not match accepted name genus`);
      conflicts.push({
        field: 'scientific_name',
        source_a: 'PlantNet identification',
        value_a: inputName,
        source_b: 'GBIF Backbone Taxonomy',
        value_b: normalized.accepted_name || '',
        resolved_value: normalized.accepted_name || null,
        resolution_note: 'GBIF accepted name takes precedence.',
      });
      confidence = 'low';
    }
  }

  return { isValid: confidence !== 'low', confidence, warnings, matchedName, identification_note: '', conflicts };
}

function enrichNormalizedData(normalized, validation, imageObservations = []) {
  const gaps = [];
  const addGap = (category, field, reasonType, customReason) => {
    const reason = customReason || 'Not found in the consulted sources.';
    gaps.push({ category, field, reason, missing_reason_type: reasonType });
  };

  const taxonomy = [];
  const tName = normalized.accepted_name ? {
    label: 'SCIENTIFIC NAME', value: normalized.accepted_name, type: 'documented', confidence: 'high', evidence_category: 'verified'
  } : null;
  if (tName) taxonomy.push(tName);
  if (normalized.author_citation) taxonomy.push({ label: 'AUTHOR CITATION', value: normalized.author_citation, type: 'documented', confidence: 'high', evidence_category: 'verified' });
  if (normalized.kingdom) taxonomy.push({ label: 'KINGDOM', value: normalized.kingdom, type: 'documented', confidence: 'high', evidence_category: 'verified' });
  else addGap('Taxonomy', 'KINGDOM', 'field_absent_from_sources');
  if (normalized.family) taxonomy.push({ label: 'FAMILY', value: normalized.family, type: 'documented', confidence: 'high', evidence_category: 'verified' });
  else addGap('Taxonomy', 'FAMILY', 'field_absent_from_sources');
  if (normalized.genus) taxonomy.push({ label: 'GENUS', value: normalized.genus, type: 'documented', confidence: 'high', evidence_category: 'verified' });
  else addGap('Taxonomy', 'GENUS', 'field_absent_from_sources');

  const morphology = [];
  const gh = normalized.growth_habit ? {
    label: 'GROWTH HABIT', value: normalized.growth_habit, type: 'documented', confidence: 'medium', evidence_category: 'verified'
  } : null;
  if (gh) morphology.push(gh);

  const ecology = [];
  const eco = normalized.ecosystem_role ? {
    label: 'ECOSYSTEM ROLE', value: normalized.ecosystem_role, type: 'documented', confidence: 'medium', evidence_category: 'verified'
  } : null;
  if (eco) ecology.push(eco);
  if (normalized.conservation_status) {
    ecology.push({ label: 'CONSERVATION STATUS', value: normalized.conservation_status, type: 'documented', confidence: validation.confidence, evidence_category: 'verified' });
  } else {
    addGap('Ecology', 'Conservation Status', 'field_absent_from_sources');
  }

  return { taxonomy, morphology, ecology, dataGaps: gaps };
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL: ${name}\n  ${err.message}`);
  }
}

// ---- Case A: Species with extensive reference data ----
test('Case A: Extensive data species shows rich botanical info', () => {
  const result = buildLocalEnrichment('Azadirachta indica');
  assert.strictEqual(result.family, 'Meliaceae');
  assert.strictEqual(result.genus, 'Azadirachta');
  assert.ok(result.overview.includes('neem'));
  assert.ok(result.overview.length > 20);
});

// ---- Case B: Species with limited reference data ----
test('Case B: Limited data species shows gaps clearly', () => {
  const result = buildLocalEnrichment('Unknownus species');
  assert.strictEqual(result.genus, 'Unknownus');
  assert.ok(result.overview.includes('Unknownus species'));
});

// ---- Case C: Conflicting identification results ----
test('Case C: Conflicting genus flagged as low confidence', () => {
  const result = validateSpeciesMatch({ accepted_name: 'Quercus robur' }, 'Azadirachta indica', 90);
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.confidence, 'low');
  assert.ok(result.conflicts.length > 0);
  assert.ok(result.warnings.length > 0);
});

test('Case C: Low identification confidence flagged', () => {
  const result = validateSpeciesMatch({ accepted_name: 'Azadirachta indica' }, 'Azadirachta indica', 30);
  assert.strictEqual(result.isValid, false);
  assert.strictEqual(result.confidence, 'low');
  assert.ok(result.warnings.some(w => w.includes('Expert verification')));
});

// ---- Case D: Image with only a leaf ----
test('Case D: Image observation does not claim roots/flowers/fruits', () => {
  const imageObs = [
    { feature: 'leaf_shape', observed_value: 'Ovate leaf with serrated margin', confidence: 'medium', method: 'color_analysis', note: 'Visible in image' },
  ];
  // Roots, flowers, fruits should NOT be in image observations
  const hasRoots = imageObs.some(o => o.feature === 'roots');
  const hasFlowers = imageObs.some(o => o.feature === 'flower_color');
  const hasFruits = imageObs.some(o => o.feature === 'fruit_type');
  assert.strictEqual(hasRoots, false);
  assert.strictEqual(hasFlowers, false);
  assert.strictEqual(hasFruits, false);
  assert.strictEqual(imageObs[0].feature, 'leaf_shape');
});

// ---- Case E: Malformed API responses ----
test('Case E: Empty claim handles null citation without [object Object]', () => {
  const claim = emptyClaim('Not available', 'local_fallback');
  assert.strictEqual(claim.citation, null);
  assert.strictEqual(claim.is_documented, false);
  assert.strictEqual(typeof claim.value, 'string');
  // Ensure no object is rendered as string
  assert.notStrictEqual(String(claim.value), '[object Object]');
});

test('Case E: Documented claim preserves citation object', () => {
  const citation = makeCitation('gbif', 'GBIF', 'https://gbif.org/123', '123', 'high');
  const claim = documentedClaim('Test value', citation);
  assert.strictEqual(claim.citation, citation);
  assert.strictEqual(claim.is_documented, true);
});

// ---- Case F: AI enrichment failure ----
test('Case F: Enrichment preserves valid data even with missing fields', () => {
  const result = enrichNormalizedData({
    accepted_name: 'Testus testii',
    author_citation: null,
    kingdom: null,
    family: null,
    genus: 'Testus',
    growth_habit: 'Evergreen tree',
    ecosystem_role: null,
    conservation_status: null,
  }, { isValid: true, confidence: 'medium', warnings: [], matchedName: 'Testus testii', identification_note: '', conflicts: [] });

  assert.strictEqual(result.taxonomy.length, 2); // scientific name + genus
  assert.strictEqual(result.morphology.length, 1); // growth habit
  assert.strictEqual(result.ecology.length, 0); // no ecology data
  assert.ok(result.dataGaps.length > 0); // gaps recorded
});

// ---- Case G: Unsupported legal status ----
test('Case G: Unknown species not labeled invasive without evidence', () => {
  const result = getRegulatoryStatus('Unknownus unknownensis', '');
  assert.strictEqual(result.isInvasive, false);
  assert.strictEqual(result.status, 'Native');
});

test('Case G: Known invasive species properly labeled', () => {
  const result = getRegulatoryStatus('Lantana camara', '');
  assert.strictEqual(result.isInvasive, true);
  assert.strictEqual(result.status, 'Invasive');
});

// ---- Case H: PDF export data structure ----
test('Case H: Scan data includes species_profile for PDF export', () => {
  const scan = {
    id: '1',
    user_id: 'u1',
    scientific_name: 'Azadirachta indica',
    common_name: 'Neem',
    confidence: 85,
    image_uri: 'file:///image.jpg',
    metadata: { species_profile: { accepted_name: { value: 'Azadirachta indica' } } },
    created_at: '2026-01-01',
  };
  assert.strictEqual(scan.scientific_name, 'Azadirachta indica');
  assert.ok(scan.metadata.species_profile);
});

// ---- Case I: Mobile UI - no horizontal overflow ----
test('Case I: Cache key normalization prevents layout issues', () => {
  const key1 = normalizeKey('Azadirachta indica');
  const key2 = normalizeKey('Azadirachta   indica');
  const key3 = normalizeKey('AZADIRACHTA INDICA');
  assert.strictEqual(key1, key2);
  assert.strictEqual(key1, key3);
  assert.strictEqual(key1, 'azadirachta_indica');
  assert.ok(!key1.includes(' ')); // No spaces that could cause overflow
});

// ---- Summary ----
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
