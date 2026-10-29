import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl, Image,
  TouchableOpacity, StatusBar, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ChevronRight, ShieldCheck, TriangleAlert } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Colors, Spacing } from '../constants/theme';
import {
  getUserScans, getStats, isInvasiveScan, isNativeScan, BioLensStats,
} from '../lib/storage';
import { ScanResult } from '../types';

const LOGO = require('../../assets/logo.png');

export default function HomeScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [stats, setStats] = useState<BioLensStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [ready, setReady] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    const scans = await getUserScans(user.id);
    const stats = await getStats(scans);
    setScans(scans);
    setStats(stats);
    setReady(true);
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
  const uniqueSpecies =
    stats?.totalSpecies ?? new Set(scans.map((s) => s.scientific_name)).size;
  const activeRegion = stats?.activeRegion ?? 'India Match';
  const lastScan = stats?.lastScanText ?? 'No scans yet';
  const highRisk = stats?.highRiskCount ?? scans.filter(isInvasiveScan).length;
  const avgConfidence = stats?.averageConfidence ?? 0;
  const latestInvasive = stats?.isLatestInvasive ?? false;

  const recent = scans.slice(0, 10);
  const recentInvasive = recent.filter(isInvasiveScan).length;
  const recentNative = recent.filter(isNativeScan).length;
  const recentDistinct = new Set(recent.map((s) => s.scientific_name)).size;

  const trend = stats?.confidenceTrend?.length
    ? stats.confidenceTrend
    : [0, 0, 0, 0, 0, 0, 0];
  const maxTrend = Math.max(...trend, 1);

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.forest} />
        }
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Image source={LOGO} style={styles.headerLogo} resizeMode="contain" />
          <Text style={styles.headerTitle}>Field Dashboard</Text>
        </View>

        {/* Snapshot */}
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>FIELD INTELLIGENCE SNAPSHOT</Text>

          <View style={styles.snapRow}>
            <Text style={styles.snapLabel}>Active Region:</Text>
            <Text style={styles.snapValue}>{activeRegion}</Text>
          </View>
          <View style={styles.snapRow}>
            <Text style={styles.snapLabel}>Last Scan:</Text>
            <Text style={styles.snapValue}>{lastScan}</Text>
          </View>
          <View style={styles.snapRow}>
            <Text style={styles.snapLabel}>High-Risk Species Detected:</Text>
            <Text style={styles.snapValue}>{highRisk}</Text>
          </View>
          <View style={styles.snapRow}>
            <Text style={styles.snapLabel}>Confidence Average:</Text>
            <Text style={styles.snapValue}>{avgConfidence}%</Text>
          </View>

          <View style={styles.snapDivider} />

          <View style={styles.snapTotals}>
            <View style={styles.snapTotalCell}>
              <Text style={styles.snapTotalValue}>{totalScans}</Text>
              <Text style={styles.snapTotalLabel}>TOTAL SCANS</Text>
            </View>
            <View style={styles.snapTotalCell}>
              <Text style={styles.snapTotalValue}>{uniqueSpecies}</Text>
              <Text style={styles.snapTotalLabel}>UNIQUE SPECIES</Text>
            </View>
          </View>
        </View>

        {/* Invasive banner */}
        <View style={[styles.banner, latestInvasive ? styles.bannerRisk : styles.bannerSafe]}>
          {latestInvasive ? (
            <TriangleAlert color={Colors.red2} size={16} />
          ) : (
            <ShieldCheck color={Colors.moss} size={16} />
          )}
          <Text style={[styles.bannerText, latestInvasive && { color: Colors.red2 }]}>
            {latestInvasive
              ? 'Invasive species flagged in your latest scan'
              : 'No invasive species in recent scan'}
          </Text>
        </View>

        {/* Ecosystem impact */}
        <View style={styles.card}>
          <Text style={styles.cardEyebrowCenter}>ECOSYSTEM IMPACT SUMMARY</Text>
          <Text style={styles.impactLead}>Recent Findings ({recent.length} scans):</Text>
          <Text style={styles.impactLine}>• {recentInvasive} invasive species detected</Text>
          <Text style={styles.impactLine}>• {recentNative} native species recorded</Text>
          <Text style={styles.impactLine}>• {recentDistinct} distinct biosignatures logged</Text>

          <Text style={styles.trendLabel}>Confidence Trend (Last 7 Scans)</Text>
          <View style={styles.trendChart}>
            {trend.map((value, i) => (
              <View
                key={i}
                style={[
                  styles.trendBar,
                  { height: Math.max(8, Math.round((value / maxTrend) * 42)) },
                ]}
              />
            ))}
          </View>
        </View>

        {/* History */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEyebrow}>RESEARCH HISTORY</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('History')}
            hitSlop={10}
            activeOpacity={0.7}
          >
            <Text style={styles.sectionLink}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>

        {!ready ? (
          <ActivityIndicator color={Colors.forest} style={{ marginTop: 24 }} />
        ) : scans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No field scans yet</Text>
            <Text style={styles.emptyText}>
              Open the Scan tab and identify your first specimen to start building field
              intelligence.
            </Text>
          </View>
        ) : (
          scans.map((scan, i) => (
            <TouchableOpacity
              key={scan.id || scan.scanId || i}
              style={styles.scanRow}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Result', { scan })}
            >
              {scan.image_uri ? (
                <Image source={{ uri: scan.image_uri }} style={styles.thumb} resizeMode="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbEmpty]} />
              )}
              <View style={styles.scanInfo}>
                <Text style={styles.scanName} numberOfLines={1}>
                  {scan.common_name || scan.scientific_name}
                </Text>
                <Text style={styles.scanSci} numberOfLines={1}>
                  {scan.scientific_name}
                </Text>
                <View style={styles.chips}>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{Math.round(scan.confidence || 0)}%</Text>
                  </View>
                  <View style={styles.chip}>
                    <Text style={styles.chipText}>{scan.region || 'India Match'}</Text>
                  </View>
                </View>
              </View>
              <ChevronRight color={Colors.faint} size={18} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: 14,
    gap: 10,
  },
  headerLogo: { width: 30, height: 30, borderRadius: 3 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.ink, letterSpacing: -0.3 },
  card: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.muted2,
    letterSpacing: 1.6,
    marginBottom: 16,
  },
  cardEyebrowCenter: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.muted2,
    letterSpacing: 1.6,
    textAlign: 'center',
    marginBottom: 18,
  },
  snapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
    gap: 12,
  },
  snapLabel: { fontSize: 13, color: Colors.muted2, flexShrink: 1 },
  snapValue: { fontSize: 13, fontWeight: '700', color: Colors.ink },
  snapDivider: { height: 1, backgroundColor: Colors.lineSoft, marginVertical: 12 },
  snapTotals: { flexDirection: 'row' },
  snapTotalCell: { flex: 1, alignItems: 'center' },
  snapTotalValue: { fontSize: 30, fontWeight: '300', color: Colors.ink },
  snapTotalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted2,
    letterSpacing: 1.4,
    marginTop: 4,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  bannerSafe: { backgroundColor: '#EAF2EC', borderColor: '#CFE0D4' },
  bannerRisk: { backgroundColor: '#FBEDEA', borderColor: '#EFD2CC' },
  bannerText: { fontSize: 12.5, fontWeight: '600', color: Colors.moss, flex: 1 },
  impactLead: { fontSize: 12.5, color: Colors.ink, marginBottom: 8 },
  impactLine: { fontSize: 12.5, color: Colors.muted2, lineHeight: 20 },
  trendLabel: { fontSize: 12, color: Colors.muted2, marginTop: 22, marginBottom: 10 },
  trendChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    height: 46,
    paddingBottom: 4,
  },
  trendBar: { flex: 1, backgroundColor: '#151A18', borderRadius: 2 },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.muted2,
    letterSpacing: 1.8,
  },
  sectionLink: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 1.2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 10,
    marginHorizontal: Spacing.lg,
  },
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: 12,
  },
  thumb: { width: 46, height: 46, borderRadius: 5, backgroundColor: Colors.chipBg },
  thumbEmpty: { backgroundColor: Colors.chipBg },
  scanInfo: { flex: 1, marginLeft: 12 },
  scanName: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  scanSci: {
    fontSize: 11.5,
    color: Colors.muted2,
    fontStyle: 'italic',
    marginTop: 1,
  },
  chips: { flexDirection: 'row', gap: 6, marginTop: 6 },
  chip: {
    backgroundColor: Colors.chipBg,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: { fontSize: 10, color: Colors.muted2, fontWeight: '600' },
  emptyCard: {
    marginHorizontal: Spacing.lg,
    padding: 22,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.line,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  emptyText: {
    fontSize: 12,
    color: Colors.muted2,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
});
