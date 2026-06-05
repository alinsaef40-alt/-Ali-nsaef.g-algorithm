// ===== Fitness Functions =====
const FitnessFunctions = {
  sphere: (x) => -(Math.pow(x - 0.5, 2)),
  rastrigin: (x) => -(10 + 9 * Math.cos(2 * Math.PI * x * 10)),
  ackley: (x) => {
    const a = 20, b = 0.2, c = 2 * Math.PI;
    const xScaled = x * 10 - 5;
    return -( -a * Math.exp(-b * Math.sqrt(0.5 * xScaled * xScaled)) -
      Math.exp(0.5 * (Math.cos(c * xScaled) + Math.cos(c * xScaled * 0.5))) +
      a + Math.E );
  }
};

function decodeChromosome(chromosome) {
  let value = 0;
  for (let i = 0; i < chromosome.length; i++) {
    value += chromosome[i] * Math.pow(2, -(i + 1));
  }
  return value;
}

function encodeValue(value, length) {
  const chromosome = new Array(length).fill(0);
  for (let i = 0; i < length; i++) {
    const bit = Math.floor(value * Math.pow(2, i + 1)) % 2;
    chromosome[i] = bit;
  }
  return chromosome;
}

function randomChromosome(length) {
  return Array.from({ length }, () => Math.random() < 0.5 ? 1 : 0);
}

function chromosomeToString(chromosome) {
  return chromosome.map(b => b.toString()).join('');
}

// ===== Genetic Algorithm Engine =====
class GeneticAlgorithm {
  constructor(config) {
    this.config = { ...config };
    this.population = [];
    this.generation = 0;
    this.bestEver = null;
    this.history = [];
    this.stepLog = [];
    this.totalMutations = 0;
    this.totalCrossovers = 0;
    this.currentPhase = null;
    this.phaseData = {};
    this.convergenceData = [];
    this.isInitialized = false;
    this.isComplete = false;
    this.stepIndex = 0;
    this.phases = ['evaluate', 'select', 'crossover', 'mutate', 'replace'];
    this.currentPhaseIndex = 0;
    this.showInitOnly = true;
    this.pendingPopulation = null;
    this.selectedParents = [];
    this.offspring = [];
    this.mutationIndices = [];
  }

  get fitnessFn() {
    return FitnessFunctions[this.config.targetFunction] || FitnessFunctions.sphere;
  }

  calculateFitness(chromosome) {
    const x = decodeChromosome(chromosome);
    return this.fitnessFn(x);
  }

  initialize() {
    this.population = [];
    for (let i = 0; i < this.config.populationSize; i++) {
      const chromosome = randomChromosome(this.config.chromosomeLength);
      this.population.push({
        chromosome,
        fitness: this.calculateFitness(chromosome),
        decoded: decodeChromosome(chromosome)
      });
    }
    this.generation = 0;
    this.bestEver = this.getBest();
    this.history = [];
    this.stepLog = [];
    this.totalMutations = 0;
    this.totalCrossovers = 0;
    this.convergenceData = [{ gen: 0, best: this.bestEver.fitness, avg: this.getAverageFitness() }];
    this.isInitialized = true;
    this.isComplete = false;
    this.currentPhaseIndex = 0;
    this.showInitOnly = true;
    this.stepIndex = 0;

    this.logStep('init', {
      population: this.population.map(p => ({ ...p, chromosome: [...p.chromosome] })),
      generation: 0
    });
  }

  getBest() {
    return this.population.reduce((best, ind) =>
      ind.fitness > best.fitness ? ind : best, this.population[0]);
  }

  getAverageFitness() {
    const sum = this.population.reduce((s, ind) => s + ind.fitness, 0);
    return sum / this.population.length;
  }

  logStep(phase, data) {
    this.stepIndex++;
    this.stepLog.push({
      index: this.stepIndex,
      phase,
      generation: this.generation,
      timestamp: Date.now(),
      data: JSON.parse(JSON.stringify(data))
    });
  }

