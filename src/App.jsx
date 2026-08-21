import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, Bell, Check, ChevronLeft, ChevronRight, CirclePlay, Film,
  Heart, Info, Menu, Play, Plus, Search, Sparkles, Star, X
} from 'lucide-react';

const API_KEY = '9195b41a09f0984bb9dfaa9392dd2b796';
const API = 'https://api.themoviedb.org/3';
const ORIGINAL = 'https://image.tmdb.org/t/p/original';
const POSTER = 'https://image.tmdb.org/t/p/w500';

const genres = ['All', 'Action', 'Drama', 'Sci-Fi', 'Comedy', 'Thriller', 'Animation', 'Documentary'];
const genreMap = { Action: 28, Drama: 18, 'Sci-Fi': 878, Comedy: 35, Thriller: 53, Animation: 16, Documentary: 99 };

function normalize(item, type = item.media_type || (item.first_air_date ? 'tv' : 'movie')) {
  const date = item.release_date || item.first_air_date || '';
  return {
    id: item.id,
    title: item.title || item.name || 'Untitled',
    overview: item.overview || 'A story waiting to be discovered.',
    poster: item.poster_path ? `${POSTER}${item.poster_path}` : 'https://placehold.co/500x750/171722/ffffff?text=No+Poster',
    backdrop: item.backdrop_path ? `${ORIGINAL}${item.backdrop_path}` : '',
    rating: item.vote_average ? item.vote_average.toFixed(1) : 'NR',
    year: date?.slice(0, 4) || '—',
    type,
    score: item.vote_average ? Math.min(Math.round(item.vote_average * 10), 99) : 80,
    genreIds: item.genre_ids || [],
    quality: type === 'tv' ? 'HD' : '4K UHD'
  };
}

async function tmdb(path) {
  const response = await fetch(`${API}${path}${path.includes('?') ? '&' : '?'}api_key=${API_KEY}&language=en-US`);
  if (!response.ok) throw new Error('TMDB request failed');
  const data = await response.json();
  return data.results || [];
}

const formatError = (error) => error instanceof Error ? error.message : 'Something went wrong.';

function SkeletonRow({ count = 6 }) {
  return <div className="flex gap-4 overflow-hidden">{Array.from({ length: count }).map((_, i) => <div key={i} className="h-64 min-w-[168px] animate-pulse rounded-2xl bg-white/[.07]" />)}</div>;
}

function ScoreRing({ score }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return <div className="relative grid h-16 w-16 place-items-center">
    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44"><circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="3" /><circle cx="22" cy="22" r={radius} fill="none" stroke="#e50914" strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} /></svg>
    <span className="text-sm font-black">{score}%</span>
  </div>;
}

function MovieCard({ item, onOpen, onPlay, inWatchlist, onToggle }) {
  return <motion.article
    layout
    initial={{ opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: .2 }}
    whileHover={{ y: -10, rotateX: 2, rotateY: -2, scale: 1.035 }}
    transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    className="group relative min-w-[168px] cursor-pointer snap-start overflow-hidden rounded-2xl border border-white/10 bg-white/[.055] shadow-2xl shadow-black/20 sm:min-w-[190px]"
    onClick={() => onOpen(item)}
  >
    <div className="relative aspect-[2/3] overflow-hidden">
      <img src={item.poster} alt={item.title} loading="lazy" className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-black/10 opacity-90" />
      <div className="absolute left-3 top-3 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white/80 backdrop-blur">{item.quality}</div>
      <div className="absolute inset-x-3 bottom-3 flex translate-y-3 items-center justify-between opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <button onClick={(e) => { e.stopPropagation(); onPlay(item); }} className="grid h-9 w-9 place-items-center rounded-full bg-white text-black transition hover:scale-110"><Play size={15} fill="currentColor" /></button>
        <button onClick={(e) => { e.stopPropagation(); onToggle(item); }} className="grid h-9 w-9 place-items-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur transition hover:border-red-400">{inWatchlist ? <Check size={15} /> : <Plus size={15} />}</button>
      </div>
    </div>
    <div className="space-y-2 p-3">
      <h3 title={item.title} className="truncate text-sm font-bold text-white">{item.title}</h3>
      <div className="flex items-center gap-2 text-[11px] text-white/50"><span className="flex items-center gap-1 text-amber-300"><Star size={11} fill="currentColor" /> {item.rating}</span><span>{item.year}</span><span className="text-emerald-300">{item.score}%</span></div>
    </div>
  </motion.article>;
}

