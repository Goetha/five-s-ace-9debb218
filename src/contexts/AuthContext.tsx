import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { 
  saveAuthCache, 
  getAuthCache, 
  clearAuthCache,
  initDB 
} from "@/lib/offlineStorage";

type AppRole = 'ifa_admin' | 'company_admin' | 'auditor';

interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
}

interface CompanyInfo {
  id: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: AppRole | null;
  userProfile: UserProfile | null;
  companyInfo: CompanyInfo | null;
  linkedCompanies: CompanyInfo[]; // All companies user has access to
  activeCompanyId: string | null; // Currently selected company
  setActiveCompanyId: (companyId: string) => void;
  isLoading: boolean;
  isOffline: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [linkedCompanies, setLinkedCompanies] = useState<CompanyInfo[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const navigate = useNavigate();

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save auth data to cache whenever it changes
  const persistAuthData = async () => {
    if (user && userRole) {
      try {
        await saveAuthCache({
          user,
          session,
          userRole,
          userProfile,
          companyInfo,
          linkedCompanies,
          activeCompanyId,
        });
        console.log('✅ Auth data cached for offline use');
      } catch (e) {
        console.error('Error caching auth data:', e);
      }
    }
  };

  // Persist auth when relevant data changes
  useEffect(() => {
    if (user && userRole) {
      persistAuthData();
    }
  }, [user, userRole, userProfile, companyInfo, linkedCompanies, activeCompanyId]);

  // Load cached auth when offline
  const loadCachedAuth = async (): Promise<boolean> => {
    try {
      await initDB();
      const cached = await getAuthCache();
      
      if (cached && cached.user) {
        console.log('📦 Loading auth from offline cache');
        setUser(cached.user);
        setSession(cached.session);
        setUserRole(cached.userRole as AppRole);
        setUserProfile(cached.userProfile);
        setCompanyInfo(cached.companyInfo);
        setLinkedCompanies(cached.linkedCompanies || []);
        setActiveCompanyId(cached.activeCompanyId);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Error loading cached auth:', e);
      return false;
    }
  };

  // Fetch user data (role, profile, company)
  const fetchUserData = async (userId: string) => {
    try {
      // Fetch roles (may have multiple). Choose precedence: ifa_admin > company_admin > auditor
      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleError) {
        console.error('Error fetching user roles:', roleError);
      }

      const rolePriority: AppRole[] = ['ifa_admin', 'company_admin', 'auditor'];
      const userRoles = (roles ?? []).map(r => r.role as AppRole);
      const role = rolePriority.find(r => userRoles.includes(r)) || null;
      setUserRole(role);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, phone')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      } else {
        setUserProfile(profileData);
      }

      // Fetch company info (if company_admin or other non-IFA roles)
      if (role !== 'ifa_admin') {
        const { data: userCompanies, error: userCompanyError } = await supabase
          .from('user_companies')
          .select('company_id')
          .eq('user_id', userId);

        if (userCompanyError) {
          console.error('Error fetching user companies:', userCompanyError);
        } else if (userCompanies && userCompanies.length > 0) {
          const companyIds = userCompanies.map(uc => uc.company_id);
          
          const { data: companiesData, error: companiesError } = await supabase
            .from('companies')
            .select('id, name')
            .in('id', companyIds.map(id => id));

          if (companiesError) {
            console.error('Error fetching companies info:', companiesError);
          } else if (companiesData) {
            setLinkedCompanies(companiesData);
            
            // Set active company (first one by default, or restore from localStorage)
            const savedActiveCompanyId = localStorage.getItem('activeCompanyId');
            const validSavedId = companiesData.find(c => c.id === savedActiveCompanyId);
            const defaultCompanyId = validSavedId?.id || companiesData[0]?.id;
            
            setActiveCompanyId(defaultCompanyId);
            setCompanyInfo(companiesData.find(c => c.id === defaultCompanyId) || null);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchUserData:', error);
    }
  };

  // Update companyInfo when activeCompanyId changes
  useEffect(() => {
    if (activeCompanyId) {
      const company = linkedCompanies.find(c => c.id === activeCompanyId);
      setCompanyInfo(company || null);
      localStorage.setItem('activeCompanyId', activeCompanyId);
    }
  }, [activeCompanyId, linkedCompanies]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        await initDB();
      } catch (e) {
        console.error('Error initializing offline DB:', e);
      }

      // If offline, try to load from cache first
      if (!navigator.onLine) {
        const hasCached = await loadCachedAuth();
        if (hasCached) {
          setIsLoading(false);
          return;
        }
      }

      // Set up auth state listener FIRST
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          setSession(session);
          setUser(session?.user ?? null);
          
          // Fetch user data after setting session
          if (session?.user) {
            setTimeout(async () => {
              await fetchUserData(session.user.id);
              setIsLoading(false);
            }, 0);
          } else {
            setUserRole(null);
            setUserProfile(null);
            setCompanyInfo(null);
            setIsLoading(false);
          }
        }
      );

      // THEN check for existing session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else if (!navigator.onLine) {
          // No online session but offline - try cache
          await loadCachedAuth();
        }
      } catch (error) {
        console.error('Error getting session:', error);
        // If error (likely offline), try cache
        if (!navigator.onLine) {
          await loadCachedAuth();
        }
      }
      
      setIsLoading(false);

      return () => subscription.unsubscribe();
    };

    initAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: phone,
          }
        }
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await clearAuthCache();
    setUser(null);
    setSession(null);
    setUserRole(null);
    setUserProfile(null);
    setCompanyInfo(null);
    setLinkedCompanies([]);
    setActiveCompanyId(null);
    localStorage.removeItem('activeCompanyId');
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      userRole,
      userProfile,
      companyInfo,
      linkedCompanies,
      activeCompanyId,
      setActiveCompanyId,
      isLoading, 
      isOffline,
      signIn, 
      signUp, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
