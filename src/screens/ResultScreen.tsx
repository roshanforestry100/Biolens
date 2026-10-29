import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert,
  ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft, TriangleAlert, ShieldCheck, Download, ChevronDown, ChevronUp,
  Leaf, Lightbulb, AlertOctagon, HelpCircle, Info,
} from 'lucide-react-native';

import { Colors, Fonts, Spacing } from '../constants/theme';
import { ScanResult, EnrichedProfile, EnrichedField } from '../types';
import { isInvasiveScan } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { generateResearchReport } from '../lib/report';

export type ResultOutputMode = 'normal' | 'scientific';

// ---------------------------------------------------------------------------
// UI Components
// ---------------------------------------------------------------------------

/** A single fact row: label + value. */
function FactRow({
  label,
  value,
  type,
}: {
  label: string;
  value: string;
  type: EnrichedField['type'];
}) {
  const isImage = type === 'image_observation';
  return (
    <View style={styles.factRow}>
      <View style={styles.factBody}>
        <Text style={[styles.factLabel, isImage && styles.factLabelImage]}>
          {label}
        </Text>
        <Text style={styles.factValue}>{value}</Text>
      </View>
      {isImage && (
        <View style={styles.imageTag}>
          <Text style={styles.imageTagText}>IMAGE OBSERVATION</Text>
        </View>
      )}
    </View>
  );
}

/** Quick facts grid item (2-column). */
function QuickFactItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.quickFactCard}>
      <Text style={styles.quickFactLabel}>{label}</Text>
      <Text style={styles.quickFactValue}>{value}</Text>
    </View>
  );
}

/** Collapsible section header with chevron. */
function SectionHeader({
  title,
  isOpen,
  onToggle,
}: {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity style={styles.sectionHeader} onPress={onToggle} activeOpacity={0.8}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionHeaderTitle}>{title}</Text>
        </View>
        <View style={styles.sectionHeaderIcon}>
          {isOpen ? <ChevronUp size={18} color={Colors.muted2} /> : <ChevronDown size={18} color={Colors.muted2} />}
        </View>
      </View>
    </TouchableOpacity>
  );
}

