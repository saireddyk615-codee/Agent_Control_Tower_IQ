chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "SECUREGUARD_GET_SELECTION") {
    return false;
  }

  const selectedCode = window.getSelection()?.toString() ?? "";
  if (!selectedCode.trim()) {
    sendResponse({ error: "Select code on the page first." });
    return false;
  }

  sendResponse({
    selectedCode,
    pageUrl: window.location.href,
    pageTitle: document.title,
  });
  return false;
});
