import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Globe, Mail, Leaf, Users, Zap } from 'lucide-react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

// Exact text recovered from APK binary
const ABOUT_CONTENT = {
  biolens: `BioLens represents our primary digital field intelligence initiative, designed to empower both dedicated conservationists and nature enthusiasts. It functions as a powerful tool for the seamless identification and logging of botanical species in real-time, helping users observe and interact with the biodiversity surrounding them.`,
  ecosystem: `Beyond the BioLens project, our broader ecosystem includes India's first dedicated forest-based news platform and highly specialized GIS consultancy services. These initiatives are driven by the foundational vision and leadership of our team.`,
  mission: `We aim to transform how people observe and interact with the biodiversity surrounding them.`,
  agentResponsibility: `To the Jungle Tak Field Directive. These protocols ensure that our technological exploration of the natural world remains ethical, safe, and respectful of all living systems.`,
  contact: `We're here to help. Reach out to the Jungle Tak team through any of the channels below.`,
};

const TEAM = [
  { name: 'Ashish Mehar', role: 'Founder & Vision Lead', note: 'Foundational vision and leadership' },
  { name: 'Tech Lead', role: 'System Architecture', note: 'Technical system architecture and ongoing digital development' },
];

const IMPACT = [
  { label: 'TOTAL FIELD HOURS', value: '256+' },
  { label: 'UNIQUE SPECIES DIVERSITY', value: '78+' },
  { label: 'REGIONS COVERED', value: '12+' },
  { label: 'BIOSIGNATURES LOGGED', value: '100+' },
];

export default function AboutScreen() {
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
          <View style={styles.logoRow}>
            <View style={styles.logo}>
              <Leaf color={Colors.white} size={32} />
            </View>
            <View>
              <Text style={styles.appName}>BIOLENS</Text>
              <Text style={styles.appBy}>By Jungle Tak</Text>
            </View>
          </View>
          <Text style={styles.version}>Field Edition v1.0.0 · Jungle Tak Engine v1.0</Text>
        </LinearGradient>

        {/* ABOUT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ABOUT JUNGLE TAK MULTIVENTURE PVT. LTD.</Text>
          <Text style={styles.body}>{ABOUT_CONTENT.biolens}</Text>
          <Text style={[styles.body, { marginTop: 12 }]}>{ABOUT_CONTENT.ecosystem}</Text>
        </View>

        {/* THE BIOLENS ECOSYSTEM IMPACT SUMMARY */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THE BIOLENS ECOSYSTEM IMPACT SUMMARY</Text>
          <View style={styles.impactGrid}>
            {IMPACT.map((item, i) => (
              <View key={i} style={styles.impactCard}>
                <Text style={styles.impactVal}>{item.value}</Text>
                <Text style={styles.impactLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* THE CORE TEAM */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>THE CORE TEAM</Text>
          {TEAM.map((member, i) => (
            <View key={i} style={styles.teamCard}>
              <View style={styles.teamAvatar}>
                <Users color={Colors.primary} size={20} />
              </View>
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{member.name}</Text>
                <Text style={styles.teamRole}>{member.role}</Text>
                <Text style={styles.teamNote}>{member.note}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* OTHER JUNGLE TAK PROJECTS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>OTHER JUNGLE TAK PROJECTS</Text>
          <View style={styles.projectCard}>
            <Zap color={Colors.primary} size={18} />
            <View style={styles.projectText}>
              <Text style={styles.projectName}>Invasive Species Tracking</Text>
              <Text style={styles.projectDesc}>Regional conservation directives and active field management</Text>
            </View>
          </View>
          <View style={styles.projectCard}>
            <Globe color={Colors.blue} size={18} />
            <View style={styles.projectText}>
              <Text style={styles.projectName}>Forest-Based News Platform</Text>
              <Text style={styles.projectDesc}>{'India\u2019s first dedicated forest intelligence news network'}</Text>
            </View>
          </View>
        </View>

        {/* CONTACT */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>CONTACT JUNGLE TAK</Text>
          <Text style={styles.body}>{ABOUT_CONTENT.contact}</Text>
          <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('https://jungletak.in')}>
            <Globe color={Colors.primary} size={18} />
            <Text style={styles.contactLink}>www.jungletak.in</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactRow} onPress={() => Linking.openURL('mailto:support@jungletak.in')}>
            <Mail color={Colors.primary} size={18} />
            <Text style={styles.contactLink}>support@jungletak.in</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy */}
        <TouchableOpacity style={styles.privacyRow} onPress={() => Linking.openURL('https://jungletak.in/privacy-policy')}>
          <Text style={styles.privacyText}>Privacy Policy · jungletak.in/privacy-policy</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>Validated By Jungle Tak Biolens Engine v1.0</Text>
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
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm },
  logo: {
    width: 60, height: 60, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  appName: { fontSize: FontSize.xxxl, fontWeight: '900', color: Colors.white, letterSpacing: 3 },
  appBy: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.6)', letterSpacing: 2 },
  version: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
  section: { paddingHorizontal: Spacing.lg, marginTop: Spacing.lg },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.5, marginBottom: 10 },
  body: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 22 },
  impactGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  impactCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, width: '47.5%', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  impactVal: { fontSize: FontSize.xxl, fontWeight: '800', color: Colors.primary },
  impactLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1, marginTop: 4, textAlign: 'center' },
  teamCard: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  teamAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.successLight, alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  teamInfo: { flex: 1 },
  teamName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary },
  teamRole: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600', marginTop: 2 },
  teamNote: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 3, lineHeight: 16 },
  projectCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.borderLight,
  },
  projectText: { flex: 1 },
  projectName: { fontSize: FontSize.base, fontWeight: '700', color: Colors.textPrimary },
  projectDesc: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 3, lineHeight: 16 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  contactLink: { fontSize: FontSize.base, color: Colors.primary, fontWeight: '600' },
  privacyRow: { alignItems: 'center', margin: Spacing.lg },
  privacyText: { fontSize: FontSize.xs, color: Colors.textMuted },
  footer: { textAlign: 'center', fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.md },
});
