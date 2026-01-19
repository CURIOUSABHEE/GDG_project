// Note: CSS imports removed - they cause CSP violations on sites like LinkedIn
// The content script uses inline styles for its UI elements

console.log("Linko Scraper Loaded");

// --- Store interval/observer for cleanup ---
let linkoInterval = null;
let linkoObserver = null;

// --- Utility: debounce to avoid excessive DOM processing ---
function debounce(fn, delay = 300) {
  let timer = null;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(null, args), delay);
  };
}

// --- Check if extension context is valid ---
function isExtensionContextValid() {
  try {
    // This will throw if context is invalidated
    if (typeof chrome === "undefined" || !chrome.runtime) return false;
    // Accessing chrome.runtime.id throws if context is invalidated
    const id = chrome.runtime.id;
    return !!id;
  } catch (e) {
    // Context invalidated - cleanup
    cleanupLinko();
    return false;
  }
}

// --- Cleanup function to stop all Linko operations ---
function cleanupLinko() {
  if (linkoInterval) {
    clearInterval(linkoInterval);
    linkoInterval = null;
  }
  if (linkoObserver) {
    linkoObserver.disconnect();
    linkoObserver = null;
  }
  // Remove any Linko buttons
  const instBtn = document.getElementById("linko-instagram-save-btn");
  const ytBtn = document.getElementById("linko-youtube-save-btn");
  if (instBtn) instBtn.remove();
  if (ytBtn) ytBtn.remove();
  console.log(
    "Linko: Cleaned up due to context invalidation. Please refresh the page.",
  );
}

// --- Safe message sender that handles invalidated context ---
function safeSendMessage(message, callback) {
  if (!isExtensionContextValid()) {
    if (callback)
      callback({ success: false, error: "Extension context invalidated" });
    return;
  }

  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("Linko message error:", chrome.runtime.lastError.message);
        if (callback)
          callback({ success: false, error: chrome.runtime.lastError.message });
        return;
      }
      if (callback) callback(response);
    });
  } catch (e) {
    console.warn("Linko: Failed to send message:", e.message);
    if (callback) callback({ success: false, error: e.message });
  }
}

// --- Helper Functions ---
function getPlatform() {
  const host = window.location.hostname;
  if (host.includes("linkedin")) return "linkedin";
  if (host.includes("twitter") || host.includes("x.com")) return "twitter";
  if (host.includes("instagram")) return "instagram";
  if (host.includes("youtube")) return "youtube";
  return "other";
}

