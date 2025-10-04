import React, { useState } from "react";
import axios from "axios";

export default function App() {
  const [url, setUrl] = useState("");
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMovie = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const res = await axios.post("/api/scrape", { url });
      setMovie(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch movie");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-4">FilmyZilla Downloader</h1>

      <div className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Enter FilmyZilla movie URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="px-4 py-2 border rounded w-96"
        />
        <button
          onClick={fetchMovie}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {loading ? "Fetching..." : "Fetch Movie"}
        </button>
      </div>

      {movie && (
        <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
          <h2 className="text-xl font-bold mb-2">{movie.name}</h2>
          {movie.image && (
            <img
              src={movie.image}
              alt={movie.name}
              className="mb-4 rounded"
            />
          )}

          <div className="flex flex-col gap-2">
            {Object.keys(movie.links).map((quality) => (
              <a
                key={quality}
                href={movie.links[quality].redirect_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-600 text-white rounded text-center hover:bg-green-700"
              >
                Download {quality}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