/** Data gap item with category and reason. */
function DataGapItem({
  category,
  field,
  reason,
}: {
  category: string;
  field: string;
  reason: string;
}) {
  return (
    <View style={styles.dataGapItem}>
      <View style={styles.dataGapHeader}>
        <Text style={styles.dataGapCategory}>{category}</Text>
        <Text style={styles.dataGapField}>{field}</Text>
      </View>
      <Text style={styles.dataGapReason}>{reason}</Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export default function ResultScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { scan } = route.params as { scan: ScanResult };
  const [exporting, setExporting] = useState(false);
  const [output, setOutput] = useState<ResultOutputMode>('normal');
  const [enriched, setEnriched] = useState<EnrichedProfile | null>(null);
  const [loadingEnriched, setLoadingEnriched] = useState(false);
  const [dataGapsExpanded, setDataGapsExpanded] = useState(false);
  // Per-section expanded state for accordions
  const [sectionExpanded, setSectionExpanded] = useState<Record<string, boolean>>({});

  const preComputedProfile = (scan as any)?.enriched_profile;

  useEffect(() => {
    let cancelled = false;
    const loadEnriched = async () => {
      const scientificName = scan.scientific_name || scan.common_name || '';
      if (!scientificName) return;

      // Use pre-computed enriched profile from scan data if available
      if (preComputedProfile) {
        setEnriched(preComputedProfile as EnrichedProfile);
        setLoadingEnriched(false);
        return;
      }

      setLoadingEnriched(true);
      try {
        // From history: enriched_profile was pre-computed by IdentifyScreen
        // and stored in scan metadata. If not available, we can't rebuild
        // without re-running the full pipeline.
        setEnriched(null);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingEnriched(false);
      }
    };
    loadEnriched();
    return () => { cancelled = true; };
  }, [scan, preComputedProfile]);

  const toggleSection = (key: string) => {
    setSectionExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isSectionOpen = (key: string) => sectionExpanded[key] ?? true;

  const e = enriched;
  const invasive = isInvasiveScan(scan);

  const statusColor = invasive ? Colors.red2 : Colors.moss;
  const statusBg = invasive ? '#FBEDEA' : '#EAF2EC';
  const statusBorder = invasive ? '#EFD2CC' : '#CFE0D4';

  const organ = String(scan.metadata?.organ || 'leaf').toLowerCase();

  const factText =
    FACTS[(scan.scientific_name || '').toLowerCase()] ||
    (e?.overview || '');

  const generalText =
    scan.description || e?.overview || 'Morphological markers analyzed across leaf arrangement, floral structure, and venation patterns.';

  const exportPdf = async () => {
    if (!user) return;
    setExporting(true);
    try {
      await generateResearchReport({
        scan,
        userName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Field Agent',
        userRank: 'Field Analyst',
        userStars: 0,
        totalScans: 0,
        userMeta: {
          age: user.user_metadata?.age,
          gender: user.user_metadata?.gender,
          qualification: user.user_metadata?.qualification,
          expertise: user.user_metadata?.expertise,
        },
      });
    } catch (err: any) {
      Alert.alert('Report Failed', err?.message || 'Could not generate the field report.');
    } finally {
      setExporting(false);
    }
  };

  const statusLabel = invasive
    ? 'Listed as invasive in Indian forest ecosystems. Active management and reporting recommended.'
    : 'No invasive status flagged. Continue standard field observation protocols.';

  const hasDataGaps = e && e.dataGaps.length > 0;

  // ---------------------------------------------------------------------------
  // Normal Mode Output
  // ---------------------------------------------------------------------------
  const normalOutput = (
    <>
      {scan.image_uri ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>IDENTIFIED SPECIMEN</Text>
          <Image
            source={{ uri: scan.image_uri }}
            style={styles.specimenImage}
            resizeMode="cover"
          />
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>BASIC INTRODUCTION</Text>
        <View style={styles.featureCard}>
          <Text style={styles.featureText}>{generalText}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>KEY CHARACTERISTICS</Text>
        <View style={styles.featureCard}>
          <View style={styles.consRow}>
            <Leaf color={Colors.ink} size={16} />
            <Text style={styles.consText}>{ORGAN_TEXT[organ] || ORGAN_TEXT.default}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>HABITAT</Text>
        <View style={styles.featureCard}>
          <Text style={styles.featureText}>
            {e?.quick_facts.find((f) => f.label === 'Native Habitat')?.value || 'Habitat data not available.'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>USES</Text>
        <View style={styles.featureCard}>
          <Text style={styles.featureText}>
            {e?.economic.find((f) => f.label === 'ECONOMIC AND AGRICULTURAL IMPORTANCE')?.value || 'Uses data not available.'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>INTERESTING FACTS</Text>
        <TouchableOpacity style={styles.factCard} onPress={() => undefined} activeOpacity={0.9}>
          <Lightbulb color={Colors.gold2} size={16} />
          <View style={styles.factBody}>
            <Text style={styles.factEyebrow}>DID YOU KNOW?</Text>
            <Text style={styles.factText}>{factText || 'This species is part of the regional field observations curated for the BioLens network.'}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SAFETY INFORMATION</Text>
        <View style={styles.safetyBox}>
          <AlertOctagon color={Colors.red2} size={16} />
          <View style={styles.safetyBody}>
            <Text style={styles.safetyTitle}>SAFETY ALERT</Text>
            <Text style={styles.safetyText}>
              Do not assume that this plant or any of its extracts are safe to consume. Only qualified
              professionals should advise on medicinal use, and consumers should verify with a certified
              botanist or medical practitioner.
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SIMILAR PLANTS</Text>
        <View style={styles.featureCard}>
          <View style={styles.consRow}>
            <HelpCircle color={Colors.ink} size={16} />
            <Text style={styles.consText}>
              Similarity comparisons to related species are pending deeper taxonomic analysis for{' '}
              {scan.scientific_name || 'this specimen'}.
            </Text>
          </View>
        </View>
      </View>
    </>
  );

  // ---------------------------------------------------------------------------
  // Scientific Mode Output (12-section species-centric layout)
  // ---------------------------------------------------------------------------
  const scientificOutput = (
    <>
      {loadingEnriched ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.forest} />
          <Text style={styles.loadingText}>Loading verified species data…</Text>
        </View>
      ) : null}

      {!loadingEnriched && e ? (
        <>
          {/* Section 1: Species Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SPECIES OVERVIEW</Text>
            <View style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <View style={styles.overviewNameWrapper}>
                  <Text style={styles.overviewCommonName}>{scan.common_name}</Text>
                  <Text style={styles.overviewScientificName}>{scan.scientific_name}</Text>
                  {e.author_citation && (
                    <Text style={styles.overviewAuthor}>{e.author_citation}</Text>
                  )}
                </View>
                <View style={styles.overviewConfidence}>
                  <Text style={styles.overviewConfidenceLabel}>IDENTIFICATION CONFIDENCE</Text>
                  <Text style={styles.overviewConfidenceValue}>{scan.confidence}%</Text>
                </View>
              </View>
              <Text style={styles.overviewText}>{e.overview}</Text>
              <View style={styles.overviewDistinctive}>
                <Text style={styles.overviewDistinctiveLabel}>DISTINCTIVE CHARACTERISTICS</Text>
                <Text style={styles.overviewDistinctiveText}>{e.distinctive_characteristics}</Text>
              </View>
              {e.native_range && (
                <View style={styles.overviewRange}>
                  <Text style={styles.overviewRangeLabel}>NATIVE RANGE</Text>
                  <Text style={styles.overviewRangeText}>{e.native_range}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Section 2: Quick Scientific Facts Grid */}
          {e.quick_facts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>QUICK SCIENTIFIC FACTS</Text>
              <View style={styles.factsGrid}>
                {e.quick_facts.map((fact, i) => (
                  <QuickFactItem key={i} label={fact.label} value={fact.value} />
                ))}
              </View>
            </View>
          )}

          {/* Section 3: Taxonomic Classification */}
          <SectionHeader
            title="TAXONOMIC CLASSIFICATION"
            isOpen={isSectionOpen('TAXONOMIC CLASSIFICATION')}
            onToggle={() => toggleSection('TAXONOMIC CLASSIFICATION')}
          />
          {isSectionOpen('TAXONOMIC CLASSIFICATION') && (
            <View style={styles.sectionBody}>
              {e.taxonomy.map((f, i) => (
                <FactRow key={i} label={f.label} value={f.value} type={f.type} />
              ))}
            </View>
          )}

          {/* Section 4: Morphological Characteristics */}
          {e.morphology.length > 0 && (
            <>
              <SectionHeader
                title="MORPHOLOGICAL CHARACTERISTICS"
                isOpen={isSectionOpen('MORPHOLOGICAL CHARACTERISTICS')}
                onToggle={() => toggleSection('MORPHOLOGICAL CHARACTERISTICS')}
              />
              {isSectionOpen('MORPHOLOGICAL CHARACTERISTICS') && (
                <View style={styles.sectionBody}>
                  {e.morphology.map((f, i) => (
                    <FactRow key={i} label={f.label} value={f.value} type={f.type} />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Section 5: Special Adaptations */}
          {e.adaptations.length > 0 && (
            <>
              <SectionHeader
                title="SPECIAL ADAPTATIONS"
                isOpen={isSectionOpen('SPECIAL ADAPTATIONS')}
                onToggle={() => toggleSection('SPECIAL ADAPTATIONS')}
              />
              {isSectionOpen('SPECIAL ADAPTATIONS') && (
                <View style={styles.sectionBody}>
                  {e.adaptations.map((f, i) => (
                    <FactRow key={i} label={f.label} value={f.value} type={f.type} />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Section 6: Habitat and Geographic Distribution */}
          {e.habitat_distribution.length > 0 && (
            <>
              <SectionHeader
                title="HABITAT AND GEOGRAPHIC DISTRIBUTION"
                isOpen={isSectionOpen('HABITAT AND GEOGRAPHIC DISTRIBUTION')}
                onToggle={() => toggleSection('HABITAT AND GEOGRAPHIC DISTRIBUTION')}
              />
              {isSectionOpen('HABITAT AND GEOGRAPHIC DISTRIBUTION') && (
                <View style={styles.sectionBody}>
                  {e.habitat_distribution.map((f, i) => (
                    <FactRow key={i} label={f.label} value={f.value} type={f.type} />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Section 7: Ecology and Biological Interactions */}
          {e.ecology.length > 0 && (
            <>
              <SectionHeader
                title="ECOLOGY AND BIOLOGICAL INTERACTIONS"
                isOpen={isSectionOpen('ECOLOGY AND BIOLOGICAL INTERACTIONS')}
                onToggle={() => toggleSection('ECOLOGY AND BIOLOGICAL INTERACTIONS')}
              />
              {isSectionOpen('ECOLOGY AND BIOLOGICAL INTERACTIONS') && (
                <View style={styles.sectionBody}>
                  {e.ecology.map((f, i) => (
                    <FactRow key={i} label={f.label} value={f.value} type={f.type} />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Section 8: Reproduction and Life Cycle */}
          {e.reproduction.length > 0 && (
            <>
              <SectionHeader
                title="REPRODUCTION AND LIFE CYCLE"
                isOpen={isSectionOpen('REPRODUCTION AND LIFE CYCLE')}
                onToggle={() => toggleSection('REPRODUCTION AND LIFE CYCLE')}
              />
              {isSectionOpen('REPRODUCTION AND LIFE CYCLE') && (
                <View style={styles.sectionBody}>
                  {e.reproduction.map((f, i) => (
                    <FactRow key={i} label={f.label} value={f.value} type={f.type} />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Section 9: Anatomy and Physiology */}
          {e.anatomy_physiology.length > 0 && (
            <>
              <SectionHeader
                title="ANATOMY AND PHYSIOLOGY"
                isOpen={isSectionOpen('ANATOMY AND PHYSIOLOGY')}
                onToggle={() => toggleSection('ANATOMY AND PHYSIOLOGY')}
              />
              {isSectionOpen('ANATOMY AND PHYSIOLOGY') && (
                <View style={styles.sectionBody}>
                  {e.anatomy_physiology.map((f, i) => (
                    <FactRow key={i} label={f.label} value={f.value} type={f.type} />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Section 10: Phytochemistry and Medicinal Research */}
          {e.phytochemistry.length > 0 && (
            <>
              <SectionHeader
                title="PHYTOCHEMISTRY AND MEDICINAL RESEARCH"
                isOpen={isSectionOpen('PHYTOCHEMISTRY AND MEDICINAL RESEARCH')}
                onToggle={() => toggleSection('PHYTOCHEMISTRY AND MEDICINAL RESEARCH')}
              />
              {isSectionOpen('PHYTOCHEMISTRY AND MEDICINAL RESEARCH') && (
                <View style={styles.sectionBody}>
                  {e.phytochemistry.map((f, i) => (
                    <FactRow key={i} label={f.label} value={f.value} type={f.type} />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Section 11: Economic, Agricultural and Practical Importance */}
          {e.economic.length > 0 && (
            <>
              <SectionHeader
                title="ECONOMIC AND AGRICULTURAL IMPORTANCE"
                isOpen={isSectionOpen('ECONOMIC AND AGRICULTURAL IMPORTANCE')}
                onToggle={() => toggleSection('ECONOMIC AND AGRICULTURAL IMPORTANCE')}
              />
              {isSectionOpen('ECONOMIC AND AGRICULTURAL IMPORTANCE') && (
                <View style={styles.sectionBody}>
                  {e.economic.map((f, i) => (
                    <FactRow key={i} label={f.label} value={f.value} type={f.type} />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Section 12: Research and Conservation */}
          {e.research_conservation.length > 0 && (
            <>
              <SectionHeader
                title="RESEARCH AND CONSERVATION"
                isOpen={isSectionOpen('RESEARCH AND CONSERVATION')}
                onToggle={() => toggleSection('RESEARCH AND CONSERVATION')}
              />
              {isSectionOpen('RESEARCH AND CONSERVATION') && (
                <View style={styles.sectionBody}>
                  {e.research_conservation.map((f, i) => (
                    <FactRow key={i} label={f.label} value={f.value} type={f.type} />
                  ))}
                </View>
              )}
            </>
          )}

          {/* Data Gaps and Limitations (collapsible panel at bottom) */}
          {hasDataGaps && (
            <TouchableOpacity
              style={styles.dataGapsHeader}
              onPress={() => setDataGapsExpanded((prev) => !prev)}
              activeOpacity={0.8}
            >
              <View style={styles.dataGapsHeaderRow}>
                <View style={styles.dataGapsHeaderLeft}>
                  <Text style={styles.dataGapsTitle}>DATA GAPS AND LIMITATIONS</Text>
                  <Text style={styles.dataGapsSubtitle}>
                    Fields with no verified data for this species
                  </Text>
                </View>
                <View style={styles.sectionHeaderIcon}>
                  {dataGapsExpanded ? <ChevronUp size={18} color={Colors.muted2} /> : <ChevronDown size={18} color={Colors.muted2} />}
                </View>
              </View>
              {dataGapsExpanded && (
                <View style={styles.dataGapsBody}>
                  {e.dataGaps.map((gap, i) => (
                    <DataGapItem
                      key={i}
                      category={gap.category}
                      field={gap.field}
                      reason={gap.reason}
                    />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          )}

          {!hasDataGaps && (
            <View style={styles.noGapsPanel}>
              <Info size={16} color={Colors.moss} />
              <Text style={styles.noGapsText}>
                No major data gaps identified by the current retrieval process.
              </Text>
            </View>
          )}
        </>
      ) : null}
    </>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      >
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft color={Colors.ink} size={19} />
            <Text style={styles.backText}>Field Base</Text>
          </TouchableOpacity>
          <Text style={styles.headerLabel}>BOTANICAL DB · BIOSIGNATURE OVERVIEW</Text>
          <Text style={styles.headerName}>{scan.common_name}</Text>
          <Text style={styles.headerSci}>{scan.scientific_name}</Text>
        </View>

        <View style={styles.segWrap}>
          <TouchableOpacity
            style={[styles.seg, output === 'normal' && styles.segOn]}
            onPress={() => setOutput('normal')}
            activeOpacity={0.85}
          >
            <Text style={[styles.segText, output === 'normal' && styles.segTextOn]}>
              NORMAL OUTPUT
            </Text>
            {output === 'normal' ? <View style={styles.segDot} /> : null}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.seg, output === 'scientific' && styles.segOn]}
            onPress={() => setOutput('scientific')}
            activeOpacity={0.85}
          >
            <Text style={[styles.segText, output === 'scientific' && styles.segTextOn]}>
              SCIENTIFIC OUTPUT
            </Text>
            {output === 'scientific' ? <View style={styles.segDot} /> : null}
          </TouchableOpacity>
        </View>

        <View style={styles.confBlock}>
          <View style={styles.confMeta}>
            <Text style={styles.confLabel}>IDENTIFICATION CONFIDENCE</Text>
            <Text style={styles.confValue}>{scan.confidence}%</Text>
          </View>
          <View style={styles.confTrack}>
            <View
              style={[
                styles.confFill,
                {
                  width: `${Math.max(0, Math.min(100, scan.confidence))}%` as any,
                  backgroundColor:
                    scan.confidence > 70 ? Colors.moss : scan.confidence > 40 ? '#D98A00' : Colors.red2,
                },
              ]}
            />
          </View>
        </View>

        <View style={[styles.statusCard, { backgroundColor: statusBg, borderColor: statusBorder }]}>
          <View style={styles.statusHeader}>
            {invasive ? (
              <TriangleAlert color={statusColor} size={18} />
            ) : (
              <ShieldCheck color={statusColor} size={18} />
            )}
            <Text style={[styles.statusTitle, { color: statusColor }]}>
              LEGAL STATUS · {invasive ? 'INVASIVE' : 'NATIVE'}
            </Text>
          </View>
          <Text style={[styles.statusMsg, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        {output === 'normal' ? normalOutput : scientificOutput}

        <TouchableOpacity
          style={styles.exportBtn}
          onPress={exportPdf}
          disabled={exporting}
          activeOpacity={0.85}
        >
          {exporting ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Download color={Colors.white} size={16} />
              <Text style={styles.exportText}>EXPORT FIELD REPORT (PDF)</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Nature is complex. While BioLens provides advanced morphological analysis, we do not
            guarantee 100% accuracy. Always consult a certified botanist for critical decisions.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ORGAN_TEXT: Record<string, string> = {
  leaf: 'Compound leaf with multiple small leaflets; toothed margins and prominent veins are typical.',
  flower: 'Distinct floral structure arranged along the reproductive axis.',
  fruit: 'Fruit type develops from the floral organ and varies across the species.',
  bark: 'Bark texture, thickness and colour provide species-level markers.',
  default: 'Morphological structure characteristic of the specimen group.',
};

const FACTS: Record<string, string> = {
  neem: 'Neem (*Azadirachta indica*) is traditionally valued across the Indian subcontinent for shade, soil restoration and medicine derived from its seeds, leaves and bark.',
  tomato: 'The tomato (*Solanum lycopersicum*) is a flowering plant in the nightshade family, cultivated for fruit and widely used in agriculture.',
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: 18 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, marginBottom: 10 },
  backText: { color: Colors.ink, fontSize: 13 },
  headerLabel: { fontSize: 9.5, color: Colors.muted2, letterSpacing: 1.5, marginBottom: 6 },
  headerName: { fontFamily: Fonts.serif, fontSize: 32, fontWeight: '700', color: Colors.ink, letterSpacing: -0.5 },
  headerSci: { fontSize: 15, color: Colors.muted2, fontStyle: 'italic', marginTop: 3 },
  segWrap: { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: 14, backgroundColor: Colors.paperDeep, borderRadius: 8, padding: 4 },
  seg: { flex: 1, borderRadius: 6, paddingVertical: 12, alignItems: 'center' },
  segOn: { backgroundColor: Colors.card },
  segText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, color: Colors.faint },
  segTextOn: { color: Colors.ink },
  segDot: { position: 'absolute', top: 6, bottom: 6, right: 6, width: 3, borderRadius: 1.5, backgroundColor: Colors.ink },
  confBlock: { backgroundColor: Colors.card, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.line, paddingHorizontal: Spacing.lg, paddingVertical: 16 },
  confMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  confLabel: { fontSize: 10, fontWeight: '700', color: Colors.muted2, letterSpacing: 1.2 },
  confValue: { fontSize: 13, fontWeight: '800', color: Colors.ink },
  confTrack: { height: 7, backgroundColor: Colors.lineSoft, borderRadius: 4, overflow: 'hidden' },
  confFill: { height: 7, borderRadius: 4 },
  statusCard: { marginHorizontal: Spacing.lg, marginTop: 16, borderRadius: 8, padding: 14, borderWidth: 1 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  statusMsg: { fontSize: 12, lineHeight: 19 },
  section: { paddingHorizontal: Spacing.lg, marginTop: 20 },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: Colors.muted2, letterSpacing: 1.6, marginBottom: 10 },
  featureCard: { backgroundColor: Colors.card, borderRadius: 8, padding: 16, borderWidth: 1, borderColor: Colors.line },
  featureText: { fontSize: 12.5, color: Colors.muted2, lineHeight: 21 },
  consRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 },
  consText: { flex: 1, fontSize: 12.5, color: Colors.muted2, lineHeight: 20 },
  factCard: { flexDirection: 'row', gap: 12, backgroundColor: '#FBF6E7', borderRadius: 8, borderWidth: 1, borderColor: '#E7D9AC', padding: 14 },
  factBody: { flex: 1, marginRight: 10 },
  factEyebrow: { fontSize: 9, fontWeight: '800', letterSpacing: 1.6, color: Colors.gold2, marginBottom: 4 },
  factText: { fontSize: 12.5, color: Colors.ink, lineHeight: 19 },
  safetyBox: { flexDirection: 'row', gap: 12, backgroundColor: '#FDF6F5', borderRadius: 8, borderWidth: 1, borderColor: '#EFD2CC', padding: 14 },
  safetyBody: { flex: 1 },
  safetyTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.6, color: Colors.red2, marginBottom: 4 },
  safetyText: { fontSize: 12, color: Colors.muted2, lineHeight: 19 },
  specimenImage: { width: '100%', height: 220, borderRadius: 8, backgroundColor: Colors.chipBg },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#111413', marginHorizontal: Spacing.lg, marginTop: 24, paddingVertical: 18, borderRadius: 4 },
  exportText: { color: Colors.white, fontSize: 11.5, fontWeight: '700', letterSpacing: 1.5 },
  disclaimer: { marginHorizontal: Spacing.lg, marginTop: 18, padding: 14, borderRadius: 6, backgroundColor: Colors.paperDeep },
  disclaimerText: { fontSize: 10.5, color: Colors.muted2, lineHeight: 17, fontStyle: 'italic' },
  loadingContainer: { flex: 1, backgroundColor: Colors.paper, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 13, color: Colors.muted2 },

  // Scientific Mode styles
  overviewCard: { backgroundColor: Colors.card, borderRadius: 8, borderWidth: 1, borderColor: Colors.line, padding: 16 },
  overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  overviewNameWrapper: { flex: 1 },
  overviewCommonName: { fontSize: 26, fontWeight: '700', color: Colors.ink, letterSpacing: -0.5 },
  overviewScientificName: { fontSize: 16, color: Colors.muted2, fontStyle: 'italic', marginTop: 4 },
  overviewAuthor: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  overviewConfidence: { alignItems: 'flex-end' },
  overviewConfidenceLabel: { fontSize: 9, fontWeight: '800', color: Colors.muted2, letterSpacing: 1.2, marginBottom: 4 },
  overviewConfidenceValue: { fontSize: 16, fontWeight: '800', color: Colors.ink },
  overviewText: { fontSize: 13, color: Colors.ink, lineHeight: 20, marginTop: 12 },
  overviewDistinctive: { marginTop: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.lineSoft },
  overviewDistinctiveLabel: { fontSize: 9, fontWeight: '800', color: Colors.muted2, letterSpacing: 1.4, marginBottom: 4 },
  overviewDistinctiveText: { fontSize: 12.5, color: Colors.muted2, lineHeight: 19 },
  overviewRange: { marginTop: 10 },
  overviewRangeLabel: { fontSize: 9, fontWeight: '800', color: Colors.muted2, letterSpacing: 1.4, marginBottom: 4 },
  overviewRangeText: { fontSize: 12.5, color: Colors.muted2, lineHeight: 19 },

  factsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickFactCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: Colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.lineSoft,
    padding: 12,
  },
  quickFactLabel: { fontSize: 8.5, fontWeight: '800', color: Colors.faint, letterSpacing: 1.2, marginBottom: 4 },
  quickFactValue: { fontSize: 12, color: Colors.ink, lineHeight: 17 },

  sectionBody: { paddingHorizontal: 16, paddingBottom: 14 },
  factRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lineSoft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  factLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Colors.faint,
    letterSpacing: 1.3,
    marginBottom: 4,
  },
  factLabelImage: { color: Colors.muted2 },
  factValue: {
    fontSize: 13.5,
    color: Colors.ink,
    lineHeight: 19,
  },
  imageTag: {
    backgroundColor: Colors.lineSoft,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  imageTagText: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.muted2,
    letterSpacing: 0.5,
  },

  dataGapsHeader: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.line,
    marginHorizontal: Spacing.lg,
    marginTop: 16,
    overflow: 'hidden',
  },
  dataGapsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  dataGapsHeaderLeft: { flex: 1 },
  dataGapsTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.muted2,
    letterSpacing: 1.6,
  },
  dataGapsSubtitle: {
    fontSize: 9,
    color: Colors.textMuted,
    marginTop: 2,
  },
  dataGapsBody: { paddingHorizontal: 16, paddingBottom: 14 },
  dataGapItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lineSoft,
  },
  dataGapHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  dataGapCategory: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.muted2,
    letterSpacing: 1.2,
  },
  dataGapField: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 1.2,
  },
  dataGapReason: {
    fontSize: 12.5,
    color: Colors.muted2,
    lineHeight: 19,
  },
  noGapsPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EAF2EC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CFE0D4',
    marginHorizontal: Spacing.lg,
    marginTop: 16,
    padding: 12,
  },
  noGapsText: {
    fontSize: 12,
    color: Colors.muted2,
    lineHeight: 18,
  },
  sectionHeader: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.line,
    marginHorizontal: Spacing.lg,
    marginTop: 16,
    overflow: 'hidden',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  sectionHeaderLeft: { flex: 1 },
  sectionHeaderTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: Colors.muted2,
    letterSpacing: 1.6,
  },
  sectionHeaderIcon: { marginLeft: 8 },
});