function scrapePost(element) {
  const platform = getPlatform();
  let data = {
    platform,
    originalUrl: window.location.href, // potentially inaccurate if feed, specific logic below
    content: "",
    authorName: "",
    authorHandle: "",
    imageUrl: "",
  };

  try {
    if (platform === "linkedin") {
      // LinkedIn Logic
      const container =
        element || document.querySelector(".feed-shared-update-v2") || document;

      data.content =
        container.querySelector(
          ".feed-shared-update-v2__description, .update-components-text",
        )?.innerText || "";

      const authorEl =
        container.querySelector(".update-components-actor__name") ||
        container.querySelector(".feed-shared-actor__name");
      data.authorName = authorEl?.innerText || "";

      // Image
      // Image
      const img = container.querySelector(
        ".update-components-image__image, .feed-shared-image__image",
      );
      data.imageUrl = img?.src || "";

      // Extract Permalink - Try multiple strategies
      let foundUrl = null;

      // Strategy 1: Look for data-urn attribute
      const urn =
        container.getAttribute("data-urn") ||
        container.getAttribute("data-activity-urn");
      if (urn && !foundUrl) {
        foundUrl = `https://www.linkedin.com/feed/update/${urn}/`;
      }

      // Strategy 2: Find timestamp link (most reliable)
      if (!foundUrl) {
        const timeLinks = container.querySelectorAll(
          'a[href*="/feed/update/"], a[href*="/posts/"]',
        );
        for (const link of timeLinks) {
          if (
            link.href &&
            (link.href.includes("/feed/update/") ||
              link.href.includes("/posts/"))
          ) {
            foundUrl = link.href;
            break;
          }
        }
      }

      // Strategy 3: Look for any link with activity URN in href
      if (!foundUrl) {
        const allLinks = container.querySelectorAll(
          'a[href*="urn:li:activity"]',
        );
        if (allLinks.length > 0) {
          foundUrl = allLinks[0].href;
        }
      }

      if (foundUrl) {
        data.originalUrl = foundUrl;
      }
      // Otherwise keep window.location.href as fallback
    } else if (platform === "twitter") {
      // Twitter/X Logic
      const container =
        element || document.querySelector('article[data-testid="tweet"]');
      if (!container) return data;

      data.content =
        container.querySelector('div[data-testid="tweetText"]')?.innerText ||
        "";
      data.authorName =
        container.querySelector('div[data-testid="User-Name"] a')?.innerText ||
        "";

      // Handle and Image logic...
      const img = container.querySelector('img[alt="Image"]');
      if (img && img.src.includes("media")) data.imageUrl = img.src;

      // Try to find status link (Time element always links to status)
      const timeEl = container.querySelector("time");
      if (timeEl) {
        const link = timeEl.closest("a");
        if (link) data.originalUrl = link.href;
      }
    } else if (platform === "instagram") {
      // Instagram Logic - Enhanced for feed, posts, reels, and stories
      const url = new URL(window.location.href);
      const isPostPage = url.pathname.includes("/p/");
      const isReelPage = url.pathname.includes("/reel/");
      const isStoryPage = url.pathname.includes("/stories/");

      // Try to get the target element
      const target = element || document.querySelector("article") || document;

      // --- Extract Author Info ---
      let foundAuthor = false;
      const systemRoutes = [
        "p",
        "reel",
        "stories",
        "explore",
        "direct",
        "accounts",
        "api",
        "developer",
        "about",
        "legal",
        "reels",
        "tags",
        "locations",
      ];

      // Strategy 1: Look for username link in header section
      const header = target.querySelector("header");
      if (header) {
        // Look for the first link that goes to a user profile
        const links = header.querySelectorAll('a[href^="/"]');
        for (const link of links) {
          const href = link.getAttribute("href");
          if (!href) continue;

          // Parse the href - should be like /username/ or /username
          const pathParts = href.split("/").filter((p) => p);
          if (pathParts.length === 1) {
            const segment = pathParts[0];
            if (!systemRoutes.includes(segment.toLowerCase())) {
              // This looks like a username link
              // Try to get text from the link or nearby elements
              let username = link.innerText?.trim();

              // Sometimes the link wraps an image, check for text nearby
              if (!username || username.length === 0) {
                // Look for sibling or parent text
                const parent = link.parentElement;
                if (parent) {
                  const textSpan = parent.querySelector("span");
                  if (textSpan) username = textSpan.innerText?.trim();
                }
              }

              // If still no username text, use the segment from URL
              if (!username || username.length === 0) {
                username = segment;
              }

              data.authorHandle = segment;
              data.authorName = username;
              foundAuthor = true;
              break;
            }
          }
        }
      }

      // Strategy 2: Look for any link with role="link" that appears to be a username
      if (!foundAuthor) {
        const roleLinks = target.querySelectorAll('a[role="link"][href^="/"]');
        for (const link of roleLinks) {
          const href = link.getAttribute("href");
          if (!href) continue;

          const pathParts = href.split("/").filter((p) => p);
          if (pathParts.length === 1) {
            const segment = pathParts[0];
            if (
              !systemRoutes.includes(segment.toLowerCase()) &&
              segment.length > 0
            ) {
              let username = link.innerText?.trim();
              if (!username) username = segment;

              // Skip if it looks like navigation text
              if (
                [
                  "Follow",
                  "Following",
                  "Message",
                  "Share",
                  "Save",
                  "More",
                  "Like",
                  "Comment",
                ].includes(username)
              )
                continue;

              data.authorHandle = segment;
              data.authorName = username;
              foundAuthor = true;
              break;
            }
          }
        }
      }

      // Strategy 3: Look at the top of article for username pattern
      if (!foundAuthor) {
        // Instagram often has the username at the very top of articles
        const allLinks = target.querySelectorAll('a[href^="/"]');
        for (const link of allLinks) {
          const href = link.getAttribute("href");
          const text = link.innerText?.trim();

          if (!href) continue;

          const pathParts = href.split("/").filter((p) => p);
          if (pathParts.length === 1) {
            const segment = pathParts[0];
            if (
              !systemRoutes.includes(segment.toLowerCase()) &&
              segment.length > 0
            ) {
              // Validate it looks like a username (no spaces, reasonable length)
              if (segment.length <= 30 && !/\s/.test(segment)) {
                data.authorHandle = segment;
                data.authorName = text || segment;
                foundAuthor = true;
                break;
              }
            }
          }
        }
      }

      // Strategy 4: Extract from URL if on a post/reel page
      if (!foundAuthor && (isPostPage || isReelPage)) {
        // Try to find the owner from page metadata or specific selectors
        // Sometimes the username appears in a specific location on post pages
        const metaTitle = document.querySelector(
          'meta[property="og:title"]',
        )?.content;
        if (metaTitle) {
          // Format is often "Username on Instagram: caption..."
          const match = metaTitle.match(/^(.+?)\s+on\s+Instagram/i);
          if (match) {
            data.authorName = match[1].trim();
            // Try to get handle from a link
            const profileLink = document.querySelector(
              'header a[href^="/"][href$="/"]',
            );
            if (profileLink) {
              const href = profileLink.getAttribute("href");
              data.authorHandle =
                href?.split("/").filter((p) => p)[0] || data.authorName;
            } else {
              data.authorHandle = data.authorName.replace(/\s+/g, "");
            }
            foundAuthor = true;
          }
        }
      }

      // Strategy 5: Look for spans with specific patterns that might contain usernames
      if (!foundAuthor) {
        // Instagram sometimes wraps usernames in spans near the top
        const spans = target.querySelectorAll("span");
        for (let i = 0; i < Math.min(spans.length, 20); i++) {
          // Check first 20 spans
          const span = spans[i];
          const text = span.innerText?.trim();

          // Username patterns: no spaces, starts with letter, reasonable length
          if (
            text &&
            text.length > 0 &&
            text.length <= 30 &&
            /^[a-zA-Z]/.test(text) &&
            !/\s/.test(text) &&
            !["Follow", "Following", "Liked", "Reels", "Tagged"].includes(text)
          ) {
            // Check if this span is inside or near a link to the profile
            const parentLink = span.closest('a[href^="/"]');
            if (parentLink) {
              const href = parentLink.getAttribute("href");
              const pathParts = href?.split("/").filter((p) => p) || [];
              if (pathParts.length === 1 && pathParts[0] === text) {
                data.authorHandle = text;
                data.authorName = text;
                foundAuthor = true;
                break;
              }
            }
          }
        }
      }

      // Strategy 6: Stories page - extract from URL
      if (!foundAuthor && isStoryPage) {
        // URL format: /stories/username/storyId/
        const pathParts = url.pathname.split("/").filter((p) => p);
        if (pathParts.length >= 2 && pathParts[0] === "stories") {
          data.authorHandle = pathParts[1];
          data.authorName = pathParts[1];
          foundAuthor = true;
        }
      }

      // --- Extract Image/Video Thumbnail ---
      const mainImage =
        target.querySelector('img[style*="object-fit"]') ||
        target.querySelector("article img[srcset]") ||
        target.querySelector('div[role="button"] img') ||
        target.querySelector('img:not([alt=""])');

      if (mainImage && mainImage.src) {
        data.imageUrl = mainImage.src;
      }

      if (!data.imageUrl) {
        const video = target.querySelector("video");
        if (video) {
          data.imageUrl = video.poster || "";
        }
      }

      if (!data.imageUrl) {
        data.imageUrl =
          document.querySelector('meta[property="og:image"]')?.content || "";
      }

      // --- Set Content (Title) to Account Name as requested ---
      // User explicitly asked for Account Name / Channel instead of Caption
      if (data.authorHandle) {
        data.content = `@${data.authorHandle}`;
      } else if (data.authorName) {
        data.content = data.authorName;
      } else {
        // If we failed to find author, try one last check on ANY strong text in header
        if (header) {
          const possibleText = header.innerText.split("\n")[0];
          if (possibleText && possibleText.length < 30) {
            data.content = possibleText;
          } else {
            data.content = "Instagram Post";
          }
        } else {
          data.content = "Instagram Post";
        }
      }

      // We can append a small snippet of the caption if we want, but user said "I DON'T WANT CAPTIONS"
      // So we stick to Account Name.

      // Add Platform identifier to title for clarity?
      // data.content = `IG: @${data.authorHandle}`; // Optional

      // Ensure we don't have empty content
      if (!data.content) data.content = "Instagram Post";

      // --- Extract Post URL ---
      if (isPostPage || isReelPage) {
        // Already on a post/reel page, use current URL
        const pathMatch = url.pathname.match(/\/(p|reel)\/([^/]+)/);
        if (pathMatch) {
          data.originalUrl = `https://www.instagram.com/${pathMatch[1]}/${pathMatch[2]}/`;
        }
      } else {
        // On feed - try to find post link from time element or other links
        const timeEl = target.querySelector("time");
        if (timeEl) {
          const link = timeEl.closest("a");
          if (link && link.href) {
            data.originalUrl = link.href;
          }
        }

        // Alternative: find any /p/ or /reel/ link
        if (!data.originalUrl || data.originalUrl === window.location.href) {
          const postLink = target.querySelector(
            'a[href*="/p/"], a[href*="/reel/"]',
          );
          if (postLink) {
            data.originalUrl = postLink.href;
          }
        }
      }

      // If on stories, extract story URL
      if (isStoryPage) {
        data.originalUrl = window.location.href;
        data.content = `Instagram Story from @${data.authorHandle || data.authorName}`;
      }
    } else if (platform === "youtube") {
      // YouTube Logic

      // Case 1: Scraping a specific element (from feed/list)
      if (element) {
        // Determine if element is the thumbnail or a parent container
        // We usually pass #thumbnail or the renderer itself
        // If passed #thumbnail, we might need to go up to finding title

        // Ideally traverse up to the main renderer
        const renderer =
          element.closest("ytd-rich-item-renderer") ||
          element.closest("ytd-video-renderer") ||
          element.closest("ytd-grid-video-renderer") ||
          element.closest("ytd-reel-video-renderer") ||
          element.closest("ytd-compact-video-renderer") ||
          element; // fallback

        // Title
        const titleEl =
          renderer.querySelector("#video-title") ||
          renderer.querySelector("#video-title-link");
        data.content = titleEl?.innerText?.trim() || titleEl?.title || "";

        // URL
        if (titleEl && titleEl.href) {
          data.originalUrl = titleEl.href;
        } else {
          const thumbLink = renderer.querySelector("a#thumbnail");
          if (thumbLink) data.originalUrl = thumbLink.href;
        }

        // Author
        const authorEl =
          renderer.querySelector("#channel-name a") ||
          renderer.querySelector(".ytd-channel-name a") ||
          renderer.querySelector(".ytd-channel-name"); // sometimes text is direct
        data.authorName = authorEl?.innerText?.trim() || "";

        // Image
        const img = renderer.querySelector("img");
        data.imageUrl = img?.src || "";
      } else {
        // Case 2: Scraping the current page (Watch page)
        // ... existing logic for page ...

        const url = new URL(window.location.href);
        const isShorts = url.pathname.includes("/shorts/");
        const isWatch = url.pathname === "/watch";

        // Get video ID
        let videoId = null;
        if (isShorts) {
          const pathParts = url.pathname.split("/");
          const shortsIndex = pathParts.indexOf("shorts");
          if (shortsIndex !== -1 && pathParts[shortsIndex + 1]) {
            videoId = pathParts[shortsIndex + 1];
          }
        } else if (isWatch) {
          videoId = url.searchParams.get("v");
        }

        // Channel name
        data.authorName =
          document.querySelector("#channel-name a")?.innerText?.trim() ||
          document.querySelector("ytd-channel-name a")?.innerText?.trim() ||
          document.querySelector("#owner-name a")?.innerText?.trim() ||
          document.querySelector(".ytd-channel-name a")?.innerText?.trim() ||
          "";

        // Video title
        data.content =
          document
            .querySelector("h1.ytd-video-primary-info-renderer")
            ?.innerText?.trim() ||
          document.querySelector("h1.ytd-watch-metadata")?.innerText?.trim() ||
          document.querySelector("#title h1")?.innerText?.trim() ||
          document.title.replace(" - YouTube", "");

        // Video thumbnail
        if (videoId) {
          data.imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
          data.originalUrl = isShorts
            ? `https://www.youtube.com/shorts/${videoId}`
            : `https://www.youtube.com/watch?v=${videoId}`;
        }
      }
    } else {
      // Generic fallback
      data.title = document.title;
      data.content =
        document.querySelector('meta[name="description"]')?.content || "";
    }
  } catch (e) {
    console.error("Scraping error:", e);
  }

  return data;
}

