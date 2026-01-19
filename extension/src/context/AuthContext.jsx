import React, { createContext, useState, useEffect, useContext } from "react";

// Check if running in extension context
const isExtensionContext =
  typeof chrome !== "undefined" &&
  chrome.storage &&
  chrome.storage.local &&
  typeof chrome.runtime !== "undefined" &&
  chrome.runtime.id;

// Mock chrome storage for local development or when running outside extension
if (!isExtensionContext) {
  window.chrome = window.chrome || {};
  window.chrome.storage = {
    local: {
      get: (keys, cb) => {
        const result = {};
        if (Array.isArray(keys)) {
          keys.forEach((k) => {
            const val = localStorage.getItem(k);
            result[k] = val;
          });
        } else if (typeof keys === "string") {
          result[keys] = localStorage.getItem(keys);
        }
        if (cb) cb(result);
        return Promise.resolve(result);
      },
      set: (items, cb) => {
        Object.keys(items).forEach((k) => localStorage.setItem(k, items[k]));
        if (cb) cb();
        return Promise.resolve();
      },
      remove: (keys, cb) => {
        if (Array.isArray(keys)) {
          keys.forEach((k) => localStorage.removeItem(k));
        } else {
          localStorage.removeItem(keys);
        }
        if (cb) cb();
        return Promise.resolve();
      },
    },
  };
  window.chrome.runtime = {
    sendMessage: () => {},
    onMessage: { addListener: () => {} },
    lastError: null,
  };
}

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check storage for token
    chrome.storage.local.get(["token", "username"], (result) => {
      if (result.token) {
        setUser({ username: result.username });
      }
      setLoading(false);
    });
  }, []);

  const login = (token, username) => {
    chrome.storage.local.set({ token, username }, () => {
      setUser({ username });
    });
  };

  const logout = () => {
    chrome.storage.local.remove(["token", "username"], () => {
      setUser(null);
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
