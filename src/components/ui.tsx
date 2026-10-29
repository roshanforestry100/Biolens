import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';

const LOGO = require('../../assets/logo.png');

/** Logo + screen title lockup used at the top of the Scan screen. */
export function BrandHeader({ title = 'BioLens Acquisition' }: { title?: string }) {
  return (
    <View style={styles.wrap}>
      <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      <View style={styles.textWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          FOREST INTELLIGENCE DIRECTIVE — BIOLENS{'\n'}ENGINE V1.0
        </Text>
      </View>
    </View>
  );
}

/** Uppercase, letter-spaced label ("EMAIL", "APPLICATION", ...). */
export function Eyebrow({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

/** Full-width primary action button (deep forest fill). */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: object;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.85}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.primaryBtn, (disabled || loading) && styles.primaryBtnDisabled, style]}
    >
      <Text style={styles.primaryBtnText}>{loading ? 'PLEASE WAIT…' : label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  logo: { width: 46, height: 46, marginRight: 12, borderRadius: 4 },
  textWrap: { flex: 1, paddingTop: 2 },
  title: {
    fontSize: 25,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 4,
    fontSize: FontSize.xs,
    color: Colors.muted2,
    letterSpacing: 1.6,
    lineHeight: 14,
    fontWeight: '600',
  },
  eyebrow: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.muted2,
    letterSpacing: 1.8,
  },
  primaryBtn: {
    backgroundColor: Colors.forest,
    paddingVertical: 17,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: FontSize.base,
    fontWeight: '700',
    letterSpacing: 2,
  },
  primaryBtnDisabled: { backgroundColor: Colors.line },
});
