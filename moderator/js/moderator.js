requirejs.config({
	baseUrl: "js",
	paths: {
		"jquery": "https://s3.amazonaws.com/storefronts/streaming-video/completecourse/js/jquery-2.1.3.min",
		"jquery.ui": "https://s3.amazonaws.com/storefronts/streaming-video/completecourse/js/jquery-ui.min",
		"bootstrap": "bootstrap.min",
		"firebase": "https://cdn.firebase.com/js/client/2.3.2/firebase",
		"bootstrap-confirmation": "bootstrap-confirmation.min"
	},
	shim: {
		"jquery": {
			export: "$"
		},
		"jquery.ui": {
			export: "$"
		},
		"firebase": {
			export: "Firebase"
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
	$("#sign-in").click(signIn);

	$(".moderator").CommentModerator();

	function signIn () {
		var email = $("#inputEmail").val();
		var password = $("#inputPassword").val();

		$(".moderator").CommentModerator("authorizeWithPassword", email, password);
	}
});

