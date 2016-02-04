define(["bootstrap-dialog", "database", "bootstrap-notify", "videojs", "videojs-markers", "jquery.onscreen", "jquery.scrollTo", "iframe-holder", "jquery.ui"], function (BootstrapDialog, Database) {

	// NOTE: I don't understand why I couldn't use this.waitingForAutoAdvance; somehow the instance of VideoManager passed into iframe-holder wasn't the same (!)

	String.prototype.toHHMMSS = function () {
		var sec_num = parseInt(this, 10);
		var hours   = Math.floor(sec_num / 3600);
		var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
		var seconds = sec_num - (hours * 3600) - (minutes * 60);

		if (hours < 10) { hours   = "0" + hours; }
		if (minutes < 10) { minutes = "0" + minutes; }
		if (seconds < 10) { seconds = "0" + seconds; }

		var time = (hours == "00" ? "" : hours + ":")
			+ (minutes == "00" && hours == "00" ? "" : minutes)
			+ ":" + seconds;

		return time;
	};

	function HashInURL (url) {
		if (url) {
			var n = url.lastIndexOf("#");
			if (n != -1) return url.substr(n);
			else return "";
		} else {
			return "";
		}
	}

	function URLWithoutHash (url) {
		if (url === undefined) return url;

		// eliminate relative path notations
		url = url.replace(/^\.\.\//, "");

		// change Habitat's .xhtml to .html
		url = url.replace(/\.xhtml/, ".html");

		if (url) {
			if (url.lastIndexOf) {

			} else {
				debugger;
			}
			var n = url.lastIndexOf("#");
			if (n != -1) return url.substr(0, n);
			else return url;
		} else
			return url;
	}

	function URLPageOnly (url) {
		if (url) {
			var n = url.lastIndexOf("/");
			if (n != -1) return url.substr(n + 1);
			else return url;
		} else
			return url;
	}

	function iFrameElementsOnScreen (elements, iframe) {
		var visible = [];
		var $iframe = $(iframe);

		// NOTE: iOS fix has to account for scrolling because getBoundingClientRect doesn't
		var h = $(window).height() + $(".the-iframe-holder").scrollTop();

		for (var i = 0; i < elements.length; i++) {
			var elem = elements[i];
			var rect = elem.getBoundingClientRect();
			if ( (rect.top >= 0 && rect.top <= h) ||
				(rect.bottom >= 0 && rect.bottom <= h) ||
				(rect.height >= h && rect.top <= h && rect.bottom >= h)) {
				visible.push(elem);
			}
		}

		return $(visible);
	}

	function onPlayContent (element, options) {
		var depth = options.depth;

		if (options.markCurrent) {
			$("#video").VideoManager("markItemCompleted", options.markCurrent);
		}

		var opts = {};
		if (options.options) opts = options.options;

		// bit of a calling kludge here:
		$("#video").VideoManager("playFromTOC", depth, opts);
	}

	// rather than having to add this custom button to the video.js build (in v4 at least), I just added the button manually (below)
	/*
	videojs.BackButton = videojs.Button.extend({});

	videojs.BackButton.prototype.buttonText = 'Back 10';

	videojs.BackButton.prototype.buildCSSClass = function (){
		return 'vjs-back-button ' + videojs.Button.prototype.buildCSSClass.call(this);
	};

	videojs.BackButton.prototype.onClick = function (){
		var t = this.player().currentTime();
		this.player().currentTime(t - 10);
	};
	*/

	function getParameterByName (loc, name) {
		name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
		var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
			results = regex.exec(loc);
		return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
	}

	function throttle(fn, threshhold, scope) {
		threshhold || (threshhold = 250);
		var last,
			deferTimer;
		return function () {
			var context = scope || this;

			var now = +new Date,
				args = arguments;
			if (last && now < last + threshhold) {
				// hold on to it
				clearTimeout(deferTimer);
				deferTimer = setTimeout(function () {
					last = now;
					fn.apply(context, args);
				}, threshhold);
			} else {
				last = now;
				fn.apply(context, args);
			}
		};
	}

	function decodeEntities (encodedString) {
		var textArea = document.createElement('textarea');
		textArea.innerHTML = encodedString;
		return textArea.value;
	}

	$.widget("que.VideoManager", {
		_create: function () {
			this.initialize(this.options.toc, this.options.el, this.options.player, this.options.markers, this.options.options);
		},

		initialize: function (toc, el, player, markers, options) {
			this.toc = toc;
			this.el = el;
			this.markers = markers;
			this.player = player;
			this.name = "Larry";
			this.options = options;

			if (options.title)
				document.title = options.title;

			Database.initialize(toc, options.title, $.proxy(this.onDatabaseUpdate, this));
			$(".toc").TOCTree("setStatus", Database.getItems());

			this.updateProgress();

			this.pop = Popcorn(el, {frameAnimation: true});

			/*
			 var backButton = new videojs.BackButton(this.player);
			 this.player.controlBar.addChild(backButton);
			 */

			// add the Back Button manually
			var backButton = new videojs.Button(this.player);
			backButton.addClass("vjs-back-button");
			backButton.on("click", function () {
				var t = this.player().currentTime();
				this.player().currentTime(t - 10);
			});
			this.player.controlBar.addChild(backButton);

			var transcriptButton = new videojs.Button(this.player);
			transcriptButton.addClass("vjs-transcript-button");
			transcriptButton.on("click", $.proxy(this.onToggleTranscript, this));
			this.player.controlBar.addChild(transcriptButton);

			//  NOTE: Not sure why this stopped working and I had to switch to the straight HTML5 event
//			this.player.on("play", $.proxy(this.onVideoStarted, this));
			$("video")[0].addEventListener("play", $.proxy(this.onVideoStarted, this));

			this.player.on("ended", $.proxy(this.onVideoEnded, this));
			this.player.on("timeupdate", $.proxy(this.onVideoTimeUpdate, this));
			this.player.on("loadedmetadata", $.proxy(this.onLoadedMetadata, this));

			$(".toc").on("playvideo", onPlayContent).on("closesearch", $.proxy(this.onCloseSearch, this));

			$(".toc").on("downloadvideo", $.proxy(this.onDownloadVideo, this));

			window.onpopstate = function (event) {
				var loc = document.location.search;
				$("#video").VideoManager("tryToGotoLocationSearch", loc);
			};

			this.player.markers({
				markerStyle: {
					"width": "8px",
					"background-color": "rgb(218, 197, 93)"
				},
				markerTip: {
					display: true,
					text: function (marker) {
						console.log(marker.class);
						return "Marker: " + marker.text;
					}
				}
			});

			this.getCustomerIdentifier();

			this.currentIndex = undefined;

			this.trackID = 1;
			this.busyScrolling = false;
			this.waitingForAutoAdvance = false;
			this.waitingForIFrameToLoad = false;

			this.registerGoogleAnalytics(this.options.title);
		},

		instance: function () {
			return this;
		},

		getCurrentIndex: function () {
			return this.currentIndex;
		},

		currentItemIsVideo: function () {
			if (this.currentIndex != undefined) {
				return this.toc[this.currentIndex].video != undefined;
			} else {
				return false;
			}
		},

		currentItemHasContent: function () {
			if (this.currentIndex != undefined) {
				return this.toc[this.currentIndex].src != undefined;
			} else {
				return false;
			}
		},

		setCurrentIndex: function (index) {
			// THEORY: when switching, mark the current section completed (should probably be: have we scrolled past everything)
			if (!this.currentItemIsVideo() && this.currentItemHasContent()) {
				if (this.currentIndex != undefined && this.currentIndex != index) {
					this.markItemCompleted(this.currentIndex);
				}

				// THEORY: consecutive sections (of non-video content) are marked complete when going from section to section
				if (index == this.currentIndex + 1) {
					this.markItemCompleted(this.currentIndex);
				}

				if (index != undefined) {
					this.markItemStarted(index);
				}
			}

			this.currentIndex = index;

			this.updateUI();

			this.saveCurrentVideoIndex();
		},

		saveCurrentVideoIndex: function () {
			Database.saveCurrentIndex(this.currentIndex);
		},

		onVideoTimeUpdate: function (event) {
			// highlight and scroll to current transcript position
			var t = this.player.currentTime();

			if (this.hasTranscript) {
				var me = this;
				var p = this.element.find(".video-transcript p");
				p.removeClass("current");
				p.each(function (index, item) {
					var el = $(item);
					var begin = el.attr("data-begin");
					var end = el.attr("data-end");
					if (t > begin && t < end) {
						el.addClass("current");
						me.element.find(".video-transcript").scrollTo(el, 500, { interrupt: true });
						return false;
					}
				});
			}

			this.saveCurrentVideoTime();
		},

		saveCurrentVideoTime: function () {
			var t = this.player.currentTime();
			Database.saveCurrentTime(t);
		},

		getCurrentVideoTime: function () {
			return Database.getCurrentTime();
		},

		tryToGotoLocationSearch: function (loc) {
			// check for link from query parameter
			var link = getParameterByName(loc, "link");
			if (link) {
				this.playFromTOC(link, {pause: true, history: false, time: this.getCurrentVideoTime()});
				return true;
			}
			return false;
		},

		loadMostRecentVideo: function () {
			var found = this.tryToGotoLocationSearch(location.search);

			var index = Database.getCurrentIndex();

			if (index == undefined) {
				this.loadFirstVideo();
			} else if (!found) {
				this.playFromTOC(index, {pause: true, time: this.getCurrentVideoTime()});
			}
		},

		loadFirstVideo: function () {
			var index = this.getFirstVideoFromTOC();

			if (index == undefined) {
				index = 0;
			}

			this.playFromTOC(index, {pause: true});
		},

		playFirstVideo: function () {
			var index = this.getFirstVideoFromTOC();

			this.playFromTOC(index, {});
		},

		playFromTOC: function (index, options) {
			if (options && options.skipToNextSource) {
				while (index < this.toc.length && URLWithoutHash(this.toc[index].src) == options.previousSource) {
					index++;
				}

				if (index >= this.toc.length) return;
			}

			if (options && (options.history == undefined || options.history == true)) {
				var staging = "";
				if (window.location.search.indexOf("staging") != -1) {
					staging = "&staging";
				}
				history.pushState(null, null, "?link=" + index + staging);
			}

			this.syncTOCToContent(index);

			this.sendGoogleAnalytics(this.toc[index].desc);

			// if this is iframe content, open it now; otherwise, it's video
			if (this.toc[index].src) {
				this.playExtraFromTOC(index, options);

				$(".iframe-holder").show();
				$(".video-holder").hide();

				return;
			}

			while (index < this.toc.length && !this.toc[index].video) {
				index++;
			}

			if (index >= this.toc.length) return;

			var src = this.toc[index].video;

			if (src.indexOf(".mov") != -1 || src.indexOf(".mp4") != -1) {
				this.player.src({type: "video/mp4", src: src});
			} else {
				this.player.src([
					{type: "video/mp4", src: src + ".mp4"},
					{type: "video/webm", src: src + ".webm"},
					{type: "video/ogg", src: src + ".ogv"}
				]);
			}

			if (options && options.time) {
				this.player.currentTime(options.time);
			}

			$(".iframe-holder").hide();
			$(".video-holder").show();

			$("#main_video").show();

			if (options && options.pause) {
			} else {
				this.player.play();
			}

			this.setCurrentIndex(index);

			var showAllMarkers = options && options.showAllMarkers;

			this.addMarkers(showAllMarkers);

			this.removeAllTriggers();
			this.addTriggersForThisVideo();

			this.onNewContentShowing();
		},

		// THEORY: links within the epub need to be overridden so the iframe src gets updated and the location bar stays current
		triggerInternalLink: function (href) {
			var this_href = URLWithoutHash(href);

			if (this_href) {
				// try to find where this internal link is in the toc and go there
				for (var i = 0; i < this.toc.length; i++) {
					// check epub content
					var other_href = URLWithoutHash(this.toc[i].src);
					if (other_href && other_href.indexOf(this_href) != -1) {
						var hash = VideoManager.HashInURL(href);
						this.playFromTOC(i, {hash: hash});
						break;
					}
					// check video content
					other_href = URLWithoutHash(this.toc[i].video);
					if (other_href && other_href.indexOf(this_href) != -1) {
						this.playFromTOC(i, {});
						break;
					}
				}
			} else {
				var iframe = $("iframe").eq(0);

				this.scrollToHash(iframe, {hash: href}, false);
			}
		},

		findInternalLink: function (href) {
			var this_href = URLWithoutHash(href);

			if (this_href) {
				// try to find where this internal link is in the toc and go there
				for (var i = 0; i < this.toc.length; i++) {
					// check epub content
					var other_href = URLWithoutHash(this.toc[i].src);
					if (other_href && other_href.indexOf(this_href) != -1) {
						return true;
					}
					// check video content
					other_href = URLWithoutHash(this.toc[i].video);
					if (other_href && other_href.indexOf(this_href) != -1) {
						return true;
					}
				}
			}

			return false;
		},

		getTOCNames: function (list) {
			for (var j = 0; j < list.length; j++) {
				var this_href = list[j].href;

				var title = undefined;
				for (var i = 0; i < this.toc.length; i++) {
					// check epub content
					var other_href = URLWithoutHash(this.toc[i].src);
					if (other_href && other_href.indexOf(this_href) != -1) {
						title = this.toc[i].desc;
						break;
					}
					// check video content
					other_href = URLWithoutHash(this.toc[i].video);
					if (other_href && other_href.indexOf(this_href) != -1) {
						title = this.toc[i].desc;
						break;
					}
				}

				if (title != undefined) {
					list[j].title = title;
				}
			}

			return list;
		},

		onDoneScrolling: function () {
			this.busyScrolling = false;
		},

		scrollToHash: function (iframe, options, immediate) {
			// iOS kludge:
			// TODO: try this, delay, then transform none
			// TODO: why does it scroll and then reset?!
			/*
			$(".the-iframe-holder")[0].style.cssText += ';-webkit-transform:rotateZ(0deg)';
			$(".the-iframe-holder")[0].offsetHeight;
			$(".the-iframe-holder")[0].style.cssText += ';-webkit-transform:none';
			*/

			//$(".the-iframe-holder").css("-webkit-overflow-scrolling", "auto");
			//$(".the-iframe-holder").css("-webkit-overflow-scrolling", "touch");

			var index, hash;

			if (options.hash == undefined) {
				if (options.index == undefined) {
					index = this.currentIndex;
				} else {
					index = options.index;
				}
				hash = VideoManager.HashInURL(this.toc[index].src);
			} else {
				hash = options.hash;
			}

			immediate = (immediate == undefined) ? false : immediate;

			var el = iframe.contents().find(hash);
			var dest = 0;

			if (el.length) {
				var top = el.offset().top;
				dest = top - 30;
			}

			// kludge for iOS scrolling (I don't like this one bit)
			var scrollingDOM;
			if ($(".the-iframe-holder").height() == $("iframe").height()) {
				// desktop
				scrollingDOM = iframe.contents().find("html,body");
			} else {
				// iOS
				scrollingDOM = $(".the-iframe-holder");
			}

			if (immediate) {
				scrollingDOM.scrollTop(dest);
			} else {
				// this should stop it from overriding the scroll-to-hash that comes next with an actual hash
				if (dest != 0)
					this.busyScrolling = true;
					scrollingDOM.stop().animate({scrollTop: dest}, {
						duration: 1000,
						complete: $.proxy(this.onDoneScrolling, this)
					});
			}
		},

		onIFrameLoaded: function (iframe) {
			this.waitingForAutoAdvance = false;
			this.waitingForIFrameToLoad = false;

			$(".loading-indicator").hide();

			this.onNewContentShowing(iframe);
		},

		onNewContentShowing: function (iframe) {
			$("#comments-panel").Comments("showCommentIconsInIframe", iframe);
		},

		addIFrame: function (params) {
			$(".loading-indicator").show();

			if (this.iframe == undefined) {
				var iframe = $("<div>").iFrameHolder({
					manager: this,
					src: this.toc[params.index].src,
					index: params.index,
					scrollTo: params.scrollTo,
					infinite_scrolling: this.options.infinite_scrolling,
					hash: params.hash,
					highlight: params.highlight,
					type: params.type
				});

				iframe.appendTo(".iframe-holder");

				iframe.on("jump", onPlayContent);

				this.iframe = iframe;
			} else {
				var options = {
					manager: this,
					src: this.toc[params.index].src,
					index: params.index,
					scrollTo: params.scrollTo,
					infinite_scrolling: this.options.infinite_scrolling,
					hash: params.hash,
					highlight: params.highlight,
					type: params.type
				};

				this.waitingForIFrameToLoad = true;
				this.iframe.iFrameHolder("loadNewContent", options);
			}
		},

		playExtraFromTOC: function (index, options) {
			if (options.replaceAll == undefined) options.replaceAll = true;

			if (options.replaceAll == true) {
				// check to see if any of the current iframes have our source
				var new_source = URLWithoutHash(this.toc[index].src);
				var existing = $(".iframe-holder").find("iframe").map(function (ind, item) {
					var src = $(item).attr("src");
					if (new_source == URLWithoutHash(src)) {
						return item;
					}
					return null;
				});

				if (existing.length) {
					// same page we're already on
					existing.attr({"data-index": index}).show();

					this.scrollToHash(existing, {index: index, hash: options.hash});

					if (options.highlight) {
						this.iframe.iFrameHolder("highlight", options.highlight);
					}
				} else {
					//var sel = $(".iframe-holder *");
					//sel.remove();

					this.addIFrame({
						index: index,
						scrollTo: true,
						hash: options.hash,
						highlight: options.highlight,
						type: this.options.type
					});
				}

				$("#main_video").hide();
				this.player.pause();
			}

			this.setCurrentIndex(index);

			var showAllMarkers = options && options.showAllMarkers;

			this.addMarkers(showAllMarkers);

			this.removeAllTriggers();
			this.addTriggersForThisVideo();
		},

		getFirstVideoFromTOC: function () {
			for (var i = 0; i < this.toc.length; i++) {
				var d = this.toc[i];
				if (d.video) {
					return i;
				}
			}

			return undefined;
		},

		advanceTOC: function (options) {
			if (this.currentIndex < this.toc.length - 1) {
				this.playFromTOC(this.currentIndex + 1, options);
			}
		},

		onVideoStarted: function () {
			this.markItemStarted(this.currentIndex);
		},

		onVideoEnded: function () {
			this.markItemCompleted(this.currentIndex);

			this.advanceTOC();
		},

		onPageScrolledToEnd: function () {
			this.markItemCompleted(this.currentIndex);

			var previousSrc = URLWithoutHash(this.toc[this.currentIndex].src);

			//this.advanceTOC( { previousSource: previousSrc, skipToNextSource: true } );
			this.advanceTOC({previousSource: previousSrc, skipToNextSource: true, replaceAll: false});
		},

		markItemStarted: function (index) {
			var completed = Database.getItemProperty(index, "completed");
			if (!completed) {
				Database.setItemProperty(index, "started", true);
				$(".toc").TOCTree("markStarted", index);
			}
		},

		markCurrentItemStarted: function () {
			this.markItemStarted(this.currentIndex);
		},

		markCurrentItemCompleted: function () {
			this.markItemCompleted(this.currentIndex);
		},

		markItemCompleted: function (index) {
			Database.setItemProperty(index, "completed", true);
			$(".toc").TOCTree("markCompleted", index);

			// for videos, check to see if all of this item's parent's children are complete
			switch (this.options.type) {
				case "metadata": // ie, video
					var p = this.toc[index].parent;
					if (p) {
						var p_index = p.index;
						var p_complete = $(".toc").TOCTree("checkForAllChildrenComplete", p_index);
						if (p_complete) {
							this.markItemCompleted(p_index);
						}
					}
					break;
			}

			this.updateProgress();
		},

		updateUI: function () {
			$(".nav-list.toc a").removeClass("active animated tada");
			$(".nav-list.toc a").eq(this.currentIndex).hide(0).addClass("active animated slideInLeft").show(0);
		},

		updateProgress: function () {
			var pct = Math.round(Database.getPercentageComplete() * 100);
			$("#completed-progress").css("width", pct + "%");
			// this is used by .progress::after (works on all browsers?)
			$(".progress").attr("data-progress", pct + "% Complete");
		},

		addTimelineMarkers: function () {
			var curDepth = this.toc[this.currentIndex].depth;

			var mz = [];

			for (var i = 0; i < this.markers.length; i++) {
				var m = this.markers[i];

				if (m.depth == curDepth) {
					var txt = m.type == "epub" ? (m.text ? m.text : "Click here to read more") : m.text;

					var item = {time: m.start, text: txt};

					mz.push(item);
				}
			}

			this.player.markers.reset(mz);
		},

		addMarkers: function (showAllMarkers) {
			this.addTimelineMarkers();

			var curDepth = this.toc[this.currentIndex].depth;

			var data = [];
			var counter = 0;

			for (var i = 0; i < this.markers.length; i++) {
				var m = this.markers[i];

				if (m.depth == curDepth) {
					var item = {};

					var txt = m.type == "epub" ? (m.text ? m.text : "Click here to read more") : m.text;

					item.depth = (counter++).toString();

					switch (m.type) {
						case "epub":
							item.short = "<i class='fa fa-book'></i>";
							break;
						case "files":
						case "code":
							item.short = "<i class='fa fa-file-code-o'></i>";
							break;
						case "extra":
							item.short = "<i class='fa fa-question-circle'></i>";
							break;
						case "sandbox":
							item.short = "<i class='fa fa-desktop'></i>";
							break;
						default:
							console.log(m.type);
							break;
					}

					item.desc = txt;
					item.callback = $.proxy(this.onClickMarker, this, i);
					item.timestamp = String(m.start).toHHMMSS();
					item.id = i;

					data.push(item);
					/*

					 //					var el = $("<div>", { class: "alert trackalert" }).attr("role", "alert");
					 var el = $("<div>", { class: "trackalert" });
					 if (!showAllMarkers) el.addClass("x-hidden");


					 var r = $("<div>", { class: "row"}).appendTo(el);

					 var d1 = $("<div>", { class: "col-xs-9" }).appendTo(r);
					 var d2 = $("<div>", { class: "col-xs-3" }).appendTo(r);

					 var defaultPlacement = true;

					 switch (m.type) {
					 case "code":
					 //el.addClass("alert-danger");
					 break;
					 case "sandbox":
					 //el.addClass("alert-info");
					 break;
					 case "quiz":
					 //el.addClass("alert-warning");
					 break;
					 case "files":
					 //el.addClass("alert-danger");
					 break;
					 case "epub":
					 var coverURL = "epubs/" + m.src + "/OEBPS/html/graphics/" + m.cover;

					 //el.addClass("alert-success");

					 var cover = $("<img>", { src: coverURL, class: "tiny-thumbnail" });
					 d2.append(cover);

					 break;
					 case "extra":
					 //el.addClass("alert-danger");
					 break;
					 }

					 $("<span>", {class: "badge", text: String(m.start).toHHMMSS()}).appendTo(d1);

					 $("<span>", {html: " " + txt}).appendTo(d1);

					 el.click($.proxy(this.onClickMarker, this, i));

					 container.append(el);

					 if (!m.elements) m.elements = {};
					 m.elements.alert = el;
					 */
					m.alert = i;
				}
			}

			if (data.length) {
				$(".resource-list").TOCTree("option", "data", data);
			}
		},

		addTriggersForThisVideo: function () {
			var curDepth = this.toc[this.currentIndex].depth;

			for (var i = 0; i < this.markers.length; i++) {
				var m = this.markers[i];
				if (m.depth == curDepth) {
					//var el = m.elements ? m.elements.alert : undefined;
					this.pop.timebase({
						start: m.start, end: m.end, alert: m.alert, id: this.trackID++, text: m.text,
						callback: $.proxy(this.onClickMarker, this, i)
					});
				}
			}
		},

		removeAllTriggers: function () {
			if (this.trackID && this.pop) {
				for (var i = 0; i < this.trackID; i++) {
					if (this.pop.removeTrackEvent)
						this.pop.removeTrackEvent(i);
				}

				delete this.pop;
			}

			this.pop = Popcorn(this.el, {frameAnimation: true});

			this.trackID = 1;
		},

		onClickMarker: function (index) {
			this.player.pause();

			var me = this;

			var m = this.markers[index];

			switch (m.type) {
				case "code":
					var contents = m.html;

					BootstrapDialog.show({
						title: "Code Listing",
						message: contents,
						size: BootstrapDialog.SIZE_WIDE,
						onshown: function (dialog) {
							dialog.getModalBody().find(".code-listing").prepend('<span class="btn-clipboard">Copy</span>');
							dialog.getModalBody().find(".btn-clipboard").click($.proxy(me.onClipboard, me));
						},
					});

					break;

				case "sandbox":
					var contents = m.html;

					var wh = $(window).outerHeight();
					contents = contents.replace("__window height__", (wh * .75));

					BootstrapDialog.show({
						title: "Sandbox",
						message: contents,
						size: BootstrapDialog.SIZE_WIDE,
					});

					break;

				case "quiz":
					var contents = "Quiz goes here.";

					BootstrapDialog.show({
						title: "Quiz",
						message: contents,
						size: BootstrapDialog.SIZE_WIDE,
					});

					break;

				case "files":
					var contents = "<ul><li>File1.cpp</li><li>File2.cpp</li><li>Data_input.txt</li></ul>";

					BootstrapDialog.show({
						title: "Project Files",
						message: contents,
						size: BootstrapDialog.SIZE_WIDE,
						buttons: [{label: 'Download All', action: $.proxy(me.onDownload, me)}]
					});

					break;

				case "epub":
					var coverURL = "epubs/" + m.src + "/OEBPS/html/graphics/" + m.cover;
					var cover = "<img class='img-thumbnail' src='" + coverURL + "'/>";

					var contents = '<div class="row"><div class="col-xs-2"><a class="center-block text-center" href="https://www.informit.com/store/learning-node.js-a-hands-on-guide-to-building-web-applications-9780321910578" target="_blank">' + cover + '<p class="small">Link to the Book</p></a></div><div class="col-xs-10"><iframe src="epubs/' + m.src + '/OEBPS/html/' + m.page + '" width="100%" height="__window height__" frameborder="0"></iframe></div></div>';
					var wh = $(window).outerHeight();
					contents = contents.replace("__window height__", (wh * .75));

					BootstrapDialog.show({
						title: "<span class='lead'>Read more.</span> An excerpt from <strong>" + m.title + "</strong>",
						message: contents,
						size: BootstrapDialog.SIZE_WIDE
						/* To inject CSS:
						 onshown: function (dialogRef) {
						 var frm = $("iframe")[0].contentDocument;
						 var otherhead = frm.getElementsByTagName("head")[0];
						 var link = frm.createElement("link");
						 link.setAttribute("rel", "stylesheet");
						 link.setAttribute("type", "text/css");
						 link.setAttribute("href", "http://fonts.googleapis.com/css?family=Bitter");
						 otherhead.appendChild(link);
						 var body = frm.getElementsByTagName("body")[0];
						 console.log(body);
						 }*/
					});

					break;

				case "extra":
					var contents = '<iframe src="' + m.src + '" width="100%" height="__window height__" frameborder="0"></frame>';

					var wh = $(window).outerHeight();
					contents = contents.replace("__window height__", (wh * .75));

					BootstrapDialog.show({
						title: "Try This…",
						message: contents,
						size: BootstrapDialog.SIZE_WIDE
					});

					break;
			}
		},

		openExtraPage: function (url) {
			var contents = '<iframe src="' + url + '" width="100%" height="__window height__" frameborder="0"></frame>';

			var wh = $(window).outerHeight();
			contents = contents.replace("__window height__", (wh * .75));

			BootstrapDialog.show({
				/*title: "Try This…",*/
				message: contents,
				size: BootstrapDialog.SIZE_WIDE
			});
		},

		onClipboard: function (event) {
			event.stopPropagation();

			$.notify({
				// options
				message: 'Code copied to clipboard.',
			}, {
				// settings
				type: 'info',
				allow_dismiss: false,
				delay: 3000,
				z_index: 5000,
				animate: {
					enter: 'animated fadeInDown',
					exit: 'animated fadeOutUp'
				},
			});
		},

		onDownload: function (event) {
			$.notify({
				// options
				message: 'Downloaded.',
			}, {
				// settings
				type: 'success',
				allow_dismiss: false,
				delay: 3000,
				z_index: 5000,
				animate: {
					enter: 'animated fadeInDown',
					exit: 'animated fadeOutUp'
				},
			});
		},

		onDownloadVideo: function (event, file) {
			$.notify({
				// options
				message: 'Video Download ' + file + ' starting ...',
			}, {
				// settings
				type: 'success',
				allow_dismiss: false,
				placement: {
					from: "bottom",
					align: "left"
				},
				delay: 3000,
				z_index: 5000,
				animate: {
					enter: 'animated fadeInDown',
					exit: 'animated fadeOutUp'
				}
			});
		},

		isShowingAll: function () {
			return this.pop.SHOWING_ALL;
		},

		getPreviousSection: function (index) {
			if (index == undefined) index = this.currentIndex;

			index = parseInt(index);

			// return the title of the next entry with a different src (ie, a different section)
			var curSrc = URLWithoutHash(this.toc[index].src);

			for (var i = index - 1; i >= 0; i--) {
				var nextSrc = URLWithoutHash(this.toc[i].src);
				if (nextSrc != curSrc) {
					var indexToReturn = i;
					// return the first one with this new source
					for (j = i - 1; j >= 0; j--) {
						var nextNextSrc = URLWithoutHash(this.toc[j].src);
						if (nextNextSrc != nextSrc) {
							indexToReturn = j + 1;
							break;
						}
					}
					return {index: indexToReturn, title: this.toc[indexToReturn].desc, src: nextSrc};
				}
			}

			return null;
		},

		getNextSection: function (index) {
			if (index == undefined) index = this.currentIndex;

			index = parseInt(index);

			// return the title of the next entry with a different src (ie, a different section)
			var curSrc = URLWithoutHash(this.toc[index].src);

			for (var i = index + 1; i < this.toc.length; i++) {
				var nextSrc = URLWithoutHash(this.toc[i].src);
				if (nextSrc != curSrc) {
					return {index: i, title: this.toc[i].desc, src: nextSrc};
				}
			}

			return null;
		},

		// using header text (as opposed to Habitat IDs)
		findCurrentItem: function () {
			var foundindex = undefined;

			var me = this;

			var iframes = $("iframe.content:onScreen");

			var curSrc = URLPageOnly(URLWithoutHash(this.toc[this.getCurrentIndex()].src));

			$(iframes.get().reverse()).each(function (index, item) {
				var iframe = $(item);
				var headers = iframe.contents().find("h1, h2, h3, h4");
				var headersOnScreen = iFrameElementsOnScreen(headers, iframe);
				for (var i = headersOnScreen.length - 1; i >= 0; i--) {
					var screen_item = headersOnScreen[i];
					var h = $(screen_item);
					//var t = h.text().replace(/(\r\n|\n|\r)/gm,"").replace(/\s+/g, " ");
					var t = h.text();
					for (var j = 0; j < me.toc.length; j++) {
						// THEORY: look for matching header text in this src file only
						// WARNING: Habitat compatibility
						var thisSrc = URLPageOnly(URLWithoutHash(me.toc[j].src));
						var desc = decodeEntities(me.toc[j].desc);
						if (desc == t && curSrc == thisSrc) {
							foundindex = j;
							break;
						}
					}
					if (foundindex != undefined)
						break;
				}
			});

			return foundindex;
		},

		// using Habitat IDs (as opposed to header text)
		findCurrentItem_byID: function () {
			var me = this;

			var iframes = $("iframe:onScreen");

			var foundIndex = null;

			$(iframes.get().reverse()).each(function (index, item) {
				if (foundIndex) {
					return foundIndex;
				}

				var iframe = $(item);

				// look for the bottom-most h1, h2 on screen
				var headers = iframe.contents().find("h1, h2");
				var headersOnScreen = iFrameElementsOnScreen(headers, iframe);
				for (var i = headersOnScreen.length - 1; i >= 0; i--) {
					var id = "#" + headersOnScreen.eq(i).attr("id");
					for (var j = 0; j < me.toc.length; j++) {
						if (me.toc[j].hash == id) {
							foundIndex = j;
							return;
						}
					}
				}

				// THEORY OF A WORKAROUND: if there's an h1 or h2 with an ID not in the TOC, use the HTML's id (this is a Habitat export problem, I think)
				// HABITAT EXPORT WORKAROUND: check the iframe's html's id (the toc id's don't match the H1/H2 id's)
				if (headersOnScreen.length && !foundIndex) {
					var headers = iframe.contents().find("html");
					var headersOnScreen = iFrameElementsOnScreen(headers, iframe);
					for (var i = headersOnScreen.length - 1; i >= 0; i--) {
						var id = "#" + headersOnScreen.eq(i).attr("id");
						for (var j = 0; j < me.toc.length; j++) {
							if (me.toc[j].hash == id) {
								foundIndex = j;
								return;
							}
						}
					}
				}
			});

			return foundIndex;
		},

		onScrollContent: function () {
			if (!this.busyScrolling && !this.waitingForIFrameToLoad) {
				var curIndex = this.getCurrentIndex();

				this.syncTOCToContent();

				var newIndex = this.getCurrentIndex();
				if (curIndex != newIndex) {
					history.pushState(null, null, "?link=" + newIndex);
				}

				if (this.options.infinite_scrolling === true) {
					this.checkForAutoAdvance();
				}
			}
		},

		syncTOCToContent: function (index) {
			if (index == undefined)
				index = this.findCurrentItem();

			if (index) {
				var isNew = false;

				if (index != this.getCurrentIndex()) {
					this.setCurrentIndex(index);
					isNew = true;
				}

				var entry = $(".toc li[data-index=" + index + "]");

				$(".toc .current").removeClass("current");
				entry.addClass("current");

				if (isNew) {
					entry.parents("li").find("> ul").show(300);
				}

				var scroller = $("#contents-pane .scroller");
				var t = scroller.scrollTop();
				var h = scroller.height();
				var p = entry.offset().top;
				var desired_top = (h * .5);// - entry.height();
				var adj = p - desired_top;
				var dest = (t + adj);
				var currTarget = scroller.attr("data-scrolltarget");
				var diff = (currTarget - dest);
				if (currTarget == undefined || Math.abs(diff) > 20) {
					scroller.attr("data-scrolltarget", dest);
					scroller.stop().animate(
						{
							scrollTop: dest
						},
						{
							duration: 1000,
							complete: function () {
							}
						}
					);
				}
			}
		},

		checkForAutoAdvance: function () {
			// check for auto-advance
			var h_container = $("#video").scrollTop() + $("#video").height();
			var h_scroller = $("#video .iframe-holder").height();

			var distToScroll = h_container - h_scroller;

			if (this.waitingForAutoAdvance) return;

			if (distToScroll >= 0) {
				var obj = this.getNextSection();

				if (obj) {
					this.waitingForAutoAdvance = true;

					this.addIFrame({index: obj.index, scrollTo: false});

					this.setCurrentIndex(obj.index);
				}
			}
		},

		registerGoogleAnalytics: function (title) {
			(function (i, s, o, g, r, a, m) {
				i['GoogleAnalyticsObject'] = r;
				i[r] = i[r] || function () {
					(i[r].q = i[r].q || []).push(arguments)
				}, i[r].l = 1 * new Date();
				a = s.createElement(o),
					m = s.getElementsByTagName(o)[0];
				a.async = 1;
				a.src = g;
				m.parentNode.insertBefore(a, m)
			})(window, document, 'script', '//www.google-analytics.com/analytics.js', 'ga');

			// my ga code:
			//ga('create', 'UA-48406787-4', 'auto');

			// andy's code (effective 10/16/15):
			ga('create', 'UA-433761-35', 'auto');

			ga('set', {
				'appName': title
			});
		},

		sendGoogleAnalytics: function (pagename) {
			// NOTE: 8/25/15 switched from screenview to pageview

			//ga('send', 'screenview', {'screenName': pagename});

			ga('send', 'pageview', {'title': pagename});

			//ga('send', 'event', 'video', 'started');
			//ga('send', 'event', data.category, data.action, data.label);
		},

		onCloseSearch: function () {
			if (this.iframe && this.iframe.iFrameHolder)
				this.iframe.iFrameHolder("unhighlight");
		},

		// after loading video, add any closed captioning
		onLoadedMetadata: function (event) {
			var captions = this.toc[this.currentIndex].captions;

			if (captions) {
				$(this.el).find("track").remove();

				var track = document.createElement("track");
				track.kind = "captions";
				track.label = "English";
				track.srclang = "en";
				track.src = captions;

				/* to auto-show captions:
				 function ontrackadded(event) {
				 event.track.mode = "showing";
				 }

				 this.player.textTracks().onaddtrack = ontrackadded;
				 */

				$(this.el).append(track);
			}

			var transcript = this.toc[this.currentIndex].transcript;
			if (transcript) {
				function timeStringToSeconds (s) {
					var h = parseInt(s.substr(0, 2));
					var m = parseInt(s.substr(3, 2));
					var sec = parseInt(s.substr(6, 2));
					var ms = parseInt(s.substr(9, 1));
					return (h * 60 * 60) + (m * 60) + sec + (ms / 10);
				}

				var me = this;

				$.get(transcript, function (data) {
					var t = $(data);
					var allText = t.find("div p");
					$(".video-transcript").html(allText);

					allText.click($.proxy(me.onClickTranscript, me));

					allText.each(function (index, item) {
						var el = $(item);
						var begin = timeStringToSeconds(el.attr("begin"));
						var end = timeStringToSeconds(el.attr("end"));
						el.attr( { "data-begin": begin, "data-end": end } );
					});
				});

				this.element.find(".video-holder").addClass("has-transcript");

				this.hasTranscript = true;
			} else {
				this.element.find(".video-holder").removeClass("has-transcript");

				this.hasTranscript = false;
			}
		},

		onClickTranscript: function (event) {
			var t = $(event.currentTarget).attr("data-begin");
			this.player.currentTime(t);
		},

		onToggleTranscript: function (event) {
			var holder = this.element.find(".video-holder");
			if (holder.hasClass("transcript-visible")) {
				holder.removeClass("transcript-visible");
			} else {
				holder.addClass("transcript-visible");
			}
			this.element.find(".vjs-transcript-button").blur();
		},

		getIDForCurrentIndex: function () {
			return this.toc[this.currentIndex].id;
		},

		getTOCTitleForID: function (id) {
			for (var i = 0; i < this.toc.length; i++) {
				var t = this.toc[i];
				if (t.id == id) {
					return t.desc;
				}
			}
			return undefined;
		},

		getHashForID: function (id) {
			for (var i = 0; i < this.toc.length; i++) {
				var t = this.toc[i];
				if (t.id == id) {
					return t.hash;
				}
			}
			return undefined;
		},

		getDatabase: function () {
			return Database;
		},

		getCustomerIdentifier: function () {
			if (window.opener) {
				var customerID = $(window.opener.document).find("meta[name='WT.dcsvid']").attr("content");
				if (customerID != null) {
					Database.setCustomerID(customerID);
				}
			} else {
				console.log("no opener");
				if (window.location.hostname == "localhost") {
					console.log("faking it");
					Database.setCustomerID("5566ba59-a786-400e-a3e0-866b6d1244f7");
				}
			}
		},

		onDatabaseUpdate: function () {
			$(".toc").TOCTree("setStatus", Database.getItems());
		}

	});

	var VideoManager = {};
	VideoManager.HashInURL = HashInURL;

	return VideoManager;
});