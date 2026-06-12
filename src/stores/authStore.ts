import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile } from '../types';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  setUser: (user: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isInitialized: false,

      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),

      initialize: async () => {
        if (get().isInitialized) return;
        set({ isLoading: true });
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            set({ user: profile ?? null });
          } else {
            set({ user: null });
          }
        } catch {
          set({ user: null });
        } finally {
          set({ isLoading: false, isInitialized: true });
        }
      },

      signIn: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const { data, error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) return { error: error.message };
          if (!data.user) return { error: 'Authentication failed' };

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profileError || !profile) {
            await supabase.auth.signOut();
            return { error: 'User profile not found. Please contact administrator.' };
          }

          if (!profile.is_active) {
            await supabase.auth.signOut();
            return { error: 'Your account has been deactivated. Contact administrator.' };
          }

          await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', profile.id);
          set({ user: profile });
          return { error: null };
        } catch (err) {
          return { error: 'An unexpected error occurred. Please try again.' };
        } finally {
          set({ isLoading: false });
        }
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, isInitialized: false });
      },
    }),
    {
      name: 'si-erp-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
);
