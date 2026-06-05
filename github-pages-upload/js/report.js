function selectionMethodLabel(method, lang) {
  const map = {
    tournament: tWithLang('tournamentMethod', lang),
    roulette: tWithLang('rouletteMethod', lang),
    rank: tWithLang('rankMethod', lang)
  };
  return map[method] || method;
}

function buildReportBody(ga, lang) {
  const state = ga.getState();
  const tr = (key, vars = {}) => tWithLang(key, lang, vars);
  const date = new Date().toLocaleDateString(
    lang === 'ar' ? 'ar-SA' : lang === 'en' ? 'en-US' : 'fa-IR'
  );
  const dir = lang === 'ar' || lang === 'fa' ? 'rtl' : 'ltr';
  const phaseNames = {
    init: tr('stepInit'), evaluate: tr('stepEvaluate'), select: tr('stepSelect'),
    crossover: tr('stepCrossover'), mutate: tr('stepMutate'), replace: tr('stepReplace')
  };

  const stepsHtml = state.stepLog.map(step => `
    <tr>
      <td>${step.index}</td>
      <td>${phaseNames[step.phase] || step.phase}</td>
      <td>${step.generation}</td>
      <td>${JSON.stringify(step.data).substring(0, 120)}...</td>
    </tr>
  `).join('');

  const convergenceRows = state.convergenceData.map(d => `
    <tr><td>${d.gen}</td><td>${d.best.toFixed(6)}</td><td>${d.avg.toFixed(6)}</td></tr>
  `).join('');

  const body = `
  <h1>${tr('reportTitle')}</h1>
  <p class="header-meta">${tr('reportDate')}: ${date}</p>

  <h2>${tr('universityName')}</h2>
  <table class="params">
    <tr><td>${tr('studentLabel')}</td><td><strong>${tr('studentName')}</strong></td></tr>
    <tr><td>${tr('professorLabel')}</td><td><strong>${tr('professorName')}</strong></td></tr>
    <tr><td>${tr('courseLabel')}</td><td><strong>${tr('courseTitle')}</strong></td></tr>
    <tr><td>${tr('universityName')}</td><td><strong>Amirkabir University of Technology</strong></td></tr>
  </table>

  <h2>${tr('reportParams')}</h2>
  <table class="params">
    <tr><td>${tr('populationSize')}</td><td><strong>${state.config.populationSize}</strong></td></tr>
    <tr><td>${tr('chromosomeLength')}</td><td><strong>${state.config.chromosomeLength}</strong></td></tr>
    <tr><td>${tr('mutationRate')}</td><td><strong>${state.config.mutationRate}%</strong></td></tr>
    <tr><td>${tr('crossoverRate')}</td><td><strong>${state.config.crossoverRate}%</strong></td></tr>
    <tr><td>${tr('maxGenerations')}</td><td><strong>${state.config.maxGenerations}</strong></td></tr>
    <tr><td>${tr('selectionMethod')}</td><td><strong>${selectionMethodLabel(state.config.selectionMethod, lang)}</strong></td></tr>
    <tr><td>${tr('targetFunction')}</td><td><strong>${state.config.targetFunction}</strong></td></tr>
    <tr><td>${tr('generation')}</td><td><strong>${state.generation}</strong></td></tr>
  </table>

  <h2>${tr('statistics')}</h2>
  <table>
    <tr><th>${tr('totalSteps')}</th><td>${state.stepLog.length}</td></tr>
    <tr><th>${tr('mutationsCount')}</th><td>${state.totalMutations}</td></tr>
    <tr><th>${tr('crossoversCount')}</th><td>${state.totalCrossovers}</td></tr>
    <tr><th>${tr('bestFitness')}</th><td>${state.bestEver ? state.bestEver.fitness.toFixed(6) : '—'}</td></tr>
    <tr><th>${tr('bestChromosome')}</th><td><code>${state.bestEver ? state.bestEver.chromosome.join('') : '—'}</code></td></tr>
    <tr><th>${tr('bestValue')}</th><td>${state.bestEver ? state.bestEver.decoded.toFixed(6) : '—'}</td></tr>
  </table>

  <h2>${tr('convergenceChart')}</h2>
  <table>
    <tr><th>${tr('generation')}</th><th>${tr('bestFitness')}</th><th>${tr('avgFitness')}</th></tr>
    ${convergenceRows}
  </table>

  <h2>${tr('reportSteps')}</h2>
  <table>
    <tr><th>#</th><th>${tr('stepExplanation')}</th><th>${tr('generation')}</th><th>Data</th></tr>
    ${stepsHtml}
  </table>

  <div class="conclusion">
    <h2>${tr('reportConclusion')}</h2>
    <p>${tr('explainDone', { gen: state.generation, fitness: state.bestEver ? state.bestEver.fitness.toFixed(6) : '—' })}</p>
    <p>${tr('bestChromosome')}: <code>${state.bestEver ? state.bestEver.chromosome.join('') : '—'}</code></p>
    <p>${tr('bestValue')}: <strong>${state.bestEver ? state.bestEver.decoded.toFixed(6) : '—'}</strong></p>
  </div>`;

  return { body, date, dir, title: tr('reportTitle') };
}

