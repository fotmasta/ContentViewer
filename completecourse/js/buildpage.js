requirejs.config({
	/*baseUrl: "https://s3.amazonaws.com/storefronts/streaming-video/completecourse/js/",*/
	baseUrl: "../completecourse/js",
	paths: {
		"jquery": "jquery-2.1.3.min",
		"jquery.ui": "jquery-ui.min",
		"jquery.json": "jquery.json.min",
		"jquery.onscreen": "jquery.onscreen",
		"bootstrap": "bootstrap",
		"bootstrap-notify": "bootstrap-notify.min",
		"bootstrap-dialog": "bootstrap-dialog.min",
		"imagesloaded": "imagesloaded.pkgd.min",
		"popcorn": "popcorn-complete.min",
		"bootstrap-toolkit": "bootstrap-toolkit.min",
		"videojs": "video.dev",
		"videojs-markers": "videojs-markers",
		"handlebars": "handlebars-v3.0.3"
	},
	shim: {
		"jquery": {
			export: "$"
		},
		"jquery.ui": {
			export: "$"
		},
		"jquery.json": {
			export: "$",
			deps: ['jquery']
		},
		"jquery.onscreen": {
			export: "$",
			deps: ['jquery']
		},
		"bootstrap": {
			export: "$",
			deps: ['jquery']
		},
		"bootstrap-notify": {
			export: "$",
			deps: ['bootstrap']
		},
		"bootstrap-dialog": {
			deps: ['bootstrap']
		},
		"popcorn": {
			export: "Popcorn"
		},
		"popcorn.timebase": {
			export: "Popcorn",
			deps: ['popcorn']
		},
		"bootstrap-toolkit": {
			export: "$",
			deps: ["jquery"]
		},
		"videojs": {
			export: "videojs",
			deps: ["jquery"]
		},
		"videojs-markers": {
			deps: ["videojs", "jquery"]
		},
		"imagesloaded": {
			export: "$",
			deps: ["jquery"]
		},
		"handlebars": {
			exports: "Handlebars"
		}
	}
});

define(["jquery", "handlebars", "text!viewer_template.html", "video-manager", "toc-tree", "videojs", "popcorn", "popcorn.timebase"], function ($, Handlebars, viewerTemplate, VideoManager) {
	var manifest;

	function initialize () {
		onResize();

		// NOTE: started using opacity too since the tab panels were overriding "invisible"
		$("#main").removeClass("invisible").css("opacity", 1);

		/*
		 if (!coachMarksShown) {
		 $("#coach-marks").CoachMarks().CoachMarks("instance").open();
		 coachMarksShown = true;
		 }
		 */
	}

	function onResize () {
		var wh = $(window).outerHeight();

		$("#contents").outerHeight(wh - 50);
		$("#video").outerHeight(wh - 50);
		$("#sidebar").outerHeight(wh - 50);

		// kludge to subtract main menu bar and course progress
		$("#contents .scroller").height(wh - 50 - 50);

		$("#main_video").css("max-height", wh - 50);
	}

	function addLinkToCSS (url) {
		var link = $("<link/>",
			{ rel: "stylesheet", href: url, type: "text/css" });
		$("head").append(link);
	}

	function convertHabitatTOCtoMetadata (data) {
		var links = $(data).find("a");

		var metadata = links.map(function (index, item) {
			var a = $(item);
			var href = a.attr("href");
			var hash = VideoManager.HashInURL(href);
			return {
				desc: a.text(),
				src: manifest.folder + "/OPS/" + a.attr("href"),
				hash: hash
			};
		});

		return metadata;
	}

	function onLoadedTOC (metadata) {
		/*
		 $(".toc").TOCTree({ data: metadata.toc });

		 $(".resource-list").TOCTree();

		 VideoManager.initialize(metadata.toc, "#video video", videojs("main_video"), metadata.markers);

		 //VideoManager.loadFirstVideo();
		 VideoManager.loadMostRecentVideo();
		 */
	}

	function onHabitatTOCLoaded (data) {
		$(".toc").TOCTree({ type: "habitat", data: data });

		var metadata = convertHabitatTOCtoMetadata(data);

		VideoManager.initialize(metadata, "#video video", videojs("main_video"), []);

		initialize();

		VideoManager.loadMostRecentVideo();
	}

	function loadContent () {
		switch (manifest.type) {
			case "metadata":
				require([manifest.folder + "/nodejs-toc.js"], onLoadedTOC);
				break;
			case "habitat":
				$.get(manifest.folder + "/OPS/toc.xhtml", onHabitatTOCLoaded);
				break;
		}
	}

	var BuildPage = {
		build: function (options) {
			var template = Handlebars.compile(viewerTemplate);
			var context = { title: options.title };
			var html = template(context);

			$("body").append($(html));

			addLinkToCSS("../completecourse/css/bootstrap.min.css");
			addLinkToCSS("../completecourse/css/bootstrap-theme.min.css");
			addLinkToCSS("../completecourse/css/animate.css");
			addLinkToCSS("../completecourse/css/font-awesome.min.css");
			addLinkToCSS("../completecourse/css/video-js.min.css");
			addLinkToCSS("../completecourse/css/bootstrap-dialog.min.css");
			addLinkToCSS("../completecourse/css/videojs.markers.min.css");
			addLinkToCSS("../completecourse/css/main.css");

			manifest = options;

			loadContent();

			$(window).resize(onResize);
		}
	};

	return BuildPage;
});