/* ==========================================================================
   CONFIG & STATE
   ========================================================================== */
const TMDB_API_KEY = "9195b41a09f0984bb9dfaa939dd2b796";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE_URL = "https://image.tmdb.org/t/p/original";
const POSTER_BASE_URL = "https://image.tmdb.org/t/p/w500";

let currentItem = null;

function readStoredList(key) {
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(stored) ? stored : [];
  } catch (error) {
    console.warn(`Unable to read saved data for ${key}:`, error);
    return [];
  }
}

let watchlist = readStoredList('fixoracine_watchlist');
let continueWatchingList = readStoredList('fixoracine_continue_watching');
let itemsCache = {};
let activeGenreId = null;
let genrePage = 1;
let genreItems = [];

// Restore persisted items into the cache so My List and Continue Watching
// remain usable after a page refresh.
[...watchlist, ...continueWatchingList].forEach(item => {
  if (item && item.id != null) itemsCache[item.id] = item;
});

/* ==========================================================================
   DOM ELEMENTS
   ========================================================================== */
const navbar = document.getElementById('navbar');
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const navLinks = document.getElementById('nav-links');

const heroBanner = document.getElementById('hero-banner');
const heroTitle = document.getElementById('hero-title');
const heroRating = document.getElementById('hero-rating');
const heroMatch = document.getElementById('hero-match');
const heroQuality = document.getElementById('hero-quality');
const heroYear = document.getElementById('hero-year');
const heroType = document.getElementById('hero-type');
const heroOverview = document.getElementById('hero-overview');
const heroPlayBtn = document.getElementById('hero-play-btn');
const heroListBtn = document.getElementById('hero-list-btn');

const genreSelectHeader = document.getElementById('genre-select-header');
const searchInput = document.getElementById('search-input');
const searchPredictions = document.getElementById('search-predictions');

const sectionContinue = document.getElementById('section-continue');
const continueCarousel = document.getElementById('continue-carousel');
const trendingCarousel = document.getElementById('trending-carousel');
const moviesCarousel = document.getElementById('movies-carousel');
const tvCarousel = document.getElementById('tv-carousel');
const loadMoreGenreBtn = document.getElementById('load-more-genre-btn');

// Detail Modal
const detailOverlay = document.getElementById('detail-modal-overlay');
const closeDetailBtn = document.getElementById('close-detail-modal');
const detailHero = document.getElementById('detail-hero');
const detailTitle = document.getElementById('detail-title');
const detailRating = document.getElementById('detail-rating');
const detailMatch = document.getElementById('detail-match');
const detailYear = document.getElementById('detail-year');
const detailQuality = document.getElementById('detail-quality');
const detailDuration = document.getElementById('detail-duration');
const detailOverview = document.getElementById('detail-overview');
const detailGenres = document.getElementById('detail-genres');
const detailPlayBtn = document.getElementById('detail-play-btn');
const detailListBtn = document.getElementById('detail-list-btn');

const tvEpisodesSection = document.getElementById('tv-episodes-section');
const modalSeasonPicker = document.getElementById('modal-season-picker');
const episodesList = document.getElementById('episodes-list');

const similarGrid = document.getElementById('similar-grid');

// Player Modal
const playerOverlay = document.getElementById('player-modal-overlay');
const closePlayerBtn = document.getElementById('close-player-modal');
const modalMovieTitle = document.getElementById('modal-movie-title');
const videoIframe = document.getElementById('video-iframe');
const serverSelect = document.getElementById('server-select');
const tvControls = document.getElementById('tv-controls');
const seasonSelect = document.getElementById('season-select');
const episodeSelect = document.getElementById('episode-select');

/* ==========================================================================
   MOBILE NAVIGATION MENU TOGGLE
   ========================================================================== */
if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
  });
}

function closeMobileMenu() {
  if (navLinks.classList.contains('active')) {
    navLinks.classList.remove('active');
  }
}

/* ==========================================================================
   DYNAMIC QUALITY ESTIMATION LOGIC
   ========================================================================== */
