define(["bootstrap-dialog", "imagesloaded", "database", "jquery.ui"], function (BootstrapDialog, imagesLoaded, Database) {

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

	function getCodePath () {
		var path;

		if (window.location.hostname == "localhost") {
			path = getAbsolutePath() + "/../completecourse/";
		} else {
			if (window.getInformITBaseURL != undefined)
				path = getInformITBaseURL();
			else
				path = "https://s3.amazonaws.com/storefronts/streaming-video/completecourse/";
		}

		return path;
	}

	function getAbsolutePath () {
		var loc = window.location;
		var pathName = loc.pathname.substring(0, loc.pathname.lastIndexOf('/'));
		return loc.origin + pathName;
	}

	function ParseWidget (src) {
		var regex = /^\[.*\]/;
		if (regex.test(src)) {
			var params = /^\[(.*),(.*)\]/;
			var match = src.match(params);
			if (match.length) {
				var widget = {src: match[1].trim(), params: match[2].trim()};
				return widget;
			}
		}
		return {};
	}

	function IsWidget (src) {
		var regex = /^\[.*\]/;
		if (regex.test(src)) {
			var params = /^\[(.*),(.*)\]/;
			var match = src.match(params);
			if (match.length) return true;
		}
		return false;
	}

	function IsPDF (src) {
		return src.toLowerCase().substr(-3) == "pdf";
	}

	$.widget("que.iFrameHolder", {
		options: {},

		_create: function () {
			this.element.addClass("the-iframe-holder").attr("data-index", this.options.index);

			var src = URLWithoutHash(this.options.src);

			if (IsWidget(src)) {
				this.widgetName = undefined;
				var widget = ParseWidget(src);
				this.iframe = $("<iframe>", {class: "content", src: "", frameborder: 0, "allowfullscreen": true});
				this.injectWidget(widget.src, widget.params);
			} else if (IsPDF(src)) {
				this.iframe = $("<iframe>", { class: "content pdf", src: "", frameborder: 0, "allowfullscreen": true, height: "100%"});
			} else {
				this.iframe = $("<iframe>", { class: "content", src: src, frameborder: 0, "allowfullscreen": true });
			}

			this.element.css("display", "none");

			this.iframe.load($.proxy(this.onLoaded, this));

			this.element.append(this.iframe);

			// a rather inelegant way to check for size changes :(
			setInterval($.proxy(this.sizeToBottom, this), 1000);
		},

		loadNewContent: function (options) {
			this.options = options;
			this.widgetName = undefined;

			var src = URLWithoutHash(this.options.src);

			this.iframe.removeClass("pdf");

			if (IsWidget(src)) {
				// clear out the old content
				this.iframe.contents().find("html,body").scrollTop(0);
				this.iframe.attr("src", "index.html").attr("src", "").height("100%");

				var widget = ParseWidget(src);
				this.injectWidget(widget.src, widget.params);
			} else if (IsPDF(src)) {
				this.iframe.contents().find("html").remove();
				this.iframe.height("100%");
				this.iframe.attr("src", "index.html").attr("src", "");
				this.iframe.addClass("pdf");
			} else {
				this.iframe.attr("src", src).height("auto");
			}
		},

		sizePDFToFit: function () {
			var b = this.iframe.contents().find("button").outerHeight() * 2 + 20;
			var embed = this.iframe.contents().find("embed");
			var h = this.element.parents("#video").height();
			var embed_height = h - b;
			embed.height(embed_height);
			this.iframe.height(h);
		},

		// iOS has fits if you don't give the iframe a specific height
		sizeToBottom: function () {
			if (this.iframe.hasClass("pdf")) {
				this.sizePDFToFit();
				return;
			}

			var bottom = this.iframe.contents().find("[data-iframe-height]");
			if (bottom.length) {
				var h = Math.ceil(bottom.offset().top + bottom.outerHeight());
				var frameh = this.iframe.height();
				if (h != frameh) {
					this.iframe.height(h);
				}
			} else {
				// no bottom element (ie, Captivate quiz)
				var body = this.iframe.contents().find("body");
				if (body.length) {
					var h = $(body[0].ownerDocument).height();
					var frameh = this.iframe.height();
					if (h != frameh) {
						this.iframe.height(h);
					}
				}
			}
			/*
			// on desktop, we can abort early
			var el = this.iframe;
			if (el.css("height") == "100%") {
				return;
			} else if (el.hasClass("pdf")) {
				this.sizePDFToFit();
				return;
			}

			// size only on iOS
			if (el.parent() && el.parent().height() != el.height()) {
				var bottom = this.iframe.contents().find("[data-iframe-height]");
				if (bottom.length) {
					var h = Math.ceil(bottom.offset().top + bottom.outerHeight());
					var frameh = this.iframe.height();
					if (h != frameh) {
						this.iframe.height(h);
					}
				} else {
					// no bottom element (ie, Captivate quiz)
					var body = this.iframe.contents().find("body");
					if (body.length) {
						var h = $(body[0].ownerDocument).height();
						var frameh = this.iframe.height();
						if (h != frameh) {
							this.iframe.height(h);
						}
					}
				}
			}
			*/
		},

		onLoaded: function ()  {
			this.addStylesheet();

			if (!this.options.infinite_scrolling) {
				this.addPreviousButton();
				this.addNextButton();
			}

			this.overrideLinks();

			/*
			// desktop:
			this.iframe.contents().scroll($.proxy(this.onScrollIframe, this));
			// iOS:
			$(".the-iframe-holder").scroll($.proxy(this.onScrollIframe, this));
			*/

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

			var src = URLWithoutHash(this.options.src);
			if (IsPDF(src)) {
				var s = $("<embed src=\"" + src + "\" width=\"100%\" height=\"100%\" type=\"application/pdf\"></embed>");
				var f = this.iframe.contents().find(".header-prev-button").after(s);
				this.sizePDFToFit();
			}

			if (this.options.disabledContent) {
				var desc = this.options.manager.getTOCTitleForID(this.options.index);
				this.iframe.contents().find(".panel-title").text(desc);
			}
		},

		onIframeContentsLoaded: function () {
			this.sizeToBottom();

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

				// NOTE: I think this was disrupting the render and touch-scrolling of the iframe on iOS (probably because of 3D rendering "optimizations")
				var is_iOS = /iPad|iPhone|iPod/.test(navigator.platform);
				if  (!is_iOS) {
					me.iframe.removeClass("fadeIn animated").hide(0);
					me.iframe.addClass("fadeIn animated").show(0);
				} else {
					this.element.addClass("ios");   // .the-iframe-holder (custom iOS attributes to correct scrolling problems)
				}

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
			var path = getCodePath();

			// add our own stylesheet for additional styles
			var $head = this.iframe.contents().find("head");
			$head.append($("<link/>",
				{ rel: "stylesheet", href: path + "css/main.css", type: "text/css" }));

			var skin = "";
			if (this.options.manager.options) {
				if (this.options.manager.options.skin)
					skin = "skin-" + this.options.manager.options.skin;

				if (this.options.manager.options.type)
					skin += " type-" + this.options.manager.options.type;
			}

			var $body = this.iframe.contents().find("body").addClass("habitat-body " + skin);
			var $html = this.iframe.contents().find("html").addClass("habitat-html");
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
				var a = $('<button class="button button-a nav-button header-prev-button"><p class="button-label">Previous </p>' + obj.title + '</button>').data("goto-index", obj.index);
				a.click($.proxy(this.onClickJumpButton, this));

				this.iframe.contents().find("body").prepend(a);
			}
		},

		addNextButton: function () {
			var obj = this.options.manager.getNextSection(this.options.index);

			if (obj) {
				// add a next button
				var a = $('<button id="next-button" data-iframe-height="true" class="button button-a nav-button"><p class="button-label">Next </p>' + obj.title + '</button>').data("goto-index", obj.index);
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
			var href = $(event.currentTarget).attr("href");

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
		},

		// parent window scrolled
		onScroll: function (event) {
			var widget = this.getWidget();
			if (widget && widget.onScroll) widget.onScroll(event);
		},

		returnHumanReadableTOCNames: function (list) {
			return this.options.manager.getTOCNames(list);
		},

		injectWidget: function (src, params) {
			var base = window.getInformITBaseURL();
			$.get(base + src, $.proxy(this.onWidgetLoaded, this, { src: src, params: params } ));

		},

		onWidgetLoaded: function (obj, data) {
			var iframe = this.iframe[0];
			var me = this;

			var desc;
			if (this.options.manager && this.options.index != undefined)
				desc = this.options.manager.getTOCTitleForID(this.options.index);

			if (iframe.contentWindow) {
				iframe.contentWindow.document.open();
				iframe.contentWindow.document.write(data);
				iframe.contentWindow.document.close();

				// CONVENTION: parse widget name from data-js in widget's index.html; the widget returns its name; get css and js files to load from the widget's index.html
				var regex, matches;

				regex = /data-css="(.*?)"/ig;
				matches = regex.exec(data);
				if (matches && matches.length) {
					var cssURL = matches[1];

					var $head = this.iframe.contents().find("head");
					var path = getCodePath();
					$head.append($("<link/>",
						{ rel: "stylesheet", href: path + cssURL, type: "text/css" }));
				}

				regex = /data-js="(.*?)"/ig;
				matches = regex.exec(data);
				if (matches && matches.length) {
					var js = matches[1];

					var reqs = [js];

					var dataPath;

					// load parameters via js
					if (obj.params) {
						var path = URLWithoutPage(window.location.pathname);
						reqs.push(path + "/" + obj.params);
						dataPath = URLWithoutPage(obj.params);
					}

					require(reqs, function (widget_name, data) {
						me.widgetName = widget_name;
						me.theWidget = me.iframe.contents().find("#the_widget")[widget_name]({data: obj.params, iframe: me, jquery: $, desc: desc, paramData: data, path: dataPath});
					});
				}
			}
		},

		getWidget: function () {
			if (this.widgetName) {
				var widget = this.iframe.contents().find("#the_widget")[this.widgetName]("instance");
				return widget;
			}
			return undefined;
		},

		isCompletable: function () {
			var widget = this.getWidget();

			return widget && widget.isComplete != undefined;
		},

		isComplete: function () {
			var widget = this.getWidget();

			return widget && widget.isComplete && widget.isComplete();
		},

		showAlert: function (title, text, yesCallback) {
			BootstrapDialog.show({
				title: title,
				message: text,
				buttons: [
					{
						label: 'Yes',
						cssClass: 'btn-primary',
						action: function (dialog) {
							dialog.close();
							yesCallback();
						}
					},
					{
						label: 'Cancel',
						cssClass: 'btn-warning',
						action: function (dialog) {
							dialog.close();
						}
					}
				]
			});
		}
	});
});