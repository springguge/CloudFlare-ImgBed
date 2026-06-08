(function () {
  function isMobileLike() {
    return /Android|iPhone|iPad|iPod|HarmonyOS|Mobile/i.test(navigator.userAgent || '') ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function fallbackCopy(text) {
    var value = String(text == null ? '' : text);
    var textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'readonly');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '0';
    textarea.style.top = '0';
    textarea.style.width = '1px';
    textarea.style.height = '1px';
    textarea.style.opacity = '0.01';
    textarea.style.zIndex = '-1';
    textarea.style.fontSize = '16px';
    document.body.appendChild(textarea);

    var selection = window.getSelection ? window.getSelection() : null;
    var selectedRange = selection && selection.rangeCount ? selection.getRangeAt(0) : null;

    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, value.length);

    var copied = false;
    try {
      copied = document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
      if (selection) {
        selection.removeAllRanges();
        if (selectedRange) selection.addRange(selectedRange);
      }
    }

    if (!copied) throw new Error('execCommand copy failed');
    return true;
  }

  window.__imbCopyText = function (text) {
    var value = String(text == null ? '' : text);
    window.__imbLastCopyText = value;

    if (isMobileLike()) {
      try {
        fallbackCopy(value);
        return Promise.resolve(true);
      } catch (fallbackError) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          return navigator.clipboard.writeText(value);
        }
        return Promise.reject(fallbackError);
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value).catch(function () {
        fallbackCopy(value);
        return true;
      });
    }

    try {
      fallbackCopy(value);
      return Promise.resolve(true);
    } catch (error) {
      return Promise.reject(error);
    }
  };
})();
