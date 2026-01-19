import React, { useState, useEffect } from "react";
import { api } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function PostGrid({ directoryId, directories = [] }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  useEffect(() => {
    loadPosts();
  }, [directoryId]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const query = directoryId ? `?directoryId=${directoryId}` : "";
      const data = await api.get(`/posts${query}`);
      setPosts(data);
    } catch (e) {
      console.error(e);
      if (
        e.message.includes("Invalid token") ||
        e.message.includes("Access denied")
      ) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePostDirectory = async (postId, newDirectoryId, e) => {
    e.stopPropagation();
    try {
      await api.put(`/posts/${postId}`, { directory: newDirectoryId || null });
      loadPosts();
    } catch (e) {
      alert(e.message);
    }
  };

  const deletePost = async (id) => {
    if (!confirm("Delete post?")) return;
    try {
      await api.delete(`/posts/${id}`);
      setPosts(posts.filter((p) => p._id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case "linkedin":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        );
      case "twitter":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
          </svg>
        );
      case "instagram":
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.439 1.44-1.439.793-.001 1.44.645 1.44 1.439z" />
          </svg>
        );
      default:
        return (
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
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
        );
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform) {
      case "linkedin":
        return "from-blue-500 to-blue-600";
      case "twitter":
        return "from-sky-400 to-sky-500";
      case "instagram":
        return "from-pink-500 to-purple-500";
      case "youtube":
        return "from-red-500 to-red-600";
      default:
        return "from-camel to-apricot";
    }
  };

  const getPlatformName = (platform) => {
    switch (platform) {
      case "linkedin":
        return "LinkedIn";
      case "twitter":
        return "X (Twitter)";
      case "instagram":
        return "Instagram";
      case "youtube":
        return "YouTube";
      default:
        return "Other";
    }
  };

  const getPlatformBgColor = (platform) => {
    switch (platform) {
      case "linkedin":
        return "bg-blue-500/10 border-blue-500/30";
      case "twitter":
        return "bg-sky-500/10 border-sky-500/30";
      case "instagram":
        return "bg-pink-500/10 border-pink-500/30";
      case "youtube":
        return "bg-red-500/10 border-red-500/30";
      default:
        return "bg-orange-500/10 border-orange-500/30";
    }
  };

  // Group posts by platform
  const groupedPosts = posts.reduce((acc, post) => {
    const platform = post.platform || "other";
    if (!acc[platform]) {
      acc[platform] = [];
    }
    acc[platform].push(post);
    return acc;
  }, {});

  // Define platform order
  const platformOrder = [
    "linkedin",
    "twitter",
    "instagram",
    "youtube",
    "other",
  ];
  const sortedPlatforms = platformOrder.filter(
    (p) => groupedPosts[p]?.length > 0,
  );

  const renderPostCard = (post) => (
    <div
      key={post._id}
      onClick={() => window.open(post.originalUrl, "_blank")}
      className="group bg-white dark:bg-slate-900 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-apricot/10 transition-all duration-300 overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-apricot/30 flex flex-col cursor-pointer animate-slide-up hover:-translate-y-1"
    >
      {/* Image */}
      {post.imageUrl && (
        <div className="h-48 bg-slate-100 dark:bg-slate-800 w-full overflow-hidden relative">
          <img
            src={post.imageUrl}
            alt="Post content"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        </div>
      )}

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Platform Badge & Date */}
        <div className="flex items-center justify-between mb-3">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r ${getPlatformColor(post.platform)} text-white text-xs font-medium shadow-sm`}
          >
            {getPlatformIcon(post.platform)}
            <span className="capitalize">{post.platform}</span>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {new Date(post.savedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Author */}
        {post.authorName && (
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-apricot to-cherry flex items-center justify-center text-white text-xs font-semibold">
              {post.authorName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                {post.authorName}
              </p>
              {post.authorHandle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  @{post.authorHandle}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 line-clamp-3 flex-1">
          {post.content}
        </p>

        {/* Actions */}
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-apricot dark:text-apricot font-medium group-hover:underline flex items-center gap-1">
              View Post
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deletePost(post._id);
              }}
              className="p-1.5 rounded-lg hover:bg-cherry/10 dark:hover:bg-cherry/20 text-slate-400 hover:text-cherry transition-all duration-300"
              title="Delete Post"
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
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>

          {/* Directory Selector */}
          <select
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => updatePostDirectory(post._id, e.target.value, e)}
            value={post.directory || ""}
            className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 hover:border-apricot focus:border-apricot focus:ring-2 focus:ring-apricot/20 outline-none transition-all cursor-pointer"
          >
            <option value="">📂 Uncategorized</option>
            {directories.map((dir) => (
              <option key={dir._id} value={dir._id}>
                📁 {dir.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-0.5">
              Saved Posts
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {loading
                ? "Loading..."
                : `${posts.length} ${posts.length === 1 ? "post" : "posts"} saved`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-apricot/20 to-cherry/20 dark:from-apricot/10 dark:to-cherry/10 mb-3 animate-pulse">
              <svg
                className="w-8 h-8 text-apricot dark:text-apricot animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              Loading posts...
            </h3>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-apricot/20 to-cherry/20 dark:from-apricot/10 dark:to-cherry/10 mb-3">
              <svg
                className="w-8 h-8 text-apricot dark:text-apricot"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
              No posts yet
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Start saving posts from LinkedIn, Twitter, and Instagram using the
              Linko extension!
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedPlatforms.map((platform) => (
              <div
                key={platform}
                className={`rounded-2xl border ${getPlatformBgColor(platform)} p-4`}
              >
                {/* Platform Section Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r ${getPlatformColor(platform)} text-white font-semibold shadow-lg`}
                  >
                    {getPlatformIcon(platform)}
                    <span>{getPlatformName(platform)}</span>
                  </div>
                  <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    {groupedPosts[platform].length}{" "}
                    {groupedPosts[platform].length === 1 ? "post" : "posts"}
                  </span>
                </div>

                {/* Posts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {groupedPosts[platform].map((post) => renderPostCard(post))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
