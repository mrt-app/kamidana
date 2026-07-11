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

document.addEventListener('DOMContentLoaded', function() {
  // 1. Parse UTM parameters from URL search query
  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source');
  const utmMedium = urlParams.get('utm_medium');
  const inboundCampaign = urlParams.get('utm_campaign');
  const inboundContent = urlParams.get('utm_content');
  const utmTerm = urlParams.get('utm_term');

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

  function getStoreName(url) {
    if (url.includes('apple.com')) return 'apple';
    if (url.includes('google.com')) return 'google';
    return 'unknown';
  }

  function getJournalCtaEventParams(badge) {
    const context = getJournalCtaContext(badge);
    if (!context) return null;

    return {
      article_slug: context.articleSlug,
      article_topic: context.articleTopic,
      cta_placement: context.placement,
      store_name: getStoreName(badge.getAttribute('href') || '')
    };
  }

  // 2. Update all store badge links with UTM parameters
  const storeBadges = document.querySelectorAll('.store-badge');
  storeBadges.forEach(function(badge) {
    const originalHref = badge.getAttribute('href');
    if (!originalHref) return;

    const ctaContext = getJournalCtaContext(badge);
    const campaign = ctaContext ? ctaContext.storeCampaign : (inboundCampaign || DEFAULT_UTM_CAMPAIGN);
    const content = ctaContext ? ctaContext.placement : inboundContent;

    try {
      const urlObj = new URL(originalHref, window.location.href);
      if (urlObj.hostname.includes('apple.com')) {
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
      } else if (urlObj.hostname.includes('google.com') || urlObj.hostname.includes('play.google.com')) {
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
      const storeName = getStoreName(url || '');

      if (typeof gtag === 'function') {
        gtag('event', 'click_store_badge', {
          'store_name': storeName,
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
      observer.observe(badge);
    });
  }
});
