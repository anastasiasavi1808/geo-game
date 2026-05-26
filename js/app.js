/* ═══════════════════════════════════════════════════════
   GeoQuiz — Application Logic
   Navigation · Dynamic map loading · Zoom/Pan · Microstate markers
   ═══════════════════════════════════════════════════════ */

// ╔══════════════════════════════════════════════════════╗
// ║                   STATE                             ║
// ╚══════════════════════════════════════════════════════╝
const state = {
  nickname: '',
  continent: '',
  difficulty: '',
  // Game details
  countries: [],        // Playable country objects for the active round
  currentIndex: 0,      // Index of current target country
  correctCount: 0,
  totalAttempts: 0,
  errors: 0,
  currentQuestionAttempts: 0,
  startTime: null,
  timerInterval: null,
  elapsedSeconds: 0,
  gameActive: false,
  // Map transform (pan & zoom)
  zoomFactor: 1,
  panX: 0,
  panY: 0,
  isPanning: false,
  panStart: { x: 0, y: 0 },
  panMoved: false,
  // Navigation helper
  leaderboardFrom: 'welcome'
};

// ╔══════════════════════════════════════════════════════╗
// ║               INITIALIZATION                        ║
// ╚══════════════════════════════════════════════════════╝
document.addEventListener('DOMContentLoaded', async () => {
  initParticles();
  initNavigation();
  initGameControls();
  initLeaderboard();

  // Load Geographic Dataset
  try {
    await loadWorldData();
    // Hide overlay
    document.getElementById('loading-overlay').classList.add('hide');
    initContinentGrid();
    initDifficultyCards();
    showScreen('screen-welcome');
  } catch (err) {
    console.error(err);
    const loadingText = document.querySelector('.loading-text');
    if (loadingText) loadingText.textContent = 'Errore nel caricamento delle mappe.';
  }
});