function Section({ title, icon, items, onOpen, onPlay, watchlist, onToggle, loading, action }) {
  const ref = useRef(null);
  const scroll = (distance) => ref.current?.scrollBy({ left: distance, behavior: 'smooth' });
  return <section className="relative mx-auto max-w-[1480px] px-5 py-8 sm:px-8 lg:px-12">
    <div className="mb-5 flex items-end justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[.24em] text-red-400"><span>{icon}</span> Curated for you</div><h2 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h2></div>{action || <div className="hidden gap-2 sm:flex"><button onClick={() => scroll(-420)} className="rounded-full border border-white/10 bg-white/[.05] p-2 transition hover:border-white/25"><ChevronLeft size={18} /></button><button onClick={() => scroll(420)} className="rounded-full border border-white/10 bg-white/[.05] p-2 transition hover:border-white/25"><ChevronRight size={18} /></button></div>}</div>
    <div ref={ref} className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-4">{loading ? <SkeletonRow /> : items?.map(item => <MovieCard key={item.id} item={item} onOpen={onOpen} onPlay={onPlay} inWatchlist={watchlist.some(x => x.id === item.id)} onToggle={onToggle} />)}</div>
  </section>;
}

function Modal({ item, onClose, onPlay, inWatchlist, onToggle }) {
  const [similar, setSimilar] = useState([]);
  const [episodes, setEpisodes] = useState([]);
  const [season, setSeason] = useState(1);
  useEffect(() => {
    if (!item) return;
    let alive = true;
    (async () => {
      try { const recs = await tmdb(`/${item.type}/${item.id}/recommendations`); if (alive) setSimilar(recs.map(x => normalize(x, item.type)).slice(0, 6)); } catch { if (alive) setSimilar([]); }
      if (item.type === 'tv') {
        try { const seasonData = await tmdb(`/tv/${item.id}/season/${season}`); if (alive) setEpisodes(seasonData.episodes || []); } catch { if (alive) setEpisodes([]); }
      }
    })();
    return () => { alive = false; };
  }, [item, season]);
  if (!item) return null;
  return <AnimatePresence><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-md" onClick={onClose}>
    <motion.div initial={{ opacity: 0, scale: .94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .96 }} transition={{ type: 'spring', damping: 25 }} className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/10 bg-[#11111a] shadow-2xl shadow-black/70" onClick={e => e.stopPropagation()}>
      <button onClick={onClose} className="absolute right-4 top-4 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white transition hover:bg-red-500"><X size={18} /></button>
      <div className="relative h-64 overflow-hidden sm:h-80"><img src={item.backdrop || item.poster} alt="" className="h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#11111a] via-transparent to-black/20" /></div>
      <div className="-mt-16 relative space-y-5 p-6 sm:p-10"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.25em] text-red-400">{item.type === 'tv' ? 'Series' : 'Feature Film'}</p><h2 className="text-3xl font-black sm:text-5xl">{item.title}</h2></div><ScoreRing score={item.score} /></div><div className="flex flex-wrap items-center gap-3 text-sm text-white/55"><span className="flex items-center gap-1 text-amber-300"><Star size={14} fill="currentColor" /> {item.rating}</span><span>{item.year}</span><span>{item.quality}</span><span className="text-emerald-300">{item.score}% match</span></div><p className="max-w-3xl text-sm leading-7 text-white/65 sm:text-base">{item.overview}</p><div className="flex flex-wrap gap-3"><button onClick={() => onPlay(item)} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-red-600 to-violet-600 px-6 py-3 text-sm font-bold shadow-neon transition hover:scale-[1.03]"><Play size={16} fill="currentColor" /> Play now</button><button onClick={() => onToggle(item)} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-6 py-3 text-sm font-bold transition hover:border-white/30">{inWatchlist ? <Check size={16} /> : <Plus size={16} />} {inWatchlist ? 'In My List' : 'Add to My List'}</button></div>{item.type === 'tv' && <div className="border-t border-white/10 pt-5"><div className="mb-3 flex items-center justify-between"><h3 className="font-bold">Episodes</h3><select value={season} onChange={e => setSeason(Number(e.target.value))} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white outline-none">{Array.from({ length: 15 }, (_, i) => <option key={i + 1} value={i + 1}>Season {i + 1}</option>)}</select></div><div className="grid gap-2 sm:grid-cols-2">{episodes.slice(0, 8).map(ep => <button key={ep.id} onClick={() => onPlay({ ...item, season, episode: ep.episode_number })} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.04] p-3 text-left transition hover:border-red-400/60 hover:bg-white/[.08]"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-500/15 text-xs font-bold text-red-200">{ep.episode_number}</span><span className="min-w-0"><span className="block truncate text-sm font-bold">{ep.name}</span><span className="block truncate text-xs text-white/45">{ep.overview || 'Episode details available in player'}</span></span><Play size={14} className="ml-auto shrink-0" /></button>)}</div></div>}{similar.length > 0 && <div className="border-t border-white/10 pt-5"><h3 className="mb-3 font-bold">More like this</h3><div className="grid grid-cols-3 gap-3 sm:grid-cols-6">{similar.map(rec => <button key={rec.id} onClick={() => onClose() || onPlay(rec)} className="group text-left"><img src={rec.poster} alt={rec.title} className="aspect-[2/3] w-full rounded-xl object-cover transition group-hover:scale-105" /><span className="mt-2 block truncate text-xs text-white/60">{rec.title}</span></button>)}</div></div>}</div>
    </motion.div>
  </motion.div></AnimatePresence>;
}

