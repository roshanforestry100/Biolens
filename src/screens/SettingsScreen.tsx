import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Info, ShieldCheck, BookOpen, Mail, ChevronRight } from 'lucide-react-native';

import { Colors, Fonts, Spacing } from '../constants/theme';

const ROWS = [
  {
    key: 'about',
    icon: Info,
    title: 'About Jungle Tak',
    subtitle: 'Our mission and team',
    route: 'About',
  },
  {
    key: 'privacy',
    icon: ShieldCheck,
    title: 'Privacy Policy',
    subtitle: 'How we protect your data',
    route: 'Privacy',
  },
  {
    key: 'ethics',
    icon: BookOpen,
    title: 'Field Protocols & Ethics',
    subtitle: 'Mission & stewardship guidelines',
    route: 'Terms',
  },
  {
    key: 'contact',
    icon: Mail,
    title: 'Contact Us',
    subtitle: 'Get in touch with support',
    route: null,
  },
];

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const open = async (row: (typeof ROWS)[number]) => {
    if (row.route) {
      navigation.navigate(row.route);
      return;
    }
    const url = 'mailto:support@jungletak.in?subject=BioLens%20Support';
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Contact Us', 'Reach the field support team at support@jungletak.in');
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 18 }]}>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>PREFERENCES &amp; LEGAL</Text>
        </View>

        <View style={styles.card}>
          {ROWS.map((row, index) => (
            <TouchableOpacity
              key={row.key}
              style={[styles.row, index < ROWS.length - 1 && styles.rowDivider]}
              onPress={() => open(row)}
              activeOpacity={0.75}
            >
              <View style={styles.iconWrap}>
                <row.icon color={Colors.ink} size={20} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
              </View>
              <ChevronRight color={Colors.faint} size={18} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerVersion}>JungleTak BioLens v1.0.0</Text>
          <Text style={styles.footerEdition}>FIELD EDITION — INDIA DIRECTIVE</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: 26 },
  title: {
    fontFamily: Fonts.serif,
    fontSize: 36,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted2,
    letterSpacing: 2,
    marginTop: 8,
  },
  card: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.line,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: Colors.lineSoft },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '700', color: Colors.ink },
  rowSubtitle: { fontSize: 12, color: Colors.muted2, marginTop: 2 },
  footer: { alignItems: 'center', marginTop: 42 },
  footerVersion: { fontSize: 13, fontWeight: '600', color: Colors.muted2 },
  footerEdition: {
    fontSize: 9.5,
    color: Colors.faint,
    letterSpacing: 1.6,
    marginTop: 8,
  },
});
