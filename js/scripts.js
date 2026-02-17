(function () {
	function getBrowserLanguage() {
	var nav = window.navigator;
	var lang =
		nav.language ||
		nav.browserLanguage ||
		nav.userLanguage ||
		'ja';
	return String(lang).toLowerCase();
	}

	var language = getBrowserLanguage();
	var isJapanese = language.startsWith('ja');

	if (
	!location.search.includes('lang') &&
	!isJapanese &&
	!location.pathname.includes('index-en')
	) {
	location.href = './index-en.html';
	}
})();

document.addEventListener('DOMContentLoaded', function() {
  const storeBadges = document.querySelectorAll('.store-badge');
  storeBadges.forEach(function(badge) {
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