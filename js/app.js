// ===== Main Application =====
let ga = null;
let visualizer = null;
let isRunning = false;
let runInterval = null;
let runSpeed = 1000;

document.addEventListener('DOMContentLoaded', () => {
  visualizer = new Visualizer();
  bindControls();
  setLanguage('ar');
  loadTheme();
  requestAnimationFrame(() => {
    visualizer.resize();
    drawInitialPreview();
    setTimeout(() => { visualizer.resize(); drawInitialPreview(); }, 150);
    setTimeout(() => { visualizer.resize(); if (ga) updateUI(ga.currentPhase || 'init', ga.phaseData || {}); else drawInitialPreview(); }, 400);
  });
});


function drawInitialPreview() {
  if (!visualizer) return;
  visualizer.resize();
  const fn = FitnessFunctions[document.getElementById('targetFunction').value] || FitnessFunctions.sphere;
  visualizer.drawPreview(fn);
}


function updateChromosomeMetaPending() {
  const meta = document.getElementById('chromosomeMeta');
  if (!meta) return;
  const bits = document.getElementById('chromosomeLength').value;
  if (ga && ga.config && ga.config.chromosomeLength === parseInt(bits)) return;
  meta.textContent = t('chromMetaPending', { bits });
}

function onParamsChanged() {
  pauseGA();
  updateChromosomeMetaPending();
  const banner = document.getElementById('paramsChangedBanner');
  if (banner) banner.classList.remove('hidden');
  if (ga) {
    document.getElementById('chromosomeGrid').innerHTML = '';
  }
}

function getConfig() {
  return {
    populationSize: parseInt(document.getElementById('populationSize').value),
    chromosomeLength: parseInt(document.getElementById('chromosomeLength').value),
    mutationRate: parseInt(document.getElementById('mutationRate').value),
    crossoverRate: parseInt(document.getElementById('crossoverRate').value),
    maxGenerations: parseInt(document.getElementById('maxGenerations').value),
    selectionMethod: document.getElementById('selectionMethod').value,
    targetFunction: document.getElementById('targetFunction').value
  };
}

function bindControls() {
  // Range sliders
  const sliders = [
    ['populationSize', v => v],
    ['chromosomeLength', v => v],
    ['mutationRate', v => v + '%'],
    ['crossoverRate', v => v + '%'],
    ['maxGenerations', v => v]
  ];

  sliders.forEach(([id, fmt]) => {
    const input = document.getElementById(id);
    const display = document.getElementById(id + 'Val');
    input.addEventListener('input', () => {
      display.textContent = fmt(input.value);
      if (id === 'chromosomeLength' || id === 'populationSize') {
        onParamsChanged();
      }
    });
  });

  // Language
  document.getElementById('langSelect').addEventListener('change', (e) => {
    setLanguage(e.target.value);
    if (ga) updateUI(ga.currentPhase, ga.phaseData || {});
  });

  // Theme
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);

  // Buttons
  document.getElementById('btnInit').addEventListener('click', initGA);
  document.getElementById('btnStep').addEventListener('click', stepGA);
  document.getElementById('btnRunSlow').addEventListener('click', () => runGA(1500));
  document.getElementById('btnRunFast').addEventListener('click', () => runGA(200));
  document.getElementById('btnPause').addEventListener('click', pauseGA);
  document.getElementById('targetFunction').addEventListener('change', () => {
    if (ga) { ga.config.targetFunction = document.getElementById('targetFunction').value; updateUI(ga.currentPhase || 'init', ga.phaseData || {}); }
    else drawInitialPreview();
  });
  document.getElementById('btnReset').addEventListener('click', resetGA);
  document.getElementById('btnExportHTML').addEventListener('click', () => {
    if (ga) openReportLangModal('html');
  });
  document.getElementById('btnExportJSON').addEventListener('click', () => {
    if (ga) openReportLangModal('json');
  });
}

function initGA() {
  pauseGA();
  ga = new GeneticAlgorithm(getConfig());
  ga.initialize();
  ga.showInitOnly = false;

  updateUI('init', { population: ga.population, generation: 0 });
  highlightStep('init');
  updateExplanation('init', { population: ga.population, generation: 0 });
  updateStats();
}

function stepGA() {
  if (!ga || !ga.isInitialized) {
    initGA();
    return;
  }
  if (ga.isComplete) return;

  const result = ga.nextStep();
  if (!result) return;

  if (result.phase === 'done') {
    pauseGA();
    updateUI('replace', result.data);
    highlightStep('replace');
    updateExplanation('done', result.data);
    updateStats();
    return;
  }

  ga.phaseData = result.data;
  updateUI(result.phase, result.data);
  highlightStep(result.phase);
  updateExplanation(result.phase, result.data);
  updateStats();
}

function runGA(speed) {
  if (!ga || !ga.isInitialized) {
    initGA();
  }
  if (ga.isComplete) return;

  runSpeed = speed;
  isRunning = true;
  document.getElementById('btnRunSlow').classList.add('hidden');
  document.getElementById('btnRunFast').classList.add('hidden');
  document.getElementById('btnPause').classList.remove('hidden');

  runInterval = setInterval(() => {
    if (!isRunning || ga.isComplete) {
      pauseGA();
      return;
    }
    stepGA();
  }, runSpeed);
}

function pauseGA() {
  isRunning = false;
  if (runInterval) {
    clearInterval(runInterval);
    runInterval = null;
  }
  document.getElementById('btnRunSlow').classList.remove('hidden');
  document.getElementById('btnRunFast').classList.remove('hidden');
  document.getElementById('btnPause').classList.add('hidden');
}

