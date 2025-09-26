import React, { useEffect, useState, Fragment } from "react";
/**
 * Sonyliv Live Events — Single-file React component (default export)
 * - Uses Tailwind CSS utility classes for styling
 * - Uses hls.js to play HLS streams reliably in modern browsers
 * - Shadcn/ui / lucide-react / framer-motion friendly code structure (you can swap components)
 *
 * How to use:
 * 1. Create a new React app (Vite, Next, CRA). Ensure Tailwind CSS is set up.
 * 2. Install dependencies:
 *    npm install hls.js lucide-react framer-motion
 * 3. Drop this file into your project and import it into a page (or use it as App.jsx)
 * 4. Running: npm run dev / npm start
 *
 * Notes:
 * - This component fetches data from: https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json
 * - It supports live badge, search, filters, sort, and a premium-looking player modal with HLS fallback.
 */

import Hls from "hls.js";
import { Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const API_URL =
  "https://raw.githubusercontent.com/drmlive/sliv-live-events/main/sonyliv.json";

function useFetchEvents(intervalMs = 30000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(API_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!mounted) return;
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const id = setInterval(fetchData, intervalMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [intervalMs]);

  return { data, loading, error };
}

function Header({ total, liveCount }) {
  return (
    <header className="w-full px-6 py-6 bg-gradient-to-r from-slate-900 via-sky-800 to-indigo-700 text-white shadow-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Sonyliv — Live Events</h1>
          <p className="text-sm opacity-80 mt-1">Premium live feed & player — Asia Cup, UCL, and more.</p>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-90">Total events</div>
          <div className="text-xl font-semibold">{total} <span className="text-sm opacity-80">•</span> <span className="text-lg">{liveCount} live</span></div>
        </div>
      </div>
    </header>
  );
}

function SearchFilter({ value, onChange, onClear }) {
  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-4 flex flex-col md:flex-row gap-3 items-center justify-between">
      <div className="flex-1 flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by team, event or channel (e.g. India, UCL, Sony Sports)..."
          className="w-full md:w-[560px] bg-white/90 border border-slate-200 rounded-2xl px-4 py-3 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
        <button
          onClick={onClear}
          className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-medium shadow hover:bg-indigo-700"
        >
          Clear
        </button>
      </div>
      <div className="flex gap-2">
        <div className="text-sm text-slate-700 py-2 px-3 bg-white/90 border rounded-2xl">Auto-refresh: 30s</div>
      </div>
    </div>
  );
}

function Badge({ children, color = "bg-indigo-600" }) {
  return <span className={`${color} text-white text-xs px-2 py-1 rounded-full`}>{children}</span>;
}

function EventCard({ item, onOpenPlayer }) {
  const isLive = !!item.isLive;
  const title = item.match_name || item.event_name;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="bg-white rounded-2xl shadow-md overflow-hidden border border-slate-100 hover:shadow-xl transition-shadow duration-200"
    >
      <div className="relative">
        <img src={item.src} alt={title} className="w-full h-44 object-cover" />
        {isLive && (
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <div className="animate-pulse w-3 h-3 bg-red-500 rounded-full shadow" />
            <div className="text-white text-sm font-semibold bg-black/50 px-2 py-1 rounded">LIVE</div>
          </div>
        )}
        <button
          onClick={() => onOpenPlayer(item)}
          className="absolute right-3 bottom-3 inline-flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-2 rounded-full shadow-lg"
        >
          <Play size={16} />
          <span className="text-sm font-medium">Watch</span>
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-md font-semibold truncate">{title}</h3>
            <p className="text-sm text-slate-500 truncate mt-1">{item.broadcast_channel} • {item.audioLanguageName}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge>{item.event_category}</Badge>
            <div className="text-xs text-slate-400">ID: {item.contentId}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-sm text-slate-600 line-clamp-2">{item.event_name}</div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-500">Audio</div>
            <Badge color="bg-emerald-600">{item.audioLanguageName || "—"}</Badge>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function PlayerModal({ item, onClose }) {
  const videoRef = React.useRef(null);
  useEffect(() => {
    if (!item) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const hlsUrl = item.video_url || item.dai_url || item.pub_url;
    if (!hlsUrl) return;

    // If native HLS supported (Safari), set src directly
    if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = hlsUrl;
      videoEl.play().catch(() => {});
      return;
    }

    // Otherwise use hls.js
    let hls;
    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        videoEl.play().catch(() => {});
      });
    } else {
      // Fallback: just set src (may or may not work)
      videoEl.src = hlsUrl;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      if (videoEl) {
        try { videoEl.pause(); } catch (e) {}
        videoEl.src = "";
      }
    };
  }, [item]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-5xl rounded-2xl overflow-hidden bg-white shadow-2xl">
        <div className="flex items-center justify-between p-3 border-b">
          <div>
            <div className="text-sm text-slate-500">{item.broadcast_channel} • {item.audioLanguageName}</div>
            <div className="text-lg font-semibold">{item.match_name || item.event_name}</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1 rounded-md text-slate-700 hover:bg-slate-100">Close</button>
          </div>
        </div>

        <div className="w-full bg-black">
          <video
            ref={videoRef}
            controls
            playsInline
            className="w-full h-[56vh] bg-black object-contain"
          />
        </div>

        <div className="p-4 flex items-center justify-between gap-4">
          <div className="text-sm text-slate-600">Stream: {item.video_url ? 'video_url' : item.dai_url ? 'dai_url' : item.pub_url ? 'pub_url' : '—'}</div>
          <div className="text-xs text-slate-400">Tip: If playback fails, try opening the raw .m3u8 link in a dedicated player (VLC) or check network restrictions.</div>
        </div>
      </div>
    </div>
  );
}