function Player({ item, onClose, onResume }) {
  const [server, setServer] = useState('vidsrc');
  const [season, setSeason] = useState(item?.season || 1);
  const [episode, setEpisode] = useState(item?.episode || 1);
  if (!item) return null;
  const source = server === 'embedmaster'
    ? item.type === 'movie' ? `https://embedmaster.link/movie/${item.id}` : `https://embedmaster.link/tv/${item.id}/${season}/${episode}`
    : server === 'embedsu'
      ? item.type === 'movie' ? `https://embed.su/embed/movie/${item.id}` : `https://embed.su/embed/tv/${item.id}/${season}/${episode}`
      : item.type === 'movie' ? `https://vidsrc.to/embed/movie/${item.id}` : `https://vidsrc.to/embed/tv/${item.id}/${season}/${episode}`;
  const updateEpisode = (nextSeason, nextEpisode) => { setSeason(nextSeason); setEpisode(nextEpisode); onResume?.(item, nextSeason, nextEpisode); };
  return <AnimatePresence><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] overflow-y-auto bg-black/95 p-3 sm:p-8"><button onClick={onClose} className="fixed right-5 top-5 z-10 rounded-full bg-white/10 p-3 hover:bg-red-500"><X size={20} /></button><div className="mx-auto flex min-h-full max-w-6xl items-center"><div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4"><span className="font-bold">Now playing <span className="text-white/50">· {item.title}{item.type === 'tv' ? ` (S${season} E${episode})` : ''}</span></span><div className="flex items-center gap-2"><label className="text-xs text-white/45">Server</label><select value={server} onChange={e => setServer(e.target.value)} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white outline-none"><option value="vidsrc">VidSrc</option><option value="embedmaster">EmbedMaster</option><option value="embedsu">EmbedSu</option></select>{item.type === 'tv' && <><select value={season} onChange={e => updateEpisode(Number(e.target.value), episode)} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white outline-none">{Array.from({ length: 15 }, (_, i) => <option key={i + 1} value={i + 1}>Season {i + 1}</option>)}</select><select value={episode} onChange={e => updateEpisode(season, Number(e.target.value))} className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white outline-none">{Array.from({ length: 30 }, (_, i) => <option key={i + 1} value={i + 1}>Episode {i + 1}</option>)}</select></>}</div></div><div className="aspect-video bg-[#050509]"><iframe title={`Playing ${item.title}`} src={source} className="h-full w-full border-0" allowFullScreen /></div></div></div></motion.div></AnimatePresence>;
}

