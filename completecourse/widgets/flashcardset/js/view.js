var baseURL;

if (window.getInformITBaseURL)
	baseURL = window.getInformITBaseURL();
else if (window.parent.getInformITBaseURL)
	baseURL = window.parent.getInformITBaseURL();
else {
	if (window.location.hostname == "localhost") {
		baseURL = "../completecourse/";
	} else {
		baseURL = "https://s3.amazonaws.com/storefronts/streaming-video/completecourse/";
	}
}

requirejs.config({
	baseUrl: baseURL + "js/",
	paths: {
		"textfit": "../widgets/flashcardset/js/textfit.min",
		"dots": "../widgets/flashcardset/js/dots"
	},
	shim: {
		"dots": {
			export: "DotNav"
		},
	}
});

define(["textfit", "dots"], function (textFit) {
	var _defaultSettings = {
		cards: [],
		randomize: false,
		selectedChapters: [],
		hideMastered: false,
		cardOrder: []
	};

	var body;

	var CARD_MARGIN = 50;

	var _currentCardIndex = -1;

	var toggleAll = false;

	var hintInterval;

	var dotRatio = 1;

	$.widget("itp.flashcardset", {
		options: {},

		_create: function () {
			_defaultSettings.cards = this.options.paramData.cards;

			body = this.element.parent("body");

			initialize(_defaultSettings);
		}
	});

	return "flashcardset";

	function getSampleData () {
		var json = {
			cards: [{
				"chapters": [1, 2],
				"term": "adjacent-layer interaction",
				"definition": "The general topic of how on one computer, two adjacent layers in a networking architectural model work together, with the lower layer providing services to the higher layer."
			}, {
				"chapters": [1],
				"term": "de-encapsulation",
				"definition": "On a computer that receives data over a network, the process in which the device interprets the lower-layer headers and, when finished with each header, removes the header, revealing the next-higher-layer PDU."
			}, {
				"chapters": [1],
				"term": "encapsulation",
				"definition": "The placement of data from a higher-layer protocol behind the header (and in some cases, between a header and trailer) of the next-lower-layer protocol. For example, an IP packet could be encapsulated in an Ethernet header and trailer before being sent over an Ethernet."
			}, {
				"chapters": [1],
				"term": "frame",
				"definition": "A term referring to a data link header and trailer, plus the data encapsulated between the header and trailer."
			}, {
				"chapters": [2],
				"term": "networking model",
				"definition": "A generic term referring to any set of protocols and standards collected into a comprehensive grouping that, when followed by the devices in a network, allows all the devices to communicate. Examples include TCP/IP and OSI."
			}, {
				"chapters": [3],
				"term": "packet",
				"definition": "A logical grouping of bytes that includes the network layer header and encapsulated data, but specifically does not include any headers and trailers below the network layer."
			}]
		};

		return json;
	}

	function getSearchParameter (search) {
		return search.slice(1).split("&").reduce(function(t, e) {
			var i = e.split("="),
				n = decodeURIComponent(i[0]),
				s = i.length > 1 ? decodeURIComponent(i[1]) : null;
			return n && (t[n] = s), t
		}, {});
	}

	function onConfigFile (data) {
		var defaults = {
			randomize: false,
			selectedChapters: [],
			hideMastered: false
		};

		$.extend(data, defaults);

		initialize(data);
	}

	function onFailConfig () {
		_defaultSettings.cards = getSampleData().cards;

		initialize(_defaultSettings);
	}

	function shuffleArray (array) {
		for (var i = array.length - 1; i > 0; i--) {
			var j = Math.floor(Math.random() * (i + 1));
			var temp = array[i];
			array[i] = array[j];
			array[j] = temp;
		}
		return array;
	}

	function initializeDots () {
		var ul = body.find("#navigator .dotstyle ul");
		ul.empty();

		var w = body.find(".card").width() - 100;

		var SPACE_BETWEEN_DOTS = 30;

		var maxDots = Math.floor(w / SPACE_BETWEEN_DOTS);

		if (_settings.activeCards.length) {
			var numDots = Math.min(_settings.activeCards.length, maxDots);

			dotRatio = _settings.activeCards.length / numDots;

			for (var i = 0; i < numDots; i++) {
				var li = $("<li><a></a></li>");
				ul.append(li);
			}

			ul.append($("<li>", {class: "dummy"}));

			body.find(".dotstyle > ul").each(function (index, item) {
				var dots = new DotNav(item, {
					callback: function (idx) {
						gotoCard(idx);
					}
				});

				$(item).data("dots", dots);
			});
		}
	}

	function initializeChapterSelector () {
		var chapters = [], i;

		for (i = 0; i < _settings.cards.length; i++) {
			var card = _settings.cards[i];
			var ch = card.chapters;
			for (var j = 0; j < ch.length; j++) {
				var c = parseInt(ch[j]);
				if (chapters.indexOf(c) === -1) {
					chapters.push(c);
				}
			}
		}

		chapters = chapters.sort(function (a, b) { return a - b; });

		for (i = 0; i < chapters.length; i++) {
			var d = $("<div>", { class: "chapter-checkbox selected", "data-index": chapters[i] });
			var sp = $("<span>", { text: chapters[i] });
			sp.appendTo(d);

			body.find("#chapter-checkboxes").append(d);

			d.click(onClickChapter);
		}

		body.find("#chapter-count span.badge").text(chapters.length);

		_settings.selectedChapters = chapters;
	}

	function seedCardOrder () {
		for (var i = 0; i < _settings.cards.length; i++) {
			_settings.cards[i].index = i;
			_settings.cardOrder.push(i);
		}
		shuffleArray(_settings.cardOrder);
	}

	function initializeCards () {
		loadProgress();

		// only randomize once
		if (_settings.cardOrder.length == 0) {
			seedCardOrder();
		}

		refilterCards();
	}

	// this just gives us a count of valid cards
	function refilterCards () {
		_settings.activeCards = [];

		for (var i = 0; i < _settings.cards.length; i++) {
			var c = _settings.cards[i];
			if (isValid(c))
				_settings.activeCards.push(i);
		}
	}

	function initialize (data) {
		_settings = data;

		_settings.cardOrder = [];

		// use 500 as max height?
		var maxh = 500;

		// set height to 4x3
		var w = body.find(".card-holder").width();
		var h = Math.min(maxh, w * .75);
		body.find(".card-holder").height(h - CARD_MARGIN * 2);

		initializeChapterSelector();

		initializeCards();

		initializeDots();

		showNextCard();

		body.find(".card").click(onClickCard);

		body.find("#next-button").click(onClickNext);
		body.find("#prev-button").click(onClickPrevious);

		body.find("#toggle-all").click(onToggleAll);

		body.find("input[name='sort-order']").click(onClickSortOrder);

		body.find("#mastered-checkbox").click(onClickMastered);
		body.find("#hide-mastered").click(onClickHideMastered);

		hintInterval = setInterval(function () {
			body.find("#card-hint").removeClass("animated").hide(0).addClass("animated swing").show(0);
		}, 5000);
	}

	function getCurrentCard () {
		if (_settings.activeCards.length == 0) return null;

		if (_currentCardIndex == -1) {
			_currentCardIndex = 0;
		} else if (_currentCardIndex >= _settings.activeCards.length) {
			_currentCardIndex = _settings.activeCards.length - 1;
		}

		// get the nth active card (either from the ordered list or the randomized list)
		return getActiveCard(_currentCardIndex);
	}

	function isValid (card) {
		var ok = false;

		for (var i = 0; i < card.chapters.length; i++) {
			var ch = card.chapters[i];
			if (_settings.selectedChapters.indexOf(ch) != -1)
				ok = true;
		}

		if (_settings.hideMastered && card.mastered == true)
			ok = false;

		return ok;
	}

	function getActiveCard (index) {
		var n = 0;

		for (var i = 0; i < _settings.cards.length; i++) {
			var c;

			if (_settings.randomize) {
				c = _settings.cards[_settings.cardOrder[i]];
			} else {
				c = _settings.cards[i];
			}

			if (isValid(c)) {
				if (n == index)
					return c;
				else n++;
			}// else skip this card
		}

		return null;
	}

	function updateCard () {
		var card = getCurrentCard();

		if (card) {
			body.find(".card").css("display", "block");
			body.find("#no-card-label").css("display", "none");

			var id = body.find(".card").data("id");

			var curCard = getActiveCard(_currentCardIndex);

			if (id != curCard.index && body.find(".card").hasClass("flip180"))
				flipCardToFront();

			body.find(".card").data("id", curCard.index);

			var term = body.find(".card .front h1");
			term.css("white-space", "normal").text(card.term);
			textFit(term[0], {maxFontSize: 80});

			body.find("#mastered-checkbox").prop("checked", card.mastered == true);

			// delay a bit so the back of the card doesn't show right away (hey, no cheating!)
			setTimeout(function () {
				var def = body.find(".card .back #definition");
				def.css("white-space", "normal").text(card.definition);
				textFit(def[0], {maxFontSize: 40});
			}, 200);
		} else {
			body.find(".card").css("display", "none");
			body.find("#no-card-label").css("display", "block");
		}

		updatePositionStatus();
	}

	function updatePositionStatus () {
		var lbl = _currentCardIndex + 1;
		if (_settings.activeCards.length == 0) lbl = "-";

		body.find("#current-count").text(lbl);
		body.find("#total-count").text(" of " + _settings.activeCards.length);

		var ul = body.find("#navigator .dotstyle ul");
		var dots = ul.data("dots");
		if (dots) {
			var dotIndex = Math.floor(_currentCardIndex / dotRatio);
			dots.selectByIndex(dotIndex);
		}
	}

	function showNextCard () {
		flipCardToFront();

		if (_currentCardIndex < _settings.activeCards.length - 1) {
			if (_currentCardIndex != -1) {
				var w = body.find(".card").width();
				body.find(".card").animate({left: -w - CARD_MARGIN - 20}, 300, "easeInOutCubic", function () {
					_currentCardIndex++;
					updateCard();
					body.find(".card").css("left", w + CARD_MARGIN + 20).animate({left: 0}, 300, "easeInOutCubic");
				});
			} else {
				// show card on startup
				_currentCardIndex++;
				updateCard();
			}
		} else {
			// make card bump against the right
			body.find(".card").animate({ left: -25 }, 100).animate( { left: 0 }, 600, "easeOutElastic");
		}
	}

	function showPreviousCard () {
		flipCardToFront();

		if (_currentCardIndex > 0) {
			var w = body.find(".card").width();
			body.find(".card").animate({left: w + CARD_MARGIN + 20}, 300, "easeInOutCubic", function () {
				_currentCardIndex--;
				updateCard();
				body.find(".card").css("left", -w - CARD_MARGIN - 20).animate({left: 0}, 300, "easeInOutCubic");
			});
		} else {
			// make card bump against the left
			body.find(".card").animate({ left: 25 }, 100).animate( { left: 0 }, 600, "easeOutElastic");
		}
	}

	function gotoCard (dotIndex) {
		flipCardToFront();

		var idx = Math.floor(dotIndex * dotRatio + 1);

		if (idx > _currentCardIndex) {
			var w = body.find(".card").width();
			body.find(".card").animate({left: -w - CARD_MARGIN - 20}, 300, "easeInOutCubic", function () {
				_currentCardIndex = idx;
				updateCard();
				body.find(".card").css("left", w + CARD_MARGIN + 20).animate({left: 0}, 300, "easeInOutCubic");
			});
		} else {
			var w = body.find(".card").width();
			body.find(".card").animate({left: w + CARD_MARGIN + 20}, 300, "easeInOutCubic", function () {
				_currentCardIndex = idx;
				updateCard();
				body.find(".card").css("left", -w - CARD_MARGIN - 20).animate({left: 0}, 300, "easeInOutCubic");
			});
		}
	}

	function onClickCard (event) {
		var t = $(event.target).parents("#mastered-checkbox-holder");
		if (t.length) {
			return;
		}

		var card = body.find(".card");

		if (card.hasClass("flip180")) {
			card.removeClass("flip180 flip360");
			card.addClass("flip360")
		} else if (card.hasClass("flip360")) {
			card.removeClass("animated flip180 flip360");
			// flip back from zero after a refresh
			setTimeout(function () {
				card.addClass("flip180 animated");
			}, 10);
		} else {
			card.removeClass("flip180 flip360");
			card.addClass("flip180");
		}

		clearInterval(hintInterval);
		body.find("#card-hint").hide(1000);
	}

	function onClickNext (event) {
		cancelAnimations();

		showNextCard();
	}

	function onClickPrevious (event) {
		cancelAnimations();

		showPreviousCard();
	}

	function flipCardToFront (immediate) {
		var card = body.find(".card");

		if (immediate) {
			card.removeClass("animated flip180 flip360");
			setTimeout(function () {
				card.addClass("animated");
			}, 10);
		} else {
			card.removeClass("flip180 flip360");
		}
	}

	function cancelAnimations () {
		body.find(".card").stop();
	}

	function onToggleAll (event) {
		if (toggleAll)
			body.find(".chapter-checkbox").addClass("selected");
		else
			body.find(".chapter-checkbox").removeClass("selected");

		toggleAll = !toggleAll;

		updateChapterCount();

		refreshFromChapters();
	}

	function updateChapterCount () {
		var ch = body.find(".chapter-checkbox.selected");
		var chapters = ch.map(function (index, item) {
			return $(item).attr("data-index");
		});

		var count = chapters.length == 0 ? "no" : chapters.length;

		body.find("#chapter-count span.badge").text(count);

		body.find("span#chapter-label").text( (chapters.length == 1 ? "chapter" : "chapters") + " selected");
	}

	function onClickChapter (event) {
		$(event.currentTarget).toggleClass("selected");

		refreshFromChapters();
	}

	function refreshFromChapters () {
		var ch = body.find(".chapter-checkbox.selected");
		var chapters = ch.map(function (index, item) {
			return parseInt($(item).attr("data-index"));
		});

		_settings.selectedChapters = $.makeArray(chapters);

		updateChapterCount();

		refilterCards();

		if (_currentCardIndex >= _settings.activeCards.length)
			_currentCardIndex = _settings.activeCards.length - 1;

		initializeDots();
		updateCard();
		updatePositionStatus();
	}

	function onClickSortOrder (event) {
		var order = $(event.target).val();
		_settings.randomize = order == "random";

		updateCard();
	}

	function onClickMastered (event) {
		var card = getCurrentCard();
		if (card) {
			card.mastered = $(event.target).prop("checked");

			if (_settings.hideMastered) {
				refilterCards();

				initializeDots();
				updateCard();
				updatePositionStatus();
			}

			saveProgress();
		}
	}

	function onClickHideMastered (event) {
		var val = $(event.target).prop("checked");
		_settings.hideMastered = val;

		refilterCards();

		initializeDots();
		updateCard();
		updatePositionStatus();
	}

	function getKey () {
		return "flashcards-" + window.location.pathname;
	}

	function getProgress () {
		var progress = "";

		for (var i = 0; i < _settings.cards.length; i++) {
			var c = _settings.cards[i];
			progress += c.mastered ? "m" : " ";
		}

		return progress;
	}

	function saveProgress () {
		var key = getKey();

		var progress = getProgress();

		localStorage.setItem(key, progress);
	}

	function loadProgress () {
		var key = getKey();

		var progress = localStorage.getItem(key);

		if (progress) {
			for (var i = 0; i < _settings.cards.length; i++) {
				var c = _settings.cards[i];
				c.mastered = (progress[i] === "m");
			}
		}
	}
});