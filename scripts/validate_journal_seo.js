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
const sourcedGuides = new Set([
  'en/kamidana-setup-guide',
  'en/modern-kamidana',
  'en/ofuda-guide',
  'en/omamori-guide',
  'en/osonae-guide',
  'en/shrine-visit-guide',
  'ja/modern-kamidana',
  'ja/ofuda-guide',
  'ja/osonae-guide'
]);

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
    assert.equal((html.match(/<p class="journal-article-meta">/g) || []).length, 1, `${lang}/${file}: visible article metadata`);
    assert.match(html, /<time datetime="\d{4}-\d{2}-\d{2}">(?:Published|公開)/, `${lang}/${file}: published date`);
    assert.match(html, /<time datetime="2026-08-09">(?:Updated|更新)/, `${lang}/${file}: updated date`);

    const editorialNoteCount = (html.match(/<section class="journal-editorial-note">/g) || []).length;
    if (sourcedGuides.has(`${lang}/${slug}`)) {
      assert.equal(editorialNoteCount, 1, `${lang}/${file}: tailored editorial note`);
      assert.match(html, /<section class="journal-editorial-note">[\s\S]*?<a href="https:\/\//, `${lang}/${file}: source link`);
    } else {
      assert.equal(editorialNoteCount, 0, `${lang}/${file}: no unrelated editorial note`);
    }

    const jsonLdBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    const articleSchemas = jsonLdBlocks.map((match) => JSON.parse(match[1])).filter((value) => value['@type'] === 'Article');
    assert.equal(articleSchemas.length, 1, `${lang}/${file}: one Article schema`);
    const article = articleSchemas[0];
    assert.equal(article.mainEntityOfPage, url, `${lang}/${file}: Article mainEntityOfPage`);
    assert.match(article.datePublished, /^\d{4}-\d{2}-\d{2}$/, `${lang}/${file}: Article datePublished`);
    assert.equal(article.dateModified, '2026-08-09', `${lang}/${file}: Article dateModified`);
    assert.equal(article.inLanguage, lang, `${lang}/${file}: Article inLanguage`);
    assert.ok(article.author?.name, `${lang}/${file}: Article author`);
    assert.ok(article.publisher?.name, `${lang}/${file}: Article publisher`);

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
