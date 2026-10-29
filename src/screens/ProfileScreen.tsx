import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image,
  StatusBar, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import {
  Camera, Pencil, Star, Clock, ShieldCheck, ChevronRight, LogOut, X,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Colors, Spacing } from '../constants/theme';
import { getUserScans, getStats, BioLensStats } from '../lib/storage';
import { ScanResult } from '../types';

const LOGO = require('../../assets/logo.png');
const AVATAR_KEY = '@biolens_avatar';
const FIELD_MODE_KEY = '@biolens_field_mode';

function rankForStars(stars: number): string {
  if (stars >= 10) return 'SENIOR ECOLOGIST';
  if (stars >= 6) return 'RESEARCH ANALYST';
  if (stars >= 3) return 'ANALYST CLASS';
  if (stars >= 1) return 'FIELD ANALYST';
  return 'FIELD RECRUIT';
}

function fieldHours(scans: number): string {
  const hours = scans * 0.25;
  if (!Number.isFinite(hours) || hours <= 0) return '0h';
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)}h`;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [scans, setScans] = useState<ScanResult[]>([]);
  const [stats, setStats] = useState<BioLensStats | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [fieldMode, setFieldMode] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const meta = user?.user_metadata || {};
  const [name, setName] = useState(String(meta.full_name ?? ''));
  const [age, setAge] = useState(String(meta.age ?? ''));
  const [gender, setGender] = useState(String(meta.gender ?? ''));
  const [qualification, setQualification] = useState(String(meta.qualification ?? ''));
  const [expertise, setExpertise] = useState(String(meta.expertise ?? ''));

  const load = useCallback(async () => {
    if (!user) return;
    const [data, storedAvatar, storedMode] = await Promise.all([
      getUserScans(user.id),
      AsyncStorage.getItem(AVATAR_KEY),
      AsyncStorage.getItem(FIELD_MODE_KEY),
    ]);
    const st = await getStats(data);
    setScans(data);
    setStats(st);
    setAvatar(storedAvatar);
    setFieldMode(storedMode === '1');
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const displayName =
    name || meta.full_name || user?.email?.split('@')[0] || 'Field Agent';
  const initial = (displayName || 'A').trim().charAt(0).toUpperCase();

  const uniqueSpecies =
    stats?.totalSpecies ?? new Set(scans.map((s) => s.scientific_name)).size;
  const stars = Math.floor(uniqueSpecies / 5);
  const rank = rankForStars(stars);
  const regions = stats?.totalRegions ?? 0;

  const changeAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await AsyncStorage.setItem(AVATAR_KEY, result.assets[0].uri);
      setAvatar(result.assets[0].uri);
    }
  };

  const toggleFieldMode = async () => {
    const next = !fieldMode;
    setFieldMode(next);
    await AsyncStorage.setItem(FIELD_MODE_KEY, next ? '1' : '0');
  };

  const saveCredentials = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: {
        ...meta,
        full_name: name.trim() || displayName,
        age: age.trim(),
        gender: gender.trim(),
        qualification: qualification.trim(),
        expertise: expertise.trim(),
      },
    });
    setSaving(false);
    if (error) {
      Alert.alert('Update Failed', error.message);
      return;
    }
    setEditing(false);
  };

  const handleSignOut = () => {
    Alert.alert('Terminate Session', 'Sign out of BioLens on this device?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 36 }}
      >
        <View style={[styles.hero, { paddingTop: insets.top + 24 }]}>
          <TouchableOpacity onPress={changeAvatar} activeOpacity={0.85}>
            <View style={styles.avatar}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarLetter}>{initial}</Text>
              )}
            </View>
            <View style={styles.avatarBadge}>
              <Camera color={Colors.white} size={13} />
            </View>
          </TouchableOpacity>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{displayName}</Text>
            <TouchableOpacity onPress={() => setEditing(true)} hitSlop={10}>
              <Pencil color={Colors.muted2} size={16} />
            </TouchableOpacity>
          </View>

          <View style={styles.starsRow}>
            {Array.from({ length: Math.max(stars, 1) }).map((_, i) => (
              <Star
                key={i}
                size={18}
                color={Colors.gold2}
                fill={i < stars ? Colors.gold2 : 'transparent'}
              />
            ))}
          </View>

          <View style={styles.classBadge}>
            <Text style={styles.classText}>{rank}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.fieldModeBtn, fieldMode && styles.fieldModeBtnOn]}
          onPress={toggleFieldMode}
          activeOpacity={0.8}
        >
          {fieldMode ? (
            <ShieldCheck color={Colors.forest} size={18} />
          ) : (
            <Clock color={Colors.ink} size={18} />
          )}
          <Text style={styles.fieldModeText}>
            {fieldMode ? 'FIELD MODE ACTIVE' : 'ENABLE FIELD MODE'}
          </Text>
        </TouchableOpacity>

        {/* Credentials */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardEyebrow}>AGENT CREDENTIALS</Text>
            <TouchableOpacity onPress={() => setEditing(true)} hitSlop={8}>
              <Text style={styles.updateLink}>UPDATE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.twoCol}>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>AGE</Text>
              <Text style={styles.fieldValue}>{age || '—'}</Text>
            </View>
            <View style={styles.col}>
              <Text style={styles.fieldLabel}>GENDER</Text>
              <Text style={styles.fieldValue}>{gender || '—'}</Text>
            </View>
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={styles.fieldLabel}>QUALIFICATION</Text>
            <Text style={styles.fieldValue}>{qualification || '—'}</Text>
          </View>

          <View style={{ marginTop: 20 }}>
            <Text style={styles.fieldLabel}>PRIMARY EXPERTISE</Text>
            <Text style={styles.fieldValue}>{expertise || 'General Field Research'}</Text>
          </View>
        </View>

        {/* Dossier */}
        <View style={styles.card}>
          <Text style={[styles.cardEyebrow, { textAlign: 'center' }]}>INTELLIGENCE DOSSIER</Text>
          <View style={styles.grid}>
            <View style={styles.gridCell}>
              <Text style={styles.gridValue}>{fieldHours(scans.length)}</Text>
              <Text style={styles.gridLabel}>TOTAL FIELD HOURS</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.gridValue}>{regions}</Text>
              <Text style={styles.gridLabel}>REGIONS COVERED</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.gridValue}>{uniqueSpecies}</Text>
              <Text style={styles.gridLabel}>SPECIES DIVERSITY</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.gridValue}>{stars}</Text>
              <Text style={styles.gridLabel}>STARS EARNED</Text>
            </View>
          </View>
          <Text style={styles.gridNote}>(1 Star awarded per 5 distinct species identified)</Text>
        </View>

        <View style={styles.footer}>
          <Image source={LOGO} style={styles.footerLogo} resizeMode="contain" />
          <Text style={styles.footerVersion}>JungleTak BioLens v1.0</Text>
        </View>

        <TouchableOpacity
          style={styles.privacyRow}
          onPress={() => navigation.navigate('Privacy')}
          activeOpacity={0.8}
        >
          <ShieldCheck color={Colors.ink} size={18} />
          <Text style={styles.privacyText}>PRIVACY POLICY</Text>
          <ChevronRight color={Colors.faint} size={18} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <LogOut color={Colors.red2} size={17} />
          <Text style={styles.signOutText}>TERMINATE SESSION</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Credentials editor */}
      <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AGENT CREDENTIALS</Text>
              <TouchableOpacity onPress={() => setEditing(false)} hitSlop={10}>
                <X color={Colors.ink} size={18} />
              </TouchableOpacity>
            </View>

            {[
              { label: 'FULL NAME', value: name, setter: setName },
              { label: 'AGE', value: age, setter: setAge, numeric: true },
              { label: 'GENDER', value: gender, setter: setGender },
              { label: 'QUALIFICATION', value: qualification, setter: setQualification },
              { label: 'PRIMARY EXPERTISE', value: expertise, setter: setExpertise },
            ].map((field) => (
              <View key={field.label} style={{ marginBottom: 14 }}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={field.value}
                  onChangeText={field.setter}
                  keyboardType={field.numeric ? 'number-pad' : 'default'}
                  placeholder="—"
                  placeholderTextColor={Colors.faint}
                />
              </View>
            ))}

            <TouchableOpacity
              style={styles.modalSave}
              onPress={saveCredentials}
              disabled={saving}
              activeOpacity={0.85}
            >
              <Text style={styles.modalSaveText}>{saving ? 'SAVING…' : 'SAVE CREDENTIALS'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  hero: { alignItems: 'center', paddingBottom: 8 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#8E44AD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
  avatarLetter: { color: Colors.white, fontSize: 42, fontWeight: '400' },
  avatarBadge: {
    position: 'absolute',
    right: -2,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2A2E2B',
    borderWidth: 2,
    borderColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  name: { fontSize: 24, fontWeight: '700', color: Colors.ink },
  starsRow: { flexDirection: 'row', gap: 3, marginTop: 8, minHeight: 18 },
  classBadge: {
    backgroundColor: Colors.forest,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 2,
    marginTop: 10,
  },
  classText: { color: Colors.white, fontSize: 10, fontWeight: '700', letterSpacing: 1.6 },
  fieldModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.paperDeep,
    marginHorizontal: Spacing.lg,
    marginTop: 20,
    marginBottom: 14,
    paddingVertical: 16,
    borderRadius: 6,
  },
  fieldModeBtnOn: { backgroundColor: '#E3EEE6' },
  fieldModeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 1.6,
  },
  card: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    marginBottom: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: 18,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  cardEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.muted2,
    letterSpacing: 1.5,
  },
  updateLink: { fontSize: 10, fontWeight: '800', color: Colors.ink, letterSpacing: 1.2 },
  twoCol: { flexDirection: 'row', gap: 24 },
  col: { flex: 1 },
  fieldLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Colors.faint,
    letterSpacing: 1.4,
    marginBottom: 5,
  },
  fieldValue: { fontSize: 16, fontWeight: '600', color: Colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 14 },
  gridCell: {
    width: '50%',
    backgroundColor: '#F7F6F1',
    borderWidth: 1,
    borderColor: Colors.lineSoft,
    paddingVertical: 18,
    alignItems: 'center',
  },
  gridValue: { fontSize: 24, fontWeight: '500', color: Colors.ink },
  gridLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.muted2,
    letterSpacing: 1,
    marginTop: 6,
    textAlign: 'center',
  },
  gridNote: {
    fontSize: 10,
    fontStyle: 'italic',
    color: Colors.faint,
    textAlign: 'center',
    marginTop: 16,
  },
  footer: { alignItems: 'center', marginTop: 10, marginBottom: 16 },
  footerLogo: { width: 30, height: 30, opacity: 0.8 },
  footerVersion: { fontSize: 10, color: Colors.faint, marginTop: 6 },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.line,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  privacyText: { flex: 1, fontSize: 11.5, fontWeight: '700', color: Colors.ink, letterSpacing: 1.4 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginTop: 14,
    paddingVertical: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2B7B1',
    backgroundColor: '#FDF6F5',
  },
  signOutText: { fontSize: 11.5, fontWeight: '700', color: Colors.red2, letterSpacing: 1.4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(18,20,18,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 20,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalTitle: { fontSize: 11, fontWeight: '800', color: Colors.ink, letterSpacing: 1.4 },
  modalInput: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    paddingVertical: 6,
    fontSize: 15,
    color: Colors.ink,
  },
  modalStatic: { fontSize: 15, fontWeight: '600', color: Colors.muted2, paddingVertical: 6 },
  modalSave: {
    backgroundColor: Colors.forest,
    borderRadius: 6,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSaveText: { color: Colors.white, fontSize: 12, fontWeight: '700', letterSpacing: 1.6 },
});
