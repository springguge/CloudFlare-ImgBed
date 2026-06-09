(function () {
  var nativeClipboard = navigator.clipboard || null;
  var nativeWriteText = nativeClipboard && nativeClipboard.writeText
    ? nativeClipboard.writeText.bind(nativeClipboard)
    : null;

  function toText(text) {
    return String(text == null ? '' : text);
  }

  function isMobileLike() {
    return /Android|iPhone|iPad|iPod|HarmonyOS|Mobile|MicroMessenger/i.test(navigator.userAgent || '') ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function restoreSelection(activeElement, ranges) {
    var selection = window.getSelection ? window.getSelection() : null;
    if (selection && ranges) {
      selection.removeAllRanges();
      ranges.forEach(function (range) {
        selection.addRange(range);
      });
    }
    if (activeElement && activeElement.focus) {
      try {
        activeElement.focus({ preventScroll: true });
      } catch (focusError) {
        try { activeElement.focus(); } catch (_) {}
      }
    }
  }

  function fallbackCopy(text) {
    var value = toText(text);
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
    textarea.readOnly = true;
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

    try {
      textarea.focus({ preventScroll: true });
    } catch (focusError) {
      textarea.focus();
    }
    textarea.select();
    textarea.setSelectionRange(0, value.length);

    var copied = false;
    try {
      copied = document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
      restoreSelection(activeElement, ranges);
    }

    if (!copied) throw new Error('execCommand copy failed');
    return true;
  }

  function showManualCopy(text) {
    var value = toText(text);
    var old = document.getElementById('__imb_manual_copy');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var wrap = document.createElement('div');
    wrap.id = '__imb_manual_copy';
    wrap.style.position = 'fixed';
    wrap.style.left = '0';
    wrap.style.right = '0';
    wrap.style.bottom = '0';
    wrap.style.zIndex = '2147483647';
    wrap.style.padding = '12px';
    wrap.style.background = 'rgba(17, 24, 39, 0.96)';
    wrap.style.boxShadow = '0 -8px 24px rgba(0,0,0,.25)';
    wrap.style.color = '#fff';
    wrap.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    var title = document.createElement('div');
    title.textContent = '浏览器限制自动复制，请长按下方内容手动复制';
    title.style.fontSize = '14px';
    title.style.marginBottom = '8px';

    var textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.readOnly = true;
    textarea.style.width = '100%';
    textarea.style.height = '136px';
    textarea.style.boxSizing = 'border-box';
    textarea.style.border = '1px solid rgba(255,255,255,.28)';
    textarea.style.borderRadius = '8px';
    textarea.style.padding = '10px';
    textarea.style.fontSize = '14px';
    textarea.style.lineHeight = '1.4';
    textarea.style.color = '#111827';
    textarea.style.background = '#fff';

    var close = document.createElement('button');
    close.type = 'button';
    close.textContent = '关闭';
    close.style.marginTop = '8px';
    close.style.width = '100%';
    close.style.height = '40px';
    close.style.border = '0';
    close.style.borderRadius = '8px';
    close.style.background = '#409eff';
    close.style.color = '#fff';
    close.style.fontSize = '15px';
    close.onclick = function () {
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    };

    wrap.appendChild(title);
    wrap.appendChild(textarea);
    wrap.appendChild(close);
    document.body.appendChild(wrap);
    try {
      textarea.focus({ preventScroll: true });
    } catch (focusError) {
      textarea.focus();
    }
    textarea.select();
    textarea.setSelectionRange(0, value.length);
  }

  function copyText(text) {
    var value = toText(text);
    window.__imbLastCopyText = value;

    if (isMobileLike()) {
      try {
        fallbackCopy(value);
        return Promise.resolve(true);
      } catch (fallbackError) {
        if (nativeWriteText) {
          return nativeWriteText(value).catch(function (nativeError) {
            showManualCopy(value);
            return true;
          });
        }
        showManualCopy(value);
        return Promise.resolve(true);
      }
    }

    if (nativeWriteText) {
      return nativeWriteText(value).catch(function () {
        fallbackCopy(value);
        return true;
      });
    }

    fallbackCopy(value);
    return Promise.resolve(true);
  }

  window.__imbCopyText = copyText;
  try {
    document.documentElement.setAttribute('data-imb-copy-patch', '1');
  } catch (_) {}

  try {
    if (!navigator.clipboard) {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: copyText }
      });
    } else {
      navigator.clipboard.writeText = copyText;
    }
  } catch (error) {
    try {
      Object.defineProperty(navigator.clipboard || navigator, navigator.clipboard ? 'writeText' : 'clipboard', {
        configurable: true,
        value: navigator.clipboard ? copyText : { writeText: copyText }
      });
    } catch (_) {}
  }
})();
