// The version badge and update log, top of the game screen between the wave and the score.
// A standalone script (not part of the game bundle) so every published version, old builds
// included, loads the same one from the site root: /version-bar.js reads /versions.json.
// Versions live at /v<id>/; the site root always serves the newest.
(() => {
  // Matches the HUD (src/data/config.ts HUD): scale = clamp(height / REF_HEIGHT, MIN, MAX).
  const HUD = { MARGIN: 28, REF_HEIGHT: 900, MIN_SCALE: 0.9, MAX_SCALE: 1.5, SUB_SIZE: 14, SPACING: 3, SCORE_SIZE: 30 };
  // Room the centered "WAVE n" takes on each side of the screen centre, and the width of the
  // right-aligned "SCORE" label, at HUD scale 1.
  const WAVE_HALF = 70;
  const SCORE_WIDTH = 72;
  const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
  const FONT = 'KaTeX_Main, "Times New Roman", serif';

  const root = document.createElement('div');
  root.style.cssText = `position:fixed;z-index:5;font-family:${FONT};color:#fff;user-select:none;`;
  // Clicks on the badge and its panels never reach the game (it listens on window).
  for (const type of ['mousedown', 'mouseup', 'click', 'wheel', 'contextmenu']) {
    root.addEventListener(type, (e) => e.stopPropagation());
  }

  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;align-items:baseline;white-space:nowrap;';
  const link = (text) => {
    const b = document.createElement('button');
    b.textContent = text;
    b.style.cssText = `all:unset;cursor:pointer;opacity:0.5;transition:opacity 0.2s ${EASE};`;
    b.addEventListener('mouseenter', () => (b.style.opacity = '0.95'));
    b.addEventListener('mouseleave', () => (b.style.opacity = '0.5'));
    return b;
  };
  const versionBtn = link('');
  const updatesBtn = link('updates');
  bar.append(versionBtn, updatesBtn);

  const panel = document.createElement('div');
  panel.style.cssText =
    `position:absolute;top:calc(100% + 10px);right:0;min-width:15em;max-width:24em;padding:0.9em 1.1em;` +
    `background:rgba(0,0,0,0.92);border:1px solid rgba(255,255,255,0.22);border-radius:4px;` +
    `letter-spacing:0;line-height:1.45;opacity:0;pointer-events:none;` +
    `transform:translateY(-6px);transition:opacity 0.22s ${EASE},transform 0.22s ${EASE};`;
  root.append(bar, panel);

  let open = null;
  const show = (which) => {
    open = open === which ? null : which;
    panel.style.opacity = open ? '1' : '0';
    panel.style.pointerEvents = open ? 'auto' : 'none';
    panel.style.transform = open ? 'translateY(0)' : 'translateY(-6px)';
    if (open) render(open);
  };
  window.addEventListener('mousedown', () => open && show(null));
  window.addEventListener('keydown', (e) => e.key === 'Escape' && open && show(null));

  let data = null;
  let here = null;
  const label = (id) => `V${id}`;
  // The local dev server only has the working copy, so older versions open on the published site.
  const PUBLIC_SITE = 'https://equation-brawler.github.io';
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
  const urlFor = (id) => (id === data.current ? '/' : `${local ? PUBLIC_SITE : ''}/v${id}/`);
  const formatDate = (iso) => {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const el = (tag, css, text) => {
    const e = document.createElement(tag);
    if (css) e.style.cssText = css;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  function render(which) {
    panel.replaceChildren();
    if (which === 'versions') {
      panel.append(el('div', 'opacity:0.45;letter-spacing:0.2em;font-size:0.75em;margin-bottom:0.5em;', 'VERSION'));
      for (const v of data.versions) {
        const a = el(
          'a',
          'display:flex;justify-content:space-between;gap:1.5em;color:#fff;text-decoration:none;padding:0.2em 0;',
        );
        a.href = urlFor(v.id);
        const name = el('span', 'white-space:nowrap;', `${label(v.id)}  ${v.title}`);
        const tag = el(
          'span',
          'opacity:0.45;font-size:0.85em;white-space:nowrap;',
          v.id === data.current ? 'newest' : formatDate(v.date),
        );
        a.style.opacity = v.id === here ? '1' : '0.6';
        if (v.id === here) name.style.borderBottom = '2px solid #3BE8FF';
        a.append(name, tag);
        panel.append(a);
      }
    } else {
      panel.append(el('div', 'opacity:0.45;letter-spacing:0.2em;font-size:0.75em;margin-bottom:0.4em;', 'UPDATES'));
      for (const v of data.versions) {
        panel.append(
          el('div', 'margin-top:0.6em;', `${label(v.id)} · ${v.title}`),
          el('div', 'opacity:0.45;font-size:0.8em;margin-bottom:0.2em;', formatDate(v.date)),
        );
        const ul = el('ul', 'margin:0;padding-left:1.1em;opacity:0.8;font-size:0.9em;');
        for (const n of v.notes) ul.append(el('li', '', n));
        panel.append(ul);
      }
    }
  }

  function layout() {
    const s = Math.max(HUD.MIN_SCALE, Math.min(HUD.MAX_SCALE, innerHeight / HUD.REF_HEIGHT));
    const m = HUD.MARGIN * s;
    root.style.fontSize = `${HUD.SUB_SIZE * s}px`;
    bar.style.letterSpacing = `${HUD.SPACING * s}px`;
    // WAVE · version · updates · SCORE, equally spaced: the free width between the wave and the
    // score, less the two labels, split into three equal gaps. Too narrow: under the score instead.
    bar.style.gap = '0px';
    const from = innerWidth / 2 + WAVE_HALF * s;
    const to = innerWidth - m - SCORE_WIDTH * s;
    const labels = versionBtn.getBoundingClientRect().width + updatesBtn.getBoundingClientRect().width;
    const gap = (to - from - labels) / 3;
    if (gap >= 16 * s) {
      bar.style.gap = `${gap}px`;
      root.style.top = `${m}px`;
      root.style.left = `${from + gap}px`;
      root.style.right = '';
    } else {
      bar.style.gap = '1.2em';
      root.style.top = `${m + (HUD.SUB_SIZE * 1.3 + HUD.SCORE_SIZE * 1.4) * s}px`;
      root.style.left = '';
      root.style.right = `${m}px`;
    }
  }

  fetch('/versions.json', { cache: 'no-cache' })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((json) => {
      data = json;
      const m = location.pathname.match(/\/v([\d.]+)\/?/);
      here = m ? m[1] : data.current;
      versionBtn.textContent = `${label(here)} ▾`;
      versionBtn.addEventListener('click', () => show('versions'));
      updatesBtn.addEventListener('click', () => show('updates'));
      document.body.append(root);
      layout();
      addEventListener('resize', layout);
    })
    .catch(() => {
      // No version list (e.g. a local build without it): no badge.
    });
})();
