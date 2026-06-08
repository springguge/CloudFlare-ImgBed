(function () {
  var pendingResolve = null;
  var pendingReject = null;

  function isMobileLike() {
    return /Android|iPhone|iPad|iPod|HarmonyOS|Mobile/i.test(navigator.userAgent || '') ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function ensureStyles() {
    if (document.getElementById('imb-copy-sheet-style')) return;
    var style = document.createElement('style');
    style.id = 'imb-copy-sheet-style';
    style.textContent = [
      '.imb-copy-sheet{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.62);display:flex;align-items:flex-end;justify-content:center;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
      '.imb-copy-panel{width:min(100%,520px);background:#111827;color:#f9fafb;border:1px solid rgba(255,255,255,.14);border-radius:18px;padding:16px;box-shadow:0 24px 70px rgba(0,0,0,.45)}',
      '.imb-copy-title{font-size:16px;font-weight:700;margin:0 0 8px}',
      '.imb-copy-note{font-size:13px;line-height:1.5;color:#a7b0c0;margin:0 0 12px}',
      '.imb-copy-text{width:100%;height:168px;box-sizing:border-box;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#030712;color:#e5e7eb;padding:12px;font-size:13px;line-height:1.45;resize:none;outline:none}',
      '.imb-copy-actions{display:flex;gap:10px;margin-top:12px}',
      '.imb-copy-actions button{flex:1;height:44px;border:0;border-radius:12px;font-size:15px;font-weight:700}',
      '.imb-copy-ok{background:#2563eb;color:#fff}',
      '.imb-copy-cancel{background:#1f2937;color:#d1d5db}',
    ].join('');
    document.head.appendChild(style);
  }

  function openCopySheet(text) {
    return new Promise(function (resolve, reject) {
      ensureStyles();
      closeCopySheet();
      pendingResolve = resolve;
      pendingReject = reject;

      var sheet = document.createElement('div');
      sheet.className = 'imb-copy-sheet';
      sheet.id = 'imb-copy-sheet';
      sheet.innerHTML = [
        '<div class="imb-copy-panel">',
        '<p class="imb-copy-title">复制链接</p>',
        '<p class="imb-copy-note">手机浏览器限制了自动复制，请点下面的按钮完成复制。</p>',
        '<textarea class="imb-copy-text" readonly></textarea>',
        '<div class="imb-copy-actions">',
        '<button class="imb-copy-cancel" type="button">取消</button>',
        '<button class="imb-copy-ok" type="button">复制链接</button>',
        '</div>',
        '</div>',
      ].join('');
      document.body.appendChild(sheet);

      var textarea = sheet.querySelector('.imb-copy-text');
      var ok = sheet.querySelector('.imb-copy-ok');
      var cancel = sheet.querySelector('.imb-copy-cancel');
      textarea.value = text;

      function selectText() {
        textarea.focus({ preventScroll: true });
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
      }

      textarea.addEventListener('click', selectText);
      ok.addEventListener('click', function () {
        try {
          selectText();
          fallbackCopy(text);
          closeCopySheet();
          resolve(true);
        } catch (error) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
              closeCopySheet();
              resolve(true);
            }).catch(function (clipboardError) {
              reject(clipboardError);
            });
            return;
          }
          reject(error);
        }
      });
      cancel.addEventListener('click', function () {
        closeCopySheet();
        reject(new Error('copy cancelled'));
      });

      setTimeout(selectText, 30);
    });
  }

  function closeCopySheet() {
    var old = document.getElementById('imb-copy-sheet');
    if (old) old.remove();
    pendingResolve = null;
    pendingReject = null;
  }

  function fallbackCopy(text) {
    var value = String(text == null ? '' : text);
    var textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', 'readonly');
    textarea.setAttribute('aria-hidden', 'true');
    textarea.style.position = 'fixed';
    textarea.style.left = '12px';
    textarea.style.top = '12px';
    textarea.style.width = 'calc(100vw - 24px)';
    textarea.style.height = '96px';
    textarea.style.opacity = '0';
    textarea.style.zIndex = '2147483647';
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
          return navigator.clipboard.writeText(value).catch(function () {
            return openCopySheet(value);
          });
        }
        return openCopySheet(value);
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
