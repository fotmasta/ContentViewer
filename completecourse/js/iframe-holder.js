define(["bootstrap-dialog", "jquery.ui"], function (BootstrapDialog) {

	function URLWithoutPage (url) {
		var n = url.lastIndexOf("/");
		if (n != -1) return url.substr(0, n);
		else return url;
	}

	function getAbsolutePath () {
		var loc = window.location;
		var pathName = loc.pathname.substring(0, loc.pathname.lastIndexOf('/'));
		return loc.origin + pathName;
	}

	$.widget("que.iFrameHolder", {
		options: {},

		_create: function () {
			this.element.attr("data-index", this.options.index);

			this.iframe = $("<iframe>", { src: this.options.src, frameborder: 0 });

			this.iframe.load($.proxy(this.onLoaded, this));

			this.element.append(this.iframe);
		},

		onLoaded: function ()  {
			this.addStylesheet();

			//this.addNextButton();

			var h = this.iframe.contents()[0].body.scrollHeight;

			// turn off scrolling on the iframe's content
			this.iframe.contents().find("html").css("overflow", "hidden");

			this.iframe.height(h);

			this.makeImagesModal();

			// if we're auto-advancing, don't scroll to any hashtags
			if (this.options.scrollTo) {
				this.options.manager.scrollToHash(this.iframe, this.options.index, true);
			}

			this.options.manager.onIFrameLoaded(this);
		},

		addStylesheet: function () {
			//var path = getAbsolutePath();
			//var path = getAbsolutePath() + "/../completecourse";
			var path = "https://s3.amazonaws.com/storefronts/streaming-video/completecourse";

			// add our own stylesheet for additional styles
			var $head = this.iframe.contents().find("head");
			$head.append($("<link/>",
				{ rel: "stylesheet", href: path + "/css/main.css", type: "text/css" }));
		},

		addNextButton: function () {
			var obj = this.options.manager.getNextSection(this.options.index);

			// add a next button
			var a = $('<a href="" class="button button-a"><h4>Next Up </h4>' + obj.title + '</a>');
			a.click(function (event) {
				event.preventDefault();
				//onPlayVideo(a, obj.index);
				console.log("play video " + obj.index);
			});

			this.iframe.contents().find("body").append(a);
		},

		makeImagesModal: function () {
			// find image links within figures
			var figs = this.iframe.contents().find("figure a img");
			var me = this;

			figs.each(function (index, item) {
				var captionTitle = $(item).parents("figure").find(".caption-title");
				var title = "Image";
				if (captionTitle.length) {
					title = captionTitle.text();
				}

				var a = $(item).parent("a");
				var fullpath = me.iframe[0].contentWindow.location.href;
				var path = URLWithoutPage(fullpath);

				a.click(function (event) {
					event.preventDefault();

					var contents = '<iframe src="' + path + "/" + a.attr("href") + '" width="100%" height="__window height__" frameborder="0"></frame>';

					var wh = $(window).outerHeight();
					contents = contents.replace("__window height__", (wh * .75));

					BootstrapDialog.show({
						title: title,
						message: contents,
						size: BootstrapDialog.SIZE_WIDE
					});
				});
			});
		}
	});
});