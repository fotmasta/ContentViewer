define(["bootstrap-dialog", "imagesloaded", "jquery.ui"], function (BootstrapDialog, imagesLoaded) {

	function URLWithoutPage (url) {
		var n = url.lastIndexOf("/");
		if (n != -1) return url.substr(0, n);
		else return url;
	}

	function URLPageOnly (url) {
		var n = url.lastIndexOf("/");
		if (n != -1) return url.substr(n);
		else return url;
	}

	function URLWithoutHash (url) {
		if (url) {
			var n = url.lastIndexOf("#");
			if (n != -1) return url.substr(0, n);
			else return url;
		} else
			return url;
	}

	function HashInURL (url) {
		if (url) {
			var n = url.lastIndexOf("#");
			if (n != -1) return url.substr(n);
			else return "";
		} else {
			return "";
		}
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

			var src = URLWithoutHash(this.options.src);

			this.iframe = $("<iframe>", { src: src, frameborder: 0 });

			this.iframe.load($.proxy(this.onLoaded, this));

			this.element.append(this.iframe);

			this.addStylesheet();
		},

		loadNewContent: function (options) {
			this.options = options;

			var src = URLWithoutHash(this.options.src);

			this.iframe.attr("src", src).css("height", "auto");
		},

		onLoaded: function ()  {
			this.addStylesheet();

			if (!this.options.infinite_scrolling) {
				this.addPreviousButton();
				this.addNextButton();
			}

			this.overrideLinks();

			var me = this;

			imagesLoaded(this.iframe.contents().find("body"), $.proxy(this.onIframeContentsLoaded, this));
		},

		onIframeContentsLoaded: function () {
			var me = this;

			if (me.iframe.contents()[0]) {
				var h = me.iframe.contents()[0].body.scrollHeight;

				// turn off scrolling on the iframe's content
				// NOTE: I was tempted to comment this out for ePub content from CodeMantra to allow the scroll thumb to appear (but the disappearing thumb could be a Mac/Chrome thing)
				me.iframe.contents().find("html").css("overflow", "hidden");

				me.iframe.height(h);

				me.iframe.scrollTop(1).scrollTop(0);

				me.highlight(me.options.highlight);

				me.makeImagesModal();

				// NOTE: if we're auto-advancing, don't scroll to any hashtags

				if (me.options.scrollTo) {
					var hash = HashInURL(me.options.src);
					if (me.options.hash)
						hash = me.options.hash;

					me.options.manager.scrollToHash(me.iframe, { hash: hash }, true);
				}

				me.options.manager.onIFrameLoaded(me);
			}
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

		highlight: function (terms) {
			if (terms) {
				var allTerms = terms.split(" ");
				this.iframe.contents().find("body").unhighlight().highlight(allTerms);
			}
		},

		unhighlight: function () {
			this.iframe.contents().find("body").unhighlight();
		},

		addPreviousButton: function () {
			var obj = this.options.manager.getPreviousSection(this.options.index);

			var me = this;

			if (obj) {
				// add a next button
				var a = $('<button class="button button-a"><h4>Previous </h4>' + obj.title + '</button>');
				a.click(function (event) {
					event.preventDefault();
					// NOTE: not sure at all why me.options.manager.getCurrentIndex() is undefined here; reference problem?
					me.options.manager.markItemCompleted(me.options.index);
					me.options.manager.playFromTOC(obj.index, {replaceAll: true});
				});

				this.iframe.contents().find("body").prepend(a);
			}
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

		overrideLinks: function () {
			// THEORY: don't override all links
			this.iframe.contents().find("a[href]").click($.proxy(this.onClickLink, this));
		},

		onClickLink: function (event) {
			event.preventDefault();
			var href = $(event.target).attr("href");
			// find the toc entry with this href and go there (including the link index # in our address bar)
			this.options.manager.triggerInternalLink(href);
		},

		makeImagesModal: function () {
			// find image links within figures
			var figs = this.iframe.contents().find("figure a img, .image img");
			var me = this;

			figs.each(function (index, item) {
				var captionTitle = $(item).parents("figure").find(".caption-title");
				var title = "Image";
				if (captionTitle.length) {
					title = captionTitle.text();
				}

				var a = $(item).parent("a");

				// ePUB:
				if (!a.length) {
					a = $(item);
				}

				var fullpath = me.iframe[0].contentWindow.location.href;
				var path = URLWithoutPage(fullpath);

				var imageURL = a.attr("href");

				// ePUB:
				if (!imageURL) {
					imageURL = $(item).attr("src");
				}

				a.click(function (event) {
					event.preventDefault();
					event.stopImmediatePropagation();

					var contents = '<iframe src="' + path + "/" + imageURL + '" width="100%" height="__window height__" frameborder="0"></iframe>';

					var wh = $(window).outerHeight();
					contents = contents.replace("__window height__", (wh * .75));

					BootstrapDialog.show({
						title: title,
						message: contents,
						size: BootstrapDialog.SIZE_WIDE
					});
				});
			});

			// find just images within figures
			var figs = this.iframe.contents().find("figure img");
			var me = this;

			figs.each(function (index, item) {
				var captionTitle = $(item).parents("figure").find(".caption-title");
				var title = "Image";
				if (captionTitle.length) {
					title = captionTitle.text();
				}

				var fig = $(item);
				var fullpath = me.iframe[0].contentWindow.location.href;
				var path = URLWithoutPage(fullpath);

				fig.click(function (event) {
					event.preventDefault();

//					var contents = '<iframe src="' + path + "/" + fig.attr("src") + '" width="100%" height="__window height__" frameborder="0"><p>This is a test.</p></iframe>';
					var contents = '<div class="image_popup" style="height: __window height__px"><img src="' + path + "/" + fig.attr("src") + '"/></div>';

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