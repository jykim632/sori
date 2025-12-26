import type { Context } from "hono";

const WIDGET_SCRIPT = `
(function() {
  if (window.SoriWidget) return;

  // Get config from data attributes or global config
  const script = document.currentScript;
  const config = window.SoriWidgetConfig || {};

  const projectId = script?.dataset?.projectId || config.projectId;
  const apiUrl = script?.dataset?.apiUrl || config.apiUrl || 'https://app.sori.life';
  const position = script?.dataset?.position || config.position || 'bottom-right';
  const primaryColor = script?.dataset?.color || config.primaryColor || '#4f46e5';
  const buttonText = script?.dataset?.text || config.buttonText || 'Feedback';

  if (!projectId) {
    console.error('Sori Widget: data-project-id is required');
    return;
  }

  // Inject styles
  const style = document.createElement('style');
  style.textContent = \`
    .sori-widget-container {
      position: fixed;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .sori-widget-container.bottom-right { bottom: 24px; right: 24px; }
    .sori-widget-container.bottom-left { bottom: 24px; left: 24px; }
    .sori-widget-container.top-right { top: 24px; right: 24px; }
    .sori-widget-container.top-left { top: 24px; left: 24px; }

    .sori-trigger-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: \${primaryColor};
      color: white;
      border: none;
      border-radius: 50px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .sori-trigger-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 20px rgba(0,0,0,0.3);
    }
    .sori-trigger-btn svg {
      width: 18px;
      height: 18px;
    }

    .sori-panel {
      width: 360px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      overflow: hidden;
      animation: sori-slide-up 0.2s ease-out;
    }
    @keyframes sori-slide-up {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .sori-panel-header {
      background: linear-gradient(135deg, \${primaryColor}, #7c3aed);
      color: white;
      padding: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .sori-panel-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sori-close-btn {
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .sori-close-btn:hover { background: rgba(255,255,255,0.3); }

    .sori-panel-body {
      padding: 16px;
      background: #fafafa;
    }

    .sori-form-group {
      margin-bottom: 16px;
    }
    .sori-form-group label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
    }

    .sori-type-selector {
      display: flex;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 4px;
    }
    .sori-type-btn {
      flex: 1;
      padding: 8px;
      border: none;
      background: transparent;
      font-size: 13px;
      font-weight: 500;
      color: #6b7280;
      cursor: pointer;
      border-radius: 6px;
      transition: all 0.15s;
    }
    .sori-type-btn.active {
      background: #eef2ff;
      color: \${primaryColor};
    }
    .sori-type-btn:hover:not(.active) {
      background: #f9fafb;
    }

    .sori-textarea, .sori-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
      box-sizing: border-box;
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    .sori-textarea:focus, .sori-input:focus {
      outline: none;
      border-color: \${primaryColor};
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }
    .sori-textarea { min-height: 100px; }

    .sori-submit-btn {
      width: 100%;
      padding: 12px;
      background: \${primaryColor};
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: opacity 0.15s;
    }
    .sori-submit-btn:hover { opacity: 0.9; }
    .sori-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .sori-submit-btn svg { width: 16px; height: 16px; }

    .sori-error {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 10px;
      border-radius: 8px;
      font-size: 13px;
      margin-bottom: 16px;
    }

    .sori-success {
      text-align: center;
      padding: 32px 16px;
    }
    .sori-success-icon {
      width: 48px;
      height: 48px;
      background: #dcfce7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 16px;
    }
    .sori-success-icon svg { width: 24px; height: 24px; color: #16a34a; }
    .sori-success h4 { margin: 0 0 8px; font-size: 16px; color: #111827; }
    .sori-success p { margin: 0; font-size: 14px; color: #6b7280; }

    .sori-footer {
      background: #f9fafb;
      padding: 8px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .sori-footer a {
      font-size: 10px;
      color: #9ca3af;
      text-decoration: none;
    }
    .sori-footer a:hover { color: #6b7280; }

    @media (max-width: 480px) {
      .sori-panel { width: calc(100vw - 48px); }
    }
  \`;
  document.head.appendChild(style);

  // Create container
  const container = document.createElement('div');
  container.className = 'sori-widget-container ' + position;
  document.body.appendChild(container);

  // Icons
  const icons = {
    message: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
    spinner: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="sori-spinner"><circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="32"><animate attributeName="stroke-dashoffset" dur="1s" repeatCount="indefinite" values="32;0"/></circle></svg>'
  };

  let isOpen = false;
  let state = { type: 'INQUIRY', message: '', email: '', loading: false, error: '', success: false };

  // Escape HTML to prevent XSS
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function render() {
    if (!isOpen) {
      container.innerHTML = \`
        <button class="sori-trigger-btn" onclick="SoriWidget.open()">
          \${icons.message}
          <span>\${buttonText}</span>
        </button>
      \`;
      return;
    }

    if (state.success) {
      container.innerHTML = \`
        <div class="sori-panel">
          <div class="sori-panel-header">
            <h3>\${icons.message} Feedback</h3>
            <button class="sori-close-btn" onclick="SoriWidget.close()">\${icons.close}</button>
          </div>
          <div class="sori-panel-body">
            <div class="sori-success">
              <div class="sori-success-icon">\${icons.check}</div>
              <h4>Thank you!</h4>
              <p>We appreciate your feedback.</p>
            </div>
          </div>
          <div class="sori-footer">
            <a href="https://sori.life" target="_blank">Powered by Sori</a>
          </div>
        </div>
      \`;
      setTimeout(() => { state.success = false; isOpen = false; render(); }, 2000);
      return;
    }

    container.innerHTML = \`
      <div class="sori-panel">
        <div class="sori-panel-header">
          <h3>\${icons.message} Share Feedback</h3>
          <button class="sori-close-btn" onclick="SoriWidget.close()">\${icons.close}</button>
        </div>
        <div class="sori-panel-body">
          <form onsubmit="SoriWidget.submit(event)">
            \${state.error ? '<div class="sori-error">' + escapeHtml(state.error) + '</div>' : ''}

            <div class="sori-form-group">
              <label>Type</label>
              <div class="sori-type-selector">
                <button type="button" class="sori-type-btn \${state.type === 'INQUIRY' ? 'active' : ''}" onclick="SoriWidget.setType('INQUIRY')">Question</button>
                <button type="button" class="sori-type-btn \${state.type === 'BUG' ? 'active' : ''}" onclick="SoriWidget.setType('BUG')">Bug Report</button>
              </div>
            </div>

            <div class="sori-form-group">
              <label>Message</label>
              <textarea class="sori-textarea" required placeholder="\${state.type === 'BUG' ? 'Describe expected vs actual behavior...' : 'How can we help you?'}" oninput="SoriWidget.setMessage(this.value)">\${escapeHtml(state.message)}</textarea>
            </div>

            <div class="sori-form-group">
              <label>Email <span style="font-weight:400;text-transform:none;color:#9ca3af">(Optional)</span></label>
              <input type="email" class="sori-input" placeholder="you@example.com" value="\${escapeHtml(state.email)}" oninput="SoriWidget.setEmail(this.value)">
            </div>

            <button type="submit" class="sori-submit-btn" \${state.loading ? 'disabled' : ''}>
              \${state.loading ? icons.spinner : icons.send}
              <span>\${state.loading ? 'Sending...' : 'Send Feedback'}</span>
            </button>
          </form>
        </div>
        <div class="sori-footer">
          <a href="https://sori.life" target="_blank">Powered by Sori</a>
        </div>
      </div>
    \`;
  }

  window.SoriWidget = {
    open() { isOpen = true; render(); },
    close() { isOpen = false; state.error = ''; render(); },
    setType(t) { state.type = t; render(); },
    setMessage(m) { state.message = m; },
    setEmail(e) { state.email = e; },
    async submit(event) {
      event.preventDefault();
      if (!state.message.trim()) return;

      state.loading = true;
      state.error = '';
      render();

      try {
        const res = await fetch(apiUrl + '/api/v1/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            type: state.type,
            message: state.message,
            email: state.email || undefined,
            metadata: {
              url: window.location.href,
              userAgent: navigator.userAgent
            }
          })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to send feedback');
        }

        state.success = true;
        state.message = '';
        state.email = '';
      } catch (err) {
        // Use safe, predefined error messages instead of server responses
        const safeErrors = {
          'Too many requests': 'Too many requests. Please try again later.',
          'Origin not allowed': 'This domain is not authorized.',
          'Project not found': 'Invalid project configuration.',
          'Message too long': 'Message is too long.',
          'Invalid email': 'Please enter a valid email address.',
        };
        const errMsg = err.message || '';
        state.error = Object.keys(safeErrors).find(k => errMsg.includes(k))
          ? safeErrors[Object.keys(safeErrors).find(k => errMsg.includes(k))]
          : 'Something went wrong. Please try again.';
      }

      state.loading = false;
      render();
    }
  };

  render();
})();
`;

export async function widget(c: Context) {
  return c.text(WIDGET_SCRIPT, 200, {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": "public, max-age=3600",
    "Access-Control-Allow-Origin": "*",
  });
}