function getDynamicQuality(releaseDate, mediaType) {
  if (mediaType === 'tv') return 'HD';
  if (!releaseDate) return 'HD';

  const release = new Date(releaseDate);
  const now = new Date();
  const diffInDays = Math.floor((now - release) / (1000 * 60 * 60 * 24));

  if (diffInDays < 0) return 'CAM';         // Upcoming / Unreleased theatrical
  if (diffInDays <= 45) return 'CAM';        // Currently in theaters
  if (diffInDays <= 90) return 'TS';         // Early release / Telesync
  if (diffInDays <= 180) return 'HD';        // Digital Web-DL release
  return '4K UHD';                           // Older catalog / Physical 4K UHD
}

function getQualityCssClass(qualityTag) {
  switch (qualityTag) {
    case 'CAM': return 'quality-cam';
    case 'TS': return 'quality-ts';
    case '4K UHD': return 'quality-4k';
    default: return 'quality-hd';
  }
}

function iconSvg(name, size = 16) {
  const paths = {
    star: '<path d="m12 3 2.78 5.63 6.22.9-4.5 4.38 1.06 6.2L12 17.18 6.44 20.1l1.06-6.2L3 9.53l6.22-.9L12 3Z"/>',
    play: '<path d="m8 5 11 7-11 7V5Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    heart: '<path d="M20.84 8.61a5.5 5.5 0 0 0-7.78 0L12 9.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    x: '<path d="m6 6 12 12M18 6 6 18"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    flame: '<path d="M12 21c4.2 0 7-2.8 7-6.5 0-2.5-1.25-4.55-3.3-6.3.12 1.7-.42 2.8-1.7 3.7.1-3.8-1.7-6.35-4.3-8.9.15 3.1-2.7 5.3-3.7 8.25C4.8 15 6.95 21 12 21Z"/>',
    film: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5v14M16 5v14M4 9h4M16 9h4M4 15h4M16 15h4"/>',
    tv: '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="m8 2 4 3 4-3"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z"/>',
    bookmark: '<path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18l-6-3-6 3V4Z"/>',
    check: '<path d="m5 12 4.2 4.2L19 6.5"/>',
    pin: '<path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/>',
    tvPlay: '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="m10 9 5 2.5-5 2.5V9Z"/>'
  };
  return `<svg class="ui-icon ui-icon-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.compass}</svg>`;
}

/* ==========================================================================
   TMDB API FETCHERS & FORMATTING
   ========================================================================== */
async function fetchFromTMDB(endpoint) {
  try {
    const separator = endpoint.includes('?') ? '&' : '?';
    const response = await fetch(`${BASE_URL}${endpoint}${separator}api_key=${TMDB_API_KEY}&language=en-US`);
    if (!response.ok) {
      throw new Error(`TMDB request failed with status ${response.status}`);
    }
    const data = await response.json();
    return data.results || data;
  } catch (error) {
    console.error("TMDB Fetch Error:", error);
    return [];
  }
}

function formatItem(rawItem, forceType = null) {
  const type = forceType || rawItem.media_type || (rawItem.first_air_date ? 'tv' : 'movie');
  const title = rawItem.title || rawItem.name || 'Untitled';
  const date = rawItem.release_date || rawItem.first_air_date || '';
  const year = date ? date.split('-')[0] : 'N/A';
  
  // Real TMDB Ratings
  const ratingNum = rawItem.vote_average ? rawItem.vote_average.toFixed(1) : 'NR';
  const matchScore = rawItem.vote_average ? Math.min(Math.round(rawItem.vote_average * 10), 99) : 80;

  // Real Dynamic Quality Tag
  const quality = getDynamicQuality(date, type);

  const formatted = {
    id: rawItem.id,
    title: title,
    type: type,
    rating: ratingNum,
    matchScore: matchScore,
    year: year,
    quality: quality,
    duration: type === 'tv' ? '1 Season' : '2h 12m',
    poster: rawItem.backdrop_path ? `${POSTER_BASE_URL}${rawItem.backdrop_path}` : (rawItem.poster_path ? `${POSTER_BASE_URL}${rawItem.poster_path}` : 'https://via.placeholder.com/500x281?text=No+Image'),
    backdrop: rawItem.backdrop_path ? `${IMG_BASE_URL}${rawItem.backdrop_path}` : 'https://via.placeholder.com/1200x600?text=No+Image',
    overview: rawItem.overview || 'No overview available for this title.'
  };

  itemsCache[rawItem.id] = formatted;
  return formatted;
}

