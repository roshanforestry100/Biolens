import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ArrowLeft, AlertTriangle, CheckCircle, Leaf, BookOpen,
  FlaskConical, TreePine, Globe, Info, Star,
} from 'lucide-react-native';

import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { ScanResult } from '../types';

export default function ResultScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { scan } = route.params as { scan: ScanResult };

  const basic = scan.metadata?.basic ?? {};
  const statusRaw = String(
    scan.regulatory_status || basic.invasive_threat_status || basic.native_status || ''
  ).toLowerCase();

  const isInvasive = statusRaw.includes('invasive') && !statusRaw.includes('not invasive');

  const statusColor = isInvasive ? Colors.danger : Colors.success;
  const statusBg = isInvasive ? Colors.dangerBg : Colors.successLight;
  const statusLabel = isInvasive
    ? 'Listed as invasive in Indian forest ecosystems. Active management and reporting recommended.'
    : 'No invasive status flagged. Continue standard field observation protocols.';

  const details = [
    { icon: FlaskConical, label: 'SCIENTIFIC NAME', value: scan.scientific_name, italic: true },
    { icon: Leaf, label: 'COMMON NAME', value: scan.common_name },
    scan.family ? { icon: TreePine, label: 'FAMILY', value: scan.family } : null,
    scan.genus ? { icon: BookOpen, label: 'GENUS', value: scan.genus } : null,
    { icon: Star, label: 'CONFIDENCE', value: `${scan.confidence}%` },
    scan.region ? { icon: Globe, label: 'LOCATION CAPTURED', value: scan.region } : null,
  ].filter(Boolean) as any[];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={['#1B2F29', '#2D5A27']} style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft color={Colors.white} size={20} />
            <Text style={styles.backText}>Field Base</Text>
          </TouchableOpacity>
          <Text style={styles.headerLabel}>BOTANICAL DB · BIOSIGNATURE OVERVIEW</Text>
          <Text style={styles.headerName}>{scan.common_name}</Text>
          <Text style={styles.headerSci}>{scan.scientific_name}</Text>
        </LinearGradient>

        {/* Confidence meter */}
        <View style={styles.confBar}>
          <View style={styles.confMeta}>
            <Text style={styles.confLabel}>IDENTIFICATION CONFIDENCE</Text>
            <Text style={styles.confValue}>{scan.confidence}%</Text>
          </View>
          <View style={styles.confTrack}>
            <View style={[styles.confFill, {
              width: `${scan.confidence}%` as any,
              backgroundColor: scan.confidence > 70 ? Colors.success : scan.confidence > 40 ? Colors.warning : Colors.danger,
            }]} />
          </View>
        </View>

        {/* Regulatory / Legal Status */}
        <View style={[styles.statusCard, { backgroundColor: statusBg, borderColor: statusColor + '40' }]}>
          <View style={styles.statusHeader}>
            {isInvasive ? (
              <AlertTriangle color={statusColor} size={20} />
            ) : (
              <CheckCircle color={statusColor} size={20} />
            )}
            <Text style={[styles.statusTitle, { color: statusColor }]}>
              LEGAL STATUS · {isInvasive ? 'INVASIVE' : 'NATIVE'}
            </Text>
          </View>
          <Text style={[styles.statusMsg, { color: statusColor }]}>{statusLabel}</Text>
        </View>

        {/* TAXONOMIC CLASSIFICATION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TAXONOMIC CLASSIFICATION</Text>
          <View style={styles.detailCard}>
            {details.map((d, i) => (
              <View key={i} style={[styles.detailRow, i < details.length - 1 && styles.detailDivider]}>
                <View style={styles.detailIcon}>
                  <d.icon color={Colors.primary} size={16} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>{d.label}</Text>
                  <Text style={[styles.detailValue, d.italic && { fontStyle: 'italic' }]}>{d.value}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* KEY IDENTIFICATION FEATURES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>KEY IDENTIFICATION FEATURES</Text>
          <View style={styles.featureCard}>
            <Text style={styles.featureText}>
              {scan.description ||
                basic.overview ||
                `Morphological markers analyzed across leaf arrangement, floral structure, and venation patterns. Phylogenetic positioning mapped within established botanical hierarchies. Confidence score based on visual similarity to verified specimens in the botanical reference database.`}
            </Text>
          </View>
        </View>

        {/* Ecological role */}
        {basic.ecological_role ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ECOLOGICAL ROLE</Text>
            <View style={styles.featureCard}>
              <Text style={styles.featureText}>{basic.ecological_role}</Text>
            </View>
          </View>
        ) : null}

        {/* Conservation / Ecological Impact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONSERVATION</Text>
          <View style={styles.featureCard}>
            <View style={styles.consBadge}>
              <Info color={Colors.blue} size={16} />
              <Text style={styles.consText}>
                {scan.conservation_status || (isInvasive
                  ? 'Active field management recommended. Report sightings to local forest authorities.'
                  : 'No conservation concern flagged. Continue standard field observation protocols.'
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Nature is complex. While BioLens provides advanced morphological analysis, we do not guarantee 100% accuracy. Always consult a certified botanist for critical decisions.
          </Text>
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: Spacing.sm, marginBottom: Spacing.lg },
  backText: { color: Colors.white, fontSize: FontSize.base },
  headerLabel: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.5, marginBottom: 4 },
  headerName: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white },
  headerSci: { fontSize: FontSize.base, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', marginTop: 2 },
  confBar: {
    backgroundColor: Colors.surface, padding: Spacing.lg,
    borderBottomWidth: 1, borderColor: Colors.borderLight,
  },
  confMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  confLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  confValue: { fontSize: FontSize.base, fontWeight: '800', color: Colors.textPrimary },
  confTrack: { height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: 'hidden' },
  confFill: { height: 8, borderRadius: 4 },
  statusCard: {
    margin: Spacing.lg, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  statusTitle: { fontSize: FontSize.xs, fontWeight: '800', letterSpacing: 1.5 },
  statusMsg: { fontSize: FontSize.sm, lineHeight: 20 },
  section: { paddingHorizontal: Spacing.lg, marginBottom: Spacing.md },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 10 },
  detailCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.borderLight, overflow: 'hidden',
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  detailDivider: { borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  detailIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: { flex: 1 },
  detailLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1 },
  detailValue: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textPrimary, marginTop: 2 },
  featureCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
  },
  featureText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },
  consBadge: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  consText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  disclaimer: {
    margin: Spacing.lg, backgroundColor: Colors.surfaceAlt,
    borderRadius: BorderRadius.md, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  disclaimerText: { fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18, fontStyle: 'italic' },
});
