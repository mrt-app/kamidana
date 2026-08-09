const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pairedSlugs = new Set([
  'asakatsu-routine',
  'digital-detox-omairi',
  'mindfulness-nakaima',
  'modern-kamidana',
  'morning-routine',
  'ofuda-guide',
  'oharai-journal',
  'oshi-kamidana',
  'osonae-guide',
  'philosophy',
  'teinei-kurashi-omairi'
]);
const articleUrls = [];

for (const lang of ['en', 'ja']) {
  const dir = path.join(root, 'journal', lang);
  for (const file of fs.readdirSync(dir).filter((name) => name.endsWith('.html') && name !== 'index.html')) {
    const slug = file.replace(/\.html$/, '');
    const url = `https://kamidana.app/journal/${lang}/${slug}`;
    const html = fs.readFileSync(path.join(dir, file), 'utf8');
    articleUrls.push(url);

    assert.match(html, new RegExp(`<link rel="canonical" href="${url}"`), `${lang}/${file}: canonical`);
    assert.match(html, new RegExp(`<meta property="og:url" content="${url}"`), `${lang}/${file}: og:url`);
    assert.doesNotMatch(html, /https:\/\/kamidana\.app\/journal\/(?:en|ja)\/[^"<]+\.html/, `${lang}/${file}: .html URL`);

    if (pairedSlugs.has(slug)) {
      assert.match(html, new RegExp(`href="https://kamidana.app/journal/en/${slug}" hreflang="en"`), `${lang}/${file}: en hreflang`);
      assert.match(html, new RegExp(`href="https://kamidana.app/journal/ja/${slug}" hreflang="ja"`), `${lang}/${file}: ja hreflang`);
    }
  }
}

for (const indexPath of ['journal/index.html', 'journal/en/index.html', 'journal/ja/index.html']) {
  const html = fs.readFileSync(path.join(root, indexPath), 'utf8');
  for (const hreflang of ['en', 'ja', 'x-default']) {
    assert.match(html, new RegExp(`hreflang="${hreflang}"`), `${indexPath}: ${hreflang}`);
  }
}

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
for (const url of articleUrls) {
  assert.match(sitemap, new RegExp(`<loc>${url}</loc>`), `sitemap: ${url}`);
}
assert.doesNotMatch(sitemap, /<loc>https:\/\/kamidana\.app\/journal\/(?:en|ja)\/[^<]+\.html<\/loc>/, 'sitemap: .html URL');

console.log(`Journal SEO validation passed: ${articleUrls.length} articles, 3 indexes.`);
