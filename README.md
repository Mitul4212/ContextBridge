# ContextBridge

A Chrome extension that captures AI chat sessions, compresses them into a structured high-fidelity memory file using your own API key, and lets you export or inject that context into a new chat — so you never lose progress when a conversation ends.

No backend. No accounts. No cloud sync. Everything runs locally.

---

## Features

- **Capture** — scrapes the full transcript from any supported AI chat page
- **Summarize** — runs a 3-pass summarization pipeline to extract verified findings, failed attempts, hardware/software behavior, metrics, and confidence levels
- **Export** — formats the memory file for Claude, ChatGPT, Gemini, Perplexity, Grok, or universal markdown
- **Inject** — pastes the formatted context directly into the prompt input of the current tab
- **History** — browse and re-export past saved sessions

### Supported Platforms
- ChatGPT (chatgpt.com)
- Claude (claude.ai)
- Gemini (gemini.google.com)
- Perplexity (perplexity.ai)
- Grok (grok.com)

### Supported API Providers
- Anthropic (Claude)
- OpenAI (GPT)
- Google Gemini
- Groq
- Custom OpenAI-compatible endpoints

---

## Installation

### Prerequisites
- Google Chrome (or any Chromium-based browser)
- An API key from one of the supported providers

### Steps

1. **Download or clone this repository**
   ```
   git clone https://github.com/Mitul4212/ContextBridge.git
   ```

2. **Open Chrome Extensions**
   - Navigate to `chrome://extensions`
   - Enable **Developer mode** (toggle in the top-right corner)

3. **Load the extension**
   - Click **Load unpacked**
   - Select the `ContextBridge` folder you cloned

4. The ContextBridge icon will appear in your Chrome toolbar.

---

## Setup

1. Click the ContextBridge icon in the toolbar to open the popup
2. Go to the **Settings** tab (or click the gear icon)
3. Select your **Provider** (Anthropic, OpenAI, Gemini, Groq, or Custom)
4. Paste your **API Key**
5. Click **Refresh Models** to load available models, then select one from the dropdown (or type a model name manually)
6. Click **Save Settings**

### Getting an API Key

| Provider | Where to get it |
|----------|----------------|
| Anthropic | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| Google Gemini | [aistudio.google.com](https://aistudio.google.com) → Get API key |
| Groq | [console.groq.com](https://console.groq.com) |
| Custom | Your own OpenAI-compatible endpoint URL + key |

> **Tip:** For Gemini, generate your key directly from AI Studio — it automatically enables the correct API and works on the free tier.

---

## Usage

### Save a Session
1. Open a supported AI chat page with an active conversation
2. Click the ContextBridge icon
3. Click **Save Session**
4. Wait for the 3-pass summarization to complete (takes 10–30 seconds depending on provider)

### Export Context
1. After saving, select your **Export Target** (Claude, ChatGPT, Gemini, etc.)
2. Click **Copy Export** to copy to clipboard
3. Or click **Download Export** to save as a `.md` file
4. Paste into a new chat to resume where you left off

### Inject Into Current Tab
1. Navigate to a supported AI chat page
2. Click **Inject Into Current Tab**
3. The formatted context is automatically pasted into the prompt input

### View History
- Click the **History** tab to browse past sessions
- Click any session to view or re-export it

---

## Memory File Structure

ContextBridge generates a structured memory file with these sections:

| Section | Purpose |
|---------|---------|
| Project / Topic | What the session was about |
| Goal | What the user was trying to achieve |
| Decisions Made | Concrete conclusions reached |
| Verified Findings | Facts confirmed by direct testing (with confidence level) |
| Failed Attempts | What was tried and what happened instead |
| Hardware Behavior | LED patterns, charging, pairing, vibration behavior |
| Software Behavior | OS detection, firmware tools, third-party app behavior |
| Measurements / Metrics | All numeric values, percentages, counts |
| Version-Specific Behavior | Differences across device/app/model revisions |
| Key Outputs | Code, formulas, artifacts produced |
| Confidence / Status | Confirmed / Likely / Hypothesis classification |
| Open Questions | Unresolved items |
| Current State | Where things stood at the end |
| Resume Prompt | A ready-to-paste paragraph to continue the session |

---

## Privacy

- All data is stored locally in `chrome.storage.local`
- Your API key is stored locally and only sent to the provider you configured
- No telemetry, no analytics, no external servers

---

## Project Structure

```
ContextBridge/
├── manifest.json          # Chrome MV3 extension config
├── background.js          # Service worker — summarization pipeline
├── popup/
│   ├── popup.html         # Main extension UI
│   └── popup.js           # Popup logic
├── settings/
│   ├── settings.html      # Settings page UI
│   ├── settings.js        # Settings logic
│   └── store.js           # Storage utilities
├── content/
│   ├── scraper.js         # Chat transcript scraper
│   └── injector.js        # Context injection into prompt inputs
├── api/
│   ├── summarizer.js      # API calls to all providers
│   └── models.js          # Model listing per provider
├── export/
│   └── formatter.js       # Prompt templates + export formatters
├── storage/
│   └── sessions.js        # Session save/load/list
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

---

## License

MIT
