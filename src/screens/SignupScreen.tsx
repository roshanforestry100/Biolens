import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Mail, Lock, User, ArrowLeft, Leaf } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';

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
      Alert.alert('Error', 'You must provide either an email or phone number and a password');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { error } = await signUpWithEmail(email, password, fullName);
    setLoading(false);
    if (error) {
      Alert.alert('Signup Failed', error);
    } else {
      Alert.alert('Agent Registered', 'Welcome to BioLens! Check your email to verify your account.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    }
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

            {/* Back Button */}
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <ArrowLeft color={Colors.white} size={20} />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Leaf color={Colors.white} size={32} />
              </View>
              <Text style={styles.appName}>CREATE ACCOUNT</Text>
              <Text style={styles.subtitle}>Join the BioLens Field Network</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>AGENT REGISTRATION</Text>
              <Text style={styles.cardSub}>As a BioLens agent, you agree to prioritize the well-being of the ecosystems you study.</Text>

              {/* Google */}
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

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Full Name */}
              <View style={styles.inputWrapper}>
                <User color={Colors.textLight} size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={Colors.textPlaceholder}
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
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
                />
              </View>

              {/* Password */}
              <View style={styles.inputWrapper}>
                <Lock color={Colors.textLight} size={18} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password (min 6 characters)"
                  placeholderTextColor={Colors.textPlaceholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity style={styles.signupBtn} onPress={handleSignup} disabled={loading} activeOpacity={0.85}>
                {loading ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.signupBtnText}>CREATE ACCOUNT</Text>
                )}
              </TouchableOpacity>

              {/* Terms notice */}
              <TouchableOpacity onPress={() => navigation.navigate('Terms')}>
                <Text style={styles.termsText}>
                  By registering, you agree to the{' '}
                  <Text style={styles.termsLink}>Jungle Tak Field Directive & Agent Responsibility</Text>
                </Text>
              </TouchableOpacity>

              {/* Already have account */}
              <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.loginLinkText}>
                  Already an agent? <Text style={styles.loginLinkBold}>SIGN IN</Text>
                </Text>
              </TouchableOpacity>
            </View>

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
  scroll: { flexGrow: 1, padding: Spacing.lg },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.lg, marginTop: Spacing.sm },
  backText: { color: Colors.white, fontSize: FontSize.base },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  logoCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm,
  },
  appName: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.white, letterSpacing: 2 },
  subtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.6)', marginTop: 4, letterSpacing: 0.5 },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.xl,
    padding: Spacing.xl, width: '100%',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 16, elevation: 10,
  },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primaryDark, letterSpacing: 2, textAlign: 'center' },
  cardSub: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: 6, marginBottom: Spacing.lg, lineHeight: 18 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt, borderRadius: BorderRadius.md,
    paddingVertical: 14, borderWidth: 1, borderColor: Colors.border, gap: 10,
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
  signupBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: 15, alignItems: 'center', marginTop: 4,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  signupBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.white, letterSpacing: 1.5 },
  termsText: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 16 },
  termsLink: { color: Colors.primary, fontWeight: '600' },
  loginLink: { alignItems: 'center', marginTop: Spacing.md },
  loginLinkText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  loginLinkBold: { fontWeight: '700', color: Colors.primary },
  footer: { color: 'rgba(255,255,255,0.35)', fontSize: FontSize.xs, marginTop: Spacing.lg, textAlign: 'center', letterSpacing: 1 },
});
