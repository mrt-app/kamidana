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
  const utmCampaign = urlParams.get('utm_campaign');
  const utmContent = urlParams.get('utm_content');
  const utmTerm = urlParams.get('utm_term');

  // Fallback to defaults if not present
  const source = utmSource || DEFAULT_UTM_SOURCE;
  const medium = utmMedium || DEFAULT_UTM_MEDIUM;
  const campaign = utmCampaign || DEFAULT_UTM_CAMPAIGN;
  const content = utmContent;
  const term = utmTerm;

  // 2. Update all store badge links with UTM parameters
  const storeBadges = document.querySelectorAll('.store-badge');
  storeBadges.forEach(function(badge) {
    const originalHref = badge.getAttribute('href');
    if (!originalHref) return;

    try {
      const urlObj = new URL(originalHref, window.location.href);
      if (urlObj.hostname.includes('apple.com')) {
        // Construct Campaign Token (ct) for App Store (max 40 characters)
        let ctValue = '';
        if (utmCampaign) {
          ctValue = utmCampaign;
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
      let storeName = 'unknown';
      if (url.includes('apple.com')) {
        storeName = 'apple';
      } else if (url.includes('google.com')) {
        storeName = 'google';
      }
      
      if (typeof gtag === 'function') {
        gtag('event', 'click_store_badge', {
          'store_name': storeName,
          'destination_url': url
        });
      }
    });
  });
});