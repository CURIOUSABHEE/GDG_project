import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

const PopupApp = () => {
  const [token, setToken] = useState("");
  const [storedToken, setStoredToken] = useState("");
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("Checking...");

  useEffect(() => {
    chrome.storage.local.get(["token", "username"], (result) => {
      if (result.token) {
        setStoredToken(result.token);
        setUsername(result.username || "");
        setStatus("Connected");
      } else {
        setStatus("Not Connected");
      }
    });
  }, []);

  const saveToken = () => {
    // Decode JWT to extract username
    let extractedUsername = "";
    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload));
      extractedUsername = decoded.username || "";
    } catch (e) {
      console.log("Could not decode token");
    }

    chrome.storage.local.set({ token, username: extractedUsername }, () => {
      setStoredToken(token);
      setUsername(extractedUsername);
      setStatus("Connected");
      setToken("");
    });
  };

  const clearToken = () => {
    chrome.storage.local.remove(["token", "username"], () => {
      setStoredToken("");
      setUsername("");
      setStatus("Not Connected");
    });
  };

  const openDashboard = () => {
    chrome.tabs.create({
      url: "https://gdg-project-7bne.vercel.app/dashboard.html",
    });
  };

  return (
    <div className="w-96 bg-gradient-to-br from-slate-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="gradient-primary p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <svg
              className="w-6 h-6"
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
          <div>
            <h1 className="text-xl font-bold">Linka</h1>
            <p className="text-xs text-white/70">Social Media Saver</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Status Badge */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-6 ${
            storedToken
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
          }`}
        >
          <div
            className={`w-2 h-2 rounded-full ${storedToken ? "bg-green-500" : "bg-amber-500"} animate-pulse`}
          ></div>
          <span className="text-sm font-medium">{status}</span>
        </div>

        {!storedToken ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    1
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Open Dashboard & Login
                  </p>
                  <button
                    onClick={openDashboard}
                    className="w-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Open Dashboard
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    2
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Copy Token & Connect
                  </p>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Paste your access token here..."
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none mb-2 text-slate-900 dark:text-white placeholder-slate-400"
                  />
                  <button
                    onClick={saveToken}
                    disabled={!token.trim()}
                    className="w-full gradient-primary text-white py-2 px-4 rounded-lg font-medium hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Connect Extension
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-apricot to-cherry flex items-center justify-center text-white font-bold text-lg">
                  {username ? username.charAt(0).toUpperCase() : "?"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {username || "Connected User"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ready to save posts
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={openDashboard}
              className="w-full gradient-primary text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              Go to Dashboard
            </button>

            <button
              onClick={clearToken}
              className="w-full border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 py-2 px-4 rounded-xl text-sm font-medium transition-colors"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PopupApp />
  </React.StrictMode>,
);
