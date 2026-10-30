(function () {
  if (window.Arieya) return;

  const currentScript = document.currentScript;
  
  const config = {
    storeKey: currentScript?.getAttribute('data-store-key') || '',
    mode: currentScript?.getAttribute('data-mode') || 'floating',
    target: currentScript?.getAttribute('data-target') || '#arieya-container',
    position: currentScript?.getAttribute('data-position') || 'bottom-right',
    theme: currentScript?.getAttribute('data-theme') || 'light',
    accentColor: currentScript?.getAttribute('data-accent-color') || '#2d5016',
    launcherText: currentScript?.getAttribute('data-launcher-text') || 'Need help choosing?',
    host: currentScript?.getAttribute('data-host') || 'https://www.arieya.site',
    ...(window.AreyaConfig || {})
  };

  if (!config.storeKey) {
    console.error('Arieya SDK: storeKey is required');
    return;
  }

  let iframe = null;
  let container = null;
  let overlay = null;
  let launcher = null;
  const callbacks = {};

  function injectStyles() {
    const style = document.createElement('style');
    style.id = 'arieya-sdk-styles';
    style.textContent = `
      .arieya-launcher {
        position: fixed;
        ${config.position === 'bottom-left' ? 'left: 24px;' : 'right: 24px;'}
        bottom: 24px;
        z-index: 999998;
        background-color: ${config.accentColor};
        color: white;
        border: none;
        border-radius: 9999px;
        padding: 12px 24px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 16px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .arieya-launcher:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }
      .arieya-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 999999;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .arieya-overlay.arieya-open {
        opacity: 1;
        pointer-events: auto;
      }
      .arieya-modal {
        width: 100%;
        height: 100%;
        background-color: ${config.theme === 'dark' ? '#111' : '#fff'};
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      @media (min-width: 768px) {
        .arieya-modal {
          width: 90vw;
          max-width: 1200px;
          height: 90vh;
          max-height: 800px;
          border-radius: 16px;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
        }
      }
      .arieya-close {
        position: absolute;
        top: 16px;
        right: 16px;
        width: 40px;
        height: 40px;
        border: none;
        background: rgba(0, 0, 0, 0.05);
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: ${config.theme === 'dark' ? '#fff' : '#000'};
        z-index: 10;
        transition: background 0.2s ease;
      }
      .arieya-close:hover {
        background: rgba(0, 0, 0, 0.1);
      }
      .arieya-iframe {
        width: 100%;
        height: 100%;
        border: none;
        flex-grow: 1;
      }
      .arieya-inline-container {
        width: 100%;
        height: 720px;
        border: none;
        border-radius: 12px;
        overflow: hidden;
      }
    `;
    document.head.appendChild(style);
  }

  function createIframe() {
    const url = new URL('/stylist', config.host);
    url.searchParams.set('store', config.storeKey);
    url.searchParams.set('embed', 'true');
    
    const frame = document.createElement('iframe');
    frame.src = url.toString();
    frame.className = config.mode === 'inline' ? 'arieya-iframe arieya-inline-container' : 'arieya-iframe';
    frame.setAttribute('allow', 'clipboard-write');
    frame.title = 'Arieya Shopping Advisor';
    return frame;
  }

  function initFloating() {
    launcher = document.createElement('button');
    launcher.className = 'arieya-launcher';
    launcher.innerHTML = '<span style="font-weight:700">a✧</span> ' + config.launcherText;
    launcher.onclick = open;
    document.body.appendChild(launcher);

    overlay = document.createElement('div');
    overlay.className = 'arieya-overlay';
    overlay.onclick = (e) => {
      if (e.target === overlay) close();
    };

    const modal = document.createElement('div');
    modal.className = 'arieya-modal';
    
    // We do not add a close button inside the modal here because the requirement 
    // says "Include a close button (×) in the overlay header" but also Part B says:
    // "Add a small close button in the stylist header that posts arieya:close to the parent"
    // I'll add the close button in the overlay wrapper anyway as a fallback or for overlay.
    const closeBtn = document.createElement('button');
    closeBtn.className = 'arieya-close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = close;
    closeBtn.ariaLabel = 'Close';

    iframe = createIframe();
    
    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('arieya-open')) {
        close();
      }
    });
  }

  function initInline() {
    container = document.querySelector(config.target);
    if (!container) {
      console.error('Arieya SDK: Target container ' + config.target + ' not found');
      return;
    }
    iframe = createIframe();
    container.appendChild(iframe);
  }

  function open() {
    if (config.mode === 'floating' && overlay) {
      overlay.classList.add('arieya-open');
      document.body.style.overflow = 'hidden';
    }
  }

  function close() {
    if (config.mode === 'floating' && overlay) {
      overlay.classList.remove('arieya-open');
      document.body.style.overflow = '';
    }
  }

  function on(event, callback) {
    if (!callbacks[event]) callbacks[event] = [];
    callbacks[event].push(callback);
  }

  window.addEventListener('message', (event) => {
    try {
      if (typeof event.data === 'string' && event.data.startsWith('arieya:')) {
        const parts = event.data.split('::');
        const eventName = parts[0];
        const payloadStr = parts.slice(1).join('::');
        const payload = payloadStr ? JSON.parse(payloadStr) : null;
        
        if (eventName === 'arieya:close') {
          close();
        }

        if (callbacks[eventName]) {
          callbacks[eventName].forEach(cb => cb(payload));
        }
      }
    } catch (e) {
      // Ignore invalid messages
    }
  });

  window.Arieya = {
    open,
    close,
    on
  };

  injectStyles();

  if (config.mode === 'inline') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initInline);
    } else {
      initInline();
    }
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initFloating);
    } else {
      initFloating();
    }
  }

})();