// ╔══════════════════════════════════════════════════════╗
// ║            PARTICLE BACKGROUND                      ║
// ╚══════════════════════════════════════════════════════╝
function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let particles = [];
  const PARTICLE_COUNT = 50;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  class Particle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.vx = (Math.random() - 0.5) * 0.25;
      this.vy = (Math.random() - 0.5) * 0.25;
      this.r = Math.random() * 2 + 0.5;
      this.alpha = Math.random() * 0.3 + 0.1;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
      if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 212, 170, ${this.alpha})`;
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new Particle());
  }

  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0, 180, 216, ${0.06 * (1 - dist / 130)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => { p.update(); p.draw(); });
    drawLines();
    requestAnimationFrame(animate);
  }
  animate();
}

// ╔══════════════════════════════════════════════════════╗
// ║               NAVIGATION                           ║
// ╚══════════════════════════════════════════════════════╝
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) target.classList.add('active');
}

function initNavigation() {
  const input = document.getElementById('nickname-input');
  const btnStart = document.getElementById('btn-start');
  
  if (input && btnStart) {
    input.addEventListener('input', () => {
      btnStart.disabled = input.value.trim().length === 0;
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && input.value.trim()) {
        btnStart.click();
      }
    });

    btnStart.addEventListener('click', () => {
      state.nickname = input.value.trim();
      if (!state.nickname) return;
      showScreen('screen-continent');
    });
  }

  const btnLbHome = document.getElementById('btn-leaderboard-home');
  if (btnLbHome) {
    btnLbHome.addEventListener('click', () => {
      state.leaderboardFrom = 'welcome';
      renderLeaderboard();
      showScreen('screen-leaderboard');
    });
  }

  document.getElementById('btn-back-continent').addEventListener('click', () => {
    showScreen('screen-welcome');
  });

  document.getElementById('btn-back-difficulty').addEventListener('click', () => {
    showScreen('screen-continent');
  });

  document.getElementById('btn-back-game').addEventListener('click', () => {
    if (state.gameActive) {
      showConfirmDialog(
        'Uscire dal gioco?',
        'Tutti i tuoi progressi andranno persi.',
        () => { endGame(); showScreen('screen-continent'); }
      );
    } else {
      showScreen('screen-continent');
    }
  });

  document.getElementById('btn-back-leaderboard').addEventListener('click', () => {
    showScreen('screen-' + state.leaderboardFrom);
  });

  document.getElementById('btn-play-again').addEventListener('click', () => {
    showScreen('screen-difficulty');
  });

  document.getElementById('btn-results-leaderboard').addEventListener('click', () => {
    state.leaderboardFrom = 'results';
    renderLeaderboard();
    showScreen('screen-leaderboard');
  });

  document.getElementById('btn-results-home').addEventListener('click', () => {
    showScreen('screen-welcome');
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║           CONTINENT SELECTION                       ║
// ╚══════════════════════════════════════════════════════╝
function initContinentGrid() {
  const grid = document.getElementById('continent-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const order = ['europe', 'asia', 'africa', 'north-america', 'south-america', 'oceania', 'world'];

  order.forEach(key => {
    const conf = CONTINENTS[key];
    const cnt = getCountriesByContinent(key).length;
    const card = document.createElement('div');
    card.className = 'continent-card';
    card.style.setProperty('--card-color', conf.color);
    card.innerHTML = `
      <span class="continent-emoji">${conf.emoji}</span>
      <div class="continent-name">${conf.name}</div>
      <div class="continent-count">${cnt} paesi</div>
    `;
    card.addEventListener('click', () => {
      state.continent = key;
      updateDifficultyScreen();
      showScreen('screen-difficulty');
    });
    grid.appendChild(card);
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║           DIFFICULTY SELECTION                      ║
// ╚══════════════════════════════════════════════════════╝
function updateDifficultyScreen() {
  const conf = CONTINENTS[state.continent];
  const diffSubtitle = document.getElementById('difficulty-subtitle');
  if (diffSubtitle) {
    diffSubtitle.textContent = `${conf.emoji} ${conf.name}`;
  }
  
  ['easy', 'medium', 'hard'].forEach(level => {
    const list = getCountriesForGame(state.continent, level);
    const countEl = document.getElementById(`count-${level}`);
    if (countEl) countEl.textContent = `${list.length} paesi`;
  });
}

function initDifficultyCards() {
  document.querySelectorAll('.difficulty-card').forEach(card => {
    card.addEventListener('click', () => {
      state.difficulty = card.dataset.level;
      startGame();
    });
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║              GAME ENGINE                            ║
// ╚══════════════════════════════════════════════════════╝
function startGame() {
  const list = getCountriesForGame(state.continent, state.difficulty);
  state.countries = shuffleArray([...list]);
  state.currentIndex = 0;
  state.correctCount = 0;
  state.totalAttempts = 0;
  state.errors = 0;
  state.currentQuestionAttempts = 0;
  state.elapsedSeconds = 0;
  state.gameActive = true;

  // Mathematically calculate dynamic centering viewport bounds for zero distortion
  const view = getContinentViewport(state.continent);
  state.zoomFactor = view.zoom;
  state.panX = view.panX;
  state.panY = view.panY;


  // Clear found panel list
  const foundList = document.getElementById('found-list');
  const foundCount = document.getElementById('found-count');
  if (foundList) foundList.innerHTML = '';
  if (foundCount) foundCount.textContent = '0';

  renderMap();
  showScreen('screen-game');
  updateGameUI();
  showCurrentCountry();

  state.startTime = Date.now();
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(updateTimer, 1000);
}

function renderMap() {
  const svg = document.getElementById('game-map');
  if (!svg) return;
  svg.innerHTML = '';
  
  // Set internal canvas view bounds
  svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  svg.appendChild(defs);

  // ALWAYS map projection using standard world bounds for consistency
  const proj = createProjection('world');

  // 1. Generate dynamic SVG <pattern> tags for each country
  availableCountries.forEach(country => {
    if (!country.iso2) return;
    const lowerIso = country.iso2.toLowerCase();

    // Standard path pattern (userSpaceOnUse, sized to full canvas to prevent repetition)
    const bbox = getGeometryBBox(country.feature.geometry, proj);
    if (bbox) {
      const w = Math.max(1, bbox.width);
      const h = Math.max(1, bbox.height);

      const pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
      pattern.setAttribute('id', `flag-pattern-${country.id}`);
      pattern.setAttribute('patternUnits', 'userSpaceOnUse');
      pattern.setAttribute('x', 0);
      pattern.setAttribute('y', 0);
      pattern.setAttribute('width', SVG_W);
      pattern.setAttribute('height', SVG_H);

      const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      img.setAttribute('href', `https://flagcdn.com/${lowerIso}.svg`);
      img.setAttribute('x', bbox.x);
      img.setAttribute('y', bbox.y);
      img.setAttribute('width', w);
      img.setAttribute('height', h);
      img.setAttribute('preserveAspectRatio', 'xMidYMid slice');

      pattern.appendChild(img);
      defs.appendChild(pattern);
    }

    // Microstate circle pattern (objectBoundingBox)
    const microPattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
    microPattern.setAttribute('id', `flag-pattern-micro-${country.id}`);
    microPattern.setAttribute('width', '1');
    microPattern.setAttribute('height', '1');
    microPattern.setAttribute('patternContentUnits', 'objectBoundingBox');

    const microImg = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    microImg.setAttribute('href', `https://flagcdn.com/${lowerIso}.svg`);
    microImg.setAttribute('x', '0');
    microImg.setAttribute('y', '0');
    microImg.setAttribute('width', '1');
    microImg.setAttribute('height', '1');
    microImg.setAttribute('preserveAspectRatio', 'xMidYMid slice');

    microPattern.appendChild(microImg);
    defs.appendChild(microPattern);
  });

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.id = 'map-view-group';
  svg.appendChild(g);

  // Background ocean
  const ocean = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  ocean.setAttribute('x', -SVG_W * 3);
  ocean.setAttribute('y', -SVG_H * 3);
  ocean.setAttribute('width', SVG_W * 7);
  ocean.setAttribute('height', SVG_H * 7);
  ocean.setAttribute('class', 'map-ocean');
  g.appendChild(ocean);

  const activeIds = new Set(state.countries.map(c => c.id));
  const foundIds = new Set(state.countries.slice(0, state.currentIndex).map(c => c.id));
  
  // 2. Render EVERY country feature from the GeoJSON dataset
  allFeatures.forEach(feature => {
    const numericId = Number(feature.id);
    const country = countryMap[numericId];
    
    // Filter rendering to only show the active quiz continent (or all if 'world')
    if (state.continent !== 'world') {
      if (!country || country.continent !== state.continent) {
        return; // Skip rendering
      }
    }

    const pathD = geometryToPath(feature.geometry, proj);
    if (!pathD) return;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('id', `country-${numericId}`);
    path.setAttribute('data-id', numericId);

    if (country && country.iso2) {
      if (activeIds.has(country.id)) {
        if (foundIds.has(country.id)) {
          path.setAttribute('fill', `url(#flag-pattern-${country.id})`);
          path.setAttribute('class', 'country-path playable found');
        } else {
          path.setAttribute('fill', 'var(--map-land-playable)');
          path.setAttribute('class', 'country-path playable');
        }
      } else {
        path.setAttribute('fill', '#0d101b');
        path.setAttribute('class', 'country-path inactive');
      }
    } else {
      path.setAttribute('fill', '#141824');
      path.setAttribute('class', 'country-path inactive');
    }

    g.appendChild(path);
  });

  // 3. Render Microstate Circle Marker Overlays (Clickable at any zoom)
  availableCountries.forEach(country => {
    if (!MICROSTATE_IDS.includes(country.id)) return;

    // Filter circle markers to only show active quiz continent
    if (state.continent !== 'world') {
      if (country.continent !== state.continent) {
        return; // Skip rendering
      }
    }

    const coords = MICROSTATE_COORDS[country.id] || (country.feature.geometry.type === 'Point' ? country.feature.geometry.coordinates : null);
    if (!coords) return;

    const [cx, cy] = proj(coords);

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', cx);
    circle.setAttribute('cy', cy);
    circle.setAttribute('r', 5); // Base starting radius
    circle.setAttribute('id', `micro-marker-${country.id}`);
    circle.setAttribute('data-id', country.id);

    if (activeIds.has(country.id)) {
      if (foundIds.has(country.id)) {
        circle.setAttribute('fill', `url(#flag-pattern-micro-${country.id})`);
        circle.setAttribute('class', 'microstate-marker found');
      } else {
        circle.setAttribute('fill', 'var(--map-land-playable)');
        circle.setAttribute('class', 'microstate-marker');
      }
    } else {
      circle.setAttribute('fill', '#1b2234');
      circle.setAttribute('class', 'microstate-marker inactive');
    }

    g.appendChild(circle);
  });

  applyTransform();
  svg.addEventListener('click', handleMapClick);
}



