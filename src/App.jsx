import React, { useEffect, useState, Fragment } from "react";
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

function PlayerInline({ item }) {
  const videoRef = React.useRef(null);

  useEffect(() => {
    if (!item) return;
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const hlsUrl = item.video_url || item.dai_url || item.pub_url;
    if (!hlsUrl) return;

    if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      videoEl.src = hlsUrl;
      videoEl.play().catch(() => {});
      return;
    }

    let hls;
    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, debug: false });
      hls.loadSource(hlsUrl);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.ERROR, function (event, data) {
        console.error("HLS.js error", data);
      });
      hls.on(Hls.Events.MANIFEST_PARSED, function () {
        videoEl.play().catch(() => {});
      });
    } else {
      videoEl.src = hlsUrl;
    }

    return () => {
      if (hls) hls.destroy();
      if (videoEl) {
        try {
          videoEl.pause();
        } catch (e) {}
        videoEl.src = "";
      }
    };
  }, [item]);

  if (!item) return null;

  return (
    <div className="w-full bg-black">
      <video
        ref={videoRef}
        controls
        playsInline
        autoPlay
        className="w-full h-[70vh] bg-black object-contain"
      />
    </div>
  );
}

export default function SonylivLiveEventsApp() {
  const { data, loading, error } = useFetchEvents(30000);
  const [playerItem, setPlayerItem] = useState(null);

  const items = data?.matches || [];

  useEffect(() => {
    if (items.length > 0) {
      // auto-load the first live item, or fallback to first item
      const liveItem = items.find((it) => it.isLive);
      setPlayerItem(liveItem || items[0]);
    }
  }, [items]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-start">
      {loading && (
        <div className="py-20 text-center text-slate-400">Loading events…</div>
      )}

      {error && (
        <div className="py-8 text-center text-red-500">Failed to load feed: {error}</div>
      )}

      {!loading && !error && playerItem && (
        <div className="w-full max-w-5xl">
          <div className="p-4 flex flex-col gap-2 bg-slate-900">
            <div className="text-sm text-slate-400">{playerItem.broadcast_channel} • {playerItem.audioLanguageName}</div>
            <div className="text-lg font-semibold">{playerItem.match_name || playerItem.event_name}</div>
          </div>
          <PlayerInline item={playerItem} />
        </div>
      )}

      <footer className="mt-8 text-center text-sm text-slate-500">
        Data source: <a className="underline" href={API_URL} target="_blank" rel="noreferrer">sonyliv.json</a> • Built with ❤️ — Premium UI demo
      </footer>
    </div>
  );
}