export default function App() {
  const [trending, setTrending] = useState([]);
  const [movies, setMovies] = useState([]);
  const [shows, setShows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [playing, setPlaying] = useState(null);
  const [activeGenre, setActiveGenre] = useState('All');
  const [genreItems, setGenreItems] = useState([]);
  const [watchlist, setWatchlist] = useState(() => JSON.parse(localStorage.getItem('fixoracine_watchlist') || '[]'));
  const [continueWatching, setContinueWatching] = useState(() => JSON.parse(localStorage.getItem('fixoracine_continue_watching') || '[]'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 700], [0, 160]);

  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 28); window.addEventListener('scroll', onScroll); return () => window.removeEventListener('scroll', onScroll); }, []);
  useEffect(() => { localStorage.setItem('fixoracine_watchlist', JSON.stringify(watchlist)); }, [watchlist]);
  useEffect(() => { localStorage.setItem('fixoracine_continue_watching', JSON.stringify(continueWatching)); }, [continueWatching]);
  useEffect(() => { (async () => { try { setLoading(true); const [a, b, c] = await Promise.all([tmdb('/trending/all/week'), tmdb('/movie/top_rated'), tmdb('/tv/top_rated')]); setTrending(a.map(normalize).slice(0, 12)); setMovies(b.map(i => normalize(i, 'movie')).slice(0, 12)); setShows(c.map(i => normalize(i, 'tv')).slice(0, 12)); } catch (e) { setError(formatError(e)); } finally { setLoading(false); } })(); }, []);

  const hero = trending[0];
  const filteredTrending = useMemo(() => { if (activeGenre === 'All') return trending; const id = genreMap[activeGenre]; return trending.filter(item => item.genreIds.includes(id)); }, [activeGenre, trending]);
  const toggleWatchlist = item => setWatchlist(list => list.some(x => x.id === item.id) ? list.filter(x => x.id !== item.id) : [item, ...list]);
  const recordContinue = (item, season = 1, episode = 1) => {
    if (!item) return;
    const record = { ...item, season, episode, progress: Math.floor(Math.random() * 60) + 20, timestamp: Date.now() };
    setContinueWatching(list => [record, ...list.filter(x => x.id !== item.id)]);
  };
  const handlePlay = (item, season = 1, episode = 1) => { recordContinue(item, season, episode); setPlaying(item); };
  const removeContinue = target => { const id = typeof target === 'object' ? target.id : target; setContinueWatching(list => list.filter(item => item.id !== id)); };
  const searchItems = useMemo(() => { if (!query.trim()) return []; const q = query.toLowerCase(); return [...trending, ...movies, ...shows].filter((item, index, arr) => arr.findIndex(x => x.id === item.id) === index && item.title.toLowerCase().includes(q)).slice(0, 6); }, [query, trending, movies, shows]);
  const runSearch = async () => {
    if (!query.trim()) return;
    try { setLoading(true); const results = await tmdb(`/search/multi?query=${encodeURIComponent(query.trim())}`); setTrending(results.filter(x => x.media_type === 'movie' || x.media_type === 'tv').map(normalize).slice(0, 12)); setActiveGenre('All'); window.location.hash = 'trending'; } catch (e) { setError(formatError(e)); } finally { setLoading(false); }
  };

  return <div className="min-h-screen overflow-x-hidden bg-[#0a0a0f] text-white selection:bg-red-500/40">
    <div className="pointer-events-none fixed inset-0 z-0 opacity-[.035] mix-blend-screen" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 180 180\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'.55\'/%3E%3C/svg%3E")' }} />
    <header className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${scrolled ? 'border-b border-white/10 bg-[#0a0a0f]/80 shadow-2xl shadow-black/20 backdrop-blur-2xl' : 'bg-gradient-to-b from-black/65 to-transparent'}`}>
      <div className="mx-auto flex h-20 max-w-[1480px] items-center gap-5 px-5 sm:px-8 lg:px-12"><button onClick={() => setMobileOpen(value => !value)} className="rounded-xl border border-white/10 p-2 md:hidden"><Menu size={20} /></button><a href="#top" className="flex shrink-0 items-center gap-2 font-black tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-red-500 to-violet-600 shadow-neon">F</span><span className="hidden text-lg sm:inline">Fixora<span className="text-red-400">Cine</span></span></a><nav className={`${mobileOpen ? 'absolute left-4 right-4 top-16 flex flex-col rounded-2xl border border-white/10 bg-[#151520]/95 p-4 shadow-2xl backdrop-blur-xl' : 'hidden'} items-start gap-5 text-sm font-semibold text-white/60 md:static md:flex md:flex-row md:items-center md:gap-6 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}><a href="#top" onClick={() => setMobileOpen(false)} className="text-white transition hover:text-red-300">Home</a><a href="#trending" onClick={() => setMobileOpen(false)} className="transition hover:text-white">Movies</a><a href="#spotlight" onClick={() => setMobileOpen(false)} className="transition hover:text-white">New & Popular</a><a href="#genres" onClick={() => setMobileOpen(false)} className="transition hover:text-white">Genres</a></nav><div className="relative ml-auto flex items-center gap-3"><div className="hidden w-48 items-center gap-2 rounded-full border border-white/10 bg-white/[.07] px-4 py-2 text-white/50 transition focus-within:border-red-400/60 focus-within:bg-white/10 sm:flex"><Search size={16} /><input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSearch()} className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/35" placeholder="Search titles" /></div><button className="relative rounded-full p-2 text-white/65 hover:text-white"><Bell size={18} /><span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" /></button><div className="grid h-9 w-9 place-items-center rounded-full border border-violet-300/30 bg-gradient-to-br from-violet-500 to-red-500 text-xs font-black">FC</div>{query && <div className="absolute right-0 top-14 w-72 overflow-hidden rounded-2xl border border-white/10 bg-[#151520]/95 p-2 shadow-2xl backdrop-blur-xl">{searchItems.length ? searchItems.map(item => <button key={item.id} onClick={() => { setSelected(item); setQuery(''); }} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/10"><img src={item.poster} className="h-12 w-9 rounded object-cover" /><span className="truncate text-sm font-semibold">{item.title}</span></button>) : <p className="p-3 text-sm text-white/45">No matching titles yet.</p>}</div>}</div></div>
    </header>

    <main id="top" className="relative z-10">
      <section className="relative min-h-[720px] overflow-hidden sm:min-h-[820px]" style={{ background: hero?.backdrop ? `url(${hero.backdrop}) center/cover` : 'linear-gradient(120deg,#18111d,#0a0a0f)' }}><motion.div style={{ y: heroY }} className="absolute inset-0 scale-110" /><div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_38%,transparent_0%,rgba(10,10,15,.18)_32%,rgba(10,10,15,.92)_84%)]" /><div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/78 to-transparent" /><div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#0a0a0f] to-transparent" /><div className="mx-auto flex min-h-[720px] max-w-[1480px] items-end px-5 pb-28 pt-36 sm:min-h-[820px] sm:px-8 lg:px-12"><AnimatePresence mode="wait">{hero && <motion.div key={hero.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8 }} className="max-w-2xl"><motion.div initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: .2 }} className="mb-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[.28em] text-red-300"><Sparkles size={14} /> Featured premiere</motion.div><motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .28 }} className="max-w-3xl text-5xl font-black leading-[.92] tracking-[-.06em] sm:text-7xl lg:text-8xl">{hero.title}</motion.h1><motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .45 }} className="mt-6 max-w-xl text-sm leading-7 text-white/62 sm:text-base">{hero.overview}</motion.p><div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-semibold text-white/55"><span className="flex items-center gap-1 text-amber-300"><Star size={14} fill="currentColor" /> {hero.rating}</span><span>{hero.year}</span><span className="text-emerald-300">{hero.score}% Match</span><span className="rounded border border-white/20 px-2 py-1">{hero.quality}</span></div><div className="mt-8 flex flex-wrap gap-3"><button onClick={() => handlePlay(hero)} className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-black shadow-xl transition hover:scale-105 hover:bg-red-100"><Play size={16} fill="currentColor" /> Watch trailer</button><button onClick={() => setSelected(hero)} className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-bold backdrop-blur transition hover:scale-105 hover:border-red-300 hover:bg-red-500/20"><Info size={16} /> More info</button></div></motion.div>}</AnimatePresence></div></section>
      <div id="genres" className="mx-auto flex max-w-[1480px] flex-wrap gap-2 px-5 pt-3 sm:px-8 lg:px-12">{genres.map(genre => <button key={genre} onClick={async () => { setActiveGenre(genre); if (genre !== 'All') { try { const data = await tmdb(`/discover/movie?with_genres=${genreMap[genre]}&sort_by=popularity.desc`); setGenreItems(data.map(i => normalize(i, 'movie')).slice(0, 12)); } catch (e) { setError(formatError(e)); } } else setGenreItems([]); }} className={`rounded-full border px-4 py-2 text-xs font-bold transition ${activeGenre === genre ? 'border-red-400/70 bg-red-500/15 text-red-200 shadow-neon' : 'border-white/10 bg-white/[.04] text-white/55 hover:border-white/25 hover:text-white'}`}>{genre}</button>)}</div>
      {error && <div className="mx-auto mt-5 max-w-[1480px] px-5 text-sm text-red-300 sm:px-8 lg:px-12">{error}</div>}
      {continueWatching.length > 0 && <Section title="Continue watching" icon="▶" items={continueWatching} onOpen={setSelected} onPlay={handlePlay} watchlist={watchlist} onToggle={removeContinue} />}
      <div id="trending"><Section title={activeGenre === 'All' ? 'Trending now' : `${activeGenre} picks`} icon="✦" items={genreItems.length ? genreItems : filteredTrending} onOpen={setSelected} onPlay={handlePlay} watchlist={watchlist} onToggle={toggleWatchlist} loading={loading} /></div>
      <section id="spotlight" className="mx-auto max-w-[1480px] px-5 py-12 sm:px-8 lg:px-12"><div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#17131f] to-[#101018] p-6 shadow-violet sm:p-10"><div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />{hero && <div className="relative grid items-center gap-8 md:grid-cols-[.72fr_1.28fr]"><div className="mx-auto w-full max-w-[250px] rotate-[-3deg] overflow-hidden rounded-2xl border border-white/15 shadow-2xl transition hover:rotate-0"><img src={hero.poster} alt={hero.title} className="aspect-[2/3] w-full object-cover" /></div><div><p className="text-xs font-bold uppercase tracking-[.25em] text-violet-300">Spotlight of the week</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">Worth your next <span className="text-red-400">two hours.</span></h2><p className="mt-5 max-w-xl leading-7 text-white/55">A hand-picked spotlight built from the titles our community is discovering right now.</p><div className="mt-7 flex items-center gap-5"><ScoreRing score={hero.score} /><div><div className="flex items-center gap-2 text-amber-300"><Star size={15} fill="currentColor" /> <span className="font-bold">{hero.rating}/10</span></div><p className="mt-1 text-xs text-white/40">Audience score</p></div></div></div></div>}</div></section>
      <Section title="Top rated films" icon="★" items={movies} onOpen={setSelected} onPlay={handlePlay} watchlist={watchlist} onToggle={toggleWatchlist} loading={loading} />
      <Section title="New releases & series" icon="◈" items={shows} onOpen={setSelected} onPlay={handlePlay} watchlist={watchlist} onToggle={toggleWatchlist} loading={loading} />
      {watchlist.length > 0 && <Section title="Your watchlist" icon="♡" items={watchlist} onOpen={setSelected} onPlay={handlePlay} watchlist={watchlist} onToggle={toggleWatchlist} />}
    </main>
    <footer className="relative z-10 mx-auto flex max-w-[1480px] flex-col gap-4 border-t border-white/10 px-5 py-12 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12"><div><span className="font-black text-white">Fixora<span className="text-red-400">Cine</span></span><p className="mt-1">Stories worth staying up for.</p></div><div className="flex gap-5"><a href="#top" className="transition hover:text-white">About</a><a href="#top" className="transition hover:text-white">Privacy</a><a href="#top" className="transition hover:text-white">Support</a></div></footer>
    <Modal item={selected} onClose={() => setSelected(null)} onPlay={item => { setSelected(null); handlePlay(item); }} inWatchlist={selected ? watchlist.some(x => x.id === selected.id) : false} onToggle={toggleWatchlist} />
    <Player item={playing} onClose={() => setPlaying(null)} onResume={recordContinue} />
  </div>;
}
