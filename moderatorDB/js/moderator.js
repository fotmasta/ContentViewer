requirejs.config({
	baseUrl: "js",
	paths: {
		"jquery": "https://s3.amazonaws.com/storefronts/streaming-video/completecourse/js/jquery-2.1.3.min",
		"jquery.ui": "https://s3.amazonaws.com/storefronts/streaming-video/completecourse/js/jquery-ui.min",
		"bootstrap": "bootstrap.min",
		"bootstrap-confirmation": "bootstrap-confirmation.min",
		"database": "https://s3.amazonaws.com/storefronts/streaming-video/completecourse_staging/js/database",
		"common": "https://s3.amazonaws.com/storefronts/streaming-video/completecourse_staging/js/common"
	},
	shim: {
		"jquery": {
			export: "$"
		},
		"jquery.ui": {
			export: "$"
		},
		"bootstrap": {
			deps: ["jquery"]
		},
		"bootstrap-confirmation": {
			deps: ["jquery", "bootstrap"],
			export: "$"
		}
	}
});

define(["jquery", "jquery.ui", "commentmoderator"], function ($) {
	$(".moderator").CommentModerator();
});