function handleMapClick(e) {
  if (!state.gameActive) return;

  const target = e.target.closest('.country-path, .microstate-marker');
  if (!target) return;

  if (target.classList.contains('found') || target.classList.contains('inactive')) return;

  const clickedId = Number(target.dataset.id);
  const targetCountry = state.countries[state.currentIndex];

  state.totalAttempts++;

  if (clickedId === targetCountry.id) {
    state.currentQuestionAttempts = 0;
    handleCorrectAnswer(clickedId, targetCountry);
  } else {
    state.currentQuestionAttempts++;
    handleWrongAnswer(target);
    
    // After 3 failed attempts, reveal the correct country with blink effect
    if (state.currentQuestionAttempts >= 3) {
      setTimeout(() => revealCorrectCountry(targetCountry), 700);
    }
  }

  updateGameUI();
}

function handleCorrectAnswer(countryId, country) {
  state.correctCount++;

  // Visually highlight path AND microstate marker if it exists
  const path = document.getElementById(`country-${countryId}`);
  const marker = document.getElementById(`micro-marker-${countryId}`);

  if (path) {
    path.classList.add('found', 'correct-flash');
    path.setAttribute('fill', `url(#flag-pattern-${countryId})`);
  }
  if (marker) {
    marker.classList.add('found');
    marker.setAttribute('fill', `url(#flag-pattern-micro-${countryId})`);
  }
  
  // Build and inject text label on map
  const proj = createProjection('world');
  const centroid = geometryCentroid(country.feature.geometry, proj);
  const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  label.setAttribute('x', centroid[0]);
  label.setAttribute('y', centroid[1]);
  label.setAttribute('class', 'country-label visible');
  label.style.fontSize = `${Math.max(3.5, 8 / state.zoomFactor)}px`;
  label.textContent = country.nameIt;
  
  const g = document.getElementById('map-view-group');
  if (g) g.appendChild(label);

  // Add dynamically to found sidebar
  addToFoundPanel(country);

  // Rich prompt feedback with HUGE animated real flag SVG image
  showFeedbackHTML(`
    <div class="feedback-body">
      <div class="feedback-header">Hai indovinato:</div>
      <div class="feedback-title-text">${country.nameIt}</div>
      <img class="feedback-flag-large-img" src="https://flagcdn.com/${country.iso2.toLowerCase()}.svg" alt="Bandiera ${country.nameIt}">
    </div>
  `, 'success');

  state.currentIndex++;
  if (state.currentIndex >= state.countries.length) {
    setTimeout(finishGame, 1000);
  } else {
    showCurrentCountry();
  }
}

