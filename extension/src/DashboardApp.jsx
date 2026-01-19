import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import PostGrid from "./components/PostGrid";
import { useAuth } from "./context/AuthContext";
import Auth from "./components/Auth";
import { api } from "./utils/api";

export default function DashboardApp() {
  const { user, loading, logout } = useAuth();
  const [selectedDirectory, setSelectedDirectory] = useState(null);
  const [directories, setDirectories] = useState([]);

  // Load directories once and share with both components
  useEffect(() => {
    if (user) {
      loadDirectories();
    }
  }, [user]);

  const loadDirectories = async () => {
    try {
      const data = await api.get("/directories");
      setDirectories(data);
    } catch (e) {
      console.error("Error loading directories:", e);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-apricot border-r-transparent mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400 font-medium">
            Loading Linka...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-cream via-apricot/10 to-mint/10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Auth />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Sidebar
        selectedDirectory={selectedDirectory}
        onSelectDirectory={setSelectedDirectory}
        directories={directories}
        onDirectoriesChange={loadDirectories}
      />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Enhanced Header */}
        <header className="h-14 gradient-primary border-b border-white/10 flex items-center justify-between px-4 shadow-lg shadow-apricot/20 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">
              Linka
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                chrome.storage.local.get("token", (r) => {
                  navigator.clipboard.writeText(r.token || "");
                  alert("Token copied! Paste it in the Extension Popup.");
                });
              }}
              className="text-xs bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg backdrop-blur-sm transition-all duration-300 hover:shadow-lg font-medium"
            >
              📋 Token
            </button>
            <div className="h-6 w-px bg-white/20"></div>
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-lg px-2.5 py-1">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {user.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-medium text-white">
                {user.username}
              </span>
            </div>
            <button
              onClick={logout}
              className="text-sm text-white/70 hover:text-white transition-colors duration-200 px-2 py-1"
            >
              Logout
            </button>
          </div>
        </header>
        <PostGrid directoryId={selectedDirectory} directories={directories} />
      </div>
    </div>
  );
}
