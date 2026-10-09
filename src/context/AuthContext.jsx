import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../utils/supabaseClient';

const AuthContext = createContext(null);

export const NICKNAME_RULES = 'Letters, numbers, spaces, dots, dashes and underscores. 2 to 24 characters.';
const NICKNAME_PATTERN = /^[A-Za-z0-9 ._-]{2,24}$/;

export function validateNickname(raw) {
  const nickname = (raw || '').trim().replace(/\s+/g, ' ');
  if (!NICKNAME_PATTERN.test(nickname)) return { error: `Nickname not valid. ${NICKNAME_RULES}` };
  return { nickname };
}

// Case-insensitive, so "Ravi" is taken if "ravi" exists (the database's own
// uniqueness rule is case-sensitive, which would allow look-alikes).
async function nicknameIsFree(nickname) {
  const escaped = nickname.replace(/[\\%_]/g, '\\$&');
  const { data, error } = await supabase.from('profiles').select('id').ilike('nickname', escaped).limit(1);
  if (error) return { error };
  return { free: data.length === 0 };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  // `user` is kept as its own state and only replaced when the person
  // actually changes. Supabase fires an auth event every time the app
  // regains focus and hands back a brand new session object each time, if
  // the rest of the app depended on that object, every focus would re-run
  // every data fetch (and could reset a game in progress).
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recovering, setRecovering] = useState(false);
  const loadedProfileIdRef = useRef(null);
  const triedMetadataForRef = useRef(null);

  const applySession = useCallback((s) => {
    setSession(s);
    setUser((prev) => (prev?.id === s?.user?.id ? prev : s?.user ?? null));
  }, []);

  // Loads the profile row for this person. If there isn't one yet but their
  // signup details are saved on the account (nickname captured at signup,
  // possibly on another device before they confirmed their email), create
  // it now. Anything still missing after that is handled by the
  // "choose a nickname" screen on the Account page.
  const loadProfile = useCallback(async (userObj) => {
    const userId = userObj?.id;
    if (!userId) {
      setProfile(null);
      loadedProfileIdRef.current = null;
      return;
    }
    const { data } = await supabase.from('profiles').select('id, nickname').eq('id', userId).maybeSingle();
    if (data) {
      setProfile(data);
      loadedProfileIdRef.current = userId;
      return;
    }

    if (triedMetadataForRef.current !== userId) {
      triedMetadataForRef.current = userId;
      const saved = validateNickname(userObj.user_metadata?.nickname);
      if (saved.nickname) {
        const { data: created } = await supabase
          .from('profiles')
          .insert({ id: userId, nickname: saved.nickname })
          .select('id, nickname')
          .maybeSingle();
        if (created) {
          setProfile(created);
          loadedProfileIdRef.current = userId;
          return;
        }
      }
    }
    setProfile(null);
    loadedProfileIdRef.current = null;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      applySession(s);
      loadProfile(s?.user).finally(() => setLoading(false));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
      applySession(s);
      const id = s?.user?.id;
      // Skip re-fetching a profile we already have for this same person
      // (focus events fire this repeatedly).
      if (id && loadedProfileIdRef.current === id) return;
      // Deferred: calling Supabase from inside this callback can deadlock it.
      setTimeout(() => loadProfile(s?.user), 0);
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfile, applySession]);

  async function signUp(email, password, rawNickname) {
    const valid = validateNickname(rawNickname);
    if (valid.error) return { error: { message: valid.error } };
    const { nickname } = valid;

    // Check BEFORE creating the account, otherwise a taken nickname leaves
    // a half-created account behind that can't be retried.
    const check = await nicknameIsFree(nickname);
    if (check.error) return { error: { message: 'Could not check that nickname right now. Check your connection and try again.' } };
    if (!check.free) return { error: { message: 'That nickname is already taken, try another.' } };

    // Nickname is also stored on the account itself so the profile can still
    // be created on first sign-in if email confirmation is on.
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { nickname } } });
    if (error) return { error };

    if (!data.session) return { pendingConfirmation: true };

    const { error: profileError } = await supabase.from('profiles').insert({ id: data.user.id, nickname });
    // If this fails (e.g. someone grabbed the nickname a moment ago) the
    // person is signed in without a profile, and the Account page will ask
    // them to pick another, so no error is returned here.
    if (profileError) console.error('Profile creation failed:', profileError);
    await loadProfile(data.user);
    return {};
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };
    await loadProfile(data.user);
    return {};
  }

  // For someone signed in who has no profile yet.
  async function createProfile(rawNickname) {
    if (!user) return { error: { message: 'Not signed in.' } };
    const valid = validateNickname(rawNickname);
    if (valid.error) return { error: { message: valid.error } };

    const check = await nicknameIsFree(valid.nickname);
    if (check.error) return { error: { message: 'Could not check that nickname right now. Try again.' } };
    if (!check.free) return { error: { message: 'That nickname is already taken, try another.' } };

    const { error } = await supabase.from('profiles').insert({ id: user.id, nickname: valid.nickname });
    if (error) {
      return {
        error: { message: error.code === '23505' ? 'That nickname is already taken, try another.' : error.message },
      };
    }
    await loadProfile(user);
    return {};
  }

  async function requestPasswordReset(email) {
    const redirectTo = `${window.location.origin}${import.meta.env.BASE_URL}account`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    return { error };
  }

  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) setRecovering(false);
    return { error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setProfile(null);
    loadedProfileIdRef.current = null;
  }

  const value = {
    session,
    user,
    profile,
    loading,
    recovering,
    signUp,
    signIn,
    signOut,
    createProfile,
    requestPasswordReset,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
