const SECUREGUARD_URL = "http://localhost:3000/scan";
const MAX_HASH_CODE_LENGTH = 100000;
const SUPPORTED_HOSTS = [
  "github.com",
  "gitlab.com",
  "dev.azure.com",
];

const reviewButton = document.getElementById("review-selected");
const openButton = document.getElementById("open-secureguard");
const status = document.getElementById("status");

function setStatus(message, isError = false) {
  status.textContent = message;
  status.className = isError ? "status error" : "status success";
}

function encodeUnicodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 8192;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url) {
    throw new Error("Open a supported GitHub, GitLab, or Azure DevOps page first.");
  }
  const hostname = new URL(tab.url).hostname;
  const isSupported =
    SUPPORTED_HOSTS.includes(hostname) || hostname.endsWith(".visualstudio.com");
  if (!isSupported) {
    throw new Error("Open a supported GitHub, GitLab, or Azure DevOps page first.");
  }
  return tab;
}

reviewButton.addEventListener("click", async () => {
  reviewButton.disabled = true;
  setStatus("Reading selected code...");

  try {
    const tab = await getActiveTab();
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: "SECUREGUARD_GET_SELECTION",
    });

    if (response?.error) {
      throw new Error(response.error);
    }
    if (!response?.selectedCode) {
      throw new Error("Select code on the page first.");
    }
    if (response.selectedCode.length > MAX_HASH_CODE_LENGTH) {
      throw new Error("Selected code is too large. Select a smaller code block.");
    }

    await chrome.storage.local.set({
      secureguard_selected_code: response.selectedCode,
      secureguard_source_url: response.pageUrl,
      secureguard_source_title: response.pageTitle,
    });

    const encodedCode = encodeUnicodeBase64(response.selectedCode);
    await chrome.tabs.create({
      url: `${SECUREGUARD_URL}#secureguardCode=${encodeURIComponent(encodedCode)}`,
    });
    setStatus("Selected code opened in SecureGuard.");
  } catch (error) {
    console.error("SecureGuard Browser Companion:", error);
    const message =
      error instanceof Error && error.message.includes("Receiving end does not exist")
        ? "Reload the code page after installing the extension, then select code again."
        : error instanceof Error
          ? error.message
          : "Could not import selected code.";
    setStatus(message, true);
  } finally {
    reviewButton.disabled = false;
  }
});

openButton.addEventListener("click", async () => {
  await chrome.tabs.create({ url: SECUREGUARD_URL });
});
