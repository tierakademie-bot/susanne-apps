/* Zugang für Premium-Apps der Tierakademie Zischgl */
(() => {
  const WORKER = 'https://tierakademie-proxy.tierakademie.workers.dev';
  const TOKEN_KEY = 'tierakademie_member_token';

  const originalFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const url = typeof input === 'string' ? input : input?.url;
    if (url === WORKER || url === WORKER + '/') {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return Promise.reject(new Error('Bitte gib zuerst deinen Mitgliedscode ein.'));
      const headers = new Headers(init.headers || {});
      headers.set('Authorization', 'Bearer ' + token);
      return originalFetch(WORKER + '/premium/messages', { ...init, headers });
    }
    return originalFetch(input, init);
  };

  const style = `
    #ta-access{position:fixed;inset:0;z-index:2147483647;background:rgba(23,43,34,.94);display:flex;align-items:center;justify-content:center;padding:20px;font-family:system-ui,-apple-system,sans-serif}
    #ta-access .ta-box{max-width:440px;width:100%;background:#fff;border-radius:16px;padding:28px;color:#243b30;box-shadow:0 18px 60px rgba(0,0,0,.35)}
    #ta-access h1{font-size:1.45rem;margin:0 0 10px;color:#274a3d}
    #ta-access p{line-height:1.55;margin:0 0 16px;color:#45534d}
    #ta-access input{box-sizing:border-box;width:100%;padding:12px;border:1px solid #adc0b4;border-radius:8px;font:inherit;text-transform:uppercase;letter-spacing:.06em}
    #ta-access button{margin-top:10px;padding:12px 16px;border:0;border-radius:8px;background:#315b49;color:#fff;font:inherit;font-weight:700;cursor:pointer}
    #ta-access .ta-msg{min-height:1.3em;margin-top:10px;color:#9b2d20;font-size:.92rem}
    #ta-member-bar{position:fixed;right:12px;bottom:12px;z-index:9999;background:#fff;border:1px solid #adc0b4;border-radius:999px;padding:7px 12px;font:13px system-ui;box-shadow:0 3px 12px rgba(0,0,0,.15)}
    #ta-member-bar button{border:0;background:none;color:#315b49;text-decoration:underline;cursor:pointer;font:inherit;padding:0}
  `;

  function renderLogin(message = '') {
    document.getElementById('ta-access')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div id="ta-access" role="dialog" aria-modal="true"><div class="ta-box"><h1>Premium-Mitgliederbereich</h1><p>Diese App gehört zum Premium-Bereich der Tierakademie. Bitte gib deinen persönlichen Zugangscode ein.</p><input id="ta-code" autocomplete="off" placeholder="Dein Zugangscode"><button id="ta-login">Zugang öffnen</button><div class="ta-msg" id="ta-msg">${message}</div></div></div>`);
    const field = document.getElementById('ta-code');
    const submit = () => login(field.value);
    document.getElementById('ta-login').onclick = submit;
    field.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    field.focus();
  }

  async function login(code) {
    const msg = document.getElementById('ta-msg');
    try {
      msg.textContent = 'Zugang wird geprüft …';
      const response = await originalFetch(WORKER + '/member/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Der Code ist nicht gültig.');
      localStorage.setItem(TOKEN_KEY, data.token);
      unlock();
    } catch (error) {
      msg.textContent = error.message || 'Der Zugang konnte nicht geprüft werden.';
    }
  }

  async function unlock() {
    try {
      const response = await originalFetch(WORKER + '/member/session', {
        headers: { Authorization: 'Bearer ' + localStorage.getItem(TOKEN_KEY) }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      document.getElementById('ta-access')?.remove();
      document.getElementById('ta-member-bar')?.remove();
      document.body.insertAdjacentHTML('beforeend', '<div id="ta-member-bar">Premium-Zugang aktiv · <button id="ta-change-code">Code wechseln</button></div>');
      document.getElementById('ta-change-code').onclick = () => {
        localStorage.removeItem(TOKEN_KEY);
        document.getElementById('ta-member-bar')?.remove();
        renderLogin('Du kannst jetzt einen anderen Code eingeben.');
      };
    } catch (error) {
      localStorage.removeItem(TOKEN_KEY);
      renderLogin(error.message || 'Der Zugang konnte nicht bestätigt werden.');
    }
  }

  function start() {
    const tag = document.createElement('style');
    tag.textContent = style;
    document.head.appendChild(tag);
    unlock();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();