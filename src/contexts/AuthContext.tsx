import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();

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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
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
