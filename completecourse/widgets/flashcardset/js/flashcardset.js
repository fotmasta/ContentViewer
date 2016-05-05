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
		"view": "../widgets/flashcardset/js/view",
		"dots": "../widgets/flashcardset/js/dots",
	},
	shim: {
		"dots": {
			export: "DotNav"
		},
	}
});

define(["view"], function (view) {
	$.widget("itp.flashcardset", {
		options: {},

		_create: function () {
			view.initialize({
				el: this.element,
				cards: this.options.paramData.cards
			});
		}
	});

	return "flashcardset";
});