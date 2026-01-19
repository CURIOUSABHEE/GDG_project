// Background Service Worker

// Create Context Menu on specific sites or globally
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "save_to_linko",
    title: "Save to Linko",
    contexts: ["page", "link", "selection", "image"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "save_to_linko") {
    // Send message to content script to scrape relevant data
    chrome.tabs.sendMessage(
      tab.id,
      { action: "scrape_and_save", info },
      (response) => {
        if (chrome.runtime.lastError) {
          console.log("Content script not ready or not supported");
        }
      },
    );
  }
});

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "save_post") {
    savePostToApi(request.data).then((res) => {
      sendResponse(res);

      // Show Native Notification
      chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: res.success ? "Linko - Saved!" : "Linko - Error",
        message: res.message,
        priority: 2,
      });
    });
    return true; // async response
  }
});

async function savePostToApi(data) {
  try {
    const { token } = await chrome.storage.local.get("token");
    if (!token) return { success: false, message: "Please login first" };

    // For local development, use: 'http://localhost:5001/api/posts'
    // For production, use: 'https://gdg-project-yexd.onrender.com/api/posts'
    const res = await fetch("http://localhost:5001/api/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      return { success: true, message: "Post saved!" };
    } else {
      const err = await res.json();
      return { success: false, message: err.error || "Failed to save" };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}
