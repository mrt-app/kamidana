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