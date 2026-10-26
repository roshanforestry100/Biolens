import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Shield, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

// Text recovered exactly from APK binary
const TERMS = [
  {
    title: 'AGENT RESPONSIBILITY',
    icon: Shield,
    color: Colors.primary,
    content: `As a BioLens agent, you agree to prioritize the well-being of the ecosystems you study. Do not disturb wildlife, damage botanical samples unnecessarily, or interfere with natural processes during your field work.`,
  },
  {
    title: 'ETHICAL GUIDELINES',
    icon: CheckCircle,
    color: Colors.success,
    content: `To the Jungle Tak Field Directive. These protocols ensure that our technological exploration of the natural world remains ethical, safe, and respectful of all living systems.`,
  },
  {
    title: 'ACCURACY DISCLAIMER',
    icon: AlertTriangle,
    color: Colors.warning,
    content: `Nature is complex. While BioLens provides advanced morphological analysis, we do not guarantee 100% accuracy. Always consult a certified botanist for critical decisions regarding species identification.`,
  },
  {
    title: 'DATA & PRIVACY',
    icon: Shield,
    color: Colors.blue,
    content: `For any questions regarding our data practices or your rights as a BioLens agent, please reach out to our environmental integrity team at support@jungletak.in.\n\nPrivacy Policy: https://jungletak.in/privacy-policy`,
  },
  {
    title: 'INVASIVE SPECIES PROTOCOL',
    icon: AlertTriangle,
    color: Colors.danger,
    content: `When an invasive species is detected, BioLens will flag it immediately. Agents are responsible for reporting invasive species sightings to local forest authorities. Do not attempt to remove or relocate invasive species without proper authorization.`,
  },
  {
    title: 'RESPECT FOR LIFE',
    icon: CheckCircle,
    color: Colors.primaryLight,
    content: `BioLens is a tool for observation, not intervention. Respect for Life is our founding principle. Every scan is a contribution to our collective understanding of India's biodiversity.`,
  },
];

export default function TermsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#1B2F29', '#2D5A27']} style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft color={Colors.white} size={20} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AGENT RESPONSIBILITY</Text>
          <Text style={styles.headerSub}>Jungle Tak Field Directive</Text>
        </LinearGradient>

        <View style={styles.intro}>
          <Text style={styles.introText}>
            These protocols ensure that our technological exploration of the natural world remains ethical, safe, and respectful of all living systems.
          </Text>
        </View>

        {TERMS.map((term, i) => (
          <View key={i} style={styles.termCard}>
            <View style={styles.termHeader}>
              <View style={[styles.termIconBg, { backgroundColor: term.color + '20' }]}>
                <term.icon color={term.color} size={18} />
              </View>
              <Text style={[styles.termTitle, { color: term.color }]}>{term.title}</Text>
            </View>
            <Text style={styles.termContent}>{term.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using BioLens, you acknowledge that you have read and agree to the Jungle Tak Field Directive and Agent Responsibility protocols.
          </Text>
          <Text style={styles.footerSub}>Validated By Jungle Tak Biolens Engine v1.0</Text>
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
  headerTitle: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.white, letterSpacing: 2 },
  headerSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  intro: { padding: Spacing.lg, backgroundColor: Colors.successLight, borderBottomWidth: 1, borderColor: Colors.successMid },
  introText: { fontSize: FontSize.sm, color: Colors.primaryDark, lineHeight: 22, fontStyle: 'italic' },
  termCard: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight,
  },
  termHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  termIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  termTitle: { fontSize: FontSize.sm, fontWeight: '800', letterSpacing: 1 },
  termContent: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },
  footer: { margin: Spacing.lg, padding: Spacing.lg, backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
  footerText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, textAlign: 'center' },
  footerSub: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },
});
