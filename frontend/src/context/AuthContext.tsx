import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialState = () => {
    const savedToken = localStorage.getItem('attest_token');
    if (savedToken) {
      try {
        const decoded: any = jwtDecode(savedToken);
        if (decoded.exp * 1000 >= Date.now()) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          return { token: savedToken, user: { username: decoded.sub } };
        } else {
          localStorage.removeItem('attest_token');
        }
      } catch (e) {
        localStorage.removeItem('attest_token');
      }
    }
    return { token: null, user: null };
  };

  const initialState = getInitialState();
  const [token, setToken] = useState<string | null>(initialState.token);
  const [user, setUser] = useState<User | null>(initialState.user);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    }
  }, [token]);

  const login = (newToken: string) => {
    localStorage.setItem('attest_token', newToken);
    const decoded: any = jwtDecode(newToken);
    setUser({ username: decoded.sub });
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('attest_token');
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