function handleWrongAnswer(target) {
  state.errors++;
  target.classList.add('error-flash');
  
  const container = document.getElementById('map-container');
  if (container) container.classList.add('shake');

  const clickedMeta = getCountryMeta(target.dataset.id);
  if (clickedMeta && clickedMeta.iso2) {
    showFeedbackHTML(`
      <div class="feedback-body">
        <div class="feedback-header">Sbagliato! Quello è:</div>
        <div class="feedback-title-text">${clickedMeta.nameIt}</div>
        <img class="feedback-flag-large-img" src="https://flagcdn.com/${clickedMeta.iso2.toLowerCase()}.svg" alt="Bandiera ${clickedMeta.nameIt}">
      </div>
    `, 'error');
  } else {
    showFeedbackHTML(`
      <div class="feedback-body">
        <div class="feedback-header">Sbagliato!</div>
        <div class="feedback-title-text">Territorio non attivo</div>
      </div>
    `, 'error');
  }

  setTimeout(() => {
    target.classList.remove('error-flash');
    if (container) container.classList.remove('shake');
  }, 600);
}

function revealCorrectCountry(country) {
  const countryId = country.id;
  const path = document.getElementById(`country-${countryId}`);
  const marker = document.getElementById(`micro-marker-${countryId}`);

  // Add blink class to the correct element
  if (path) {
    path.classList.add('blink-reveal');
  }
  if (marker) {
    marker.classList.add('blink-reveal');
  }

  showFeedbackHTML(`
    <div class="feedback-body">
      <div class="feedback-header">Era qui! Il Paese era:</div>
      <div class="feedback-title-text">${country.nameIt}</div>
      <img class="feedback-flag-large-img" src="https://flagcdn.com/${country.iso2.toLowerCase()}.svg" alt="Bandiera ${country.nameIt}">
    </div>
  `, 'error');

  // After the blink, reveal with flag and move on
  setTimeout(() => {
    state.currentQuestionAttempts = 0;
    // Mark as found visually but don't count as correct
    if (path) {
      path.classList.remove('blink-reveal');
      path.classList.add('found');
      path.setAttribute('fill', `url(#flag-pattern-${countryId})`);
    }
    if (marker) {
      marker.classList.remove('blink-reveal');
      marker.classList.add('found');
      marker.setAttribute('fill', `url(#flag-pattern-micro-${countryId})`);
    }

    // Add label on map
    const proj = createProjection('world');
    const centroid = geometryCentroid(country.feature.geometry, proj);
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', centroid[0]);
    label.setAttribute('y', centroid[1]);
    label.setAttribute('class', 'country-label visible');
    label.style.fontSize = `${Math.max(3.5, 8 / state.zoomFactor)}px`;
    label.textContent = country.nameIt;
    const g = document.getElementById('map-view-group');
    if (g) g.appendChild(label);

    // Move to next country
    state.currentIndex++;
    if (state.currentIndex >= state.countries.length) {
      setTimeout(finishGame, 1000);
    } else {
      showCurrentCountry();
    }
    updateGameUI();
  }, 1800);
}


