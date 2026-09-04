import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("jackal_token"));
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const fetchCurrentUser = useCallback(async (authToken) => {
    if (!authToken) {
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        // Expired or invalid
        localStorage.removeItem("jackal_token");
        setToken(null);
        setUser(null);
      }
    } catch {
      // Network or offline fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
    } else {
      // Create guest automatically if no user exists yet
      quickGuest();
    }
  }, [token, fetchCurrentUser]);

  const setAuthSession = (authToken, userData) => {
    localStorage.setItem("jackal_token", authToken);
    setToken(authToken);
    setUser(userData);
  };

  const login = async (username, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setAuthSession(data.token, data.user);
      setShowAuthModal(false);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const register = async (username, password) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setAuthSession(data.token, data.user);
      setShowAuthModal(false);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const quickGuest = async (preferredCallsign) => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/auth/guest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callsign: preferredCallsign }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setAuthSession(data.token, data.user);
      }
    } catch {
      // Offline fallback
    } finally {
      setIsLoading(false);
    }
  };

  const updateCallsign = async (newCallsign) => {
    if (!token) return { success: false, error: "Not authenticated" };
    try {
      const res = await fetch("/api/auth/callsign", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ callsign: newCallsign }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update callsign");
      setAuthSession(data.token, data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    localStorage.removeItem("jackal_token");
    setToken(null);
    setUser(null);
    quickGuest(); // Revert to clean guest session
  };

  const reloadProfile = () => {
    if (token) fetchCurrentUser(token);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        showAuthModal,
        setShowAuthModal,
        login,
        register,
        quickGuest,
        updateCallsign,
        logout,
        reloadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
