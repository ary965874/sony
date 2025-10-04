import axios from "axios";
import cheerio from "cheerio";

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const logs = []; // <-- collect logs to send back for debugging
  const { url } = req.body;
  if (!url) {
    logs.push("❌ URL missing in request body");
    return res.status(400).json({ error: "URL required", logs });
  }

  try {
    logs.push(`➡️ Fetching main page: ${url}`);
    const { data } = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    const $ = cheerio.load(data);

    let name = $("p.info b").first().text().trim();
    if (!name) {
      name = $("p.info").text().trim();
      logs.push("⚠️ Movie name not found in <b>, fallback to <p.info>");
    } else {
      logs.push(`✅ Movie name found: ${name}`);
    }

    let image = $("img[src*='filmyzilla']").first().attr("src") || null;
    if (image) logs.push(`✅ Image found: ${image}`);
    else logs.push("⚠️ Image not found");

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
      logs.push(`➡️ Found ${quality} main_url: ${full_url}`);
    });

    // Resolve redirect URLs
    for (const q of Object.keys(links)) {
      try {
        logs.push(`➡️ Visiting server page for ${q}: ${links[q].main_url}`);
        const downloadPage = await axios.get(links[q].main_url, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });

        const $$ = cheerio.load(downloadPage.data);
        const startDownload = $$("a:contains('Start Download Now')").attr("href");
        if (!startDownload) {
          logs.push(`❌ Start Download link not found for ${q}`);
          continue;
        }
        logs.push(`✅ Start Download link found for ${q}: ${startDownload}`);

        const finalResp = await axios.head(new URL(startDownload, links[q].main_url).href, {
          maxRedirects: 0,
          validateStatus: null,
          headers: { "User-Agent": "Mozilla/5.0" },
        });

        if (finalResp.headers.location) {
          links[q].redirect_url = finalResp.headers.location;
          logs.push(`✅ Redirect URL for ${q}: ${links[q].redirect_url}`);
        } else {
          logs.push(`⚠️ No redirect URL returned for ${q}`);
        }
      } catch (e) {
        logs.push(`❌ Error resolving ${q}: ${e.message}`);
      }
    }

    res.status(200).json({ name, image, links, logs });
  } catch (err) {
    logs.push(`❌ Error fetching main page: ${err.message}`);
    console.error(err);
    res.status(500).json({ error: "Failed to scrape", logs });
  }
}
