import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { User, UserRole } from '../types/user';
import {
  api,
  AUTH_EXPIRED_EVENT,
  AUTH_TOKEN_KEY,
  AUTH_TOKEN_UPDATED_EVENT,
  AUTH_USER_KEY,
  clearAuthSession,
  getAuthToken,
  getTokenExpirationMs,
} from '../services/api';

export interface RegisterResult {
  user?: User;
  isPendingApproval?: boolean;
  requireOtp?: boolean;
  email?: string;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role?: string) => Promise<User>;
  loginWithGoogle: (credential: string, role?: UserRole, mode?: 'login' | 'register') => Promise<User>;
  applyForOrganizer: (data: {
    applicantType?: string;
    organization?: string;
    organizationType?: string;
    applicantPosition?: string;
    organizationDescription?: string;
    organizationWebsite?: string;
    organizationLogo?: string;
    personalIntroduction?: string;
    bio?: string;
    phone?: string;
    password?: string;
    socials?: Record<string, string>;
  }) => Promise<{ user: User; message: string }>;
  switchRole: (targetRole: 'ATTENDEE' | 'ORGANIZER' | 'EXHIBITOR', password?: string) => Promise<User>;
  addExhibitorRole: (data: {
    companyName: string;
    industryCategory: string;
    companyPhone?: string;
    companyWebsite?: string;
    exhibitorDescription?: string;
    password: string;
  }) => Promise<{ user: User; message: string }>;
  register: (userData: {
    email: string;
    password: string;
    full_name: string;
    role?: UserRole;
    organization?: string;
    phone?: string;
    bio?: string;
    confirm_password?: string;
    confirmPassword?: string;
    applicant_type?: string;
    applicantType?: string;
    personal_introduction?: string;
    personalIntroduction?: string;
    organization_type?: string;
    organizationType?: string;
    applicant_position?: string;
    applicantPosition?: string;
    position?: string;
    organization_description?: string;
    organizationDescription?: string;
    organization_website?: string;
    organizationWebsite?: string;
    website?: string;
    organization_logo?: string;
    organizationLogo?: string;
    socials?: Record<string, string>;
  }) => Promise<RegisterResult>;
  verifyRegistrationOtp: (email: string, otp: string) => Promise<User>;
  loginSponsor: (email: string, password: string) => Promise<User>;
  registerSponsor: (data: {
    full_name: string;
    email: string;
    password: string;
    company_name: string;
    industry_category: string;
    company_phone: string;
    company_website?: string;
    company_description: string;
    company_logo?: string;
    sponsorship_objectives: string[];
    target_audience: string[];
    preferred_event_categories: string[];
    skills_and_interests: string[];
    preferred_locations?: string[];
    budget_range?: number;
    preferred_benefits?: string[];
    additional_preferences?: Record<string, any>;
  }) => Promise<{ user: User; message: string }>;
  loginSponsorWithGoogle: (credential: string, mode?: 'login' | 'register', sponsorData?: any) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const expirationTimerRef = useRef<number | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const clearExpirationTimer = useCallback(() => {
    if (expirationTimerRef.current !== null) {
      window.clearTimeout(expirationTimerRef.current);
      expirationTimerRef.current = null;
    }
  }, []);

  const expireSessionNow = useCallback(() => {
    clearExpirationTimer();
    clearAuthSession();
    setUser(null);
    setIsLoading(false);
  }, [clearExpirationTimer]);

  const scheduleExpirationTimer = useCallback(
    (token: string | null) => {
      clearExpirationTimer();
      if (!token) return;

      const armTimer = (activeJwt: string) => {
        const expMs = getTokenExpirationMs(activeJwt);
        if (expMs === null) {
          expireSessionNow();
          return;
        }

        const remainingMs = expMs - Date.now();
        if (remainingMs <= 0) {
          expireSessionNow();
          return;
        }

        // Clamp to 32-bit signed max timeout delay; check on fire in case of sleep/throttling
        const delayMs = Math.min(remainingMs, 2_147_483_647);
        expirationTimerRef.current = window.setTimeout(() => {
          const currentToken = getAuthToken();
          if (!currentToken) {
            expireSessionNow();
          } else {
            armTimer(currentToken);
          }
        }, delayMs);
      };

      armTimer(token);
    },
    [clearExpirationTimer, expireSessionNow]
  );

  const refreshUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      clearExpirationTimer();
      clearAuthSession();
      setUser(null);
      setIsLoading(false);
      return;
    }

    scheduleExpirationTimer(token);

    try {
      const currentUser = await api.auth.getMe();
      if (currentUser && getAuthToken()) {
        setUser(currentUser);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(currentUser));
        scheduleExpirationTimer(getAuthToken());
      } else {
        expireSessionNow();
      }
    } catch (e) {
      console.error('Failed to load session user:', e);
      expireSessionNow();
    } finally {
      setIsLoading(false);
    }
  }, [clearExpirationTimer, expireSessionNow, scheduleExpirationTimer]);

  useEffect(() => {
    refreshUser();

    const handleAuthExpired = () => {
      expireSessionNow();
    };

    const handleTokenUpdated = () => {
      const token = getAuthToken();
      if (!token) {
        expireSessionNow();
      } else {
        scheduleExpirationTimer(token);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== null && e.key !== AUTH_TOKEN_KEY && e.key !== AUTH_USER_KEY) {
        return;
      }
      const token = getAuthToken();
      if (!token) {
        expireSessionNow();
        return;
      }
      if (e.key === AUTH_TOKEN_KEY && e.newValue) {
        refreshUser();
      }
    };

    const handleVisibilityOrFocus = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      const hasSession = Boolean(userRef.current || localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(AUTH_USER_KEY));
      if (hasSession && !getAuthToken()) {
        expireSessionNow();
      }
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    window.addEventListener(AUTH_TOKEN_UPDATED_EVENT, handleTokenUpdated);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearExpirationTimer();
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
      window.removeEventListener(AUTH_TOKEN_UPDATED_EVENT, handleTokenUpdated);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [clearExpirationTimer, expireSessionNow, refreshUser, scheduleExpirationTimer]);

  const login = async (email: string, password: string, role?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.auth.login({ email, password, role });
      setUser(res.user);
      localStorage.setItem('sheba_auth_user', JSON.stringify(res.user));
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const applyForOrganizer = async (data: {
    applicantType?: string;
    organization?: string;
    organizationType?: string;
    applicantPosition?: string;
    organizationDescription?: string;
    organizationWebsite?: string;
    organizationLogo?: string;
    personalIntroduction?: string;
    bio?: string;
    phone?: string;
    password?: string;
    socials?: Record<string, string>;
  }): Promise<{ user: User; message: string }> => {
    setIsLoading(true);
    try {
      const res = await api.auth.applyOrganizer(data);
      setUser(res.user);
      localStorage.setItem('sheba_auth_user', JSON.stringify(res.user));
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (targetRole: 'ATTENDEE' | 'ORGANIZER' | 'EXHIBITOR', password?: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.auth.switchRole({ targetRole, password });
      setUser(res.user);
      localStorage.setItem('sheba_auth_user', JSON.stringify(res.user));
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const addExhibitorRole = async (data: {
    companyName: string;
    industryCategory: string;
    companyPhone?: string;
    companyWebsite?: string;
    exhibitorDescription?: string;
    password: string;
  }): Promise<{ user: User; message: string }> => {
    setIsLoading(true);
    try {
      const res = await api.auth.addExhibitorRole(data);
      setUser(res.user);
      localStorage.setItem('sheba_auth_user', JSON.stringify(res.user));
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (
    credential: string,
    role?: UserRole,
    mode?: 'login' | 'register'
  ): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.auth.googleLogin({ credential, role, mode });
      setUser(res.user);
      localStorage.setItem('sheba_auth_user', JSON.stringify(res.user));
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    full_name: string;
    role?: UserRole;
    organization?: string;
    phone?: string;
    bio?: string;
    confirm_password?: string;
    confirmPassword?: string;
    applicant_type?: string;
    applicantType?: string;
    personal_introduction?: string;
    personalIntroduction?: string;
    organization_type?: string;
    organizationType?: string;
    applicant_position?: string;
    applicantPosition?: string;
    position?: string;
    organization_description?: string;
    organizationDescription?: string;
    organization_website?: string;
    organizationWebsite?: string;
    website?: string;
    organization_logo?: string;
    organizationLogo?: string;
    socials?: Record<string, string>;
  }): Promise<RegisterResult> => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(userData);
      if (!res.isPendingApproval && !res.requireOtp && res.user) {
        setUser(res.user);
        localStorage.setItem('sheba_auth_user', JSON.stringify(res.user));
      }
      return {
        user: res.user,
        isPendingApproval: res.isPendingApproval,
        requireOtp: res.requireOtp ?? (userData.role !== 'ORGANIZER'),
        email: res.email || userData.email,
        message: res.message,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const verifyRegistrationOtp = async (email: string, otp: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.auth.verifyRegistrationOtp({ email, otp });
      setUser(res.user);
      localStorage.setItem('sheba_auth_user', JSON.stringify(res.user));
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const loginSponsor = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.auth.sponsor.login({ email, password });
      setUser(res.user);
      localStorage.setItem('sheba_auth_user', JSON.stringify(res.user));
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const registerSponsor = async (data: {
    full_name: string;
    email: string;
    password: string;
    company_name: string;
    industry_category: string;
    company_phone: string;
    company_website?: string;
    company_description: string;
    company_logo?: string;
    sponsorship_objectives: string[];
    target_audience: string[];
    preferred_event_categories: string[];
    skills_and_interests: string[];
    preferred_locations?: string[];
    budget_range?: number;
    preferred_benefits?: string[];
    additional_preferences?: Record<string, any>;
  }): Promise<{ user: User; message: string }> => {
    setIsLoading(true);
    try {
      const res = await api.auth.sponsor.register(data);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const loginSponsorWithGoogle = async (
    credential: string,
    mode?: 'login' | 'register',
    sponsorData?: any
  ): Promise<User> => {
    setIsLoading(true);
    try {
      const res = await api.auth.sponsor.googleLogin({
        credential,
        mode,
        ...sponsorData,
      });
      setUser(res.user);
      localStorage.setItem('sheba_auth_user', JSON.stringify(res.user));
      return res.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await api.auth.logout();
    } finally {
      expireSessionNow();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user ? user.role : null,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginWithGoogle,
        loginSponsor,
        registerSponsor,
        loginSponsorWithGoogle,
        applyForOrganizer,
        switchRole,
        addExhibitorRole,
        register,
        verifyRegistrationOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
