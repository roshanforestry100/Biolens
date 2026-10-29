import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { supabase } from './supabase';
import { ScanResult } from '../types';

export interface ReportUserMeta {
  age?: string;
  gender?: string;
  qualification?: string;
  expertise?: string;
}

export interface ReportOptions {
  scan: ScanResult;
  userName: string;
  userRank?: string;
  userStars?: number;
  totalScans?: number;
  userMeta?: ReportUserMeta;
}

/**
 * Build a Research Report PDF through the `generate-pdf` Edge Function and
 * hand it to the system share sheet.  Returns the saved file URI.
 */
export async function generateResearchReport(options: ReportOptions): Promise<string> {
  const { scan } = options;

  const logoBase64 = await readLogoAsBase64();
  const plantImageBase64 = await readLocalImageAsBase64(scan.image_uri);

  const body = {
    userName: (options.userName || 'Field Agent').trim(),
    userRank: options.userRank || 'Field Researcher',
    userStars: options.userStars ?? 0,
    totalScans: options.totalScans ?? 0,
    logoBase64,
    userMeta: {
      age: options.userMeta?.age || '',
      gender: options.userMeta?.gender || '',
      qualification: options.userMeta?.qualification || '',
      expertise: options.userMeta?.expertise || '',
    },
    reportData: {
      commonName: scan.common_name,
      scientific_name: scan.scientific_name,
      confidence: scan.confidence,
      region: scan.region,
      basic: scan.metadata?.basic ?? null,
      scientificData: scan.metadata?.scientific ?? null,
      species_profile: scan.metadata?.species_profile ?? null,
      image_observations: scan.metadata?.image_observations ?? null,
      plantImageBase64,
    },
  };

  const { data, error } = await supabase.functions.invoke('generate-pdf', { body });

  if (error) {
    throw new Error(await errorMessage(error));
  }

  const pdfBase64 = (data as any)?.pdfBase64;
  if (!pdfBase64) {
    throw new Error('The report service did not return a document.');
  }

  const directory = FileSystem.documentDirectory;
  if (!directory) {
    throw new Error('Device storage is not available.');
  }

  const safeName = (scan.scientific_name || 'Unknown_Species').replace(/\s+/g, '_');
  const fileUri = `${directory}JungleTak_Report_${safeName}_${Date.now()}.pdf`;

  await FileSystem.writeAsStringAsync(fileUri, pdfBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Download Research Report',
      UTI: 'com.adobe.pdf',
    });
  }

  return fileUri;
}

/** Returns the report URI even when sharing is unavailable. */
export async function shareAvailable(): Promise<boolean> {
  try {
    return await Sharing.isAvailableAsync();
  } catch {
    return false;
  }
}

async function readLogoAsBase64(): Promise<string> {
  try {
    const asset = Asset.fromModule(require('../../assets/logo.png'));
    await asset.downloadAsync();
    const uri = asset.localUri || asset.uri;
    if (!uri) return '';
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    return '';
  }
}

async function readLocalImageAsBase64(uri?: string): Promise<string> {
  if (!uri || /^https?:/i.test(uri)) return '';
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    return '';
  }
}

async function errorMessage(error: any): Promise<string> {
  try {
    if (error?.context?.json) {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    }
  } catch {
    // ignore
  }
  return error?.message || 'Report generation failed.';
}
