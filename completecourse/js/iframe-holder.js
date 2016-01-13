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
			this.element.addClass("the-iframe-holder").attr("data-index", this.options.index);

			var src = URLWithoutHash(this.options.src);

			this.iframe = $("<iframe>", { src: src, frameborder: 0, "allowfullscreen": true });

			this.element.css("display", "none");

			this.iframe.load($.proxy(this.onLoaded, this));

			this.element.append(this.iframe);

			//this.addStylesheet();
		},

		loadNewContent: function (options) {
			this.options = options;

			var src = URLWithoutHash(this.options.src);

			this.iframe.hide(0);

			this.iframe.attr("src", src);
		},

		onLoaded: function ()  {
			this.addStylesheet();

			if (!this.options.infinite_scrolling) {
				this.addPreviousButton();
				this.addNextButton();
			}

			this.overrideLinks();

			this.iframe.contents().scroll($.proxy(this.onScrollIframe, this));

			var me = this;

			switch (this.options.type) {
				case "metadata":
					this.element.show(0);

					var wh = $(window).outerHeight();
					//this.iframe.css("min-height", wh);

					this.iframe.removeClass("fadeIn animated").hide(0);
					this.iframe.addClass("fadeIn animated").show(0);

					this.iframe[0].contentWindow.addEventListener("moduleReadyEvent", function (evt) {
						var interfaceObj = evt.Data;
						if (interfaceObj) {
							var eventEmitterObj = interfaceObj.getEventEmitter();
							if (eventEmitterObj) {
								// NOTE: this didn't seem to trigger
								eventEmitterObj.removeEventListener("CPAPI_QUESTIONSUBMIT");
								eventEmitterObj.addEventListener("CPAPI_QUESTIONSUBMIT", function (e) {
									var percent = me.iframe[0].contentWindow.cpAPIInterface.getVariableValue("cpInfoPercentage");
									//console.log("percent = " + percent);
								});
							}
						}
					});

					this.options.manager.onIFrameLoaded(me);
					break;
				default:    // epub, habitat
					imagesLoaded(this.iframe.contents().find("body"), $.proxy(this.onIframeContentsLoaded, this));

					break;
			}
		},

		onIframeContentsLoaded: function () {
			var me = this;

			if (me.iframe.contents()[0]) {

				var xs = ResponsiveBootstrapToolkit.is("xs");

				// let the content know if it's xs (this is also done when resizing but needs to be done here for initial loading)
				me.iframe.contents().find(".habitat-body").removeClass("xs");
				if (xs) {
					me.iframe.contents().find(".habitat-body").addClass("xs");
				}

				me.highlight(me.options.highlight);

				me.makeImagesModal();

				this.element.show(0);

				me.iframe.removeClass("fadeIn animated").hide(0);
				me.iframe.addClass("fadeIn animated").show(0);

				// NOTE: if we're auto-advancing, don't scroll to any hashtags

				if (me.options.scrollTo) {
					var hash = HashInURL(me.options.src);
					if (me.options.hash)
						hash = me.options.hash;

					me.options.manager.scrollToHash(me.iframe, { hash: hash }, true);
				}

				me.options.manager.onIFrameLoaded(me.iframe);
			}
		},

		addStylesheet: function () {
			var path;

			if (window.location.hostname == "localhost") {
				path = getAbsolutePath() + "/../completecourse/";
			} else {
				path = getInformITBaseURL();
			}

			// add our own stylesheet for additional styles
			var $head = this.iframe.contents().find("head");
			$head.append($("<link/>",
				{ rel: "stylesheet", href: path + "css/main.css", type: "text/css" }));

			var skin = "";
			if (this.options.manager.options && this.options.manager.options.skin)
				skin = "skin-" + this.options.manager.options.skin;

			var $body = this.iframe.contents().find("body").addClass("habitat-body " + skin);
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

			if (obj) {
				// add a next button
				var a = $('<button class="button button-a header-prev-button"><h4>Previous </h4>' + obj.title + '</button>').data("goto-index", obj.index);
				a.click($.proxy(this.onClickJumpButton, this));

				this.iframe.contents().find("body").prepend(a);
			}
		},

		addNextButton: function () {
			var obj = this.options.manager.getNextSection(this.options.index);

			if (obj) {
				// add a next button
				var a = $('<button id="next-button" class="button button-a"><h4>Next </h4>' + obj.title + '</button>').data("goto-index", obj.index);
				a.click($.proxy(this.onClickJumpButton, this));

				this.iframe.contents().find("body").append(a);
			}
		},

		onClickJumpButton: function (event) {
			event.preventDefault();

			var next = $(event.currentTarget).data("goto-index");
			var cur = this.options.manager.getCurrentIndex();

			$(this.element).trigger("jump", { depth: next, options: { markCurrent: cur, replaceAll: true } });
		},

		overrideLinks: function () {
			// THEORY: don't override all links
			this.iframe.contents().find("a[href]").click($.proxy(this.onClickLink, this));
		},

		onClickLink: function (event) {
			event.preventDefault();
			var href = $(event.target).attr("href");

			// external link
			if  (href.indexOf("http:") != -1 || href.indexOf("mailto") != -1) {
				window.open(href, "_blank");
			} else {
				// find the toc entry with this href and go there (including the link index # in our address bar)
				var found = this.options.manager.findInternalLink(href);
				if (found)
					this.options.manager.triggerInternalLink(href);
				else {
					this.options.manager.openExtraPage(href);
				}
			}
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
		},

		onScrollIframe: function (event) {
			if (this.options.manager)
				this.options.manager.onScrollContent();
		}
	});
});