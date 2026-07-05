import { createContext, useContext, useState, useEffect } from "react";
import { vendorApi } from "../utils/api";

const VendorAuthContext = createContext(null);

export function VendorAuthProvider({ children }) {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("vendorAuthToken");
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await vendorApi.get("/vendor/auth/me");
      setVendor(response.data.vendor);
    } catch (error) {
      console.error("Vendor auth check failed:", error);
      localStorage.removeItem("vendorAuthToken");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await vendorApi.post("/vendor/auth/login", {
      email,
      password,
    });
    const { token, vendor } = response.data;
    localStorage.setItem("vendorAuthToken", token);
    setVendor(vendor);
    return vendor;
  };

  const register = async ({ email, password, businessName, contactPhone }) => {
    const response = await vendorApi.post("/vendor/auth/register", {
      email,
      password,
      businessName,
      contactPhone,
    });
    const { token, vendor } = response.data;
    localStorage.setItem("vendorAuthToken", token);
    setVendor(vendor);
    return vendor;
  };

  const logout = () => {
    localStorage.removeItem("vendorAuthToken");
    setVendor(null);
  };

  const value = {
    vendor,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!vendor,
  };

  return (
    <VendorAuthContext.Provider value={value}>
      {children}
    </VendorAuthContext.Provider>
  );
}

export function useVendorAuth() {
  const context = useContext(VendorAuthContext);
  if (!context) {
    throw new Error("useVendorAuth must be used within a VendorAuthProvider");
  }
  return context;
}