  nextStep() {
    if (!this.isInitialized) return null;
    if (this.isComplete) return { phase: 'done', data: {} };

    if (this.showInitOnly) {
      this.showInitOnly = false;
      this.currentPhase = 'init';
      return { phase: 'init', data: { population: this.population, generation: 0 } };
    }

    if (this.currentPhaseIndex >= this.phases.length) {
      this.currentPhaseIndex = 0;
    }

    const phase = this.phases[this.currentPhaseIndex];
    let result;

    switch (phase) {
      case 'evaluate':
        result = this._phaseEvaluate();
        break;
      case 'select':
        result = this._phaseSelect();
        break;
      case 'crossover':
        result = this._phaseCrossover();
        break;
      case 'mutate':
        result = this._phaseMutate();
        break;
      case 'replace':
        result = this._phaseReplace();
        break;
    }

    this.currentPhase = phase;
    this.currentPhaseIndex++;

    if (this.currentPhaseIndex >= this.phases.length) {
      this.currentPhaseIndex = 0;
      if (this.generation >= this.config.maxGenerations) {
        this.isComplete = true;
        return { phase: 'done', data: { generation: this.generation, best: this.bestEver } };
      }
    }

    return result;
  }

  _phaseEvaluate() {
    this.population.forEach(ind => {
      ind.fitness = this.calculateFitness(ind.chromosome);
      ind.decoded = decodeChromosome(ind.chromosome);
    });
    this.population.sort((a, b) => b.fitness - a.fitness);

    const best = this.getBest();
    const avg = this.getAverageFitness();
    if (!this.bestEver || best.fitness > this.bestEver.fitness) {
      this.bestEver = { ...best, chromosome: [...best.chromosome] };
    }

    this.logStep('evaluate', { best: best.fitness, avg, population: this.population.map(p => ({ fitness: p.fitness, decoded: p.decoded })) });
    return { phase: 'evaluate', data: { best: best.fitness, avg, population: this.population } };
  }

  _phaseSelect() {
    this.selectedParents = [];
    const count = this.config.populationSize;

    for (let i = 0; i < count; i++) {
      let selected;
      switch (this.config.selectionMethod) {
        case 'tournament':
          selected = this._tournamentSelect(3);
          break;
        case 'roulette':
          selected = this._rouletteSelect();
          break;
        case 'rank':
          selected = this._rankSelect();
          break;
        default:
          selected = this._tournamentSelect(3);
      }
      this.selectedParents.push({ ...selected, chromosome: [...selected.chromosome] });
    }

    this.logStep('select', {
      method: this.config.selectionMethod,
      count: this.selectedParents.length,
      selectedIndices: this.selectedParents.map((p, i) => this.population.indexOf(
        this.population.find(ind => ind.chromosome.join('') === p.chromosome.join(''))
      ))
    });

    return { phase: 'select', data: { parents: this.selectedParents, method: this.config.selectionMethod } };
  }

  _tournamentSelect(k) {
    let best = null;
    for (let i = 0; i < k; i++) {
      const idx = Math.floor(Math.random() * this.population.length);
      if (!best || this.population[idx].fitness > best.fitness) {
        best = this.population[idx];
      }
    }
    return best;
  }

  _rouletteSelect() {
    const minFit = Math.min(...this.population.map(p => p.fitness));
    const adjusted = this.population.map(p => p.fitness - minFit + 0.001);
    const total = adjusted.reduce((s, f) => s + f, 0);
    let rand = Math.random() * total;
    for (let i = 0; i < this.population.length; i++) {
      rand -= adjusted[i];
      if (rand <= 0) return this.population[i];
    }
    return this.population[this.population.length - 1];
  }

  _rankSelect() {
    const sorted = [...this.population].sort((a, b) => b.fitness - a.fitness);
    const n = sorted.length;
    const totalRank = (n * (n + 1)) / 2;
    let rand = Math.random() * totalRank;
    for (let i = 0; i < n; i++) {
      rand -= (n - i);
      if (rand <= 0) return sorted[i];
    }
    return sorted[0];
  }

