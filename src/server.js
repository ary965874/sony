const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    // --- Movie name ---
    let name = $("p.info b").first().text().trim();
    if (!name) name = $("p.info").text().trim();

    // --- Image ---
    let image = $("img[src*='filmyzilla']").first().attr("src") || null;

    // --- Links by quality ---
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

    // --- Resolve redirect URLs ---
    for (const q of Object.keys(links)) {
      try {
        const downloadPage = await axios.get(links[q].main_url);
        const $$ = cheerio.load(downloadPage.data);
        const startDownload = $$("a:contains('Start Download Now')").attr("href");
        if (startDownload) {
          const finalResp = await axios.head(new URL(startDownload, links[q].main_url).href, {
            maxRedirects: 0,
            validateStatus: null,
          });
          if (finalResp.headers.location) {
            links[q].redirect_url = finalResp.headers.location;
          }
        }
      } catch (e) {
        console.log(`Error resolving ${q}:`, e.message);
      }
    }

    res.json({ name, image, links });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Failed to scrape page" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
