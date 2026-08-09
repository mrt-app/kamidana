// (function () {
// 	function getBrowserLanguage() {
// 	var nav = window.navigator;
// 	var lang =
// 		nav.language ||
// 		nav.browserLanguage ||
// 		nav.userLanguage ||
// 		'ja';
// 	return String(lang).toLowerCase();
// 	}
//
// 	var language = getBrowserLanguage();
// 	var isJapanese = language.startsWith('ja');
//
// 	if (
// 	!location.search.includes('lang') &&
// 	!isJapanese &&
// 	!location.pathname.includes('index-en')
// 	) {
// 	location.href = './index-en.html';
// 	}
// })();

// UTM Parameter Configuration
const APP_STORE_PROVIDER_TOKEN = '118649014'; // App Store Provider Token (pt)
const DEFAULT_UTM_SOURCE = 'official_web';
const DEFAULT_UTM_MEDIUM = 'organic';
const DEFAULT_UTM_CAMPAIGN = 'website_referral';
const FIRST_TOUCH_STORAGE_KEY = 'kamidana_first_touch_utm_v1';

document.addEventListener('DOMContentLoaded', function() {
  // 1. Persist the first inbound UTM set for the current browser session.
  const urlParams = new URLSearchParams(window.location.search);
  const inboundUtm = {
    source: urlParams.get('utm_source'),
    medium: urlParams.get('utm_medium'),
    campaign: urlParams.get('utm_campaign'),
    content: urlParams.get('utm_content'),
    term: urlParams.get('utm_term')
  };
  let firstTouchUtm = null;

  try {
    const storedUtm = window.sessionStorage.getItem(FIRST_TOUCH_STORAGE_KEY);
    if (storedUtm) {
      firstTouchUtm = JSON.parse(storedUtm);
    } else if (Object.values(inboundUtm).some(Boolean)) {
      firstTouchUtm = inboundUtm;
      window.sessionStorage.setItem(FIRST_TOUCH_STORAGE_KEY, JSON.stringify(inboundUtm));
    }
  } catch (e) {
    firstTouchUtm = null;
  }

  const effectiveUtm = firstTouchUtm || inboundUtm;
  const utmSource = effectiveUtm.source;
  const utmMedium = effectiveUtm.medium;
  const inboundCampaign = effectiveUtm.campaign;
  const inboundContent = effectiveUtm.content;
  const utmTerm = effectiveUtm.term;

  // Fallback to defaults if not present
  const source = utmSource || DEFAULT_UTM_SOURCE;
  const medium = utmMedium || DEFAULT_UTM_MEDIUM;
  const term = utmTerm;

  function getJournalCtaContext(element) {
    const cta = element.closest('[data-journal-cta]');
    if (!cta) return null;

    const articleSlug = cta.dataset.articleSlug;
    const articleTopic = cta.dataset.articleTopic;
    const placement = cta.dataset.ctaPlacement;
    const storeCampaign = cta.dataset.storeCampaign;

    if (!articleSlug || !articleTopic || !placement || !storeCampaign) return null;

    return {
      articleSlug: articleSlug,
      articleTopic: articleTopic,
      placement: placement,
      storeCampaign: storeCampaign
    };
  }

  function getStore(urlValue) {
    try {
      const url = new URL(urlValue, window.location.href);
      const isApple = url.hostname === 'apps.apple.com' && url.pathname === '/app/apple-store/id1231920500';
      const isGoogle = url.hostname === 'play.google.com' &&
        url.pathname === '/store/apps/details' &&
        url.searchParams.get('id') === 'com.gmail.mrt.another';

      if (isApple) return { name: 'apple', url: url };
      if (isGoogle) return { name: 'google', url: url };
    } catch (e) {
      return null;
    }
    return null;
  }

  function getJournalCtaEventParams(badge) {
    const context = getJournalCtaContext(badge);
    if (!context) return null;

    return {
      article_slug: context.articleSlug,
      article_topic: context.articleTopic,
      cta_placement: context.placement,
      store_name: getStore(badge.getAttribute('href') || '').name
    };
  }

  // 2. Update all store badge links with UTM parameters
  const storeBadges = document.querySelectorAll('.store-badge');
  storeBadges.forEach(function(badge) {
    const originalHref = badge.getAttribute('href');
    if (!originalHref) return;
    const store = getStore(originalHref);
    if (!store) return;

    const ctaContext = getJournalCtaContext(badge);
    const campaign = ctaContext ? ctaContext.storeCampaign : (inboundCampaign || DEFAULT_UTM_CAMPAIGN);
    const content = ctaContext ? ctaContext.placement : inboundContent;

    try {
      const urlObj = store.url;
      if (store.name === 'apple') {
        // Construct Campaign Token (ct) for App Store (max 40 characters)
        let ctValue = '';
        if (ctaContext) {
          ctValue = ctaContext.storeCampaign;
        } else if (inboundCampaign) {
          ctValue = inboundCampaign;
          if (utmSource) {
            ctValue += '_' + utmSource;
          }
        } else if (utmSource) {
          ctValue = utmSource;
        } else {
          ctValue = DEFAULT_UTM_CAMPAIGN + '_' + DEFAULT_UTM_SOURCE;
        }
        ctValue = ctValue.substring(0, 40);

        // Build unified URL: https://apps.apple.com/app/apple-store/id1231920500?pt=118649014&ct={param}&mt=8
        const unifiedUrl = new URL('https://apps.apple.com/app/apple-store/id1231920500');
        unifiedUrl.searchParams.set('pt', APP_STORE_PROVIDER_TOKEN);
        unifiedUrl.searchParams.set('ct', ctValue);
        unifiedUrl.searchParams.set('mt', '8');
        urlObj.href = unifiedUrl.toString();
      } else if (store.name === 'google') {
        // Construct Referrer for Google Play Store
        const playParams = [];
        if (source) playParams.push('utm_source=' + encodeURIComponent(source));
        if (medium) playParams.push('utm_medium=' + encodeURIComponent(medium));
        if (campaign) playParams.push('utm_campaign=' + encodeURIComponent(campaign));
        if (content) playParams.push('utm_content=' + encodeURIComponent(content));
        if (term) playParams.push('utm_term=' + encodeURIComponent(term));

        if (playParams.length > 0) {
          const referrerString = playParams.join('&');
          urlObj.searchParams.set('referrer', referrerString);
        }
      }
      badge.setAttribute('href', urlObj.toString());
    } catch (e) {
      console.error('Failed to update store badge URL:', e);
    }

    // 3. Add GA4 event tracking listener
    badge.addEventListener('click', function() {
      const url = badge.getAttribute('href');
      const journalCtaParams = getJournalCtaEventParams(badge);
      const destinationStore = getStore(url || '');
      if (!destinationStore) return;

      if (typeof gtag === 'function') {
        gtag('event', 'click_store_badge', {
          'store_name': destinationStore.name,
          'destination_url': url,
          ...(journalCtaParams || {})
        });
      }
    });
  });

  // Track each journal store badge once when at least half of it is visible.
  if (typeof IntersectionObserver === 'function') {
    const seenJournalCtaBadges = new WeakSet();
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting || seenJournalCtaBadges.has(entry.target)) return;

        const journalCtaParams = getJournalCtaEventParams(entry.target);
        if (!journalCtaParams || typeof gtag !== 'function') return;

        seenJournalCtaBadges.add(entry.target);
        gtag('event', 'view_journal_cta', journalCtaParams);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-journal-cta] .store-badge').forEach(function(badge) {
      if (getStore(badge.getAttribute('href') || '')) observer.observe(badge);
    });
  }
});