export default function SonylivLiveEventsApp() {
  const { data, loading, error } = useFetchEvents(30000);
  const [query, setQuery] = useState("");
  const [filterLive, setFilterLive] = useState(null); // null = all, true = live only, false = upcoming only
  const [sortBy, setSortBy] = useState("live-first");
  const [playerItem, setPlayerItem] = useState(null);

  const items = data?.matches || [];
  const total = items.length;
  const liveCount = items.filter((it) => it.isLive).length;

  function filterAndSearch(list) {
    const q = query.trim().toLowerCase();
    let out = [...list];
    if (filterLive !== null) out = out.filter((i) => !!i.isLive === filterLive);
    if (q) {
      out = out.filter((i) => {
        const hay = `${i.match_name || ''} ${i.event_name || ''} ${i.broadcast_channel || ''} ${i.event_category || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (sortBy === 'live-first') out.sort((a,b) => (b.isLive?1:0) - (a.isLive?1:0));
    if (sortBy === 'alpha') out.sort((a,b) => (a.match_name||a.event_name||'').localeCompare(b.match_name||b.event_name||''));
    return out;
  }

  const visible = filterAndSearch(items);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900">
      <Header total={total} liveCount={liveCount} />

      <SearchFilter value={query} onChange={setQuery} onClear={() => { setQuery(''); setFilterLive(null); }} />

      <main className="max-w-6xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setFilterLive(null)} className={`px-3 py-1 rounded-full ${filterLive===null? 'bg-indigo-600 text-white': 'bg-white'}`}>All</button>
            <button onClick={() => setFilterLive(true)} className={`px-3 py-1 rounded-full ${filterLive===true? 'bg-emerald-600 text-white': 'bg-white'}`}>Live</button>
            <button onClick={() => setFilterLive(false)} className={`px-3 py-1 rounded-full ${filterLive===false? 'bg-slate-600 text-white': 'bg-white'}`}>Upcoming</button>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600">Sort</label>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-xl px-3 py-2 border bg-white">
              <option value="live-first">Live first</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </div>
        </div>

        {loading && (
          <div className="py-20 text-center text-slate-500">Loading events…</div>
        )}

        {error && (
          <div className="py-8 text-center text-red-600">Failed to load feed: {error}</div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {visible.map((item, idx) => (
                <EventCard key={item.contentId + '_' + idx} item={item} onOpenPlayer={(it) => setPlayerItem(it)} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="mt-12 text-center text-slate-500">No events matched your search/filters.</div>
        )}

        <footer className="mt-12 text-center text-sm text-slate-500">
          Data source: <a className="underline" href={API_URL} target="_blank" rel="noreferrer">sonyliv.json</a> • Built with ❤️ — Premium UI demo
        </footer>
      </main>

      <AnimatePresence>
        {playerItem && <PlayerModal item={playerItem} onClose={() => setPlayerItem(null)} />}
      </AnimatePresence>
    </div>
  );
}
