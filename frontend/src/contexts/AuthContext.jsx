import { createContext, useContext, useState, useEffect } from "react";
import { api } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get("/api/admin/auth/me");
      setAdmin(response.data.admin);
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("authToken");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await api.post("/api/admin/auth/login", {
      email,
      password,
    });
    const { token, admin } = response.data;
    localStorage.setItem("authToken", token);
    setAdmin(admin);
    return admin;
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    setAdmin(null);
  };

  const changePassword = async (currentPassword, newPassword) => {
    await api.post("/api/admin/auth/change-password", {
      currentPassword,
      newPassword,
    });
  };

  const value = {
    admin,
    loading,
    login,
    logout,
    changePassword,
    isAuthenticated: !!admin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
