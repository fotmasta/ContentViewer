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

			if (!this.options.infinite_scrolling) {
				this.addNextButton();
			}

			var me = this;

			setTimeout(function () {
				var h = me.iframe.contents()[0].body.scrollHeight;

				// turn off scrolling on the iframe's content
				me.iframe.contents().find("html").css("overflow", "hidden");

				me.iframe.height(h);

				me.makeImagesModal();

				// if we're auto-advancing, don't scroll to any hashtags
				if (me.options.scrollTo) {
					me.options.manager.scrollToHash(me.iframe, me.options.index, true);
				}

				me.options.manager.onIFrameLoaded(me);
			}, 1000);
		},

		addStylesheet: function () {
			//var path = getAbsolutePath();

			var path;

			if (window.location.hostname == "localhost") {
				path = getAbsolutePath() + "/../completecourse";
			} else {
				path = "https://s3.amazonaws.com/storefronts/streaming-video/completecourse";
			}

			// add our own stylesheet for additional styles
			var $head = this.iframe.contents().find("head");
			$head.append($("<link/>",
				{ rel: "stylesheet", href: path + "/css/main.css", type: "text/css" }));

			var $body = this.iframe.contents().find("body").addClass("habitat-body");
		},

		addNextButton: function () {
			var obj = this.options.manager.getNextSection(this.options.index);

			var me = this;

			if (obj) {
				// add a next button
				var a = $('<button class="button button-a"><h4>Next Up </h4>' + obj.title + '</button>');
				a.click(function (event) {
					event.preventDefault();
					// NOTE: not sure at all why me.options.manager.getCurrentIndex() is undefined here; reference problem?
					me.options.manager.markItemCompleted(me.options.index);
					me.options.manager.playFromTOC(obj.index, {replaceAll: true});
				});

				this.iframe.contents().find("body").append(a);
			}
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