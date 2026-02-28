import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User as SupaUser } from '@supabase/supabase-js';

export type UserRole = 'faculty' | 'hod' | 'junior_assistant' | 'principal';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  departmentId: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, fullName: string, role: UserRole, departmentId?: string, yearOfJoining?: number, uniqueId?: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchAppUser(supaUser: SupaUser): Promise<AppUser | null> {
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', supaUser.id)
    .limit(1);

  const role = (roles?.[0]?.role as UserRole) || 'faculty';

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, department_id')
    .eq('user_id', supaUser.id)
    .maybeSingle();

  let departmentName = '';
  if (profile?.department_id) {
    const { data: dept } = await supabase
      .from('departments')
      .select('name')
      .eq('id', profile.department_id)
      .maybeSingle();
    departmentName = dept?.name || '';
  }

  return {
    id: supaUser.id,
    name: profile?.full_name || supaUser.email || '',
    email: supaUser.email || '',
    role,
    department: departmentName,
    departmentId: profile?.department_id || null,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        setTimeout(async () => {
          if (!mounted) return;
          const appUser = await fetchAppUser(session.user);
          if (mounted) {
            setUser(appUser);
            setLoading(false);
          }
        }, 0);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      if (session?.user) {
        const appUser = await fetchAppUser(session.user);
        if (mounted) setUser(appUser);
      }
      if (mounted) setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message || null };
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
        return { error: 'Network error: Please check your internet connection, disable ad blockers, or try a different browser.' };
      }
      return { error: err?.message || 'An unexpected error occurred' };
    }
  };

  const signup = async (email: string, password: string, fullName: string, role: UserRole, departmentId?: string, yearOfJoining?: number, uniqueId?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: fullName,
            role,
            department_id: departmentId || null,
            year_of_joining: yearOfJoining || null,
            unique_id: uniqueId || null,
          },
        },
      });
      if (error) {
        let msg = error.message;
        if (msg.includes('unique constraint') && msg.includes('unique_id')) {
          msg = 'This Unique ID is already registered. Please check your ID and try again.';
        } else if (msg.includes('unique constraint')) {
          msg = 'An account with these details already exists.';
        } else if (msg.includes('Database error')) {
          msg = 'Registration failed due to a database error. The Unique ID may already be in use.';
        }
        return { error: msg };
      }
      return { error: null };
    } catch (err: any) {
      if (err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError')) {
        return { error: 'Network error: Please check your internet connection, disable ad blockers, or try a different browser.' };
      }
      return { error: err?.message || 'An unexpected error occurred' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, signup, logout, isAuthenticated: !!session }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
