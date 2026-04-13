/**
 * toast.ts — Sistema de notificações estilizadas sem dependências externas.
 * Pode ser chamado de qualquer lugar (hooks, utils) sem necessidade de estado React.
 *
 * Uso:
 *   toast.success('Alterações salvas com sucesso!');
 *   toast.error('Erro ao conectar com o servidor.');
 *   toast.info('Nenhuma alteração para salvar.');
 */

export type ToastType = 'success' | 'error' | 'info' | 'warning';

const COLORS: Record<ToastType, { bg: string; ring: string; icon: string; pulse: string }> = {
  success: { bg: '#059669', ring: 'rgba(5,150,105,0.25)',  icon: '✓', pulse: '#34d399' },
  error:   { bg: '#dc2626', ring: 'rgba(220,38,38,0.25)',  icon: '✕', pulse: '#f87171' },
  warning: { bg: '#d97706', ring: 'rgba(217,119,6,0.25)',  icon: '⚠', pulse: '#fbbf24' },
  info:    { bg: '#2563eb', ring: 'rgba(37,99,235,0.25)',  icon: 'ℹ', pulse: '#60a5fa' },
};

// Inject keyframe CSS once
function injectStyles() {
  if (document.getElementById('_toast_styles')) return;
  const style = document.createElement('style');
  style.id = '_toast_styles';
  style.textContent = `
    @keyframes _toastIn  { from { opacity:0; transform:translateY(14px) scale(0.94); } to { opacity:1; transform:translateY(0) scale(1); } }
    @keyframes _toastOut { from { opacity:1; transform:translateY(0) scale(1); }       to { opacity:0; transform:translateY(6px) scale(0.96); } }
    @keyframes _pulse    { 0%,100% { opacity:1; } 50% { opacity:.5; } }
  `;
  document.head.appendChild(style);
}

// Get or create the fixed container
function getContainer(): HTMLElement {
  let c = document.getElementById('_toast_container');
  if (!c) {
    c = document.createElement('div');
    c.id = '_toast_container';
    Object.assign(c.style, {
      position:       'fixed',
      bottom:         '1.75rem',
      left:           '50%',
      transform:      'translateX(-50%)',
      zIndex:         '99999',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      gap:            '0.5rem',
      pointerEvents:  'none',
    });
    document.body.appendChild(c);
  }
  return c;
}

function show(message: string, type: ToastType = 'success', duration = 3800) {
  injectStyles();
  const container = getContainer();
  const { bg, ring, icon, pulse } = COLORS[type];

  const el = document.createElement('div');
  Object.assign(el.style, {
    display:       'flex',
    alignItems:    'center',
    gap:           '0.75rem',
    padding:       '0.875rem 1.375rem',
    background:    bg,
    color:         '#fff',
    borderRadius:  '16px',
    fontFamily:    "'Inter', system-ui, -apple-system, sans-serif",
    fontSize:      '0.875rem',
    fontWeight:    '700',
    letterSpacing: '0.01em',
    boxShadow:     `0 8px 30px ${ring}, 0 2px 8px rgba(0,0,0,0.18)`,
    pointerEvents: 'all',
    cursor:        'default',
    maxWidth:      '440px',
    whiteSpace:    'nowrap',
    userSelect:    'none',
    animation:     '_toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
  });

  el.innerHTML = `
    <span style="
      width:22px;height:22px;
      background:rgba(255,255,255,0.18);
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:900;flex-shrink:0;
    ">${icon}</span>
    <span style="flex:1;line-height:1.3;">${message}</span>
    <span style="
      width:7px;height:7px;border-radius:50%;
      background:${pulse};
      flex-shrink:0;
      animation:_pulse 1.5s ease-in-out infinite;
    "></span>
  `;

  container.appendChild(el);

  setTimeout(() => {
    el.style.animation = '_toastOut 0.28s ease forwards';
    setTimeout(() => el.remove(), 290);
  }, duration);
}

const toast = {
  success: (msg: string, ms?: number) => show(msg, 'success', ms),
  error:   (msg: string, ms?: number) => show(msg, 'error',   ms),
  warning: (msg: string, ms?: number) => show(msg, 'warning', ms),
  info:    (msg: string, ms?: number) => show(msg, 'info',    ms),
};

export default toast;