/* ==========================================================================
   GENRE FETCHING & FILTERING
   ========================================================================== */
async function populateGenres() {
  try {
    const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${TMDB_API_KEY}&language=en-US`);
    const data = await response.json();
    const genres = data.genres || [];

    genreSelectHeader.innerHTML = `<option value="" disabled selected>Genres</option>`;
    genres.forEach(genre => {
      const opt = document.createElement('option');
      opt.value = genre.id;
      opt.textContent = genre.name;
      genreSelectHeader.appendChild(opt);
    });
  } catch (err) {
    console.error("Genre List Fetch Error:", err);
  }
}

async function loadGenrePage(reset = false) {
  if (!activeGenreId) return;
  if (reset) {
    genrePage = 1;
    genreItems = [];
  }

  try {
    const res = await fetch(`${BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&with_genres=${activeGenreId}&sort_by=popularity.desc&page=${genrePage}`);
    if (!res.ok) throw new Error(`Genre request failed with status ${res.status}`);
    const data = await res.json();
    const results = (data.results || []).map(i => formatItem(i, 'movie'));
    genreItems = reset ? results : [...genreItems, ...results];

    if (genreItems.length > 0 && reset) setHero(genreItems[0]);
    trendingCarousel.classList.add('genre-results-grid');
    renderCarousel(trendingCarousel, genreItems);
    loadMoreGenreBtn.style.display = data.total_pages && genrePage < data.total_pages ? 'inline-flex' : 'none';
  } catch (err) {
    console.error("Genre Filter Fetch Error:", err);
    trendingCarousel.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">Unable to load this genre. Please try again.</p>';
    loadMoreGenreBtn.style.display = 'none';
  }
}

genreSelectHeader.addEventListener('change', async (e) => {
  const genreId = e.target.value;
  const selectedGenreName = genreSelectHeader.options[genreSelectHeader.selectedIndex].text;
  if (!genreId) return;

  closeMobileMenu();
  activeGenreId = genreId;
  document.getElementById('section-movies').style.display = 'none';
  document.getElementById('section-tv').style.display = 'none';
  sectionContinue.style.display = 'none';
  document.getElementById('trending-label').textContent = `Genre: ${selectedGenreName}`;
  await loadGenrePage(true);
});

if (loadMoreGenreBtn) {
  loadMoreGenreBtn.addEventListener('click', async () => {
    loadMoreGenreBtn.disabled = true;
    loadMoreGenreBtn.innerHTML = 'Loading…';
    genrePage += 1;
    await loadGenrePage(false);
    loadMoreGenreBtn.disabled = false;
    loadMoreGenreBtn.textContent = 'More Movies';
  });
}

/* ==========================================================================
   APP INIT & CATEGORY LOADING
   ========================================================================== */
async function init() {
  activeGenreId = null;
  genreItems = [];
  trendingCarousel.classList.remove('genre-results-grid');
  if (loadMoreGenreBtn) loadMoreGenreBtn.style.display = 'none';
  document.getElementById('section-movies').style.display = 'block';
  document.getElementById('section-tv').style.display = 'block';
  document.getElementById('trending-label').textContent = 'Trending Now';
  genreSelectHeader.value = "";

  renderContinueWatching();
  await populateGenres();

  const [trendingRaw, moviesRaw, tvRaw] = await Promise.all([
    fetchFromTMDB('/trending/all/week'),
    fetchFromTMDB('/movie/popular'),
    fetchFromTMDB('/tv/popular')
  ]);

  const trending = trendingRaw.map(i => formatItem(i));
  const movies = moviesRaw.map(i => formatItem(i, 'movie'));
  const tvShows = tvRaw.map(i => formatItem(i, 'tv'));

  if (trending.length > 0) setHero(trending[0]);

  renderCarousel(trendingCarousel, trending);
  renderCarousel(moviesCarousel, movies);
  renderCarousel(tvCarousel, tvShows);
}

async function loadCategory(type) {
  activeGenreId = null;
  genreItems = [];
  trendingCarousel.classList.remove('genre-results-grid');
  if (loadMoreGenreBtn) loadMoreGenreBtn.style.display = 'none';
  document.getElementById('section-movies').style.display = 'none';
  document.getElementById('section-tv').style.display = 'none';
  sectionContinue.style.display = 'none';
  genreSelectHeader.value = "";
  
  const endpoint = type === 'movie' ? '/movie/top_rated' : '/tv/top_rated';
  document.getElementById('trending-label').textContent = type === 'movie' ? 'Top Rated Movies' : 'Top Rated TV Shows';

  const rawItems = await fetchFromTMDB(endpoint);
  const items = rawItems.map(i => formatItem(i, type));

  if (items.length > 0) setHero(items[0]);
  renderCarousel(trendingCarousel, items);
}

function setHero(item) {
  currentItem = item;
  heroBanner.style.backgroundImage = `url('${item.backdrop}')`;
  heroTitle.textContent = item.title;
  heroRating.innerHTML = `${iconSvg('star', 15)} <span>${item.rating}</span>`;
  heroMatch.textContent = `${item.matchScore}% Match`;

  // Apply real quality badge and styling
  heroQuality.textContent = item.quality;
  heroQuality.className = `quality-badge ${getQualityCssClass(item.quality)}`;

  heroYear.textContent = item.year;
  heroType.textContent = item.type.toUpperCase();
  heroOverview.textContent = item.overview;

  const saved = continueWatchingList.find(c => c.id === item.id);
  const s = saved ? saved.season : 1;
  const e = saved ? saved.episode : 1;

  heroPlayBtn.onclick = () => openPlayer(item, s, e);
  updateWatchlistBtnUI(heroListBtn, item);
}

function renderCarousel(container, items) {
  if (items.length === 0) {
    container.innerHTML = '<p style="color: var(--text-muted); padding: 1rem;">No items found.</p>';
    return;
  }

  container.innerHTML = items.map(item => {
    const qClass = getQualityCssClass(item.quality);
    return `
      <div class="movie-card" onclick="openDetailModal(${item.id})">
        <div class="poster-wrapper">
          <span class="brand-badge ${qClass}">${item.quality}</span>
          <img src="${item.poster}" alt="${item.title}" class="poster-img" loading="lazy">
          <button class="card-hover-play" title="Play ${item.title}" aria-label="Play ${item.title}" onclick="event.stopPropagation(); openPlayer(itemsCache[${item.id}])">${iconSvg('play', 20)}</button>
        </div>
        <div class="card-info">
          <div class="card-actions">
            <div class="action-btns-left">
              <button class="icon-btn icon-btn-play" title="Play" aria-label="Play" onclick="event.stopPropagation(); openPlayer(itemsCache[${item.id}])">${iconSvg('play', 15)}</button>
              <button class="icon-btn" title="Add to List" aria-label="Add to My List" onclick="event.stopPropagation(); toggleWatchlist(itemsCache[${item.id}], this)">${iconSvg('plus', 15)}</button>
              <button class="icon-btn" title="Like" aria-label="Like">${iconSvg('heart', 15)}</button>
            </div>
            <button class="icon-btn" title="Details" aria-label="Open details" onclick="event.stopPropagation(); openDetailModal(${item.id})">${iconSvg('chevronDown', 15)}</button>
          </div>
          <div class="card-title" title="${item.title}">${item.title}</div>
          <div class="card-meta">
            <span class="star-rating">${iconSvg('star', 13)} <span>${item.rating}</span></span>
            <span class="card-year">${item.year}</span>
            <span class="age-badge">${item.matchScore}% Match</span>
            <span class="quality-badge ${qClass}">${item.quality}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   CONTINUE WATCHING LOGIC
   ========================================================================== */
function recordContinueWatching(item, season = 1, episode = 1) {
  if (!item) return;

  continueWatchingList = continueWatchingList.filter(i => i.id !== item.id);

  const record = {
    ...item,
    season: parseInt(season) || 1,
    episode: parseInt(episode) || 1,
    progress: Math.floor(Math.random() * 60) + 20,
    timestamp: new Date().getTime()
  };

  itemsCache[item.id] = record;
  continueWatchingList.unshift(record);
  localStorage.setItem('fixoracine_continue_watching', JSON.stringify(continueWatchingList));
  renderContinueWatching();
}

function renderContinueWatching() {
  if (continueWatchingList.length === 0) {
    sectionContinue.style.display = 'none';
    return;
  }

  sectionContinue.style.display = 'block';
  continueWatchingList.forEach(item => {
    if (item && item.id != null) itemsCache[item.id] = item;
  });
  continueCarousel.innerHTML = continueWatchingList.map(item => {
    const metaText = item.type === 'tv' 
      ? `S${item.season}:E${item.episode}` 
      : `${item.year} • Movie`;
    const qClass = getQualityCssClass(item.quality);

    return `
      <div class="movie-card" onclick="openPlayer(itemsCache[${item.id}], ${item.season || 1}, ${item.episode || 1})">
        <div class="poster-wrapper">
          <span class="brand-badge ${qClass}">${item.quality}</span>
          <img src="${item.poster}" alt="${item.title}" class="poster-img" loading="lazy">
          <button class="card-hover-play" title="Resume ${item.title}" aria-label="Resume ${item.title}" onclick="event.stopPropagation(); openPlayer(itemsCache[${item.id}], ${item.season || 1}, ${item.episode || 1})">${iconSvg('play', 20)}</button>
          <div class="progress-bar-container">
            <div class="progress-bar" style="width: ${item.progress || 50}%;"></div>
          </div>
        </div>
        <div class="card-info">
          <div class="card-actions">
            <div class="action-btns-left">
              <button class="icon-btn icon-btn-play" title="Resume" aria-label="Resume" onclick="event.stopPropagation(); openPlayer(itemsCache[${item.id}], ${item.season || 1}, ${item.episode || 1})">${iconSvg('play', 15)}</button>
              <button class="icon-btn" title="Remove" aria-label="Remove from Continue Watching" onclick="event.stopPropagation(); removeFromContinueWatching(${item.id})">${iconSvg('x', 15)}</button>
            </div>
            <button class="icon-btn" title="Details" aria-label="Open details" onclick="event.stopPropagation(); openDetailModal(${item.id})">${iconSvg('chevronDown', 15)}</button>
          </div>
          <div class="card-title" title="${item.title}">${item.title}</div>
          <div class="card-meta">
            <span class="continue-badge">${metaText}</span>
            <span class="star-rating">${iconSvg('star', 13)} <span>${item.rating}</span></span>
            <span class="card-year">${item.year}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function removeFromContinueWatching(id) {
  continueWatchingList = continueWatchingList.filter(i => i.id !== id);
  localStorage.setItem('fixoracine_continue_watching', JSON.stringify(continueWatchingList));
  renderContinueWatching();
}

function showContinueWatchingPage() {
  document.getElementById('section-movies').style.display = 'none';
  document.getElementById('section-tv').style.display = 'none';
  sectionContinue.style.display = 'none';
  genreSelectHeader.value = "";
  document.getElementById('trending-label').textContent = 'Continue Watching';

  renderCarousel(trendingCarousel, continueWatchingList);
}

/* ==========================================================================
   DETAIL MODAL & SIMILAR CONTENT
   ========================================================================== */
async function openDetailModal(id) {
  const item = itemsCache[id];
  if (!item) return;

  currentItem = item;
  detailHero.style.backgroundImage = `url('${item.backdrop}')`;
  detailTitle.textContent = item.title;
  detailRating.innerHTML = `${iconSvg('star', 15)} <span>${item.rating}</span>`;
  detailMatch.textContent = `${item.matchScore}% Match`;
  detailYear.textContent = item.year;
  
  detailQuality.textContent = item.quality;
  detailQuality.className = `quality-badge ${getQualityCssClass(item.quality)}`;

  detailDuration.textContent = item.duration;
  detailOverview.textContent = item.overview;
  detailGenres.textContent = item.type === 'tv' ? 'TV Series, Drama, Sci-Fi' : 'Movie, Action, Adventure';

  const saved = continueWatchingList.find(c => c.id === item.id);
  const targetS = saved ? saved.season : 1;
  const targetE = saved ? saved.episode : 1;

  detailPlayBtn.onclick = () => {
    detailOverlay.classList.remove('active');
    openPlayer(item, targetS, targetE);
  };

  updateWatchlistBtnUI(detailListBtn, item);

  if (item.type === 'tv') {
    tvEpisodesSection.style.display = 'block';
    await loadTVShowSeasons(item.id, targetS);
  } else {
    tvEpisodesSection.style.display = 'none';
  }

  // Load recommendations/matching content
  await loadSimilarContent(item.id, item.type);

  detailOverlay.classList.add('active');
}

async function loadSimilarContent(id, type) {
  similarGrid.innerHTML = '<p style="color:#aaa; font-size:0.9rem; grid-column: span 3;">Loading matching titles...</p>';
  try {
    const rawItems = await fetchFromTMDB(`/${type}/${id}/recommendations`);
    const results = (rawItems || []).slice(0, 6).map(i => formatItem(i, type));

    if (results.length === 0) {
      similarGrid.innerHTML = '<p style="color:#aaa; font-size:0.9rem; grid-column: span 3;">No matching titles found.</p>';
      return;
    }

    similarGrid.innerHTML = results.map(item => {
      const qClass = getQualityCssClass(item.quality);
      return `
        <div class="similar-card" onclick="openDetailModal(${item.id})">
          <div class="similar-poster-wrapper">
            <span class="brand-badge ${qClass}">${item.quality}</span>
            <img src="${item.poster}" alt="${item.title}" loading="lazy">
          </div>
          <div class="similar-info">
            <div class="similar-title">${item.title}</div>
            <div class="similar-meta">
              <span class="star-rating">${iconSvg('star', 13)} <span>${item.rating}</span></span>
              <span class="year-tag">${item.year}</span>
            </div>
            <div class="similar-overview">${item.overview}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("Similar Content Fetch Error:", err);
    similarGrid.innerHTML = '<p style="color:#aaa; font-size:0.9rem; grid-column: span 3;">Unable to load recommendations.</p>';
  }
}

async function loadTVShowSeasons(tvId, initialSeason = 1) {
  try {
    const tvData = await fetchFromTMDB(`/tv/${tvId}`);
    const seasons = tvData.seasons ? tvData.seasons.filter(s => s.season_number > 0) : [];

    modalSeasonPicker.innerHTML = seasons.map(s => `
      <option value="${s.season_number}" ${s.season_number == initialSeason ? 'selected' : ''}>${s.name || 'Season ' + s.season_number}</option>
    `).join('') || '<option value="1">Season 1</option>';

    modalSeasonPicker.onchange = (e) => loadTVEpisodes(tvId, e.target.value);

    await loadTVEpisodes(tvId, initialSeason);
  } catch (err) {
    console.error("TV Seasons Fetch Error:", err);
  }
}

async function loadTVEpisodes(tvId, seasonNum) {
  episodesList.innerHTML = '<p style="color:#aaa; font-size:0.9rem;">Loading episodes...</p>';
  try {
    const seasonData = await fetchFromTMDB(`/tv/${tvId}/season/${seasonNum}`);
    const episodes = seasonData.episodes || [];

    if (episodes.length === 0) {
      episodesList.innerHTML = '<p style="color:#aaa;">No episode information available.</p>';
      return;
    }

    episodesList.innerHTML = episodes.map(ep => {
      const epThumb = ep.still_path ? `${POSTER_BASE_URL}${ep.still_path}` : currentItem.poster;
      return `
        <div class="episode-card" onclick="playSpecificEpisode(${seasonNum}, ${ep.episode_number})">
          <div class="episode-num">${ep.episode_number}</div>
          <div class="episode-thumb-wrapper">
            <img src="${epThumb}" alt="${ep.name}" class="episode-thumb">
            <div class="episode-play-icon">${iconSvg('play', 18)}</div>
          </div>
          <div class="episode-details">
            <div class="episode-top-row">
              <span class="episode-name">${ep.name}</span>
              <span class="episode-runtime">${ep.runtime ? ep.runtime + 'm' : '45m'}</span>
            </div>
            <div class="episode-desc">${ep.overview || 'No episode summary available.'}</div>
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("TV Episodes Fetch Error:", err);
  }
}

function playSpecificEpisode(season, episode) {
  detailOverlay.classList.remove('active');
  openPlayer(currentItem, season, episode);
}

closeDetailBtn.addEventListener('click', () => {
  detailOverlay.classList.remove('active');
});

detailOverlay.addEventListener('click', (e) => {
  if (e.target === detailOverlay) {
    detailOverlay.classList.remove('active');
  }
});

/* ==========================================================================
   PREDICTIVE SEARCH
   ========================================================================== */
let searchTimeout;

searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  const query = e.target.value.trim();

  if (!query) {
    searchPredictions.classList.remove('active');
    return;
  }

  searchTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
      const data = await res.json();
      const results = (data.results || [])
        .filter(i => i.media_type === 'movie' || i.media_type === 'tv')
        .slice(0, 6)
        .map(i => formatItem(i));

      if (results.length > 0) {
        searchPredictions.innerHTML = results.map(item => `
          <div class="prediction-item" onclick="selectPrediction(${item.id})">
            <img src="${item.poster}" class="prediction-thumb" alt="${item.title}">
            <div class="prediction-info">
              <span class="prediction-title">${item.title}</span>
              <span class="prediction-meta">${item.year} • ${item.type.toUpperCase()} • ${iconSvg('star', 12)} ${item.rating} • ${item.quality}</span>
            </div>
          </div>
        `).join('');
        searchPredictions.classList.add('active');
      } else {
        searchPredictions.innerHTML = '<div style="padding: 0.8rem 1rem; color: #888; font-size: 0.85rem;">No matches found</div>';
        searchPredictions.classList.add('active');
      }
    } catch (err) {
      console.error("Predictive Search Error:", err);
    }
  }, 250);
});

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const query = searchInput.value.trim();
    if (query) {
      searchPredictions.classList.remove('active');
      performFullSearch(query);
    }
  }
});

function selectPrediction(id) {
  searchPredictions.classList.remove('active');
  searchInput.value = "";
  openDetailModal(id);
}

async function performFullSearch(query) {
  document.getElementById('section-movies').style.display = 'none';
  document.getElementById('section-tv').style.display = 'none';
  sectionContinue.style.display = 'none';
  genreSelectHeader.value = "";
  document.getElementById('trending-label').textContent = `Results for "${query}"`;

  try {
    const res = await fetch(`${BASE_URL}/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    const results = (data.results || [])
      .filter(i => i.media_type === 'movie' || i.media_type === 'tv')
      .map(i => formatItem(i));

    renderCarousel(trendingCarousel, results);
  } catch (err) {
    console.error("Full Search Error:", err);
  }
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-box')) {
    searchPredictions.classList.remove('active');
  }
});

/* ==========================================================================
   STREAMING PLAYER MODAL
   ========================================================================== */
function openPlayer(item, targetSeason = 1, targetEpisode = 1) {
  if (!item) return;
  currentItem = item;
  modalMovieTitle.textContent = `${item.title} ${item.type === 'tv' ? `(S${targetSeason} E${targetEpisode})` : ''}`;

  if (item.type === 'tv') {
    tvControls.style.display = 'flex';
    populatePlayerDropdowns(targetSeason, targetEpisode);
  } else {
    tvControls.style.display = 'none';
  }

  recordContinueWatching(item, targetSeason, targetEpisode);
  updateEmbedUrl();
  playerOverlay.classList.add('active');
}

function populatePlayerDropdowns(selectedSeason = 1, selectedEpisode = 1) {
  seasonSelect.innerHTML = Array.from({length: 15}, (_, i) => `<option value="${i+1}">S${i+1}</option>`).join('');
  episodeSelect.innerHTML = Array.from({length: 30}, (_, i) => `<option value="${i+1}">E${i+1}</option>`).join('');

  seasonSelect.value = selectedSeason;
  episodeSelect.value = selectedEpisode;
}

function updateEmbedUrl() {
  const server = serverSelect.value;
  const tmdb = currentItem.id;
  const season = seasonSelect.value || 1;
  const episode = episodeSelect.value || 1;

  if (currentItem.type === 'tv') {
    recordContinueWatching(currentItem, season, episode);
    modalMovieTitle.textContent = `${currentItem.title} (S${season} E${episode})`;
  }

  let src = "";

  if (server === 'embedmaster') {
    src = currentItem.type === 'movie'
      ? `https://embedmaster.link/movie/${tmdb}`
      : `https://embedmaster.link/tv/${tmdb}/${season}/${episode}`;
  } else if (server === 'vidsrc') {
    src = currentItem.type === 'movie' 
      ? `https://vidsrc.to/embed/movie/${tmdb}`
      : `https://vidsrc.to/embed/tv/${tmdb}/${season}/${episode}`;
  } else if (server === 'embedsu') {
    src = currentItem.type === 'movie'
      ? `https://embed.su/embed/movie/${tmdb}`
      : `https://embed.su/embed/tv/${tmdb}/${season}/${episode}`;
  } else {
    src = currentItem.type === 'movie'
      ? `https://www.2embed.cc/embed/${tmdb}`
      : `https://www.2embed.cc/embedtv/${tmdb}&s=${season}&e=${episode}`;
  }

  videoIframe.src = src;
}

closePlayerBtn.addEventListener('click', () => {
  playerOverlay.classList.remove('active');
  videoIframe.src = "";
});

serverSelect.addEventListener('change', updateEmbedUrl);
seasonSelect.addEventListener('change', updateEmbedUrl);
episodeSelect.addEventListener('change', updateEmbedUrl);

/* ==========================================================================
   WATCHLIST & NAVIGATION
   ========================================================================== */
function toggleWatchlist(item, btnElement) {
  if (!item) return;
  const index = watchlist.findIndex(i => i.id === item.id);
  if (index > -1) {
    watchlist.splice(index, 1);
  } else {
    watchlist.push(item);
  }
  localStorage.setItem('fixoracine_watchlist', JSON.stringify(watchlist));
  updateWatchlistBtnUI(btnElement, item);
}

function updateWatchlistBtnUI(btnElement, item) {
  if (!btnElement || !item) return;
  const inList = watchlist.some(i => i.id === item.id);
  if (btnElement.classList.contains('icon-btn') || btnElement.classList.contains('btn-circle-action')) {
    btnElement.innerHTML = inList ? iconSvg('check', 16) : iconSvg('plus', 16);
  } else {
    btnElement.innerHTML = inList ? `${iconSvg('check', 16)} <span>In My List</span>` : `${iconSvg('plus', 16)} <span>My List</span>`;
  }
  btnElement.onclick = (e) => {
    e.stopPropagation();
    toggleWatchlist(item, btnElement);
  };
}

function showWatchlist() {
  watchlist.forEach(item => {
    if (item && item.id != null) itemsCache[item.id] = item;
  });
  document.getElementById('section-movies').style.display = 'none';
  document.getElementById('section-tv').style.display = 'none';
  sectionContinue.style.display = 'none';
  genreSelectHeader.value = "";
  document.getElementById('trending-label').textContent = 'My List';

  renderCarousel(trendingCarousel, watchlist);
}

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
});

/* Start App */
init();