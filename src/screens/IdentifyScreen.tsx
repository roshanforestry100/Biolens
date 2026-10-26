import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Linking,
  StatusBar, ActivityIndicator, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat,
  withTiming, Easing, withSequence,
} from 'react-native-reanimated';
import {
  ScanLine, Camera, Image as ImageIcon, X, Zap,
} from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { identifyPlant, enrichPlant, prepareImage } from '../lib/plantnet';
import { saveScan } from '../lib/storage';
import { ScanResult } from '../types';

// Exact scanning phase messages recovered from the APK binary.
const SCAN_PHASES = [
  'Scanning morphological markers... We are isolating leaf arrangement, floral structure, and venation patterns to create a unique physiological profile for this specimen.',
  'Synthesizing taxonomic positioning... Our system is currently mapping the phylogenetic relationship of this species within established botanical hierarchies to ensure precise rank classification.',
  'Retrieving botanical literature... Compiling the ecological and regulatory profile for this specimen.',
];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function IdentifyScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [mode, setMode] = useState<'camera' | 'preview'>('camera');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState(0);
  const [scanMessage, setScanMessage] = useState('');

  // Animation values
  const scanLineY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const startScanAnimation = () => {
    scanLineY.value = 0;
    scanLineY.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.linear }),
      -1,
      false
    );
    opacity.value = withRepeat(withSequence(
      withTiming(0.4, { duration: 700 }),
      withTiming(1, { duration: 700 }),
    ), -1, true);
    scale.value = withRepeat(withSequence(
      withTiming(1.03, { duration: 1000 }),
      withTiming(1, { duration: 1000 }),
    ), -1, true);
  };

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value * 260 }],
  }));
  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const frameStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setMode('preview');
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err?.message || 'Could not capture the image.');
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setCapturedUri(result.assets[0].uri);
        setMode('preview');
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Could not open the gallery.');
    }
  };

  const resetCapture = () => {
    setCapturedUri(null);
    setMode('camera');
    setScanning(false);
    setScanPhase(0);
    setScanMessage('');
  };

  const runIdentification = async () => {
    if (!capturedUri) {
      Alert.alert('No Sample', 'Please capture or upload a plant image first.');
      return;
    }
    if (!user) {
      Alert.alert('Sign In Required', 'Sign in to save field observations.');
      return;
    }

    setScanning(true);
    setScanPhase(0);
    setScanMessage(SCAN_PHASES[0]);
    startScanAnimation();

    try {
      // Resize/compress exactly like the original client (width 1280, JPEG 80%).
      const prepared = await prepareImage(capturedUri);

      setScanPhase(0);
      setScanMessage(SCAN_PHASES[0]);
      const [identified] = await Promise.all([
        identifyPlant(prepared.base64),
        sleep(1200),
      ]);

      if (!identified?.scientific_name) {
        throw new Error('No species match found. Try a clearer image.');
      }

      const scientificName = identified.scientific_name;
      const commonName = identified.common_name || 'Unknown Species';
      const confidence = Math.round(
        Number(identified.final_confidence ?? identified.confidence ?? 0)
      );
      const region = identified.region_valid ? 'India Match' : 'Outside India';

      setScanPhase(1);
      setScanMessage(SCAN_PHASES[1]);
      const [enrichment] = await Promise.all([
        enrichPlant(scientificName),
        sleep(900),
      ]);

      setScanPhase(2);
      setScanMessage(SCAN_PHASES[2]);
      await sleep(600);

      const payload: Record<string, any> = {
        ...identified,
        confidence,
        commonName,
        common_name: commonName,
        scientific_name: scientificName,
        region,
        imageUri: prepared.uri,
        // Nested block expected by the original stats/report logic.
        basic: enrichment,
        overview: enrichment.overview,
        description: enrichment.overview,
        family: enrichment.family,
        genus: enrichment.genus,
        conservation_status: enrichment.conservation_status,
        regulatory_status: enrichment.invasive_threat_status,
        invasive_threat_status: enrichment.invasive_threat_status,
        native_status: enrichment.native_status,
        ecological_role: enrichment.ecological_role,
      };

      const saved = await saveScan(payload);

      const scan: ScanResult = {
        ...(payload as any),
        ...saved,
        id: saved.id,
        created_at: saved.created_at,
      };

      setScanning(false);
      resetCapture();
      navigation.navigate('Result', { scan });
    } catch (err: any) {
      setScanning(false);
      const msg =
        err?.message || 'Botanical identification failed. Please try a clearer image.';
      Alert.alert('Identification Failed', msg, [
        { text: 'Retry', onPress: resetCapture },
        { text: 'OK' },
      ]);
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Camera color={Colors.textMuted} size={48} />
        <Text style={styles.permTitle}>Camera Access Required</Text>
        <Text style={styles.permText}>
          BioLens requires camera access to identify plants in the field.
        </Text>
        <TouchableOpacity
          style={styles.permBtn}
          onPress={async () => {
            if (permission.canAskAgain) {
              await requestPermission();
            } else {
              Linking.openSettings();
            }
          }}
        >
          <Text style={styles.permBtnText}>
            {permission.canAskAgain ? 'GRANT ACCESS' : 'OPEN SETTINGS'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permSecondary} onPress={pickImage}>
          <Text style={styles.permSecondaryText}>UPLOAD FROM GALLERY INSTEAD</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {mode === 'camera' && (
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          {/* Header */}
          <View style={[styles.camHeader, { paddingTop: insets.top + Spacing.lg }]}>
            <Text style={styles.camTitle}>BIOLOGICAL SAMPLE ACQUISITION</Text>
            <Text style={styles.camSub}>Point camera at plant or species</Text>
          </View>

          {/* Scan frame */}
          <View style={styles.frameContainer}>
            <Animated.View style={[styles.scanFrame, frameStyle]}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </Animated.View>
          </View>

          {/* Controls */}
          <View style={[styles.camControls, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
            <TouchableOpacity style={styles.galleryBtn} onPress={pickImage}>
              <ImageIcon color={Colors.white} size={22} />
              <Text style={styles.galleryText}>UPLOAD SAMPLE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>
            <View style={styles.galleryBtn} />
          </View>
        </CameraView>
      )}

      {mode === 'preview' && capturedUri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} />

          {/* Scanning overlay */}
          {scanning && (
            <Animated.View style={[styles.scanOverlay, overlayStyle]}>
              <View style={styles.scanContent}>
                <Animated.View style={[styles.scanLineBar, scanLineStyle]} />
                <View style={styles.scanTextBox}>
                  <ScanLine color={Colors.accent} size={28} />
                  <Text style={styles.scanPhaseNum}>PHASE {scanPhase + 1}/3</Text>
                  <Text style={styles.scanMsg}>{scanMessage}</Text>
                  <ActivityIndicator color={Colors.accent} size="small" style={{ marginTop: 12 }} />
                </View>
              </View>
            </Animated.View>
          )}

          {/* Preview controls */}
          {!scanning && (
            <View style={styles.previewControls}>
              <View style={[styles.previewHeader, { paddingTop: insets.top }]}>
                <TouchableOpacity style={styles.retakeBtn} onPress={resetCapture}>
                  <X color={Colors.white} size={20} />
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.previewFooter, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
                <Text style={styles.previewLabel}>FIELD INTELLIGENCE SNAPSHOT</Text>
                <Text style={styles.previewSub}>Nature is complex. While BioLens provides advanced morphological analysis, we do not guarantee 100% accuracy.</Text>
                <TouchableOpacity style={styles.identifyBtn} onPress={runIdentification}>
                  <Zap color={Colors.white} size={20} />
                  <Text style={styles.identifyBtnText}>INITIATE IDENTIFICATION</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  camHeader: {
    alignItems: 'center', paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  camTitle: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.white, letterSpacing: 2 },
  camSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  frameContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scanFrame: { width: 260, height: 260, position: 'relative' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: Colors.accent, borderWidth: 3 },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  camControls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl, paddingTop: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  galleryBtn: { alignItems: 'center', width: 80 },
  galleryText: { fontSize: FontSize.xs, color: Colors.white, marginTop: 4, letterSpacing: 0.5 },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
  },
  captureBtnInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: Colors.white },
  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, backgroundColor: Colors.background },
  permTitle: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.md },
  permText: { fontSize: FontSize.base, color: Colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  permBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, paddingVertical: 14, paddingHorizontal: Spacing.xl, marginTop: Spacing.lg },
  permBtnText: { fontSize: FontSize.base, fontWeight: '700', color: Colors.white, letterSpacing: 1 },
  permSecondary: { marginTop: Spacing.md, padding: Spacing.sm },
  permSecondaryText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.primary, letterSpacing: 1 },
  previewContainer: { flex: 1 },
  previewImage: { ...StyleSheet.absoluteFill },
  scanOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(27,47,41,0.85)', justifyContent: 'center', alignItems: 'center' },
  scanContent: { width: '100%', alignItems: 'center' },
  scanLineBar: { width: '80%', height: 2, backgroundColor: Colors.accent, opacity: 0.8 },
  scanTextBox: { backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: BorderRadius.lg, padding: Spacing.xl, margin: Spacing.xl, alignItems: 'center', borderWidth: 1, borderColor: Colors.accent + '40' },
  scanPhaseNum: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.accent, letterSpacing: 2, marginTop: 12, marginBottom: 8 },
  scanMsg: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 20 },
  previewControls: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },
  previewHeader: { backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: Spacing.lg },
  retakeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12 },
  retakeText: { color: Colors.white, fontSize: FontSize.base },
  previewFooter: { backgroundColor: 'rgba(27,47,41,0.9)', padding: Spacing.xl },
  previewLabel: { fontSize: FontSize.xs, fontWeight: '800', color: Colors.accent, letterSpacing: 2, marginBottom: 8 },
  previewSub: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)', lineHeight: 16, marginBottom: Spacing.lg },
  identifyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: 16, gap: 10,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 8, elevation: 6,
  },
  identifyBtnText: { fontSize: FontSize.base, fontWeight: '800', color: Colors.white, letterSpacing: 1.5 },
});
