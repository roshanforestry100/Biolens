import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Shield, Database, Microscope, Lock, Mail } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

const DEVELOPER = 'Ashish Mehar';
const COMPANY = 'Jungle Tak Multiventure Pvt. Ltd.';
const SYSTEM_ARCH = 'System Architecture & Developer';

const SECTIONS = [
  {
    title: '1. Data Guardianship',
    icon: Shield,
    color: Colors.primary,
    content:
      'We treat your information with the same respect we afford to the ecosystems we protect. We collect information you provide directly to us, such as when you create an agent account, scan a biological specimen, or contact our field support team. This ensures scientific accuracy and proper documentation of botanical diversity.',
  },
  {
    title: '2. Purpose of Intelligence',
    icon: Database,
    color: Colors.primaryLight,
    content:
      'The information we gather is used exclusively to maintain and improve the BioLens ecosystem. This includes enhancing identification accuracy, refining our models for biodiversity research, and providing you with critical field updates.',
  },
  {
    title: '3. Biological Sample Integrity',
    icon: Microscope,
    color: Colors.blue,
    content:
      'Images of flora and wildlife captured through BioLens are processed to provide real-time taxonomic data. We may use anonymized digital samples for research purposes to aid global conservation efforts and botanical science, ensuring your field work contributes to a larger environmental mission.',
  },
  {
    title: '4. Digital Security & Trust',
    icon: Lock,
    color: Colors.success,
    content:
      'We implement rigorous technical safeguards to protect your data against unauthorized access. Your data is never sold or used for purposes unrelated to the Jungle Tak mission.',
  },
  {
    title: '5. Ethical Contact',
    icon: Mail,
    color: Colors.warning,
    content:
      'For any questions regarding our data practices or your rights as a BioLens agent, please reach out to our environmental integrity team at support@jungletak.in.',
  },
];

export default function PrivacyScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#1B2F29', '#2D5A27']}
          style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft color={Colors.white} size={20} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>ETHICAL GUIDELINES & PRIVACY</Text>
          <Text style={styles.headerSub}>BioLens By Jungle Tak</Text>
        </LinearGradient>

        <View style={styles.intro}>
          <Text style={styles.introText}>
            Your field observations belong to you. This policy explains what BioLens collects,
            why it is collected, and how it is protected.
          </Text>
        </View>

        {SECTIONS.map((section, i) => (
          <View key={i} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBg, { backgroundColor: section.color + '20' }]}>
                <section.icon color={section.color} size={18} />
              </View>
              <Text style={[styles.cardTitle, { color: section.color }]}>{section.title}</Text>
            </View>
            <Text style={styles.cardContent}>{section.content}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Photo library access and camera access are used only when you choose to capture or
            upload a specimen. BioLens does not collect your precise location, contacts, or
            microphone audio.
          </Text>
          <Text style={styles.footerSub}>Last updated: 2026 · Jungle Tak Biolens Engine v1.0</Text>
          <View style={styles.devBlock}>
            <Text style={styles.devLabel}>System Architecture & Developer</Text>
            <Text style={styles.devName}>{DEVELOPER}</Text>
            <Text style={styles.devCo}>{COMPANY}</Text>
          </View>
        </View>

        <View style={styles.watermark}>
          <Text style={styles.watermarkText}>
            {SYSTEM_ARCH} · {DEVELOPER} · {COMPANY}
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
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg },
  backText: { color: Colors.white, fontSize: FontSize.base },
  headerTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white, letterSpacing: 1.5 },
  headerSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  intro: { padding: Spacing.lg, backgroundColor: Colors.successLight, borderBottomWidth: 1, borderColor: Colors.successMid },
  introText: { fontSize: FontSize.sm, color: Colors.primaryDark, lineHeight: 22, fontStyle: 'italic' },
  card: {
    marginHorizontal: Spacing.lg, marginTop: Spacing.md,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.lg, borderWidth: 1, borderColor: Colors.borderLight,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  iconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: FontSize.sm, fontWeight: '800', letterSpacing: 0.5 },
  cardContent: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },
  footer: { margin: Spacing.lg, padding: Spacing.lg, backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border },
  footerText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20, textAlign: 'center' },
  footerSub: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm },
  devBlock: { marginTop: Spacing.md, alignItems: 'center', paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  devLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, letterSpacing: 1, textAlign: 'center', marginBottom: 2 },
  devName: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.ink, textAlign: 'center', marginBottom: 1 },
  devCo: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },
  watermark: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  watermarkText: {
    fontSize: FontSize.xs,
    color: Colors.faint,
    letterSpacing: 1,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
