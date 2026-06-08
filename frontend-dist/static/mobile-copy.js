(function () {
  function isMobileLike() {
    return /Android|iPhone|iPad|iPod|HarmonyOS|Mobile/i.test(navigator.userAgent || '') ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function fallbackCopy(text) {
    var value = String(text == null ? '' : text);
    var textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.autocomplete = 'off';
    textarea.autocapitalize = 'off';
    textarea.spellcheck = false;
    textarea.style.position = 'fixed';
    textarea.style.left = '0';
    textarea.style.top = '40%';
    textarea.style.width = '100vw';
    textarea.style.height = '120px';
    textarea.style.opacity = '0.01';
    textarea.style.zIndex = '2147483647';
    textarea.style.fontSize = '16px';
    textarea.style.border = '0';
    textarea.style.padding = '0';
    textarea.style.webkitUserSelect = 'text';
    textarea.style.userSelect = 'text';
    document.body.appendChild(textarea);

    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, value.length);

    var copied = false;
    try {
      copied = document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }

    if (!copied) throw new Error('execCommand copy failed');
    return true;
  }

  window.__imbCopyText = function (text) {
    var value = String(text == null ? '' : text);
    window.__imbLastCopyText = value;

    if (isMobileLike() && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(value).catch(function () {
        fallbackCopy(value);
        return true;
      });
    }

    try {
      fallbackCopy(value);
      return Promise.resolve(true);
    } catch (fallbackError) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(value);
      }
      return Promise.reject(fallbackError);
    }
  };
})();