function resetGA() {
  pauseGA();
  ga = null;
  document.getElementById('genNumber').textContent = '0';
  document.getElementById('bestFitness').textContent = '—';
  document.getElementById('avgFitness').textContent = '—';
  document.getElementById('currentStepLabel').textContent = '—';
  const canvasLabel = document.getElementById('canvasPhaseLabel');
  if (canvasLabel) canvasLabel.textContent = '—';
  document.getElementById('explanationContent').innerHTML = `<p>${t('welcomeText')}</p>`;
  document.getElementById('chromosomeGrid').innerHTML = '';
  document.getElementById('statSteps').textContent = '0';
  document.getElementById('statMutations').textContent = '0';
  document.getElementById('statCrossovers').textContent = '0';
  document.getElementById('statBestChrom').textContent = '—';
  document.getElementById('statBestValue').textContent = '—';

  document.querySelectorAll('.step-badge').forEach(b => {
    b.classList.remove('active', 'done');
  });
  document.querySelectorAll('.step-connector').forEach(c => {
    c.classList.remove('done');
  });

  visualizer.resize();
  const c = visualizer.getColors();
  [visualizer.mainCtx, visualizer.landscapeCtx, visualizer.populationCtx, visualizer.convergenceCtx].forEach(ctx => {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });
}

function highlightStep(phase) {
  const phases = ['init', 'evaluate', 'select', 'crossover', 'mutate', 'replace'];
  const idx = phases.indexOf(phase);

  document.querySelectorAll('.step-badge').forEach((badge, i) => {
    badge.classList.remove('active');
    if (i < idx) badge.classList.add('done');
    else if (i === idx) {
      badge.classList.add('active');
      badge.classList.remove('done');
    } else {
      badge.classList.remove('done');
    }
  });

  document.querySelectorAll('.step-connector').forEach((conn, i) => {
    conn.classList.toggle('done', i < idx);
  });
}

function updateExplanation(phase, data) {
  const label = document.getElementById('currentStepLabel');
  const content = document.getElementById('explanationContent');

  const phaseLabels = {
    init: t('stepInit'), evaluate: t('stepEvaluate'), select: t('stepSelect'),
    crossover: t('stepCrossover'), mutate: t('stepMutate'), replace: t('stepReplace'),
    done: t('reportConclusion')
  };

  label.textContent = phaseLabels[phase] || phase;
  const canvasLabel = document.getElementById('canvasPhaseLabel');
  if (canvasLabel) canvasLabel.textContent = phaseLabels[phase] || phase;

  let text = '';
  const cfg = ga ? ga.config : getConfig();

  switch (phase) {
    case 'init':
      text = t('explainInit', { pop: cfg.populationSize, len: cfg.chromosomeLength });
      break;
    case 'evaluate':
      text = t('explainEvaluate', {
        best: (data.best || 0).toFixed(4),
        avg: (data.avg || 0).toFixed(4)
      });
      break;
    case 'select':
      text = t('explainSelect', {
        count: data.parents?.length || cfg.populationSize,
        method: getSelectionMethodName(data.method || cfg.selectionMethod)
      });
      break;
    case 'crossover':
      text = t('explainCrossover', {
        rate: cfg.crossoverRate,
        count: data.crossoverCount || 0
      });
      break;
    case 'mutate':
      text = t('explainMutate', { rate: cfg.mutationRate });
      break;
    case 'replace':
      text = t('explainReplace', {
        gen: data.generation || ga?.generation || 0,
        best: data.best ? data.best.chromosome?.join('') || '—' : '—',
        fitness: (data.best?.fitness || data.best || 0).toFixed ? (data.best?.fitness || 0).toFixed(4) : String(data.best?.fitness || 0)
      });
      break;
    case 'done':
      text = t('explainDone', {
        gen: data.generation || ga?.generation || 0,
        fitness: (data.best?.fitness || ga?.bestEver?.fitness || 0).toFixed(4)
      });
      break;
  }

  content.innerHTML = `<p>${text}</p>`;
}

function updateUI(phase, data) {
  if (!ga) return;

  document.getElementById('genNumber').textContent = ga.generation;
  const best = ga.bestEver || ga.getBest();
  document.getElementById('bestFitness').textContent = best ? best.fitness.toFixed(4) : '—';
  document.getElementById('avgFitness').textContent = ga.population.length ? ga.getAverageFitness().toFixed(4) : '—';

  visualizer.renderAll(ga, phase, data);
}

function updateStats() {
  if (!ga) return;
  document.getElementById('statSteps').textContent = ga.stepIndex;
  document.getElementById('statMutations').textContent = ga.totalMutations;
  document.getElementById('statCrossovers').textContent = ga.totalCrossovers;
  if (ga.bestEver) {
    document.getElementById('statBestChrom').textContent = ga.bestEver.chromosome.join('');
    document.getElementById('statBestValue').textContent = ga.bestEver.decoded.toFixed(6);
  }
}

function toggleTheme() {
  const body = document.body;
  if (body.classList.contains('theme-light')) {
    body.classList.remove('theme-light');
    body.classList.add('theme-dark');
    localStorage.setItem('ga-theme', 'dark');
  } else {
    body.classList.remove('theme-dark');
    body.classList.add('theme-light');
    localStorage.setItem('ga-theme', 'light');
  }
  if (ga) {
    visualizer.renderAll(ga, ga.currentPhase, ga.phaseData || {});
  }
}

function loadTheme() {
  const saved = localStorage.getItem('ga-theme');
  if (saved === 'dark') {
    document.body.classList.remove('theme-light');
    document.body.classList.add('theme-dark');
  }
}
