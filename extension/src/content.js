// Note: CSS imports removed - they cause CSP violations on sites like LinkedIn
// The content script uses inline styles for its UI elements

console.log("Linko Scraper Loaded");

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
      // Instagram Logic
      const container = document.querySelector("article");
      if (container) {
        // If we are on the feed, this selector `document.querySelector('article')` is too broad (gets first post only).
        // But injection logic passes specific `element`.
        // Instagram feed posts usually have a time element that links to the post.

        // If element is passed (feed) or container found (post page)
        const target = element || container;

        data.authorName = target.querySelector("header span")?.innerText || "";
        data.imageUrl = target.querySelector("img")?.src || "";
        const caption =
          target.querySelector("h1") || target.querySelector("span");
        data.content = caption?.innerText || "";

        // Permalink from time
        const timeEl = target.querySelector("time");
        if (timeEl) {
          const link = timeEl.closest("a");
          if (link) data.originalUrl = link.href;
        }
      }
    } else if (platform === "youtube") {
      // YouTube Logic - Extract video information
      const url = new URL(window.location.href);
      const isShorts = url.pathname.includes("/shorts/");
      const isWatch = url.pathname === "/watch";

      // Get video ID
      let videoId = null;
      if (isShorts) {
        // YouTube Shorts: /shorts/VIDEO_ID
        const pathParts = url.pathname.split("/");
        const shortsIndex = pathParts.indexOf("shorts");
        if (shortsIndex !== -1 && pathParts[shortsIndex + 1]) {
          videoId = pathParts[shortsIndex + 1];
        }
      } else if (isWatch) {
        videoId = url.searchParams.get("v");
      }

      // Channel name - try multiple selectors for different YouTube layouts
      data.authorName =
        document.querySelector("#channel-name a")?.innerText?.trim() ||
        document.querySelector("ytd-channel-name a")?.innerText?.trim() ||
        document.querySelector("#owner-name a")?.innerText?.trim() ||
        document.querySelector(".ytd-channel-name a")?.innerText?.trim() ||
        document
          .querySelector('span[itemprop="author"] link[itemprop="name"]')
          ?.getAttribute("content") ||
        "";

      // Get author handle/channel URL
      const channelLink = document.querySelector(
        "#channel-name a, ytd-channel-name a, #owner-name a",
      );
      if (channelLink) {
        const channelUrl = channelLink.href;
        // Extract @handle if available
        if (channelUrl.includes("/@")) {
          data.authorHandle = channelUrl.split("/@")[1]?.split("/")[0] || "";
        }
      }

      // Video title
      data.content =
        document
          .querySelector("h1.ytd-video-primary-info-renderer")
          ?.innerText?.trim() ||
        document.querySelector("h1.ytd-watch-metadata")?.innerText?.trim() ||
        document.querySelector("#title h1")?.innerText?.trim() ||
        document.querySelector('meta[name="title"]')?.content ||
        document.querySelector('meta[property="og:title"]')?.content ||
        document.title.replace(" - YouTube", "");

      // For Shorts, try different selectors
      if (isShorts && !data.content) {
        data.content =
          document
            .querySelector(".title.ytd-reel-video-renderer")
            ?.innerText?.trim() ||
          document.querySelector("h2.title")?.innerText?.trim() ||
          "";
      }

      // Video thumbnail
      if (videoId) {
        // Try maxresdefault first, fallback to hqdefault
        data.imageUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        data.originalUrl = isShorts
          ? `https://www.youtube.com/shorts/${videoId}`
          : `https://www.youtube.com/watch?v=${videoId}`;
      }

      // Fallback thumbnail from meta tags
      if (!data.imageUrl) {
        data.imageUrl =
          document.querySelector('meta[property="og:image"]')?.content ||
          document.querySelector('link[rel="image_src"]')?.href ||
          "";
      }

      // Add video description as additional context (first 500 chars)
      const description =
        document.querySelector("#description-text")?.innerText?.trim() ||
        document.querySelector('meta[name="description"]')?.content ||
        "";
      if (description && data.content) {
        data.content = `${data.content}\n\n${description.substring(0, 500)}${description.length > 500 ? "..." : ""}`;
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

    chrome.runtime.sendMessage({ action: "save_post", data }, (response) => {
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
  let selector = "";
  if (platform === "linkedin") selector = ".feed-shared-update-v2";
  else if (platform === "twitter") selector = 'article[data-testid="tweet"]';
  else if (platform === "instagram") selector = "article";
  else if (platform === "youtube") {
    // Handle YouTube separately with floating button
    processYouTube();
    return;
  }

  if (!selector) return;

  const posts = document.querySelectorAll(selector);
  posts.forEach((post) => {
    if (post.dataset.linkoProcessed) return;
    post.dataset.linkoProcessed = "true";

    // Ensure relative positioning
    const style = window.getComputedStyle(post);
    if (style.position === "static") {
      post.style.position = "relative";
    }

    const btn = createSaveButton(post);
    post.appendChild(btn);
  });
}

// YouTube-specific processing
function processYouTube() {
  const url = new URL(window.location.href);
  const isVideoPage =
    url.pathname === "/watch" || url.pathname.includes("/shorts/");

  if (!isVideoPage) return;

  // Check if button already exists
  if (document.getElementById("linko-youtube-save-btn")) return;

  // Create floating save button for YouTube
  const btn = document.createElement("button");
  btn.id = "linko-youtube-save-btn";
  btn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
    </svg>
    Save to Linko
  `;
  btn.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 20px;
    z-index: 9999;
    background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
    color: white;
    border: none;
    padding: 12px 20px;
    border-radius: 50px;
    font-family: 'YouTube Sans', 'Roboto', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    box-shadow: 0 4px 15px rgba(255, 107, 107, 0.4);
    transition: all 0.3s ease;
  `;

  btn.addEventListener("mouseenter", () => {
    btn.style.transform = "scale(1.05)";
    btn.style.boxShadow = "0 6px 20px rgba(255, 107, 107, 0.5)";
  });

  btn.addEventListener("mouseleave", () => {
    btn.style.transform = "scale(1)";
    btn.style.boxShadow = "0 4px 15px rgba(255, 107, 107, 0.4)";
  });

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    const originalContent = btn.innerHTML;
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px; animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"></circle>
      </svg>
      Saving...
    `;

    const data = scrapePost(null);

    chrome.runtime.sendMessage({ action: "save_post", data }, (response) => {
      if (response && response.success) {
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Saved!
        `;
        btn.style.background =
          "linear-gradient(135deg, #10b981 0%, #059669 100%)";
        setTimeout(() => {
          btn.innerHTML = originalContent;
          btn.style.background =
            "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)";
        }, 2000);
      } else {
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          Error
        `;
        btn.style.background =
          "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
        setTimeout(() => {
          btn.innerHTML = originalContent;
          btn.style.background =
            "linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)";
        }, 2000);
      }
    });
  });

  document.body.appendChild(btn);
}

// Remove YouTube button when navigating away from video
function cleanupYouTubeButton() {
  const url = new URL(window.location.href);
  const isVideoPage =
    url.pathname === "/watch" || url.pathname.includes("/shorts/");

  if (!isVideoPage) {
    const btn = document.getElementById("linko-youtube-save-btn");
    if (btn) btn.remove();
  }
}

// Run periodically to handle infinite scroll and SPA navigation
setInterval(() => {
  processPosts();
  if (getPlatform() === "youtube") {
    cleanupYouTubeButton();
  }
}, 2000);

// Also listen for YouTube's SPA navigation
if (getPlatform() === "youtube") {
  // YouTube uses History API for navigation
  let lastUrl = location.href;
  new MutationObserver(() => {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      // Remove old button and let processPosts create new one
      const btn = document.getElementById("linko-youtube-save-btn");
      if (btn) btn.remove();
      setTimeout(processPosts, 500); // Wait for page to load
    }
  }).observe(document.body, { subtree: true, childList: true });
}

// Also handle Context Menu action request
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "scrape_and_save") {
    const data = scrapePost(null); // Scrape full page or best guess
    if (request.info.selectionText) data.content = request.info.selectionText;
    if (request.info.linkUrl) data.originalUrl = request.info.linkUrl;
    if (request.info.srcUrl) data.imageUrl = request.info.srcUrl;

    chrome.runtime.sendMessage({ action: "save_post", data }, sendResponse);
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

// Animation
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
