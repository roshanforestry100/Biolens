import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Recovered credentials from APK binary analysis
const SUPABASE_URL = 'https://kgefxdwtneihozevsyig.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZWZ4ZHd0bmVpaG96ZXZzeWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5ODIwNzUsImV4cCI6MjA4NjU1ODA3NX0.CcEU0tFjTMMBVH-CLaeouiCWz4PzTHCuR4fU9FU0Chw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
