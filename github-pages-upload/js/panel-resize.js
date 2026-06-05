/**
 * Excel-style column resizers for main panels and chart row.
 */
(function () {
  const MIN_COL = 140;
  const MIN_CHART = 120;
  const MIN_CENTER = 260;

  function isRtl() {
    return document.body.dir === 'rtl';
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function redrawCharts() {
    if (typeof visualizer === 'undefined' || !visualizer) return;
    visualizer.resize();
    if (typeof ga !== 'undefined' && ga) {
      if (typeof updateUI === 'function') {
        updateUI(ga.currentPhase || 'init', ga.phaseData || {});
      }
    } else if (typeof drawInitialPreview === 'function') {
      drawInitialPreview();
    }
  }

  function loadWidths() {
    try {
      const saved = JSON.parse(localStorage.getItem('ga-col-widths') || '{}');
      if (saved.params) document.documentElement.style.setProperty('--col-params-w', saved.params + 'px');
      if (saved.explain) document.documentElement.style.setProperty('--col-explain-w', saved.explain + 'px');
      if (saved.c1) document.documentElement.style.setProperty('--chart-c1', saved.c1 + 'fr');
      if (saved.c2) document.documentElement.style.setProperty('--chart-c2', saved.c2 + 'fr');
      if (saved.c3) document.documentElement.style.setProperty('--chart-c3', saved.c3 + 'fr');
    } catch (_) { /* ignore */ }
  }

  function saveWidths() {
    const root = getComputedStyle(document.documentElement);
    const data = {
      params: parseInt(root.getPropertyValue('--col-params-w')) || 320,
      explain: parseInt(root.getPropertyValue('--col-explain-w')) || 360,
      c1: parseFloat(root.getPropertyValue('--chart-c1')) || 1,
      c2: parseFloat(root.getPropertyValue('--chart-c2')) || 1,
      c3: parseFloat(root.getPropertyValue('--chart-c3')) || 1
    };
    localStorage.setItem('ga-col-widths', JSON.stringify(data));
  }

  function bindPanelResizer(handle, panel, cssVar, layoutEl) {
    if (!handle || !panel) return;

    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      handle.classList.add('active');
      document.body.classList.add('is-resizing');

      const startX = e.clientX;
      const startW = panel.offsetWidth;
      const layoutW = layoutEl.offsetWidth;
      const rtl = isRtl();

      function onMove(ev) {
        const diff = ev.clientX - startX;
        const delta = rtl ? -diff : diff;
        const maxW = layoutW - MIN_CENTER - MIN_COL - 40;
        const newW = clamp(startW + delta, MIN_COL, maxW);
        document.documentElement.style.setProperty(cssVar, newW + 'px');
        redrawCharts();
      }

      function onUp(ev) {
        handle.releasePointerCapture(ev.pointerId);
        handle.classList.remove('active');
        document.body.classList.remove('is-resizing');
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onUp);
        saveWidths();
      }

      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
    });
  }

  function bindChartResizer(handle, leftKey, rightKey) {
    if (!handle) return;

    handle.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      handle.setPointerCapture(e.pointerId);
      handle.classList.add('active');
      document.body.classList.add('is-resizing');

      const root = getComputedStyle(document.documentElement);
      let c1 = parseFloat(root.getPropertyValue('--chart-c1')) || 1;
      let c2 = parseFloat(root.getPropertyValue('--chart-c2')) || 1;
      let c3 = parseFloat(root.getPropertyValue('--chart-c3')) || 1;

      const startX = e.clientX;
      const rtl = isRtl();

      function onMove(ev) {
        const diff = (ev.clientX - startX) * (rtl ? -1 : 1);
        const scale = diff / 80;
        if (leftKey === 'c1' && rightKey === 'c2') {
          c1 = clamp(c1 + scale, 0.35, 3);
          c2 = clamp(c2 - scale, 0.35, 3);
        } else if (leftKey === 'c2' && rightKey === 'c3') {
          c2 = clamp(c2 + scale, 0.35, 3);
          c3 = clamp(c3 - scale, 0.35, 3);
        }
        document.documentElement.style.setProperty('--chart-c1', c1 + 'fr');
        document.documentElement.style.setProperty('--chart-c2', c2 + 'fr');
        document.documentElement.style.setProperty('--chart-c3', c3 + 'fr');
        redrawCharts();
      }

      function onUp(ev) {
        handle.releasePointerCapture(ev.pointerId);
        handle.classList.remove('active');
        document.body.classList.remove('is-resizing');
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUp);
        handle.removeEventListener('pointercancel', onUp);
        saveWidths();
      }

      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUp);
      handle.addEventListener('pointercancel', onUp);
    });
  }

  function initPanelResize() {
    loadWidths();

    const layout = document.getElementById('mainLayout');
    const panelParams = document.getElementById('panelParams');
    const panelExplain = document.getElementById('panelExplain');

    bindPanelResizer(document.getElementById('resizerParams'), panelParams, '--col-params-w', layout);
    bindPanelResizer(document.getElementById('resizerExplain'), panelExplain, '--col-explain-w', layout);

    bindChartResizer(document.getElementById('resizerChart1'), 'c1', 'c2');
    bindChartResizer(document.getElementById('resizerChart2'), 'c2', 'c3');

    window.addEventListener('resize', () => {
      clearTimeout(window._gaResizeT);
      window._gaResizeT = setTimeout(redrawCharts, 120);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPanelResize);
  } else {
    initPanelResize();
  }
})();