function addToFoundPanel(country) {
  const list = document.getElementById('found-list');
  const countEl = document.getElementById('found-count');
  if (!list) return;

  const item = document.createElement('div');
  item.className = 'found-item';
  item.innerHTML = `
    <span class="found-item-flag">${country.flag}</span>
    <span class="found-item-name">${country.nameIt}</span>
  `;
  // Prepend to top
  list.insertBefore(item, list.firstChild);
  if (countEl) countEl.textContent = state.correctCount;
}

function showCurrentCountry() {
  if (state.currentIndex >= state.countries.length) return;
  state.currentQuestionAttempts = 0;
  const country = state.countries[state.currentIndex];
  const el = document.getElementById('game-country-name');
  if (el) {
    el.textContent = country.nameIt;
    
    // Spark animation on target change
    el.classList.remove('scale-in');
    void el.offsetWidth;
    el.classList.add('scale-in');
  }
}

function updateGameUI() {
  const accuracy = state.totalAttempts > 0
    ? Math.round((state.correctCount / state.totalAttempts) * 100)
    : 100;
  
  const accuracyEl = document.getElementById('game-accuracy');
  if (accuracyEl) accuracyEl.textContent = `${accuracy}%`;

  const total = state.countries.length;
  const progressEl = document.getElementById('game-progress');
  if (progressEl) progressEl.textContent = `${state.currentIndex}/${total}`;

  const pct = total > 0 ? (state.currentIndex / total) * 100 : 0;
  const progressBar = document.getElementById('game-progress-bar');
  if (progressBar) progressBar.style.width = `${pct}%`;
}

function updateTimer() {
  if (!state.gameActive) return;
  state.elapsedSeconds = Math.floor((Date.now() - state.startTime) / 1000);
  const timerEl = document.getElementById('game-timer');
  if (timerEl) timerEl.textContent = formatTime(state.elapsedSeconds);
}

