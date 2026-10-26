import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  User, Star, Leaf, ScanLine, MapPin, Activity, LogOut,
  ChevronRight, Info, FileText, Shield, Lock,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { getUserScans, getStats, BioLensStats } from '../lib/storage';
import { generateResearchReport, shareAvailable } from '../lib/report';
import { ScanResult } from '../types';

function rankForStars(stars: number): string {
  if (stars >= 20) return 'Senior Ecologist';
  if (stars >= 10) return 'Field Analyst';
  if (stars >= 5) return 'Explorer';
  return 'Field Researcher';
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [scans, setScans] = useState<ScanResult[]>([]);
  const [stats, setStats] = useState<BioLensStats | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const [data, st] = await Promise.all([getUserScans(user.id), getStats()]);
    setScans(data);
    setStats(st);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const uniqueSpecies = stats?.totalSpecies ?? new Set(scans.map((s) => s.scientific_name)).size;
  const stars = Math.floor(uniqueSpecies / 5);
  const userRank = rankForStars(stars);
  const invasiveFound = stats?.highRiskCount ?? 0;

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const handleReport = async () => {
    const latest = scans[0];
    if (!latest) {
      Alert.alert('No Field Scans', 'Complete at least one identification before exporting a report.');
      return;
    }
    if (!user) return;

    setReportLoading(true);
    try {
      const meta = user.user_metadata || {};
      const fileUri = await generateResearchReport({
        scan: latest,
        userName: meta.full_name || user.email?.split('@')[0] || 'Field Agent',
        userRank,
        userStars: stars,
        totalScans: stats?.totalScans ?? scans.length,
        userMeta: {
          age: meta.age,
          gender: meta.gender,
          qualification: meta.qualification,
          expertise: meta.expertise,
        },
      });

      if (!(await shareAvailable())) {
        Alert.alert('Report Saved', `Research report saved to:\n${fileUri}`);
      }
    } catch (err: any) {
      Alert.alert(
        'Download Failed',
        `Unable to generate the research report at this time. ${err?.message || ''}`.trim()
      );
    } finally {
      setReportLoading(false);
    }
  };

  const menuItems = [
    {
      icon: FileText,
      label: 'Research Report',
      sub: reportLoading ? 'Compiling field dossier…' : 'Export field intelligence as PDF',
      onPress: handleReport,
      busy: reportLoading,
    },
    {
      icon: Lock,
      label: 'Privacy Policy',
      sub: 'How your field data is handled',
      onPress: () => navigation.navigate('Privacy'),
    },
    {
      icon: Info,
      label: 'About BioLens',
      sub: 'Jungle Tak ecosystem',
      onPress: () => navigation.navigate('About'),
    },
    {
      icon: Shield,
      label: 'Agent Responsibility',
      sub: 'Field directive & terms',
      onPress: () => navigation.navigate('Terms'),
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <LinearGradient
          colors={['#1B2F29', '#2D5A27']}
          style={[styles.headerGrad, { paddingTop: insets.top + 8 }]}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <User color={Colors.white} size={36} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Field Agent'}
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <View style={styles.agentBadge}>
                <Shield color={Colors.accent} size={12} />
                <Text style={styles.agentBadgeText}>{userRank.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Stars display */}
        <View style={styles.starsRow}>
          {Array.from({ length: Math.max(stars, 1) }).map((_, i) => (
            <Star key={i} color={i < stars ? Colors.gold : Colors.border} size={24} fill={i < stars ? Colors.gold : 'transparent'} />
          ))}
          <Text style={styles.starsLabel}>  {stars} STAR{stars !== 1 ? 'S' : ''} EARNED</Text>
        </View>

        {/* FIELD INTELLIGENCE DOSSIER */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>FIELD INTELLIGENCE DOSSIER</Text>
          <View style={styles.dossierGrid}>
            <View style={styles.dossierCard}>
              <ScanLine color={Colors.primary} size={22} />
              <Text style={styles.dossierVal}>{stats?.totalScans ?? scans.length}</Text>
              <Text style={styles.dossierLabel}>TOTAL SCANS</Text>
            </View>
            <View style={styles.dossierCard}>
              <Leaf color={Colors.primaryLight} size={22} />
              <Text style={styles.dossierVal}>{uniqueSpecies}</Text>
              <Text style={styles.dossierLabel}>UNIQUE SPECIES</Text>
            </View>
            <View style={styles.dossierCard}>
              <MapPin color={Colors.blue} size={22} />
              <Text style={styles.dossierVal}>{stats?.totalRegions ?? 0}</Text>
              <Text style={styles.dossierLabel}>REGIONS COVERED</Text>
            </View>
            <View style={styles.dossierCard}>
              <Activity color={Colors.danger} size={22} />
              <Text style={[styles.dossierVal, { color: invasiveFound > 0 ? Colors.danger : Colors.textPrimary }]}>
                {invasiveFound}
              </Text>
              <Text style={styles.dossierLabel}>INVASIVE FOUND</Text>
            </View>
          </View>
        </View>

        {/* Star info */}
        <View style={styles.starNote}>
          <Star color={Colors.gold} size={14} />
          <Text style={styles.starNoteText}>
            Star awarded per 5 distinct species identified · Next star at {(Math.floor(uniqueSpecies / 5) + 1) * 5} species
          </Text>
        </View>

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AGENT PROFILE</Text>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.menuRow}
              onPress={item.onPress}
              activeOpacity={0.8}
              disabled={item.busy}
            >
              <View style={styles.menuIcon}>
                <item.icon color={Colors.primary} size={20} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              {item.busy ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <ChevronRight color={Colors.textMuted} size={18} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <LogOut color={Colors.danger} size={18} />
          <Text style={styles.signOutText}>TERMINATE SESSION</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>BioLens Field Edition v1.0.0{'\n'}Validated By Jungle Tak Biolens Engine v1.0</Text>

        <View style={{ height: Spacing.xxl + insets.bottom }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerGrad: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white },
  profileEmail: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  agentBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,230,118,0.15)', borderRadius: BorderRadius.full,
    paddingVertical: 3, paddingHorizontal: 10, alignSelf: 'flex-start', marginTop: 8,
    borderWidth: 1, borderColor: Colors.accent + '40',
  },
  agentBadgeText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: '700', letterSpacing: 1 },
  starsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderColor: Colors.borderLight,
  },
  starsLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '700', letterSpacing: 1 },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 12 },
  dossierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dossierCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, width: '47.5%', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderLight,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  dossierVal: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.textPrimary, marginTop: 8 },
  dossierLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1, marginTop: 4, textAlign: 'center' },
  starNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: Spacing.lg, marginTop: Spacing.sm,
    backgroundColor: '#FFF8F0', borderRadius: BorderRadius.md,
    padding: Spacing.sm, borderWidth: 1, borderColor: '#FFE0B2',
  },
  starNoteText: { fontSize: FontSize.xs, color: Colors.warning, flex: 1, lineHeight: 16 },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textPrimary },
  menuSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, margin: Spacing.lg,
    backgroundColor: Colors.dangerBg, borderRadius: BorderRadius.md,
    paddingVertical: 14, borderWidth: 1, borderColor: Colors.dangerLight,
  },
  signOutText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.danger, letterSpacing: 1 },
  footer: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18, marginBottom: Spacing.md },
});
