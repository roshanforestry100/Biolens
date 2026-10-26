import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, ChevronRight, AlertTriangle, CheckCircle, Clock } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { getUserScans, isInvasiveScan } from '../lib/storage';
import { ScanResult } from '../types';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const data = await getUserScans(user.id);
    setScans(data);
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: ScanResult }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Result', { scan: item })}
      activeOpacity={0.8}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.statusDot, { backgroundColor: isInvasiveScan(item) ? Colors.danger : Colors.success }]} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.sciName}>{item.scientific_name}</Text>
        <Text style={styles.commonName}>{item.common_name}</Text>
        <View style={styles.cardMeta}>
          <Clock color={Colors.textMuted} size={11} />
          <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
          {item.region ? (
            <>
              <Text style={styles.metaDot}>Â·</Text>
              <Text style={styles.metaText}>{item.region.substring(0, 16)}</Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={styles.cardRight}>
        {isInvasiveScan(item) ? (
          <AlertTriangle color={Colors.danger} size={16} />
        ) : (
          <CheckCircle color={Colors.success} size={16} />
        )}
        <Text style={styles.confidence}>{item.confidence}%</Text>
        <ChevronRight color={Colors.textMuted} size={16} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#1B2F29', '#2D5A27']} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.headerTitle}>SEARCH HISTORY</Text>
        <Text style={styles.headerSub}>Field Intelligence Snapshot Â· {scans.length} records</Text>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Retrieving field logs...</Text>
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Search color={Colors.border} size={48} />
              <Text style={styles.emptyTitle}>No Field Scans Yet</Text>
              <Text style={styles.emptyText}>Your identification history will appear here.</Text>
            </View>
          }
          ListHeaderComponent={
            scans.length > 0 ? (
              <View style={styles.listHeader}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.danger }]} />
                  <Text style={styles.legendText}>Invasive</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: Colors.success }]} />
                  <Text style={styles.legendText}>Native</Text>
                </View>
              </View>
            ) : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white, letterSpacing: 2, paddingTop: Spacing.sm },
  headerSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 4, letterSpacing: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: FontSize.sm, color: Colors.textMuted, fontStyle: 'italic' },
  list: { padding: Spacing.lg, gap: 8, flexGrow: 1 },
  listHeader: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: FontSize.xs, color: Colors.textMuted },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardLeft: { marginRight: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardBody: { flex: 1 },
  sciName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary, fontStyle: 'italic' },
  commonName: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: FontSize.xs, color: Colors.textMuted },
  metaDot: { color: Colors.border },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  confidence: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl, marginTop: Spacing.xxl },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textSecondary, marginTop: Spacing.md },
  emptyText: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },
});

