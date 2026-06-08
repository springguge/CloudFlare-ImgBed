(function () {
  function isMobileLike() {
    return /Android|iPhone|iPad|iPod|HarmonyOS|Mobile/i.test(navigator.userAgent || '') ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function fallbackCopy(text) {
    var value = String(text == null ? '' : text);
    var activeElement = document.activeElement;
    var selection = window.getSelection ? window.getSelection() : null;
    var ranges = [];

    if (selection) {
      for (var i = 0; i < selection.rangeCount; i += 1) {
        ranges.push(selection.getRangeAt(i));
      }
    }

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
    textarea.setAttribute('readonly', '');
    document.body.appendChild(textarea);

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
        ranges.forEach(function (range) {
          selection.addRange(range);
        });
      }
      if (activeElement && activeElement.focus) {
        try {
          activeElement.focus({ preventScroll: true });
        } catch (focusError) {
          activeElement.focus();
        }
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
