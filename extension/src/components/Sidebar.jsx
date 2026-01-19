import React, { useState } from "react";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function Sidebar({
  selectedDirectory,
  onSelectDirectory,
  directories = [],
  onDirectoriesChange,
}) {
  const [newDirName, setNewDirName] = useState("");
  const { logout } = useAuth();

  const createDirectory = async (e) => {
    e.preventDefault();
    if (!newDirName.trim()) return;
    try {
      await api.post("/directories", { name: newDirName });
      setNewDirName("");
      onDirectoriesChange?.();
    } catch (e) {
      alert(e.message);
    }
  };

  const deleteDirectory = async (id, e) => {
    e.stopPropagation();
    if (!confirm("Delete directory?")) return;
    try {
      await api.delete(`/directories/${id}`);
      if (selectedDirectory === id) onSelectDirectory(null);
      onDirectoriesChange?.();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen flex flex-col shadow-xl overflow-hidden">
      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto p-4 pb-2">
        {/* Quick Access */}
        <div className="mb-6">
          <div
            onClick={() => onSelectDirectory(null)}
            className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 mb-2 ${
              !selectedDirectory
                ? "bg-gradient-to-r from-apricot to-cherry text-white shadow-lg shadow-apricot/30"
                : "hover:bg-cream/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-md"
            }`}
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span className="text-sm font-medium">All Posts</span>
          </div>
          <div
            onClick={() => onSelectDirectory("uncategorized")}
            className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300 ${
              selectedDirectory === "uncategorized"
                ? "bg-gradient-to-r from-apricot to-cherry text-white shadow-lg shadow-apricot/30"
                : "hover:bg-cream/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-md"
            }`}
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
                d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm font-medium">Uncategorized</span>
          </div>
        </div>

        {/* Directories Section */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Folders
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              {directories.length}
            </span>
          </div>

          <div className="space-y-1">
            {directories.map((dir) => (
              <div
                key={dir._id}
                onClick={() => onSelectDirectory(dir._id)}
                className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-300 ${
                  selectedDirectory === dir._id
                    ? "bg-gradient-to-r from-apricot to-cherry text-white shadow-lg shadow-apricot/30"
                    : "hover:bg-cream/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:shadow-md"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                    />
                  </svg>
                  <span className="font-medium truncate">{dir.name}</span>
                </div>
                <button
                  onClick={(e) => deleteDirectory(dir._id, e)}
                  className={`opacity-0 group-hover:opacity-100 p-1 rounded-lg transition-all duration-300 ${
                    selectedDirectory === dir._id
                      ? "hover:bg-white/20"
                      : "hover:bg-cherry/10 dark:hover:bg-cherry/20 text-slate-400 hover:text-cherry"
                  }`}
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Directory Form */}
      <div className="flex-shrink-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <form onSubmit={createDirectory} className="flex flex-col gap-2">
          <input
            type="text"
            placeholder="New folder name..."
            className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 focus:ring-2 focus:ring-apricot focus:border-transparent outline-none transition-all"
            value={newDirName}
            onChange={(e) => setNewDirName(e.target.value)}
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-gradient-to-r from-apricot to-cherry text-white rounded-lg hover:shadow-lg hover:shadow-apricot/40 transition-all duration-300 hover:scale-105 font-medium flex items-center justify-center gap-2"
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
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