  _phaseCrossover() {
    this.offspring = [];
    let crossoverCount = 0;

    for (let i = 0; i < this.selectedParents.length; i += 2) {
      const parent1 = this.selectedParents[i];
      const parent2 = this.selectedParents[Math.min(i + 1, this.selectedParents.length - 1)];

      let child1Chrom = [...parent1.chromosome];
      let child2Chrom = [...parent2.chromosome];
      let crossoverPoint = -1;

      if (Math.random() < this.config.crossoverRate / 100) {
        crossoverPoint = Math.floor(Math.random() * (this.config.chromosomeLength - 1)) + 1;
        child1Chrom = [
          ...parent1.chromosome.slice(0, crossoverPoint),
          ...parent2.chromosome.slice(crossoverPoint)
        ];
        child2Chrom = [
          ...parent2.chromosome.slice(0, crossoverPoint),
          ...parent1.chromosome.slice(crossoverPoint)
        ];
        crossoverCount++;
        this.totalCrossovers++;
      }

      this.offspring.push({
        chromosome: child1Chrom,
        fitness: 0,
        decoded: 0,
        parentIndices: [i, Math.min(i + 1, this.selectedParents.length - 1)],
        crossoverPoint
      });

      if (i + 1 < this.selectedParents.length) {
        this.offspring.push({
          chromosome: child2Chrom,
          fitness: 0,
          decoded: 0,
          parentIndices: [i, i + 1],
          crossoverPoint
        });
      }
    }

    while (this.offspring.length > this.config.populationSize) {
      this.offspring.pop();
    }

    this.logStep('crossover', { crossoverCount, rate: this.config.crossoverRate, offspring: this.offspring.length });
    return { phase: 'crossover', data: { offspring: this.offspring, crossoverCount, parents: this.selectedParents } };
  }

  _phaseMutate() {
    this.mutationIndices = [];
    let mutationCount = 0;

    this.offspring.forEach((ind, idx) => {
      const mutatedBits = [];
      for (let bit = 0; bit < ind.chromosome.length; bit++) {
        if (Math.random() < this.config.mutationRate / 100) {
          ind.chromosome[bit] = 1 - ind.chromosome[bit];
          mutatedBits.push(bit);
          mutationCount++;
          this.totalMutations++;
        }
      }
      if (mutatedBits.length > 0) {
        this.mutationIndices.push({ index: idx, bits: mutatedBits });
      }
      ind.fitness = this.calculateFitness(ind.chromosome);
      ind.decoded = decodeChromosome(ind.chromosome);
    });

    this.logStep('mutate', { mutationCount, rate: this.config.mutationRate, indices: this.mutationIndices });
    return { phase: 'mutate', data: { offspring: this.offspring, mutationIndices: this.mutationIndices, mutationCount } };
  }

  _phaseReplace() {
    this.population = this.offspring.slice(0, this.config.populationSize);
    this.generation++;

    const best = this.getBest();
    const avg = this.getAverageFitness();
    if (!this.bestEver || best.fitness > this.bestEver.fitness) {
      this.bestEver = { ...best, chromosome: [...best.chromosome] };
    }

    this.convergenceData.push({ gen: this.generation, best: best.fitness, avg });

    this.logStep('replace', {
      generation: this.generation,
      best: best.fitness,
      avg,
      bestChromosome: chromosomeToString(best.chromosome)
    });

    return { phase: 'replace', data: { population: this.population, generation: this.generation, best, avg } };
  }

  runFullGeneration() {
    const results = [];
    for (let i = 0; i < this.phases.length; i++) {
      const r = this.nextStep();
      if (r) results.push(r);
      if (this.isComplete) break;
    }
    return results;
  }

  getState() {
    return {
      population: this.population,
      generation: this.generation,
      bestEver: this.bestEver,
      convergenceData: this.convergenceData,
      stepLog: this.stepLog,
      totalMutations: this.totalMutations,
      totalCrossovers: this.totalCrossovers,
      isComplete: this.isComplete,
      currentPhase: this.currentPhase,
      config: this.config
    };
  }
}
