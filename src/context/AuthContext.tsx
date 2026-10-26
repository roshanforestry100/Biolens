import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

interface AuthResult {
  error: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/** Deep link used by Supabase's Google OAuth callback. */
export const OAUTH_REDIRECT = AuthSession.makeRedirectUri({
  scheme: 'jungletakbiolens',
  path: 'auth/callback',
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async (): Promise<AuthResult> => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: OAUTH_REDIRECT,
          skipBrowserRedirect: true,
        },
      });

      if (error) return { error: error.message };
      if (!data?.url) return { error: 'Google sign-in could not start.' };

      const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { error: null };
      }
      if (result.type !== 'success' || !result.url) {
        return { error: 'Google sign-in was interrupted.' };
      }

      const params = parseAuthUrl(result.url);

      if (params.error) {
        return { error: params.error_description || params.error };
      }

      if (params.access_token && params.refresh_token) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (sessionError) return { error: sessionError.message };
        return { error: null };
      }

      if (params.code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code);
        if (exchangeError) return { error: exchangeError.message };
        return { error: null };
      }

      return { error: 'Google sign-in did not return a session.' };
    } catch (error: any) {
      return { error: error?.message || 'Google sign-in failed.' };
    }
  };

  const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<AuthResult> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          all_time_total_scans: 0,
          all_time_species_list: [],
        },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ session, user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * Supabase can return the session in the fragment (implicit flow) or as a
 * `?code=` query parameter (PKCE).  Read both.
 */
function parseAuthUrl(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const hashIndex = url.indexOf('#');
  if (hashIndex >= 0) {
    Object.assign(out, parseQuery(url.slice(hashIndex + 1)));
  }
  const queryIndex = url.indexOf('?');
  if (queryIndex >= 0) {
    const end = hashIndex >= 0 ? hashIndex : url.length;
    Object.assign(out, parseQuery(url.slice(queryIndex + 1, end)));
  }
  return out;
}

function parseQuery(query: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [rawKey, rawValue = ''] = pair.split('=');
    try {
      out[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue.replace(/\+/g, ' '));
    } catch {
      out[rawKey] = rawValue;
    }
  }
  return out;
}
