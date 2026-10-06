import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    const { data } = await supabase.from('profiles').select('id, nickname').eq('id', userId).maybeSingle();
    setProfile(data || null);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      loadProfile(s?.user?.id).finally(() => setLoading(false));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      loadProfile(s?.user?.id);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile]);

  async function signUp(email, password, nickname) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error };
    if (!data.session) {
      // Email confirmation is likely enabled on the Supabase project, there
      // is no session yet to create a profile row under, so nickname is
      // stashed and created on first successful sign-in instead.
      try {
        localStorage.setItem('pib-pending-nickname', nickname);
      } catch {
        /* ignore */
      }
      return { pendingConfirmation: true };
    }
    const { error: profileError } = await supabase.from('profiles').insert({ id: data.user.id, nickname });
    if (profileError) return { error: profileError };
    await loadProfile(data.user.id);
    return {};
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    // Finish creating a profile row if signup happened before email
    // confirmation completed.
    const { data: existing } = await supabase.from('profiles').select('id').eq('id', data.user.id).maybeSingle();
    if (!existing) {
      let pendingNickname = null;
      try {
        pendingNickname = localStorage.getItem('pib-pending-nickname');
      } catch {
        /* ignore */
      }
      if (pendingNickname) {
        await supabase.from('profiles').insert({ id: data.user.id, nickname: pendingNickname });
        try {
          localStorage.removeItem('pib-pending-nickname');
        } catch {
          /* ignore */
        }
      }
    }
    await loadProfile(data.user.id);
    return {};
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
  }

  const value = {
    session,
    user: session?.user || null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
