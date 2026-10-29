import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Image,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Colors, Fonts } from '../constants/theme';

const LOGO = require('../../assets/logo.png');

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    const { error } = await signInWithEmail(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert('Login Failed', error);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) Alert.alert('Google Sign-In Failed', error);
  };

  const handleForgot = async () => {
    if (!email.trim()) {
      Alert.alert('Reset Password', 'Enter your email address first, then tap Forgot Password.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: 'jungletakbiolens://auth/callback',
    });
    Alert.alert(
      'Reset Password',
      error ? error.message : `A reset link has been sent to ${email.trim()}.`
    );
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
            <Text style={styles.tagline}>Forest Intelligence &amp; Botanical Identification</Text>
          </View>

          <View style={styles.tabs}>
            <View style={styles.tab}>
              <Text style={styles.tabActive}>SIGN IN</Text>
              <View style={styles.tabUnderline} />
            </View>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => navigation.navigate('Signup')}
              activeOpacity={0.7}
            >
              <Text style={styles.tabInactive}>SIGN UP</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>EMAIL</Text>
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
            placeholder="Enter your password"
            placeholderTextColor={Colors.faint}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            underlineColorAndroid="transparent"
          />

          <TouchableOpacity style={styles.forgot} onPress={handleForgot} activeOpacity={0.7}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.signInBtn}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <Text style={styles.signInText}>SIGN IN</Text>
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
  hero: { alignItems: 'center', marginBottom: 34 },
  logo: { width: 104, height: 104, borderRadius: 6 },
  appName: {
    fontFamily: Fonts.serif,
    fontSize: 34,
    fontWeight: '700',
    color: '#10231D',
    marginTop: 18,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: Colors.muted2,
    marginTop: 8,
    textAlign: 'center',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    marginBottom: 30,
  },
  tab: { flex: 1, alignItems: 'flex-start', paddingBottom: 12 },
  tabActive: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.ink,
    letterSpacing: 2.5,
  },
  tabInactive: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.faint,
    letterSpacing: 2.5,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -1,
    left: 0,
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
  forgot: { alignSelf: 'flex-end', marginTop: 14 },
  forgotText: { fontSize: 13, color: '#1F3A31' },
  signInBtn: {
    backgroundColor: Colors.forest,
    borderRadius: 6,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 26,
  },
  signInText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 3,
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24, gap: 14 },
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
  termsWrap: { marginTop: 26 },
  termsText: {
    fontSize: 11,
    color: Colors.faint,
    textAlign: 'center',
    lineHeight: 17,
  },
  termsLink: { color: '#1F3A31', fontWeight: '600' },
});
