import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { invoiceService } from '../services/api'; // Import invoiceService

interface User {
  id: string;
  username: string;
  name: string;
  empresa?: string;
  sucursal?: string;
  token?: string;
  nombreEmpresa?: string; // ADDED
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined); // Export AuthContext

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null); // token state
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const storedToken = localStorage.getItem('authToken');
        const userData = localStorage.getItem('user');

        if (storedToken && userData) {
          api.defaults.headers.Authorization = `Bearer ${storedToken}`;
          setToken(storedToken); // Set token in state
          setUser(JSON.parse(userData));
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Failed to authenticate:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        api.defaults.headers.Authorization = null;
        setToken(null); // Clear token state
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = async (username: string, password: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await invoiceService.login(username, password); // Call invoiceService.login

      if (response.status) {
        if (!response.token) {
          throw new Error('Token is missing in the response');
        }

        const userData: User = {
          id: response.id || 'mock-id', // Use response.id
          name: response.name || 'Demo User',
          empresa: response.empresa || '',
          sucursal: response.sucursal || '',
          username: username,
          token: response.token, // Store the token in User object
          nombreEmpresa: response.nombreEmpresa || 'Empresa Demo' // ADDED
        };

        localStorage.setItem('authToken', response.token);
        localStorage.setItem('user', JSON.stringify(userData));

        api.defaults.headers.Authorization = `Bearer ${response.token}`;

        setUser(userData);
        setIsAuthenticated(true);
        setToken(response.token);
      } else {
        throw new Error(response.message || 'Invalid credentials');
      }
    } catch (error: any) {
      console.error('Error in authentication:', error);
      throw error; // Re-throw for the component Login to handle it
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    api.defaults.headers.Authorization = null;
    setToken(null); // Clear token state
    setUser(null);
    setIsAuthenticated(false);
    navigate('/login');
  };

  const value: AuthContextType = {
    isAuthenticated: isAuthenticated,
    isLoading: isLoading,
    user: user,
    token: token, // Add token to value
    login: handleLogin,
    logout: logout,
  };

  return (
    <AuthContext.Provider value={value}>
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

//Export the interface too!
export type { AuthContextType };