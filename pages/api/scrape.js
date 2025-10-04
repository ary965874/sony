import axios from "axios";
import cheerio from "cheerio";

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const $ = cheerio.load(data);

    let name = $("p.info b").first().text().trim();
    if (!name) name = $("p.info").text().trim();
    let image = $("img[src*='filmyzilla']").first().attr("src") || null;

    const links = {};
    $("a[href*='/server/']").each((i, el) => {
      const href = $(el).attr("href");
      const text = $(el).text().toLowerCase();
      const full_url = new URL(href, url).href;

      let quality = "unknown";
      if (text.includes("1080") || href.includes("1080")) quality = "1080p";
      else if (text.includes("720") || href.includes("720")) quality = "720p";
      else if (text.includes("480") || href.includes("480")) quality = "480p";

      links[quality] = { main_url: full_url };
    });

    // Resolve redirect URLs
    for (const q of Object.keys(links)) {
      try {
        const downloadPage = await axios.get(links[q].main_url, {
          headers: { "User-Agent": "Mozilla/5.0" }
        });
        const $$ = cheerio.load(downloadPage.data);
        const startDownload = $$("a:contains('Start Download Now')").attr("href");
        if (startDownload) {
          const finalResp = await axios.head(new URL(startDownload, links[q].main_url).href, {
            maxRedirects: 0,
            validateStatus: null,
            headers: { "User-Agent": "Mozilla/5.0" }
          });
          if (finalResp.headers.location) {
            links[q].redirect_url = finalResp.headers.location;
          }
        }
      } catch (e) {
        console.log(`Error resolving ${q}:`, e.message);
      }
    }

    res.status(200).json({ name, image, links });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to scrape" });
  }
}
