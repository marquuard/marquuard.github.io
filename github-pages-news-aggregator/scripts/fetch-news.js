const Parser = require('rss-parser');
const fs = require('fs');
const path = require('path');

const parser = new Parser({ timeout: 10000 });

const FEEDS = {
  technology: [
    'https://feeds.arstechnica.com/arstechnica/index',
    'https://theverge.com/rss/index.xml'
  ],
  finance: [
    'https://finance.yahoo.com/news/rssindex',
    'https://feeds.content.dowjones.io/public/rss/mw_topstories'
  ],
  business: [
    'https://feeds.bbci.co.uk/news/business/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml'
  ],
  world: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml'
  ]
};

function createSummary(text, maxLength = 180) {
  if (!text) return 'Nincs elérhető összefoglaló.';
  const clean = text.replace(/<[^>]*>?/gm, '').trim();
  return clean.length > maxLength ? clean.substring(0, maxLength) + '...' : clean;
}

async function main() {
  const result = {
    lastUpdated: new Date().toISOString(),
    categories: { technology: [], finance: [], business: [], world: [] }
  };

  for (const [category, urls] of Object.entries(FEEDS)) {
    const rawItems = [];

    for (const url of urls) {
      try {
        const feed = await parser.parseURL(url);
        (feed.items || []).forEach(item => {
          rawItems.push({
            title: item.title,
            link: item.link,
            summary: createSummary(item.contentSnippet || item.content || item.summary),
            source: feed.title || new URL(url).hostname,
            pubDate: item.pubDate ? new Date(item.pubDate).getTime() : Date.now()
          });
        });
      } catch (err) {
        console.warn(`Hiba a forrásnál (${url}):`, err.message);
      }
    }

    // Ismétlődések szűrése és rendezés
    const seen = new Set();
    const unique = rawItems.filter(item => {
      const key = (item.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a, b) => b.pubDate - a.pubDate);
    result.categories[category] = unique.slice(0, 5);
  }

  const outDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'news.json'), JSON.stringify(result, null, 2));
  console.log('news.json sikeresen frissítve.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
