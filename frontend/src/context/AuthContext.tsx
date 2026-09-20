import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole } from '../types/user';
import { api, getAuthToken } from '../services/api';

export interface RegisterResult {
  user: User;
  isPendingApproval?: boolean;
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
    organization: string;
    bio?: string;
    phone?: string;
    password?: string;
    socials?: Record<string, string>;
  }) => Promise<{ user: User; message: string }>;
  switchRole: (targetRole: 'ATTENDEE' | 'ORGANIZER', password?: string) => Promise<User>;
  register: (userData: {
    email: string;
    password: string;
    full_name: string;
    role?: UserRole;
    organization?: string;
    phone?: string;
    bio?: string;
  }) => Promise<RegisterResult>;
  loginSponsor: (email: string, password: string) => Promise<User>;
  registerSponsor: (data: {
    full_name: string;
    email: string;
    password: string;
    company_name: string;
    industry_category: string;
    company_phone: string;
    company_website?: string;
  }) => Promise<{ user: User; message: string }>;
  loginSponsorWithGoogle: (credential: string, mode?: 'login' | 'register', sponsorData?: any) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      localStorage.removeItem('sheba_auth_user');
      setIsLoading(false);
      return;
    }

    try {
      const currentUser = await api.auth.getMe();
      if (currentUser) {
        setUser(currentUser);
        localStorage.setItem('sheba_auth_user', JSON.stringify(currentUser));
      } else {
        setUser(null);
        localStorage.removeItem('sheba_auth_user');
      }
    } catch (e) {
      console.error('Failed to load session user:', e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

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
    organization: string;
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

  const switchRole = async (targetRole: 'ATTENDEE' | 'ORGANIZER', password?: string): Promise<User> => {
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
  }): Promise<RegisterResult> => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(userData);
      if (!res.isPendingApproval && res.user) {
        setUser(res.user);
        localStorage.setItem('sheba_auth_user', JSON.stringify(res.user));
      }
      return {
        user: res.user,
        isPendingApproval: res.isPendingApproval,
        message: res.message,
      };
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
      setUser(null);
      localStorage.removeItem('sheba_auth_user');
      localStorage.removeItem('sheba_auth_token');
      setIsLoading(false);
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
        register,
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
