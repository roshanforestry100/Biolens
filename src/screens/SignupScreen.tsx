import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Image,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { Colors, Fonts } from '../constants/theme';

const LOGO = require('../../assets/logo.png');

export default function SignupScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { signUpWithEmail, signInWithGoogle } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSignup = async () => {
    if (!fullName || !email || !password) {
      Alert.alert('Error', 'Please complete every field to register.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await signUpWithEmail(email.trim(), password, fullName.trim());
    setLoading(false);
    if (error) {
      Alert.alert('Signup Failed', error);
    } else {
      Alert.alert(
        'Agent Registered',
        'Welcome to BioLens! Check your email to verify your account, then sign in.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) Alert.alert('Google Sign-In Failed', error);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
            <Text style={styles.appName}>JungleTak BioLens</Text>
            <Text style={styles.tagline}>Join the BioLens Field Network</Text>
          </View>

          <View style={styles.tabs}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <Text style={styles.tabInactive}>SIGN IN</Text>
            </TouchableOpacity>
            <View style={[styles.tab, styles.tabRight]}>
              <Text style={styles.tabActive}>SIGN UP</Text>
              <View style={styles.tabUnderline} />
            </View>
          </View>

          <Text style={styles.fieldLabel}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            placeholderTextColor={Colors.faint}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            underlineColorAndroid="transparent"
          />

          <Text style={[styles.fieldLabel, { marginTop: 22 }]}>EMAIL</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            placeholderTextColor={Colors.faint}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            underlineColorAndroid="transparent"
          />

          <Text style={[styles.fieldLabel, { marginTop: 22 }]}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum 6 characters"
            placeholderTextColor={Colors.faint}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            underlineColorAndroid="transparent"
          />

          <Text style={styles.pledge}>
            As a BioLens agent you agree to prioritise the well-being of the ecosystems you
            study and to record observations truthfully.
          </Text>

          <TouchableOpacity
            style={styles.signInBtn}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.signInText}>CREATE ACCOUNT</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogle}
            disabled={googleLoading}
            activeOpacity={0.85}
          >
            {googleLoading ? (
              <ActivityIndicator color={Colors.ink} size="small" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Terms')}
            activeOpacity={0.7}
            style={styles.termsWrap}
          >
            <Text style={styles.termsText}>
              By continuing, you agree to our{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
              {' '}and{' '}
              <Text style={styles.termsLink}>Terms of Service</Text>.
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 26, paddingTop: 28 },
  hero: { alignItems: 'center', marginBottom: 30 },
  logo: { width: 92, height: 92, borderRadius: 6 },
  appName: {
    fontFamily: Fonts.serif,
    fontSize: 30,
    fontWeight: '700',
    color: '#10231D',
    marginTop: 16,
    letterSpacing: -0.4,
  },
  tagline: { fontSize: 13, color: Colors.muted2, marginTop: 7, textAlign: 'center' },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    marginBottom: 28,
  },
  tab: { flex: 1, paddingBottom: 12 },
  tabRight: { alignItems: 'flex-end' },
  tabActive: { fontSize: 13, fontWeight: '800', color: Colors.ink, letterSpacing: 2.5 },
  tabInactive: { fontSize: 13, fontWeight: '700', color: Colors.faint, letterSpacing: 2.5 },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    right: 0,
    width: 56,
    height: 2,
    backgroundColor: Colors.ink,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted2,
    letterSpacing: 2,
    marginBottom: 6,
  },
  input: {
    fontSize: 16,
    color: Colors.ink,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
  },
  pledge: { fontSize: 11, color: Colors.faint, lineHeight: 17, marginTop: 20 },
  signInBtn: {
    backgroundColor: Colors.forest,
    borderRadius: 6,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  signInText: { color: Colors.white, fontSize: 14, fontWeight: '700', letterSpacing: 2.5 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 22, gap: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.line },
  dividerText: { fontSize: 12, color: Colors.faint, letterSpacing: 1.5 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.forest,
    borderRadius: 6,
    paddingVertical: 16,
  },
  googleIcon: { fontSize: 20, fontWeight: '800', color: '#1A73E8' },
  googleText: { fontSize: 15, fontWeight: '600', color: Colors.ink },
  termsWrap: { marginTop: 24 },
  termsText: { fontSize: 11, color: Colors.faint, textAlign: 'center', lineHeight: 17 },
  termsLink: { color: '#1F3A31', fontWeight: '600' },
});
