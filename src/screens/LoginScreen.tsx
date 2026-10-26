import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Mail, Lock, LogIn, Leaf } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

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
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) Alert.alert('Login Failed', error);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) Alert.alert('Google Sign-In Failed', error);
  };

  return (
    <LinearGradient colors={['#1B2F29', '#2D5A27', '#1B5E20']} style={styles.gradient}>
      <View style={[styles.safe, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            {/* Logo / Header */}
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Leaf color={Colors.white} size={40} />
              </View>
              <Text style={styles.appName}>BioLens</Text>
              <Text style={styles.tagline}>By Jungle Tak</Text>
              <Text style={styles.subtitle}>Field Intelligence Platform</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>AGENT LOGIN</Text>
              <Text style={styles.cardSub}>Sign in to your field account</Text>

              {/* Google Button */}
              <TouchableOpacity style={styles.googleBtn} onPress={handleGoogle} disabled={googleLoading} activeOpacity={0.85}>
                {googleLoading ? (
                  <ActivityIndicator color={Colors.textPrimary} size="small" />
                ) : (
                  <>
                    <Text style={styles.googleIcon}>G</Text>
                    <Text style={styles.googleText}>Continue with Google</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Email */}
              <View style={styles.inputWrapper}>
                <Mail color={Colors.textLight} size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={Colors.textPlaceholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <Lock color={Colors.textLight} size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.textPlaceholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              {/* Login Button */}
              <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
                {loading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <>
                    <LogIn color={Colors.white} size={18} />
                    <Text style={styles.loginBtnText}>SIGN IN</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Sign Up Link */}
              <TouchableOpacity style={styles.signupLink} onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.signupLinkText}>
                  New agent?{' '}
                  <Text style={styles.signupLinkBold}>CREATE ACCOUNT</Text>
                </Text>
              </TouchableOpacity>

              {/* Terms */}
              <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
                <Text style={styles.termsText}>
                  By continuing you agree to our{' '}
                  <Text style={styles.termsLink}>Terms & Agent Responsibility</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>Validated By Jungle Tak Biolens Engine v1.0</Text>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.lg },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md,
  },
  appName: { fontSize: FontSize.display, fontWeight: '800', color: Colors.white, letterSpacing: 2 },
  tagline: { fontSize: FontSize.md, color: 'rgba(255,255,255,0.7)', letterSpacing: 3, marginTop: 2 },
  subtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.5)', letterSpacing: 1.5, marginTop: 4 },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, width: '100%', maxWidth: 400,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primaryDark, letterSpacing: 2, textAlign: 'center' },
  cardSub: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: Spacing.lg },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md,
    paddingVertical: 14, paddingHorizontal: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  googleIcon: { fontSize: 18, fontWeight: '800', color: '#4285F4' },
  googleText: { fontSize: FontSize.base, fontWeight: '600', color: Colors.textPrimary },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md, gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
  dividerText: { fontSize: FontSize.sm, color: Colors.textMuted },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: Spacing.md, marginBottom: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: FontSize.base, color: Colors.textPrimary, paddingVertical: 14 },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: 15, gap: 8, marginTop: 4,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  loginBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.white, letterSpacing: 1.5 },
  signupLink: { alignItems: 'center', marginTop: Spacing.lg },
  signupLinkText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  signupLinkBold: { fontWeight: '700', color: Colors.primary },
  termsText: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 16 },
  termsLink: { color: Colors.primary, fontWeight: '600' },
  footer: { color: 'rgba(255,255,255,0.35)', fontSize: FontSize.xs, marginTop: Spacing.lg, letterSpacing: 1 },
});
