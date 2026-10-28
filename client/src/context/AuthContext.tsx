import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient, TOKEN_STORAGE_KEY } from '../api/client';

export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and verify authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiClient.get('/auth/me');
        if (response.data?.success && response.data?.data?.user) {
          setUser(response.data.data.user);
          setToken(storedToken);
        } else {
          throw new Error('Invalid profile payload');
        }
      } catch (err) {
        console.warn('Session verification failed, logging out:', err);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response.data?.success && response.data?.data) {
      const { user: userData, token: authToken } = response.data.data;
      localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
      setToken(authToken);
      setUser(userData);
    } else {
      throw new Error(response.data?.message || 'Login failed');
    }
  };

  const register = async (name: string, email: string, password: string): Promise<void> => {
    const response = await apiClient.post('/auth/register', { name, email, password });
    if (response.data?.success && response.data?.data) {
      const { user: userData, token: authToken } = response.data.data;
      localStorage.setItem(TOKEN_STORAGE_KEY, authToken);
      setToken(authToken);
      setUser(userData);
    } else {
      throw new Error(response.data?.message || 'Registration failed');
    }
  };

  const logout = (): void => {
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear token from storage:', e);
    }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
