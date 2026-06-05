class Visualizer {
  constructor() {
    this.mainCanvas = document.getElementById('mainCanvas');
    this.landscapeCanvas = document.getElementById('landscapeCanvas');
    this.populationCanvas = document.getElementById('populationCanvas');
    this.convergenceCanvas = document.getElementById('convergenceCanvas');
    this.mainCtx = this.mainCanvas.getContext('2d');
    this.landscapeCtx = this.landscapeCanvas.getContext('2d');
    this.populationCtx = this.populationCanvas.getContext('2d');
    this.convergenceCtx = this.convergenceCanvas.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  scale(w, h) {
    return Math.max(1.8, Math.min(w, h) / 150);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const mainH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--main-chart-h')) || 380;
    const subH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sub-chart-h')) || 190;

    const mainRect = this.mainCanvas.parentElement.getBoundingClientRect();
    this.mainCanvas.width = mainRect.width * dpr;
    this.mainCanvas.height = mainH * dpr;
    this.mainCanvas.style.width = mainRect.width + 'px';
    this.mainCanvas.style.height = mainH + 'px';

    [this.landscapeCanvas, this.populationCanvas, this.convergenceCanvas].forEach(c => {
      const rect = c.parentElement.getBoundingClientRect();
      c.width = rect.width * dpr;
      c.height = subH * dpr;
      c.style.width = rect.width + 'px';
      c.style.height = subH + 'px';
    });

    [this.mainCtx, this.landscapeCtx, this.populationCtx, this.convergenceCtx].forEach(ctx => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
  }

  getColors() {
    const style = getComputedStyle(document.body);
    return {
      bg: style.getPropertyValue('--canvas-bg').trim(),
      text: style.getPropertyValue('--text-primary').trim(),
      muted: style.getPropertyValue('--text-muted').trim(),
      accent: style.getPropertyValue('--accent').trim(),
      accent2: style.getPropertyValue('--accent-secondary').trim(),
      accent3: style.getPropertyValue('--accent-tertiary').trim(),
      success: style.getPropertyValue('--success').trim(),
      warning: style.getPropertyValue('--warning').trim(),
      border: style.getPropertyValue('--border').trim()
    };
  }

  drawMain(ga, phase, phaseData) {
    const ctx = this.mainCtx;
    const w = this.mainCanvas.width / (window.devicePixelRatio || 1);
    const h = this.mainCanvas.height / (window.devicePixelRatio || 1);
    const c = this.getColors();

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, w, h);

    const pad = { top: 40, bottom: 40, left: 50, right: 20 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    // Draw fitness curve
    const fitnessFn = ga.fitnessFn;
    const points = [];
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i <= 200; i++) {
      const x = i / 200;
      const y = fitnessFn(x);
      points.push({ x, y });
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const yRange = maxY - minY || 1;

    // Grid
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const gy = pad.top + (plotH * i) / 5;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(w - pad.right, gy);
      ctx.stroke();
    }
    for (let i = 0; i <= 5; i++) {
      const gx = pad.left + (plotW * i) / 5;
      ctx.beginPath();
      ctx.moveTo(gx, pad.top);
      ctx.lineTo(gx, h - pad.bottom);
      ctx.stroke();
    }

    // Axes labels
    ctx.fillStyle = c.muted;
    const sc = this.scale(w, h);
    ctx.font = `${Math.round(26 * sc)}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('x ∈ [0, 1]', w / 2, h - 8);
    ctx.save();
    ctx.translate(12, h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('f(x)', 0, 0);
    ctx.restore();

    // Fitness curve
    ctx.beginPath();
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2.5 * sc;
    points.forEach((p, i) => {
      const px = pad.left + p.x * plotW;
      const py = pad.top + plotH - ((p.y - minY) / yRange) * plotH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Fill under curve
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.top, 0, h - pad.bottom);
    grad.addColorStop(0, c.accent + '30');
    grad.addColorStop(1, c.accent + '05');
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw population
    if (ga.population && ga.population.length > 0) {
      ga.population.forEach((ind, idx) => {
        const px = pad.left + ind.decoded * plotW;
        const py = pad.top + plotH - ((ind.fitness - minY) / yRange) * plotH;

        let radius = 8 * sc;
        let color = c.accent2;
        let alpha = 0.7;

        if (phase === 'select' && phaseData?.parents) {
          const isParent = phaseData.parents.some(p =>
            p.chromosome.join('') === ind.chromosome.join('')
          );
          if (isParent) { color = c.warning; radius = 12 * sc; alpha = 1; }
        }
        if (phase === 'crossover' && phaseData?.parents) {
          const isParent = phaseData.parents.some(p =>
            p.chromosome.join('') === ind.chromosome.join('')
          );
          if (isParent) { color = c.warning; radius = 12 * sc; alpha = 1; }
        }
        if (ind === ga.bestEver || (ga.bestEver && ind.chromosome.join('') === ga.bestEver.chromosome.join(''))) {
          color = c.success; radius = 14 * sc; alpha = 1;
        }

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = c.bg;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
    }

    // Crossover visualization
    if (phase === 'crossover' && phaseData?.offspring) {
      phaseData.offspring.slice(0, 4).forEach((off, i) => {
        if (off.crossoverPoint >= 0) {
          const px = pad.left + off.decoded * plotW;
          const py = pad.top + plotH - ((off.fitness - minY) / yRange) * plotH;
          ctx.strokeStyle = c.accent3;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.arc(px, py, 12 + i * 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

  }

  drawLandscape(ga) {
    const ctx = this.landscapeCtx;
    const w = this.landscapeCanvas.width / (window.devicePixelRatio || 1);
    const h = this.landscapeCanvas.height / (window.devicePixelRatio || 1);
    const c = this.getColors();

    ctx.clearRect(0, 0, w, h);
    const fitnessFn = ga.fitnessFn;
    let minY = Infinity, maxY = -Infinity;
    const pts = [];
    for (let i = 0; i <= 100; i++) {
      const x = i / 100;
      const y = fitnessFn(x);
      pts.push({ x, y });
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const yRange = maxY - minY || 1;

    ctx.beginPath();
    pts.forEach((p, i) => {
      const px = p.x * w;
      const py = h - 10 - ((p.y - minY) / yRange) * (h - 20);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 4.5;
    ctx.stroke();

    if (ga.bestEver) {
      const bx = ga.bestEver.decoded * w;
      const by = h - 10 - ((ga.bestEver.fitness - minY) / yRange) * (h - 20);
      ctx.beginPath();
      ctx.arc(bx, by, 7, 0, Math.PI * 2);
      ctx.fillStyle = c.success;
      ctx.fill();
    }
  }

  drawPopulation(ga, phase, phaseData) {
    const ctx = this.populationCtx;
    const w = this.populationCanvas.width / (window.devicePixelRatio || 1);
    const h = this.populationCanvas.height / (window.devicePixelRatio || 1);
    const c = this.getColors();

    ctx.clearRect(0, 0, w, h);
    if (!ga.population || ga.population.length === 0) return;

    const bins = 20;
    const histogram = new Array(bins).fill(0);
    const minX = 0, maxX = 1;

    ga.population.forEach(ind => {
      const bin = Math.min(bins - 1, Math.floor((ind.decoded - minX) / (maxX - minX) * bins));
      histogram[bin]++;
    });

    const maxCount = Math.max(...histogram, 1);
    const barW = w / bins - 2;

    histogram.forEach((count, i) => {
      const barH = (count / maxCount) * (h - 20);
      const x = i * (w / bins) + 1;
      const y = h - 10 - barH;

      const grad = ctx.createLinearGradient(x, y, x, h - 10);
      grad.addColorStop(0, c.accent2);
      grad.addColorStop(1, c.accent2 + '40');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barW, barH);
    });

    ctx.fillStyle = c.muted;
    ctx.font = 'bold 22px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('0', 10, h - 1);
    ctx.fillText('1', w - 10, h - 1);
  }

  drawConvergence(ga) {
    const ctx = this.convergenceCtx;
    const w = this.convergenceCanvas.width / (window.devicePixelRatio || 1);
    const h = this.convergenceCanvas.height / (window.devicePixelRatio || 1);
    const c = this.getColors();

    ctx.clearRect(0, 0, w, h);
    const data = ga.convergenceData;
    if (!data || data.length < 2) return;

    const pad = 10;
    const plotW = w - pad * 2;
    const plotH = h - pad * 2;

    const allVals = data.flatMap(d => [d.best, d.avg]);
    const minY = Math.min(...allVals);
    const maxY = Math.max(...allVals);
    const yRange = maxY - minY || 1;
    const maxGen = data[data.length - 1].gen || 1;

    // Best fitness line
    ctx.beginPath();
    ctx.strokeStyle = c.success;
    ctx.lineWidth = 4.5;
    data.forEach((d, i) => {
      const px = pad + (d.gen / maxGen) * plotW;
      const py = pad + plotH - ((d.best - minY) / yRange) * plotH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Average fitness line
    ctx.beginPath();
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    data.forEach((d, i) => {
      const px = pad + (d.gen / maxGen) * plotW;
      const py = pad + plotH - ((d.avg - minY) / yRange) * plotH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // Legend
    ctx.font = 'bold 22px JetBrains Mono';
    ctx.fillStyle = c.success;
    ctx.textAlign = 'left';
    ctx.fillText('Best', pad, 10);
    ctx.fillStyle = c.accent;
    ctx.fillText('Avg', pad + 40, 10);
  }

  renderChromosomeGrid(ga, phase, phaseData) {
    const grid = document.getElementById('chromosomeGrid');
    const meta = document.getElementById('chromosomeMeta');
    grid.innerHTML = '';

    let individuals = ga.population || [];
    if (phase === 'crossover' && phaseData?.offspring) individuals = phaseData.offspring;
    if (phase === 'mutate' && phaseData?.offspring) individuals = phaseData.offspring;

    const bitLen = ga.config?.chromosomeLength || (individuals[0]?.chromosome?.length || 0);
    const total = individuals.length;
    const displayCount = total;
    const sorted = [...individuals].sort((a, b) => b.fitness - a.fitness);

    if (meta) {
      meta.textContent = typeof t === 'function'
        ? t('chromMeta', { bits: bitLen, shown: displayCount, total: total })
        : `${bitLen} bits | ${displayCount}/${total}`;
    }

    for (let i = 0; i < displayCount; i++) {
      const ind = sorted[i];
      const row = document.createElement('div');
      row.className = 'chrom-row';

      if (ga.bestEver && ind.chromosome.join('') === ga.bestEver.chromosome.join('')) {
        row.classList.add('best');
      }
      if (phase === 'select' && phaseData?.parents?.some(p => p.chromosome.join('') === ind.chromosome.join(''))) {
        row.classList.add('selected');
      }
      if (phase === 'mutate' && phaseData?.mutationIndices?.some(m => {
        const off = phaseData.offspring[m.index];
        return off && off.chromosome.join('') === ind.chromosome.join('');
      })) {
        row.classList.add('mutated');
      }

      const mutatedBits = new Set();
      if (phase === 'mutate' && phaseData?.mutationIndices) {
        phaseData.mutationIndices.forEach(m => {
          if (phaseData.offspring[m.index]?.chromosome.join('') === ind.chromosome.join('')) {
            m.bits.forEach(b => mutatedBits.add(b));
          }
        });
      }

      const bitsHtml = ind.chromosome.map((bit, bi) => {
        const cls = mutatedBits.has(bi) ? 'bit-mutated' : (bit ? 'bit-1' : 'bit-0');
        return `<span class="${cls}">${bit}</span>`;
      }).join('');

      row.innerHTML = `
        <span class="chrom-index">${i + 1}</span>
        <span class="chrom-bits">${bitsHtml}</span>
        <span class="chrom-fitness">${ind.fitness.toFixed(4)}</span>
      `;
      grid.appendChild(row);
    }
  }


  drawPreview(fitnessFn) {
    const dummy = { fitnessFn, population: [], bestEver: null, convergenceData: [] };
    this.drawMainPreview(fitnessFn);
    this.drawLandscape(dummy);
    this.drawPopulationPreview();
    this.drawConvergencePreview();
  }

  drawMainPreview(fitnessFn) {
    const ctx = this.mainCtx;
    const w = this.mainCanvas.width / (window.devicePixelRatio || 1);
    const h = this.mainCanvas.height / (window.devicePixelRatio || 1);
    if (w < 10 || h < 10) return;
    const c = this.getColors();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, w, h);
    const pad = { top: 40, bottom: 40, left: 50, right: 20 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;
    let minY = Infinity, maxY = -Infinity;
    const points = [];
    for (let i = 0; i <= 200; i++) {
      const x = i / 200;
      const y = fitnessFn(x);
      points.push({ x, y });
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const yRange = maxY - minY || 1;
    const sc = this.scale(w, h);
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const gy = pad.top + (plotH * i) / 5;
      ctx.beginPath();
      ctx.moveTo(pad.left, gy);
      ctx.lineTo(w - pad.right, gy);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.strokeStyle = c.accent;
    ctx.lineWidth = 2.5 * sc;
    points.forEach((p, i) => {
      const px = pad.left + p.x * plotW;
      const py = pad.top + plotH - ((p.y - minY) / yRange) * plotH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.fillStyle = c.muted;
    ctx.font = `${Math.round(26 * sc)}px JetBrains Mono, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('x', w / 2, h - 10);
  }

  drawPopulationPreview() {
    const ctx = this.populationCtx;
    const w = this.populationCanvas.width / (window.devicePixelRatio || 1);
    const h = this.populationCanvas.height / (window.devicePixelRatio || 1);
    if (w < 10) return;
    const c = this.getColors();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = c.muted;
    ctx.font = 'bold 24px IBM Plex Sans Arabic, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('—', w / 2, h / 2);
  }

  drawConvergencePreview() {
    const ctx = this.convergenceCtx;
    const w = this.convergenceCanvas.width / (window.devicePixelRatio || 1);
    const h = this.convergenceCanvas.height / (window.devicePixelRatio || 1);
    if (w < 10) return;
    const c = this.getColors();
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = c.border;
    ctx.lineWidth = 1;
    const pad = 14;
    ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.fillStyle = c.muted;
    ctx.font = 'bold 24px IBM Plex Sans Arabic, Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('—', w / 2, h / 2);
  }

  renderAll(ga, phase, phaseData) {
    if (!ga) return;
    try {
      this.drawMain(ga, phase, phaseData);
      this.drawLandscape(ga);
      this.drawPopulation(ga, phase, phaseData);
      this.drawConvergence(ga);
      this.renderChromosomeGrid(ga, phase, phaseData);
    } catch (e) {
      console.error('Render error:', e);
    }
  }
}