function finishGame() {
  endGame();

  const accuracy = state.totalAttempts > 0
    ? Math.round((state.correctCount / state.totalAttempts) * 100)
    : 100;

  saveToLeaderboard({
    nickname: state.nickname,
    continent: state.continent,
    difficulty: state.difficulty,
    time: state.elapsedSeconds,
    accuracy: accuracy,
    countries: state.countries.length,
    errors: state.errors,
    date: new Date().toISOString()
  });

  showResults(accuracy);
}

function endGame() {
  state.gameActive = false;
  if (state.timerInterval) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
  const svg = document.getElementById('game-map');
  if (svg) svg.removeEventListener('click', handleMapClick);
}

function showResults(accuracy) {
  const conf = CONTINENTS[state.continent];
  const difficulties = { easy: 'Facile', medium: 'Medio', hard: 'Difficile' };

  let icon = '🏆', title = 'Incredibile!', subtitle = 'Mappa completata!';
  if (accuracy < 100) { icon = '🌟'; title = 'Ben fatto!'; subtitle = 'Grande prestazione geografica!'; }
  if (accuracy < 80)  { icon = '👍'; title = 'Buon lavoro!'; subtitle = 'Puoi perfezionarti!'; }
  if (accuracy < 60)  { icon = '💪'; title = 'Continua così!'; subtitle = 'Un altro po\' di allenamento!'; }
  if (accuracy < 40)  { icon = '📚'; title = 'Non mollare!'; subtitle = 'Impara le posizioni e riprova!'; }

  document.getElementById('results-icon').textContent = icon;
  document.getElementById('results-title').textContent = title;
  document.getElementById('results-subtitle').textContent = subtitle;

  document.getElementById('result-continent').textContent = `${conf.emoji} ${conf.name}`;
  document.getElementById('result-level').textContent = difficulties[state.difficulty];
  document.getElementById('result-time').textContent = formatTime(state.elapsedSeconds);
  document.getElementById('result-accuracy').textContent = `${accuracy}%`;
  document.getElementById('result-found').textContent = `${state.correctCount}/${state.countries.length}`;
  document.getElementById('result-errors').textContent = state.errors;

  showScreen('screen-results');
}

// ╔══════════════════════════════════════════════════════╗
// ║            GAME CONTROLS (PAN & ZOOM)               ║
// ╚══════════════════════════════════════════════════════╝
function initGameControls() {
  // Wire up topbar zoom buttons
  document.getElementById('btn-zoom-in').addEventListener('click', () => zoomMap(0.7));
  document.getElementById('btn-zoom-out').addEventListener('click', () => zoomMap(1.45));
  document.getElementById('btn-zoom-reset').addEventListener('click', resetMapTransform);

  // Wire up floating map overlay zoom buttons
  document.getElementById('btn-map-zoom-in').addEventListener('click', () => zoomMap(0.7));
  document.getElementById('btn-map-zoom-out').addEventListener('click', () => zoomMap(1.45));
  document.getElementById('btn-map-zoom-reset').addEventListener('click', resetMapTransform);


  const container = document.getElementById('map-container');
  if (container) {
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      zoomMap(e.deltaY > 0 ? 1.15 : 0.85);
    }, { passive: false });
  }

  const svg = document.getElementById('game-map');
  if (!svg) return;

  svg.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    state.isPanning = true;
    state.panMoved = false;
    state.panStart = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener('mousemove', (e) => {
    if (!state.isPanning) return;
    const dx = e.clientX - state.panStart.x;
    const dy = e.clientY - state.panStart.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      state.panMoved = true;
    }
    if (state.panMoved) {
      state.panX += dx;
      state.panY += dy;
      state.panStart = { x: e.clientX, y: e.clientY };
      applyTransform();
    }
  });

  window.addEventListener('mouseup', () => {
    state.isPanning = false;
  });

  svg.addEventListener('click', (e) => {
    if (state.panMoved) {
      e.stopImmediatePropagation();
      state.panMoved = false;
    }
  }, true);

  // Touch Support (Pinch-to-zoom & smooth swipe panning)
  let touchDist = 0;
  let touchStartPoint = null;

  svg.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      state.panMoved = false;
    } else if (e.touches.length === 2) {
      touchDist = getDist(e.touches);
    }
  }, { passive: true });

  svg.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && touchStartPoint) {
      const dx = e.touches[0].clientX - touchStartPoint.x;
      const dy = e.touches[0].clientY - touchStartPoint.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        state.panMoved = true;
        e.preventDefault();
        state.panX += dx;
        state.panY += dy;
        touchStartPoint = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        applyTransform();
      }
    } else if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getDist(e.touches);
      if (dist > 10) {
        zoomMap(touchDist / dist);
        touchDist = dist;
      }
    }
  }, { passive: false });

  svg.addEventListener('touchend', () => {
    touchStartPoint = null;
  });
}

