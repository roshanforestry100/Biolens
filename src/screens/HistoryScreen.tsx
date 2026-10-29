import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Colors, Fonts, Spacing } from '../constants/theme';
import { getUserScans } from '../lib/storage';
import { ScanResult } from '../types';

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
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
      activeOpacity={0.75}
      onPress={() => navigation.navigate('Result', { scan: item })}
    >
      {item.image_uri ? (
        <Image source={{ uri: item.image_uri }} style={styles.thumb} resizeMode="cover" />
      ) : (
        <View style={styles.thumb} />
      )}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {item.common_name || item.scientific_name}
        </Text>
        <Text style={styles.sci} numberOfLines={1}>
          {item.scientific_name}
        </Text>
        <View style={styles.chips}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{Math.round(item.confidence || 0)}%</Text>
          </View>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{item.region || 'India Match'}</Text>
          </View>
          <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        </View>
      </View>
      <ChevronRight color={Colors.faint} size={18} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft color={Colors.ink} size={19} />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Research History</Text>
          <Text style={styles.subtitle}>
            {scans.length} {scans.length === 1 ? 'RECORD' : 'RECORDS'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.forest} />
        </View>
      ) : (
        <FlatList
          data={scans}
          keyExtractor={(item) => item.id || item.scanId || item.created_at}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 28 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.forest} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No field scans yet</Text>
              <Text style={styles.emptyText}>
                Identifications you record will be archived here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: Spacing.lg,
    paddingBottom: 16,
  },
  backBtn: { paddingVertical: 6, paddingRight: 2 },
  title: { fontFamily: Fonts.serif, fontSize: 26, fontWeight: '700', color: Colors.ink },
  subtitle: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Colors.muted2,
    letterSpacing: 1.6,
    marginTop: 3,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg, gap: 8, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: 12,
  },
  thumb: { width: 46, height: 46, borderRadius: 5, backgroundColor: Colors.chipBg },
  body: { flex: 1, marginLeft: 12 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.ink },
  sci: { fontSize: 11.5, color: Colors.muted2, fontStyle: 'italic', marginTop: 1 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  chip: {
    backgroundColor: Colors.chipBg,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  chipText: { fontSize: 10, color: Colors.muted2, fontWeight: '600' },
  date: { fontSize: 10, color: Colors.faint, marginLeft: 2 },
  empty: { padding: 30, alignItems: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: Colors.ink },
  emptyText: { fontSize: 12, color: Colors.muted2, textAlign: 'center', marginTop: 6 },
});
