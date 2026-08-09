const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync(__dirname + '/scripts.js', 'utf8');

function createBadge(href, cta) {
  const attributes = { href };
  const listeners = {};
  return {
    attributes,
    listeners,
    closest: () => cta || null,
    getAttribute: (name) => attributes[name] || null,
    setAttribute: (name, value) => { attributes[name] = value; },
    addEventListener: (name, listener) => { listeners[name] = listener; }
  };
}

function runPage({ search = '', badges = [], storage = new Map() } = {}) {
  const events = [];
  let onReady;
  let observerCallback;
  const observed = [];
  const document = {
    addEventListener: (name, listener) => { if (name === 'DOMContentLoaded') onReady = listener; },
    querySelectorAll: (selector) => selector === '.store-badge'
      ? badges
      : badges.filter((badge) => badge.closest('[data-journal-cta]'))
  };
  const context = {
    console,
    document,
    URL,
    URLSearchParams,
    WeakSet,
    Object,
    window: {
      location: { href: `https://kamidana.app/journal/en/omamori-guide${search}`, search },
      sessionStorage: {
        getItem: (key) => storage.has(key) ? storage.get(key) : null,
        setItem: (key, value) => storage.set(key, value)
      }
    },
    gtag: (...args) => events.push(args),
    IntersectionObserver: class {
      constructor(callback, options) {
        observerCallback = callback;
        this.options = options;
      }
      observe(target) { observed.push(target); }
      unobserve() {}
    }
  };
  vm.runInNewContext(source, context);
  onReady();
  return { events, observed, observerCallback, storage };
}

const appleUrl = 'https://apps.apple.com/app/apple-store/id1231920500';
const playUrl = 'https://play.google.com/store/apps/details?id=com.gmail.mrt.another';
const cta = {
  dataset: {
    articleSlug: 'omamori-guide',
    articleTopic: 'omamori',
    ctaPlacement: 'article_end',
    storeCampaign: 'jrnl_omamori_end'
  }
};

test('rewrites an approved App Store destination', () => {
  const badge = createBadge(appleUrl);
  runPage({ badges: [badge] });
  const url = new URL(badge.attributes.href);
  assert.equal(url.hostname, 'apps.apple.com');
  assert.equal(url.searchParams.get('pt'), '118649014');
  assert.equal(url.searchParams.get('ct'), 'website_referral_official_web');
});

test('rewrites an approved Google Play destination with first-touch UTM', () => {
  const badge = createBadge(playUrl);
  runPage({ search: '?utm_source=note&utm_medium=referral&utm_campaign=launch', badges: [badge] });
  const referrer = new URL(badge.attributes.href).searchParams.get('referrer');
  assert.equal(referrer, 'utm_source=note&utm_medium=referral&utm_campaign=launch');
});

test('does not rewrite or track an unapproved store-like destination', () => {
  const original = 'https://evil.example/?next=apps.apple.com';
  const badge = createBadge(original);
  const page = runPage({ badges: [badge] });
  assert.equal(badge.attributes.href, original);
  assert.equal(badge.listeners.click, undefined);
  assert.equal(page.observed.length, 0);
});

test('keeps the first UTM set for the session', () => {
  const storage = new Map();
  runPage({ search: '?utm_source=note&utm_campaign=first', badges: [], storage });
  const badge = createBadge(playUrl);
  runPage({ search: '?utm_source=x&utm_campaign=second', badges: [badge], storage });
  const referrer = new URL(badge.attributes.href).searchParams.get('referrer');
  assert.match(referrer, /utm_source=note/);
  assert.match(referrer, /utm_campaign=first/);
  assert.doesNotMatch(referrer, /second/);
});

test('sends article-end click parameters', () => {
  const badge = createBadge(appleUrl, cta);
  const page = runPage({ badges: [badge] });
  badge.listeners.click();
  const [, eventName, params] = page.events[0];
  assert.equal(eventName, 'click_store_badge');
  assert.deepEqual(
    JSON.parse(JSON.stringify(params)),
    {
      store_name: 'apple',
      destination_url: badge.attributes.href,
      article_slug: 'omamori-guide',
      article_topic: 'omamori',
      cta_placement: 'article_end'
    }
  );
});

test('sends sticky click parameters', () => {
  const stickyCta = { dataset: { ...cta.dataset, ctaPlacement: 'sticky' } };
  const badge = createBadge(playUrl, stickyCta);
  const page = runPage({ badges: [badge] });
  badge.listeners.click();
  assert.equal(page.events[0][2].cta_placement, 'sticky');
});

test('sends one view event when an approved CTA is visible', () => {
  const badge = createBadge(appleUrl, cta);
  const page = runPage({ badges: [badge] });
  assert.equal(page.observed.length, 1);
  page.observerCallback([{ target: badge, isIntersecting: true }]);
  page.observerCallback([{ target: badge, isIntersecting: true }]);
  assert.equal(page.events.filter((event) => event[1] === 'view_journal_cta').length, 1);
});

test('limits the App Store campaign token to 40 characters', () => {
  const badge = createBadge(appleUrl);
  runPage({ search: `?utm_source=${'s'.repeat(30)}&utm_campaign=${'c'.repeat(30)}`, badges: [badge] });
  assert.equal(new URL(badge.attributes.href).searchParams.get('ct').length, 40);
});