function getDist(touches) {
  return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
}

function zoomMap(factor) {
  const oldZoom = state.zoomFactor;
  // Dynamic scaling bounds up to 20x for microstate selection ease!
  state.zoomFactor = Math.max(0.6, Math.min(20, state.zoomFactor / factor));
  
  // Center Zoom Adjustments
  const ratio = state.zoomFactor / oldZoom;
  state.panX = SVG_W / 2 - (SVG_W / 2 - state.panX) * ratio;
  state.panY = SVG_H / 2 - (SVG_H / 2 - state.panY) * ratio;

  applyTransform();
}

function getContinentViewport(key) {
  const conf = CONTINENTS[key];
  if (!conf) return { zoom: 1, panX: 0, panY: 0 };
  if (key === 'world') return { zoom: 1, panX: 0, panY: 0 };

  const proj = createProjection('world');
  const b = conf.bounds;
  
  // Project corners of continent bounds
  const [x1, y1] = proj([b.minLon, b.maxLat]); // Top-left
  const [x2, y2] = proj([b.maxLon, b.minLat]); // Bottom-right
  
  const cW = Math.abs(x2 - x1);
  const cH = Math.abs(y2 - y1);
  
  const cX = (x1 + x2) / 2;
  const cY = (y1 + y2) / 2;
  
  // Fit with 18% padding
  let zoom = Math.min((SVG_W * 0.82) / cW, (SVG_H * 0.82) / cH);
  zoom = Math.round(Math.max(1.0, Math.min(8, zoom)) * 10) / 10;
  
  const panX = Math.round(SVG_W / 2 - cX * zoom);
  const panY = Math.round(SVG_H / 2 - cY * zoom);
  
  return { zoom, panX, panY };
}

function resetMapTransform() {
  // Mathematically calculate dynamic centering viewport bounds for zero distortion
  const view = getContinentViewport(state.continent);
  state.zoomFactor = view.zoom;
  state.panX = view.panX;
  state.panY = view.panY;
  applyTransform();
}


// ╔══════════════════════════════════════════════════════╗
// ║      APPLY TRANSLATE & COMPENSATED SCALE             ║
// ╚══════════════════════════════════════════════════════╝
function applyTransform() {
  const g = document.getElementById('map-view-group');
  if (!g) return;

  // Apply SVG transformations
  g.setAttribute('transform', `translate(${state.panX}, ${state.panY}) scale(${state.zoomFactor})`);

  // DYNAMICALLY adjust microstate circle overlay sizes & label fonts
  // Prevents markers from scaling up/down to keep them comfortably clickable!
  const markers = document.querySelectorAll('.microstate-marker');
  markers.forEach(m => {
    const defaultRadius = 5;
    const rScaled = Math.max(1.5, defaultRadius / state.zoomFactor);
    const strokeScaled = Math.max(0.3, 0.8 / state.zoomFactor);
    m.setAttribute('r', rScaled);
    m.style.strokeWidth = strokeScaled;
  });

  const labels = document.querySelectorAll('.country-label');
  labels.forEach(l => {
    const fontScaled = Math.max(3.5, 8 / state.zoomFactor);
    l.style.fontSize = `${fontScaled}px`;
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║               FEEDBACK TOASTS                       ║
// ╚══════════════════════════════════════════════════════╝
let toastTimeout = null;
function showFeedbackHTML(htmlContent, type) {
  const toast = document.getElementById('feedback-toast');
  if (!toast) return;

  clearTimeout(toastTimeout);
  toast.classList.remove('show', 'success', 'error');

  toast.innerHTML = htmlContent;
  toast.classList.add(type);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 1800);
}

// ╔══════════════════════════════════════════════════════╗
// ║              LEADERBOARD SYSTEM                     ║
// ╚══════════════════════════════════════════════════════╝
const STORAGE_KEY = 'geoquiz_leaderboard_data';

function getLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveToLeaderboard(entry) {
  const lb = getLeaderboard();
  lb.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lb));
}

