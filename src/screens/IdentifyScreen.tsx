import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Modal, Alert,
  StatusBar, ActivityIndicator, ScrollView, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { X } from 'lucide-react-native';

import { useAuth } from '../context/AuthContext';
import { Colors, Fonts, Spacing } from '../constants/theme';
import { BrandHeader } from '../components/ui';
import { identifyPlant, prepareImage } from '../lib/plantnet';
import { buildScientificProfile } from '../lib/profile-builder';
import { analyzeImage } from '../lib/image-analysis';
import { saveScan } from '../lib/storage';
import { ScanResult } from '../types';

const ORGANS = ['leaf', 'flower', 'fruit', 'bark'] as const;
type Organ = (typeof ORGANS)[number];

// Probe log shown by the scanning overlay, in the original UI's style.
const SCAN_LOG = [
  'Initializing BioLens Engine...',
  'Processing binary sample...',
  'Matching morphological structure...',
  'Retrieving botanical literature...',
];

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function IdentifyScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [organ, setOrgan] = useState<Organ>('leaf');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Gallery Error', err?.message || 'Could not open the gallery.');
    }
  };

  const openCamera = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) {
        Alert.alert(
          'Camera Access Required',
          'Allow camera access to photograph specimens, or upload a sample from your gallery.',
          [
            { text: 'Upload Sample', onPress: pickFromGallery },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }
    }
    setCameraOpen(true);
  };

  const capture = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) {
        setImageUri(photo.uri);
        setCameraOpen(false);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err?.message || 'Could not capture the image.');
    }
  };

  const runIdentification = async () => {
    if (!imageUri) {
      Alert.alert('No Sample', 'Upload or capture a plant sample first.');
      return;
    }
    if (!user) {
      Alert.alert('Sign In Required', 'Sign in to record field observations.');
      return;
    }
    if (scanning) return;

    setScanning(true);
    setScanStep(0);

    try {
      const prepared = await prepareImage(imageUri);
      setScanStep(1);

      const [identified] = await Promise.all([
        identifyPlant(prepared.base64, organ),
        sleep(1400),
      ]);

      if (!identified?.scientific_name) {
        throw new Error('No species match found. Try a clearer image or another organ.');
      }

      setScanStep(2);

      const scientificName = identified.scientific_name;
      const commonName = identified.common_name || 'Unknown Species';
      const confidence = Math.round(
        Number(identified.confidence ?? 0)
      );
      const region = 'Outside India';

      // Run image analysis on the submitted photograph
      const imageObservations = await analyzeImage(prepared.uri);

      // Build the full scientific profile through the pipeline:
      // PlantNet → GBIF → Botanical Research → LLM → Validation
      const profile = await buildScientificProfile(identified, imageObservations);

      setScanStep(3);

      const {
        overview,
        distinctive_characteristics,
        native_range,
        key_facts,
        quick_facts,
        taxonomy,
        morphology,
        adaptations,
        habitat_distribution,
        ecology,
        reproduction,
        anatomy_physiology,
        phytochemistry,
        economic,
        research_conservation,
        dataGaps,
        accepted_name,
        author_citation,
        validation,
      } = profile;

      const familyValue = taxonomy.find((f) => f.label === 'FAMILY')?.value || '';
      const genusValue = taxonomy.find((f) => f.label === 'GENUS')?.value || '';
      const invasiveField = ecology.find((f) => f.label === 'INVASIVE STATUS');
      const invasiveStatus = invasiveField?.value || 'Not assessed';
      const isInvasive = invasiveStatus === 'Invasive';

      const payload: Record<string, any> = {
        ...identified,
        organ,
        confidence,
        commonName,
        common_name: commonName,
        scientific_name: scientificName,
        region,
        imageUri: prepared.uri,
        basic: {
          overview,
          family: familyValue,
          genus: genusValue,
          native_status: isInvasive ? 'Invasive' : 'Native',
          invasive_threat_status: isInvasive ? 'Invasive' : 'Not Invasive',
          conservation_status: ecology.find((f) => f.label === 'CONSERVATION STATUS')?.value || 'Not Evaluated',
          ecological_role: ecology.find((f) => f.label === 'ECOSYSTEM ROLE')?.value || '',
          regions: native_range ? [native_range] : [],
          uses: economic.find((f) => f.label === 'ECONOMIC AND AGRICULTURAL IMPORTANCE')?.value ? [economic.find((f) => f.label === 'ECONOMIC AND AGRICULTURAL IMPORTANCE')?.value] : [],
          source: 'NVIDIA LLM + GBIF + POWO + Wikipedia',
          note: 'Elaborated using NVIDIA NIM LLM from GBIF, POWO, and Wikipedia open sources.',
        },
        overview,
        description: overview,
        family: familyValue,
        genus: genusValue,
        conservation_status: ecology.find((f) => f.label === 'CONSERVATION STATUS')?.value || 'Not Evaluated',
        regulatory_status: invasiveStatus,
        invasive_threat_status: invasiveStatus,
        native_status: isInvasive ? 'Invasive' : 'Native',
        ecological_role: ecology.find((f) => f.label === 'ECOSYSTEM ROLE')?.value || '',
        species_profile: {
          accepted_name: { value: accepted_name, citation: null, is_documented: true, evidence_category: 'verified' },
          author_citation: { value: author_citation || '', citation: null, is_documented: true, evidence_category: 'verified' },
          family: { value: familyValue, citation: null, is_documented: true, evidence_category: 'verified' },
          genus: { value: genusValue, citation: null, is_documented: true, evidence_category: 'verified' },
          conservation_status: { value: ecology.find((f) => f.label === 'CONSERVATION STATUS')?.value || 'Not Evaluated', citation: null, is_documented: true, evidence_category: 'verified' },
          invasive_status: { value: invasiveStatus, citation: null, is_documented: true, evidence_category: 'verified' },
          ecosystem_role: { value: ecology.find((f) => f.label === 'ECOSYSTEM ROLE')?.value || '', citation: null, is_documented: true, evidence_category: 'verified' },
          growth_habit: { value: morphology.find((f) => f.label === 'GROWTH HABIT')?.value || '', citation: null, is_documented: true, evidence_category: 'verified' },
          habitat: { value: habitat_distribution.find((f) => f.label === 'HABITAT')?.value || '', citation: null, is_documented: true, evidence_category: 'verified' },
          native_distribution: { value: native_range || '', citation: null, is_documented: true, evidence_category: 'verified' },
          agricultural_importance: { value: economic.find((f) => f.label === 'ECONOMIC AND AGRICULTURAL IMPORTANCE')?.value || '', citation: null, is_documented: true, evidence_category: 'verified' },
        },
        image_observations: imageObservations,
        // Full enriched profile for Scientific Mode
        enriched_profile: {
          overview,
          distinctive_characteristics,
          native_range,
          key_facts,
          quick_facts,
          taxonomy,
          morphology,
          adaptations,
          habitat_distribution,
          ecology,
          reproduction,
          anatomy_physiology,
          phytochemistry,
          economic,
          research_conservation,
          dataGaps,
          accepted_name,
          author_citation,
          identification_confidence: confidence,
          validation,
        },
      };

      const saved = await saveScan(payload);

      const scan: ScanResult = {
        ...(payload as any),
        ...saved,
        id: saved.id,
        created_at: saved.created_at,
      };

      setScanning(false);
      setScanStep(0);
      setImageUri(null);
      navigation.navigate('Result', { scan });
    } catch (err: any) {
      setScanning(false);
      setScanStep(0);
      Alert.alert(
        'Identification Failed',
        err?.message || 'Botanical identification failed. Please try a clearer image.'
      );
    }
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingTop: insets.top }}>
          <BrandHeader />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>BIOLOGICAL SAMPLE ACQUISITION</Text>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={pickFromGallery} activeOpacity={0.75}>
              <Text style={styles.actionText}>UPLOAD SAMPLE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={openCamera} activeOpacity={0.75}>
              <Text style={styles.actionText}>OPEN CAMERA</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.preview}
            activeOpacity={0.9}
            onPress={pickFromGallery}
          >
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                <Text style={styles.previewStamp}>BIOLENS ENGINE READY</Text>
              </>
            ) : (
              <View style={styles.awaiting}>
                <View style={[styles.corner, styles.cornerTL]} />
                <View style={[styles.corner, styles.cornerTR]} />
                <View style={[styles.corner, styles.cornerBL]} />
                <View style={[styles.corner, styles.cornerBR]} />
                <Text style={styles.awaitingText}>Awaiting Plant Sample...</Text>
                <View style={styles.awaitingRule} />
                <Text style={styles.readyText}>BIOLENS ENGINE READY</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.organRow}>
            {ORGANS.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.organTab}
                onPress={() => setOrgan(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.organText, organ === item && styles.organTextActive]}>
                  {item.toUpperCase()}
                </Text>
                {organ === item && <View style={styles.organUnderline} />}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.scanBtn} onPress={runIdentification} activeOpacity={0.9}>
            <Text style={styles.scanBtnText}>INITIATE IDENTIFICATION</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Camera capture */}
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={styles.cameraScreen}>
          <StatusBar barStyle="light-content" />
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          <View style={[styles.cameraTop, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => setCameraOpen(false)} style={styles.cameraClose}>
              <X color={Colors.white} size={22} />
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>BIOLOGICAL SAMPLE ACQUISITION</Text>
            <View style={{ width: 40 }} />
          </View>
          <View style={styles.cameraFrameWrap} pointerEvents="none">
            <View style={styles.cameraFrame}>
              <View style={[styles.camCorner, styles.camCornerTL]} />
              <View style={[styles.camCorner, styles.camCornerTR]} />
              <View style={[styles.camCorner, styles.camCornerBL]} />
              <View style={[styles.camCorner, styles.camCornerBR]} />
            </View>
          </View>
          <View style={[styles.cameraBottom, { paddingBottom: insets.bottom + 26 }]}>
            <TouchableOpacity style={styles.shutter} onPress={capture} activeOpacity={0.8}>
              <View style={styles.shutterInner} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Scanning overlay */}
      {scanning && (
        <View style={styles.scanOverlay}>
          <View style={styles.scanPanel}>
            <Text style={styles.scanPanelTitle}>JUNGLETAK BIOLENS ENGINE V1.0</Text>
            <ActivityIndicator color={Colors.ink} size="small" style={{ marginVertical: 18 }} />
            {SCAN_LOG.map((line, index) => {
              if (index > scanStep) return null;
              const active = index === scanStep;
              return (
                <Text
                  key={line}
                  style={[styles.scanLine, active && styles.scanLineActive]}
                >
                  {active ? '> ' : '•  '}
                  {line}
                </Text>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.paper },
  card: {
    backgroundColor: Colors.card,
    marginHorizontal: Spacing.lg,
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 1.1,
    marginBottom: 16,
  },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 5,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#FCFBF8',
  },
  actionText: { fontSize: 11.5, fontWeight: '700', color: Colors.ink, letterSpacing: 1.1 },
  preview: {
    height: 300,
    borderRadius: 6,
    backgroundColor: '#EFEDE6',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  previewImage: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  previewStamp: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 14,
    fontSize: 9,
    letterSpacing: 3,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
  },
  awaiting: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  awaitingText: {
    fontFamily: Fonts.serif,
    fontStyle: 'italic',
    fontSize: 16,
    color: '#6B6F6B',
  },
  awaitingRule: {
    width: 150,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#9E9F98',
    marginTop: 14,
  },
  readyText: {
    position: 'absolute',
    bottom: 16,
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: '700',
    color: '#7E827D',
  },
  corner: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderColor: '#2A2E2B',
    borderWidth: 2,
  },
  cornerTL: { top: 14, left: 14, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 14, right: 14, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 14, left: 14, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 14, right: 14, borderLeftWidth: 0, borderTopWidth: 0 },
  organRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 22,
    paddingHorizontal: 4,
  },
  organTab: { alignItems: 'center', paddingBottom: 6 },
  organText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E928C',
    letterSpacing: 1.4,
  },
  organTextActive: { color: Colors.ink },
  organUnderline: {
    marginTop: 5,
    width: 26,
    height: 2,
    backgroundColor: Colors.ink,
  },
  scanBtn: {
    backgroundColor: '#111413',
    borderRadius: 4,
    paddingVertical: 20,
    alignItems: 'center',
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: 1.6,
  },
  cameraScreen: { flex: 1, backgroundColor: '#000' },
  cameraTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  cameraClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraTitle: {
    color: '#fff',
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: '700',
  },
  cameraFrameWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cameraFrame: { width: 270, height: 270 },
  camCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFFFFF',
    borderWidth: 2.5,
  },
  camCornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  camCornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  camCornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  camCornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  cameraBottom: { alignItems: 'center' },
  shutter: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#FFFFFF' },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(245,244,239,0.9)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  scanPanel: {
    backgroundColor: '#FCFBF7',
    borderRadius: 6,
    paddingVertical: 28,
    paddingHorizontal: 22,
  },
  scanPanelTitle: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
    letterSpacing: 0.4,
  },
  scanLine: {
    fontFamily: Fonts.mono,
    fontSize: 12.5,
    color: '#A9ADA5',
    lineHeight: 24,
  },
  scanLineActive: { color: Colors.ink, fontWeight: '700' },
});