function exportReportHTML(ga, reportLang) {
  const lang = reportLang || currentLang;
  const { body, date, dir, title } = buildReportBody(ga, lang);

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, sans-serif; max-width: 900px; margin: 2rem auto; padding: 0 1rem; color: #1a1d2e; line-height: 1.7; }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 0.5rem; }
    h2 { color: #7c3aed; margin-top: 2rem; }
    table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.9rem; }
    th, td { border: 1px solid #e2e6f0; padding: 0.5rem 0.75rem; text-align: start; }
    th { background: #eef1f8; font-weight: 600; }
    tr:nth-child(even) { background: #f8f9fc; }
    .params td { border: 1px solid #e2e6f0; padding: 0.5rem 0.75rem; }
    .conclusion { background: #ecfdf5; border-left: 4px solid #059669; padding: 1rem; margin-top: 1rem; }
    code { background: #eef1f8; padding: 0.15rem 0.4rem; font-size: 0.85rem; }
    .header-meta { color: #5a6178; font-size: 0.9rem; }
  </style>
</head>
<body>${body}</body>
</html>`;

  downloadFile(html, `GA_Report_${date.replace(/\//g, '-')}.html`, 'text/html');
}


function exportReportJSON(ga, reportLang) {
  const state = ga.getState();
  const lang = reportLang || currentLang;
  const tr = (key, vars) => tWithLang(key, lang, vars);
  const report = {
    title: tr('reportTitle'),
    date: new Date().toISOString(),
    language: lang,
    parameters: state.config,
    statistics: {
      totalSteps: state.stepLog.length,
      totalMutations: state.totalMutations,
      totalCrossovers: state.totalCrossovers,
      generations: state.generation,
      bestFitness: state.bestEver?.fitness,
      bestChromosome: state.bestEver?.chromosome,
      bestDecodedValue: state.bestEver?.decoded
    },
    convergence: state.convergenceData,
    stepLog: state.stepLog
  };

  downloadFile(JSON.stringify(report, null, 2), `GA_Report_${Date.now()}.json`, 'application/json');
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function captureCanvasDataURL(canvas) {
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}


let pendingReportFormat = null;

function openReportLangModal(format) {
  pendingReportFormat = format;
  const modal = document.getElementById('reportLangModal');
  if (!modal) {
    if (format === 'html' && ga) exportReportHTML(ga, currentLang);
    if (format === 'json' && ga) exportReportJSON(ga, currentLang);
    return;
  }
  modal.classList.remove('hidden');
  document.querySelectorAll('#reportLangModal [data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (translations[currentLang][key]) el.textContent = translations[currentLang][key];
  });
}

function closeReportLangModal() {
  pendingReportFormat = null;
  document.getElementById('reportLangModal')?.classList.add('hidden');
}

function exportReportWithLang(lang) {
  const format = pendingReportFormat;
  closeReportLangModal();
  if (!ga || !format) return;
  if (format === 'html') exportReportHTML(ga, lang);
  if (format === 'json') exportReportJSON(ga, lang);
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.report-lang-btn').forEach(btn => {
    btn.addEventListener('click', () => exportReportWithLang(btn.getAttribute('data-report-lang')));
  });
  document.getElementById('reportLangCancel')?.addEventListener('click', closeReportLangModal);
  document.getElementById('reportLangBackdrop')?.addEventListener('click', closeReportLangModal);
});
