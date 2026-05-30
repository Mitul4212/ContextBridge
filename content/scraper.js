(function () {
  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes('openai.com') || host.includes('chatgpt.com')) return 'chatgpt';
    if (host.includes('claude.ai')) return 'claude';
    if (host.includes('gemini.google.com')) return 'gemini';
    if (host.includes('perplexity.ai')) return 'perplexity';
    if (host.includes('grok.com')) return 'grok';
    return 'unknown';
  }

  function uniqueTextLines(nodes) {
    const seen = new Set();
    const lines = [];
    for (const node of nodes) {
      const text = (node.innerText || node.textContent || '').trim();
      if (!text) continue;
      if (text.length < 2) continue;
      if (seen.has(text)) continue;
      seen.add(text);
      lines.push(text);
    }
    return lines;
  }

  function scrapeBySelectors(userSelectors, assistantSelectors) {
    const userNodes = uniqueTextLines(document.querySelectorAll(userSelectors.join(',')));
    const assistantNodes = uniqueTextLines(document.querySelectorAll(assistantSelectors.join(',')));

    const blocks = [];
    for (const text of userNodes) blocks.push(`USER: ${text}`);
    for (const text of assistantNodes) blocks.push(`ASSISTANT: ${text}`);

    const allText = blocks.join('\n\n').trim();
    return allText;
  }

  function scrapeChatGPT() {
    return scrapeBySelectors(
      ['[data-message-author-role="user"]', 'article [data-testid="user-message"]', '[data-testid="conversation-turn"] [data-message-author-role="user"]'],
      ['[data-message-author-role="assistant"]', 'article [data-testid="assistant-message"]', '[data-testid="conversation-turn"] [data-message-author-role="assistant"]']
    );
  }

  function scrapeClaude() {
    return scrapeBySelectors(
      ['[data-testid="user-message"]', '[class*="user"] [class*="message"]'],
      ['[data-testid="assistant-message"]', '[class*="assistant"] [class*="message"]']
    );
  }

  function scrapeGemini() {
    return scrapeBySelectors(
      ['user-query', '[data-test-id="user-query"]', '[class*="query-text"]'],
      ['model-response', '[data-test-id="model-response"]', '[class*="response-content"]']
    );
  }

  function scrapePerplexity() {
    return scrapeBySelectors(
      ['[data-testid="user-query"]', '[class*="query"] [class*="prose"]'],
      ['[data-testid="answer"]', '[class*="answer"] [class*="prose"]']
    );
  }

  function scrapeGrok() {
    return scrapeBySelectors(
      ['[data-testid="message-user"]', '[class*="user-message"]'],
      ['[data-testid="message-assistant"]', '[class*="assistant-message"]']
    );
  }

  function scrapeCurrentChat() {
    const platform = detectPlatform();
    const transcript = {
      chatgpt: scrapeChatGPT,
      claude: scrapeClaude,
      gemini: scrapeGemini,
      perplexity: scrapePerplexity,
      grok: scrapeGrok
    }[platform]?.() || '';

    return { platform, transcript };
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'CB_SCRAPE_CHAT') return;

    try {
      const result = scrapeCurrentChat();
      sendResponse({ ok: true, data: result });
    } catch (error) {
      sendResponse({ ok: false, error: error.message || 'Scraping failed.' });
    }
  });
})();
