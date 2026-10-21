import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface AuthState {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  userId: string | null;
  email: string | null;
  /** UI hint only. Real authorization is enforced by RLS on the database. */
  isAdmin: boolean;
  signIn(email: string, password: string): Promise<string | null>;
  signUp(email: string, password: string, name: string): Promise<string | null>;
  signOut(): Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let alive = true;
    if (!supabase || !session) {
      setIsAdmin(false);
      return;
    }
    supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data }) => alive && setIsAdmin(data?.role === 'admin'));
    return () => {
      alive = false;
    };
  }, [session]);

  const value = useMemo<AuthState>(
    () => ({
      configured: !!supabase,
      loading,
      session,
      userId: session?.user.id ?? null,
      email: session?.user.email ?? null,
      isAdmin,
      async signIn(email, password) {
        const { error } = await supabase!.auth.signInWithPassword({ email, password });
        return error ? error.message : null;
      },
      async signUp(email, password, name) {
        const { error } = await supabase!.auth.signUp({ email, password, options: { data: { display_name: name } } });
        return error ? error.message : null;
      },
      async signOut() {
        await supabase?.auth.signOut();
      },
    }),
    [loading, session, isAdmin],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
