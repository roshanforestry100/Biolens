import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  Leaf, Star, ScanLine, MapPin, Activity,
  Globe, ChevronRight, Info,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { getUserScans, getStats, isInvasiveScan, BioLensStats } from '../lib/storage';
import { ScanResult } from '../types';

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [stats, setStats] = useState<BioLensStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const [s, st] = await Promise.all([
      getUserScans(user.id),
      getStats(),
    ]);
    setScans(s);
    setStats(st);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalScans = stats?.totalScans ?? scans.length;
  const uniqueSpecies = stats?.totalSpecies ?? new Set(scans.map((s) => s.scientific_name)).size;
  const stars = Math.floor(uniqueSpecies / 5);
  const regionsCovered = stats?.totalRegions ?? new Set(scans.map((s) => s.region).filter(Boolean)).size;
  const invasiveCount =
    stats?.highRiskCount ?? scans.filter((s) => isInvasiveScan(s)).length;

  const cardStats = [
    { label: 'TOTAL SCANS', value: totalScans, icon: ScanLine, color: Colors.primary },
    { label: 'UNIQUE SPECIES', value: uniqueSpecies, icon: Leaf, color: Colors.primaryLight },
    { label: 'STARS EARNED', value: stars, icon: Star, color: '#FFD700' },
    { label: 'REGIONS COVERED', value: regionsCovered, icon: MapPin, color: Colors.blue },
    { label: 'AVG CONFIDENCE', value: `${stats?.averageConfidence ?? 0}%`, icon: Activity, color: Colors.accent },
    { label: 'INVASIVE ALERTS', value: invasiveCount, icon: Globe, color: Colors.danger },
  ];

  const recentScans = scans.slice(0, 5);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#1B2F29', '#2D5A27']} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>FIELD BASE</Text>
            <Text style={styles.userName}>
              Agent {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Field Agent'}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.infoBtn} onPress={() => navigation.navigate('About')}>
              <Info color={Colors.white} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Engine badge */}
        <View style={styles.engineBadge}>
          <Leaf color={Colors.accent} size={12} />
          <Text style={styles.engineText}>
            BioLens Engine v1.0 · {stats?.lastScanText || 'Active'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* THE BIOLENS ECOSYSTEM IMPACT SUMMARY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THE BIOLENS ECOSYSTEM IMPACT SUMMARY</Text>
          <View style={styles.statsGrid}>
            {cardStats.map((stat, i) => (
              <View key={i} style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: stat.color + '20' }]}>
                  <stat.icon color={stat.color} size={20} />
                </View>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Star system info */}
        <View style={styles.starNote}>
          <Star color={Colors.gold} size={14} />
          <Text style={styles.starNoteText}>Star awarded per 5 distinct species identified</Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FIELD ACTIVITY LOG</Text>
          <TouchableOpacity
            style={styles.scanCTA}
            onPress={() => navigation.navigate('Identify')}
            activeOpacity={0.85}
          >
            <LinearGradient colors={['#2D5A27', '#1B5E20']} style={styles.scanCTAGradient}>
              <ScanLine color={Colors.white} size={28} />
              <View style={styles.scanCTAText}>
                <Text style={styles.scanCTATitle}>INITIATE IDENTIFICATION</Text>
                <Text style={styles.scanCTASub}>Scan a plant or species in the field</Text>
              </View>
              <ChevronRight color={Colors.white} size={20} />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>RECENT FIELD INTELLIGENCE</Text>
              <TouchableOpacity onPress={() => navigation.navigate('History')}>
                <Text style={styles.seeAll}>SEE ALL</Text>
              </TouchableOpacity>
            </View>
            {recentScans.map((scan, i) => (
              <TouchableOpacity
                key={scan.id || i}
                style={styles.scanRow}
                onPress={() => navigation.navigate('Result', { scan })}
                activeOpacity={0.8}
              >
                <View style={[styles.scanDot, {
                  backgroundColor: isInvasiveScan(scan)
                    ? Colors.dangerLight : Colors.successLight
                }]} />
                <View style={styles.scanInfo}>
                  <Text style={styles.scanName}>{scan.scientific_name}</Text>
                  <Text style={styles.scanCommon}>{scan.common_name}</Text>
                </View>
                <View style={styles.scanRight}>
                  <Text style={styles.scanConf}>{scan.confidence}%</Text>
                  <ChevronRight color={Colors.textMuted} size={16} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty state */}
        {scans.length === 0 && (
          <View style={styles.emptyState}>
            <Leaf color={Colors.border} size={48} />
            <Text style={styles.emptyTitle}>No Field Scans Yet</Text>
            <Text style={styles.emptyText}>
              Start identifying species to build your field intelligence database.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('Identify')}
            >
              <Text style={styles.emptyBtnText}>OPEN CAMERA</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: Spacing.sm },
  greeting: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, fontWeight: '600' },
  userName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 8, marginTop: 4 },
  infoBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  engineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: BorderRadius.full,
    paddingVertical: 4, paddingHorizontal: 12, alignSelf: 'flex-start', marginTop: 8,
  },
  engineText: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.5 },
  scroll: { flex: 1 },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 12 },
  seeAll: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, width: '47.5%',
    borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1, marginTop: 2 },
  starNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: Spacing.lg, marginTop: Spacing.sm,
    backgroundColor: '#FFF8F0', borderRadius: BorderRadius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: '#FFE0B2',
  },
  starNoteText: { fontSize: FontSize.xs, color: Colors.warning, fontStyle: 'italic' },
  scanCTA: { borderRadius: BorderRadius.lg, overflow: 'hidden', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  scanCTAGradient: { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, gap: Spacing.md },
  scanCTAText: { flex: 1 },
  scanCTATitle: { fontSize: FontSize.base, fontWeight: '800', color: Colors.white, letterSpacing: 1 },
  scanCTASub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  scanRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  scanDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  scanInfo: { flex: 1 },
  scanName: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary, fontStyle: 'italic' },
  scanCommon: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  scanRight: { alignItems: 'flex-end', flexDirection: 'row', gap: 4 },
  scanConf: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  emptyState: { alignItems: 'center', padding: Spacing.xxl },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textSecondary, marginTop: Spacing.md },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: 12, paddingHorizontal: Spacing.xl, marginTop: Spacing.lg,
  },
  emptyBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.white, letterSpacing: 1 },
});
