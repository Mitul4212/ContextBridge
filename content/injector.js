(function () {
  function findPromptInput() {
    const selectors = [
      'textarea',
      '[contenteditable="true"]',
      '[role="textbox"]',
      'div.ProseMirror'
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;
        return el;
      }
    }

    return null;
  }

  function injectContextText(text) {
    const el = findPromptInput();
    if (!el) return false;

    el.focus();
    if ('value' in el) {
      el.value = text;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return true;
    }

    el.textContent = text;
    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    return true;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== 'CB_INJECT_CONTEXT') return;

    const ok = injectContextText(message.text || '');
    if (!ok) {
      sendResponse({ ok: false, error: 'No prompt input found on this page.' });
      return;
    }

    sendResponse({ ok: true });
  });
})();