function clearLeaderboard() {
  localStorage.removeItem(STORAGE_KEY);
  renderLeaderboard();
}

function initLeaderboard() {
  const fContinent = document.getElementById('filter-continent');
  const fLevel = document.getElementById('filter-level');
  if (fContinent) fContinent.addEventListener('change', renderLeaderboard);
  if (fLevel) fLevel.addEventListener('change', renderLeaderboard);

  const btnClear = document.getElementById('btn-clear-leaderboard');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      showConfirmDialog(
        'Cancellare i record?',
        'Tutti i punteggi salvati verranno eliminati definitivamente.',
        clearLeaderboard
      );
    });
  }
}

function renderLeaderboard() {
  const list = getLeaderboard();
  const continentVal = document.getElementById('filter-continent').value;
  const diffVal = document.getElementById('filter-level').value;

  let filtered = list;
  if (continentVal !== 'all') {
    filtered = filtered.filter(x => x.continent === continentVal);
  }
  if (diffVal !== 'all') {
    filtered = filtered.filter(x => x.difficulty === diffVal);
  }

  // Rank sorting: Accuracy descending, then time ascending
  filtered.sort((a, b) => {
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return a.time - b.time;
  });

  const tbody = document.getElementById('leaderboard-body');
  const empty = document.getElementById('leaderboard-empty');
  const tbl = document.getElementById('leaderboard-table');

  if (!tbody || !empty || !tbl) return;

  if (filtered.length === 0) {
    tbl.style.display = 'none';
    empty.style.display = 'block';
    return;
  }

  tbl.style.display = 'table';
  empty.style.display = 'none';

  const diffNames = { easy: 'Facile', medium: 'Medio', hard: 'Difficile' };

  tbody.innerHTML = filtered.map((e, idx) => {
    const cConf = CONTINENTS[e.continent] || { emoji: '🌐', name: e.continent };
    const dateStr = new Date(e.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
    const rank = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1);
    const color = e.accuracy >= 90 ? 'var(--success)' : e.accuracy >= 70 ? 'var(--warning)' : 'var(--error)';

    return `
      <tr>
        <td class="rank-cell">${rank}</td>
        <td>${escapeHtml(e.nickname)}</td>
        <td>${cConf.emoji} ${cConf.name}</td>
        <td>${diffNames[e.difficulty] || e.difficulty}</td>
        <td class="accuracy-cell" style="color: ${color}">${e.accuracy}%</td>
        <td>${formatTime(e.time)}</td>
        <td>${dateStr}</td>
      </tr>
    `;
  }).join('');
}

// ╔══════════════════════════════════════════════════════╗
// ║              CONFIRM DIALOG                         ║
// ╚══════════════════════════════════════════════════════╝
function showConfirmDialog(title, message, callback) {
  const overlay = document.createElement('div');
  overlay.className = 'dialog-overlay';
  overlay.innerHTML = `
    <div class="dialog-box">
      <h3>${title}</h3>
      <p>${message}</p>
      <div class="dialog-actions">
        <button class="btn btn-ghost dialog-cancel">Annulla</button>
        <button class="btn btn-primary dialog-confirm">Conferma</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));

  const close = () => {
    overlay.classList.remove('show');
    setTimeout(() => overlay.remove(), 300);
  };

  overlay.querySelector('.dialog-cancel').addEventListener('click', close);
  overlay.querySelector('.dialog-confirm').addEventListener('click', () => {
    close();
    callback();
  });
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
}

// ╔══════════════════════════════════════════════════════╗
// ║               UTILITIES                             ║
// ╚══════════════════════════════════════════════════════╝
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
