# SecureGuard-LM IQ Browser Companion

The optional SecureGuard-LM IQ Browser Companion is a lightweight Manifest V3 extension for
desktop Chromium browsers. It lets a developer select code on GitHub, GitLab, or Azure DevOps and
send only that selected text into the local SecureGuard `/scan` workflow.

The extension does not collect credentials, scrape private repositories, or send data to an
external service.

## Install Locally

1. Start SecureGuard-LM IQ at `http://localhost:3000`.
2. Open Chrome.
3. Go to `chrome://extensions`.
4. Enable **Developer Mode**.
5. Click **Load unpacked**.
6. Select the project’s `/browser-extension` folder.
7. Open or reload a GitHub, GitLab, or Azure DevOps code page.
8. Select a block of code.
9. Open the SecureGuard-LM IQ Browser Companion.
10. Click **Review Selected Code**.

The extension opens:

```text
http://localhost:3000/scan#secureguardCode=<base64-encoded-selected-code>
```

The scan page decodes the selected text locally, fills the code textarea, clears prior review
results, and removes the hash from the URL immediately.

## Safety

**This extension only sends selected code to the local SecureGuard web app. Do not select
confidential code.**

- Only the current text selection is read.
- No whole-page scraping occurs when there is no selection.
- Selected code, source URL, and source title are stored only in `chrome.storage.local`.
- No data is sent to external services by the extension.
- The local scan app still requires human review before production use.
