// Direct Pl@ntNet identification service.
//
// Calls the official Pl@ntNet API to identify plant species from uploaded
// images. Falls back to the Supabase Edge Function proxy when the direct
// API key is not configured.

import { supabase } from './supabase';
import * as ImageManipulator from 'expo-image-manipulator';

const PLANTNET_API_BASE = 'https://my-api.plantnet.org/v2';
const PLANTNET_PROJECT = 'all';

// Pl@ntNet API key from environment variables
const PLANTNET_API_KEY = process.env.PLANTNET_API_KEY || '';

export interface PlantNetCandidate {
  score: number;
  scientificNameWithoutAuthor: string;
  scientificNameAuthorship: string;
  genus: { scientificNameWithoutAuthor: string };
  family: { scientificNameWithoutAuthor: string };
  commonNames: string[];
  gbif?: { id: string };
  images: { url: { m: string; o: string } }[];
}

export interface PlantNetIdentifyResponse {
  query: {
    project: string;
    images: string[];
    organs: string[];
    includeRelatedImages: boolean;
  };
  language: string;
  preferedReferential: string;
  bestMatch: string;
  results: PlantNetCandidate[];
  remainingIdentificationRequests: number;
}

export interface PlantNetIdentifyResult {
  scientific_name: string;
  common_name?: string;
  confidence: number;
  confidence_level: string;
  candidates: PlantNetCandidate[];
  source: 'plantnet' | 'supabase';
  raw: any;
}

export interface PreparedImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

export async function prepareImage(uri: string): Promise<PreparedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1280 } }],
    {
      compress: 0.8,
      format: 'jpeg' as any,
      base64: true,
    }
  );

  if (!result.base64) {
    throw new Error('Could not process the captured image.');
  }

  return {
    uri: result.uri,
    base64: result.base64,
    width: result.width,
    height: result.height,
  };
}

export async function identifyPlantNet(
  imageBase64: string,
  organs: string[] = ['leaf'],
  apiKey?: string,
): Promise<PlantNetIdentifyResponse> {
  const key = apiKey || PLANTNET_API_KEY;
  if (!key) {
    throw new Error('PLANTNET_API_KEY is not configured.');
  }

  const url = `${PLANTNET_API_BASE}/identify/${PLANTNET_PROJECT}?include-related-images=false&no-reject=false&api-key=${key}`;

  const formData = new FormData();
  formData.append('images[]', {
    uri: 'data:image/jpeg;base64,' + imageBase64,
    name: 'image.jpg',
    type: 'image/jpeg',
  } as unknown as Blob);
  formData.append('organs', organs.join(','));
  formData.append('include-related-images', 'false');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => '');
      throw new Error(`Pl@ntNet API error (${res.status}): ${errorText}`);
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error('Pl@ntNet API request timed out.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function identifyPlant(
  imageBase64: string,
  organ?: string,
): Promise<PlantNetIdentifyResult> {
  const organs = organ ? [organ] : ['leaf'];

  try {
    const response = await identifyPlantNet(imageBase64, organs);
    const results = response.results || [];

    if (results.length === 0) {
      throw new Error('No species match found.');
    }

    const best = results[0];
    const confidence = Math.round(best.score * 100);

    return {
      scientific_name: best.scientificNameWithoutAuthor,
      common_name: best.commonNames?.[0],
      confidence,
      confidence_level:
        confidence > 70 ? 'high' : confidence > 40 ? 'medium' : 'low',
      candidates: results,
      source: 'plantnet',
      raw: response,
    };
  } catch (plantNetError: any) {
    const { data, error } = await supabase.functions.invoke('identify', {
      body: organ ? { image: imageBase64, organ } : { image: imageBase64 },
    });

    if (error) {
      throw new Error(
        `Identification failed. Pl@ntNet: ${plantNetError.message}. Supabase: ${await readFunctionError(error)}`,
      );
    }

    const payload = (data || {}) as any;
    if (payload.error) {
      throw new Error(payload.error);
    }

    return {
      scientific_name: payload.scientific_name || payload.scientificName || 'Unknown',
      common_name: payload.common_name || payload.commonName,
      confidence: Math.round(
        Number(payload.final_confidence ?? payload.confidence ?? 0),
      ),
      confidence_level:
        Number(payload.final_confidence ?? payload.confidence ?? 0) > 70
          ? 'high'
          : Number(payload.final_confidence ?? payload.confidence ?? 0) > 40
            ? 'medium'
            : 'low',
      candidates: [],
      source: 'supabase',
      raw: payload,
    };
  }
}

async function readFunctionError(error: any): Promise<string> {
  try {
    if (error?.context?.json) {
      const body = await error.context.json();
      if (body?.error) return String(body.error);
      if (body?.message) return String(body.message);
    }
    if (error?.context?.text) {
      const text = await error.context.text();
      if (text) return text;
    }
  } catch {
    // ignore
  }
  return error?.message || 'Identification service is unavailable.';
}