// --- Injection Logic ---

function createSaveButton(target) {
  const btn = document.createElement("button");
  btn.innerText = "Save to Linko";
  btn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        z-index: 9999;
        background: #4f46e5;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        font-family: sans-serif;
        font-size: 12px;
        cursor: pointer;
        opacity: 0.9;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    `;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.innerText = "Saving...";
    const data = scrapePost(target);

    safeSendMessage({ action: "save_post", data }, (response) => {
      if (response && response.success) {
        btn.innerText = "Saved!";
        btn.style.background = "#10b981"; // green
        setTimeout(() => btn.remove(), 2000);
      } else {
        btn.innerText = "Error";
        btn.style.background = "#ef4444"; // red
        setTimeout(() => {
          btn.innerText = "Save to Linko";
          btn.style.background = "#4f46e5";
        }, 2000);
      }
    });
  });

  return btn;
}

function processPosts() {
  const platform = getPlatform();

  switch (platform) {
    case "linkedin": {
      const posts = document.querySelectorAll(".feed-shared-update-v2");
      posts.forEach((post) => injectButton(post));
      break;
    }
    case "twitter": {
      const posts = document.querySelectorAll('article[data-testid="tweet"]');
      posts.forEach((post) => injectButton(post));
      break;
    }
    case "instagram": {
      processInstagramPosts();
      break;
    }
    case "youtube": {
      processYouTubeVideos();
      break;
    }
    default:
      break;
  }
}

const debouncedProcessPosts = debounce(processPosts, 400);

function injectButton(post, customStyle = {}) {
  if (post.dataset.linkoProcessed) return;
  post.dataset.linkoProcessed = "true";

  // Ensure relative positioning so absolute button is relative to this post
  const style = window.getComputedStyle(post);
  if (style.position === "static") {
    post.style.position = "relative";
  }

  const btn = createSaveButton(post);

  // Apply custom styles if provided
  if (Object.keys(customStyle).length > 0) {
    Object.assign(btn.style, customStyle);
  }

  post.appendChild(btn);
}

// Instagram-specific processing
function processInstagramPosts() {
  // 1. Try to find feed posts/articles
  const articles = document.querySelectorAll("article");

  if (articles.length > 0) {
    articles.forEach((article) => {
      // Avoid injecting into stories or minimal layouts if they are <article>
      injectButton(article, {
        top: "10px",
        right: "10px",
        zIndex: "100",
        position: "absolute",
        padding: "8px 16px",
        background: "white",
        color: "black",
        borderRadius: "20px",
        fontWeight: "600",
        fontSize: "14px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      });
    });
  } else {
    // Fallback? Or maybe we are on a single post page that isn't an article?
    // Usually single post pages are also <article>.
    // If no articles found, maybe try the old floating button as a safety net?
    // Let's keep it simple for now as requested "every post".
  }
}

// Cleanup Instagram button - specific to the old floating button,
// but we might want to clean up per-post buttons if they become invalid?
// For now, simple removal of the global floating button if it exists.
function cleanupInstagramButton() {
  const btn = document.getElementById("linko-instagram-save-btn");
  if (btn) btn.remove();
}

// YouTube-specific processing
function processYouTubeVideos() {
  // Target multiple video container types
  const videoSelectors = [
    "ytd-rich-item-renderer", // Home feed
    "ytd-video-renderer", // Search results
    "ytd-grid-video-renderer", // Channel videos
    "ytd-reel-video-renderer", // Shorts (sometimes)
    "ytd-compact-video-renderer", // Sidebar recommendations
  ];

  const videos = document.querySelectorAll(videoSelectors.join(","));

  videos.forEach((video) => {
    // For YouTube, it's often better to attach to the thumbnail container
    // so it doesn't mess up the layout of the text details
    const target = video.querySelector("#thumbnail") || video;

    // Check if we already injected into this specific target (using the parent video's dataset check)
    if (video.dataset.linkoProcessed) return;

    // We treat the 'post' as the main video container for metadata,
    // but the specific target for visual injection might be the thumbnail.
    // However, injectButton attaches to 'post', so we need to be careful.

    // Let's attach to the 'video' container but position it over the thumbnail.
    // This requires 'relative' on the video container, which might break layout.
    // Better strategy: Attach to #thumbnail if it exists.

    if (target.id === "thumbnail") {
      injectButton(target, {
        top: "5px",
        right: "5px",
        zIndex: "1000",
        padding: "4px 8px",
        fontSize: "12px",
        background: "rgba(0, 0, 0, 0.8)",
        color: "white",
        border: "1px solid rgba(255,255,255,0.2)",
      });
      // Mark the parent video as processed too so we don't try again
      video.dataset.linkoProcessed = "true";
    } else {
      // Fallback
      injectButton(video);
    }
  });

  // Also handle the main video player page (just in case they want a button there too)
  const mainPlayer = document.querySelector("#movie_player");
  if (mainPlayer && !document.getElementById("linko-youtube-main-btn")) {
    // Optional: Add valid logic for main player if requested.
    // For now, focusing on "every post" in feeds/lists as per common interpretation.
  }
}

function cleanupYouTubeButton() {
  const btn = document.getElementById("linko-youtube-save-btn");
  if (btn) btn.remove();
}

// --- Initialize Linko with proper context checking ---
function initLinko() {
  // Check context before starting
  if (!isExtensionContextValid()) {
    console.warn("Linko: Cannot initialize - context invalid");
    return;
  }

  // Clear any existing interval/observer
  if (linkoInterval) clearInterval(linkoInterval);
  if (linkoObserver) linkoObserver.disconnect();

  // Run periodically to handle infinite scroll and SPA navigation
  linkoInterval = setInterval(() => {
    // Check context at the start of each interval
    if (!isExtensionContextValid()) {
      return; // cleanupLinko() is called inside isExtensionContextValid
    }

    debouncedProcessPosts();
    const platform = getPlatform();
    if (platform === "youtube") {
      cleanupYouTubeButton();
    }
    if (platform === "instagram") {
      cleanupInstagramButton();
    }
  }, 2000);

  // Listen for SPA navigation (YouTube and Instagram use History API)
  const platform = getPlatform();
  if (platform === "youtube" || platform === "instagram") {
    let lastUrl = location.href;
    linkoObserver = new MutationObserver(() => {
      // Check context before processing mutations
      if (!isExtensionContextValid()) {
        return; // cleanupLinko() is called inside isExtensionContextValid
      }

      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        const currentPlatform = getPlatform();

        // Remove old buttons
        if (currentPlatform === "youtube") {
          const btn = document.getElementById("linko-youtube-save-btn");
          if (btn) btn.remove();
        }
        if (currentPlatform === "instagram") {
          const btn = document.getElementById("linko-instagram-save-btn");
          if (btn) btn.remove();
        }

        // Wait for page to load then process
        setTimeout(() => {
          if (isExtensionContextValid()) {
            debouncedProcessPosts();
          }
        }, 500);
      }
    });
    linkoObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: false,
    });
  }
}

// Start Linko
initLinko();

// Also handle Context Menu action request
if (isExtensionContextValid()) {
  try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      // Check context validity on each message
      if (!isExtensionContextValid()) {
        sendResponse({
          success: false,
          error: "Extension context invalidated",
        });
        return;
      }

      if (request.action === "scrape_and_save") {
        const data = scrapePost(null); // Scrape full page or best guess
        if (request.info.selectionText)
          data.content = request.info.selectionText;
        if (request.info.linkUrl) data.originalUrl = request.info.linkUrl;
        if (request.info.srcUrl) data.imageUrl = request.info.srcUrl;

        safeSendMessage({ action: "save_post", data }, sendResponse);
        return true; // Keep channel open for async response
      }

      if (request.action === "show_notification") {
        // Create a toast
        const toast = document.createElement("div");
        toast.innerText = request.message;
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: ${request.status === "success" ? "#10b981" : "#ef4444"};
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            font-family: sans-serif;
            animation: slideIn 0.3s ease-out;
          `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
      }
    });
  } catch (e) {
    console.warn("Linko: Failed to add message listener:", e.message);
  }
}

// Animation styles
try {
  const style = document.createElement("style");
  style.innerHTML = `
  @keyframes slideIn {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
  }
  @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
  }
  `;
  document.head.appendChild(style);
} catch (e) {
  // Style injection failed, non-critical
}
