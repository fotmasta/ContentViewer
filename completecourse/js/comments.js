define(["jquery.ui", "firebase"], function () {
	$.widget("que.Comments", {

		options: {},

		_create: function (mgr) {
			var btn = this.element.find("#submit-comment");

			this.element.find("#commentText").on("input", $.proxy(this.onChangeComment, this));
			this.element.find("#submit-comment").click($.proxy(this.onClickSubmit, this));
			this.element.find("#close-button").click($.proxy(this.onClickClose, this));
			this.element.find("#tab-all").click($.proxy(this.onClickAllComments, this));
			this.element.find("#tab-page").click($.proxy(this.onClickPageComments, this));

			this.comments = [];
			this.last_iframe = undefined;

			this.authorize();
		},

		authorize: function () {
			var ref = new Firebase("https://ptg-comments.firebaseio.com");
			ref.authAnonymously($.proxy(this.onAuthorized, this));
		},

		onAuthorized: function (error, authData) {
			if (error) {
				console.log("Login Failed!", error);
			} else {
				//console.log("Authenticated successfully with payload:", authData);
				this.loadCommentsFromFirebase();
			}
		},

		clearComments: function () {
			this.element.find(".comment").remove();

			this.comments = [];

			this.element.find("#tab-all small").text("(0)");
			this.element.find("#tab-page small").text("(0)");
		},

		loadCommentsFromFirebase: function () {
			this.firebaseRef = new Firebase("https://ptg-comments.firebaseio.com/");
			//this.clearComments();
			// use "child_added" or "value"? ("child_added" wasn't triggered for changes; "value" is)
			this.firebaseRef.child(this.options.titlePath + "/comments").orderByChild("timestamp").on("value", $.proxy(this.onLoadComments, this));
		},

		onLoadComments: function (snapshot) {
			this.clearComments();

			var recs = snapshot.val();
			for (var each in recs) {
				var c = recs[each];
				if (c.ok) {
					c.key = each;
					this.addComment(c);
				}
			}

			this.showCommentIconsInIframe();
		},

		addComment: function (params) {
			var d = $("<div>", { class: "comment" });
			d.attr("data-key", params.key);

			var p = $("<p>", { class: "comment-text", text: params.text });
			d.append(p);

			var n = params.name;
			/*
			if (params.email) {
				n += " (" + params.email + ")";
			}
			*/

			var h = $("<h5>", { class: "comment-name", text: n });
			d.append(h);

			var dateFromTimestamp = new Date(params.timestamp);
			var dateOptions = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
			var dateFormatted = dateFromTimestamp.toLocaleTimeString([], dateOptions);

			var date = $("<small>", { text: dateFormatted });
			h.append(date);

			if (params.category) {
				var cat = params.category;
				switch (params.category) {
					case "authorfeedback":
						cat = "feedback"; break;
					case "techsupport":
						cat = "support"; break;
				}
				var c = $("<span>", { class: "badge category " + params.category, text: cat });
				h.append(c);
			}

			if (params.anchor_id) {
				var title = this.options.manager.VideoManager("getTOCTitleForID", params.anchor_id);

				var t = $("<span>", { class: "reference", text: title });
				var i = $("<i class='fa fa-anchor'></i>");
				h.append(i).append(t);

				d.addClass("has-anchor");
				d.click($.proxy(this.onClickComment, this));
			}

			this.element.find(".tab-content").prepend(d);

			this.comments.push(params);

			var s = "(" + this.comments.length + ")";
			this.element.find("#tab-all small").text(s);
		},

		onClickComment: function (event) {
			var key = $(event.currentTarget).attr("data-key");
			for (var i = 0; i < this.comments.length; i++) {
				var c = this.comments[i];
				if (c.key == key) {
					var options = {};

					var index = c.anchor_id;

					this.options.manager.VideoManager("playFromTOC", index, options);
					break;
				}
			}
		},

		onClickSubmit: function () {
			var newCommentRef = this.firebaseRef.child(this.options.titlePath + "/comments").push();

			var name = this.element.find("#commentName").val();
			name = name ? name : "Anonymous";
			var email = this.element.find("#commentEmail").val();
			var text = this.element.find("#commentText").val();
			var category = this.element.find("#category input:radio:checked").val();
			var timestamp = Date.now();

			var rec = { "name": name, email: email, "text": text, "timestamp": timestamp, category: category, "ok": false };

			var useAnchor = this.element.find("#commentAnchor").prop("checked");
			if (useAnchor) {
				// look up an anchor to use for this entry in the TOC
				var anchor_id = this.options.manager.VideoManager("getIDForCurrentIndex");
				rec.anchor_id = anchor_id;
			}

			newCommentRef.set(rec);

			this.notifyNewComment();

			this.resetDataEntry();
		},

		notifyNewComment: function () {
			$.notify({
				// options
				message: 'Comment submitted.<br/>Comments will appear after being reviewed.'
			}, {
				// settings
				type: 'info',
				allow_dismiss: true,
				placement: {
					from: "top",
					align: "right"
				},
				delay: 8000,
				z_index: 5000,
				animate: {
					enter: 'animated fadeInDown',
					exit: 'animated fadeOutUp'
				}
			});
		},

		onChangeComment: function () {
			var text = this.element.find("#commentText").val();
			if (text)
				this.element.find("#submit-comment").removeClass("disabled");
			else
				this.element.find("#submit-comment").addClass("disabled");
		},

		resetDataEntry: function () {
			this.element.find("#commentName").val("");
			this.element.find("#commentEmail").val("");
			this.element.find("#commentText").val("");
			this.element.find("#commentAnchor").prop("checked", false);
			this.element.find("#category input:radio:checked").prop("checked", false);
			this.element.find("#submit-comment").addClass("disabled");
		},

		onClickClose: function () {
			this.closePanel();
		},

		openPanel: function () {
			this.element.show("slide", {direction: "right"});
			this.element.find(".comment.animated").removeClass("animated");
		},

		closePanel: function () {
			this.element.hide("slide", {direction: "right"});
		},

		togglePanel: function () {
			this.element.toggle("slide", {direction: "right"});
			this.element.find(".comment.animated").removeClass("animated");
		},

		showCommentIconsInIframe: function (iframe) {
			var count = 0;

			if (iframe == undefined)
				iframe = this.last_iframe;

			// if it's an epub, find the comment on the page
			if (iframe) {
				iframe.remove(".comment-anchor");

				for (var i = 0; i < this.comments.length; i++) {
					var c = this.comments[i];
					c.onPage = false;
					if (c.anchor_id) {
						var hash = this.options.manager.VideoManager("getHashForID", c.anchor_id);
						var el = iframe.contents().find(hash);
						if (el.length) {
							var d = $("<div>", { class: "comment-anchor", html: "&#xe0b9" });
							d.attr("data-key", c.key);
							el.parent().append(d);
							c.onPage = true;
							count++;
						}
					}
				}
				this.last_iframe = iframe;

				iframe.contents().find(".comment-anchor").off("click").click($.proxy(this.showCommentFromLink, this));
			} else {
				for (var i = 0; i < this.comments.length; i++) {
					var c = this.comments[i];
					c.onPage = false;
					if (c.anchor_id) {
						var id = this.options.manager.VideoManager("getIDForCurrentIndex");
						if (id == c.anchor_id) {
							c.onPage = true;
							count++;
						}
					}
				}
			}

			var s = "(" + count + ")";
			this.element.find("#tab-page small").text(s);

			this.refreshCommentList();
		},

		showCommentFromLink: function (event) {
			var el = event.target;
			var key = $(el).attr("data-key");
			if (key) {
				// show all comments
				this.refreshCommentList(true);

				var me = this;
				setTimeout(function () {
					me.scrollToComment(key);
				}, 500);
			}
			this.openPanel();
		},

		findComment: function (key) {
			for (var i = 0; i < this.comments.length; i++) {
				var c = this.comments[i];
				if (c.key == key) return c;
			}
			return undefined;
		},

		scrollToComment: function (key) {
			var entry = this.element.find("[data-key='" + key + "']");
			var scroller = this.element.find("#comments-content");
			var t = scroller.scrollTop();
			var h = scroller.height();
			var p = entry.offset().top;
			var desired_top = (h * .5);// - entry.height();
			var adj = p - desired_top;
			var dest = (t + adj);
			scroller.stop().animate(
				{
					scrollTop: dest
				},
				{
					duration: 1000,
					complete: function () {
						entry.removeClass("animated flash").hide(0).addClass("animated flash").show(0);
					}
				}
			);
		},

		refreshCommentList: function (showAll) {
			if (showAll == undefined) {
				var tab = this.element.find("#all-or-page-tabs li.active");
				if (tab.length && tab.attr("id") == "tab-li-page") {
					showAll = false;
				} else {
					showAll = true;
				}
			} else {
				// make tab reflect choice
				if (showAll) {
					this.element.find("#tab-li-all").addClass("active");
					this.element.find("#tab-li-page").removeClass("active");
				} else {
					this.element.find("#tab-li-all").removeClass("active");
					this.element.find("#tab-li-page").addClass("active");
				}
			}

			if (showAll) {
				this.element.find(".tab-content .comment").show(0);
			} else {
				this.element.find(".tab-content .comment").hide(0);
				for (var i = 0; i < this.comments.length; i++) {
					var c = this.comments[i];
					if (c.onPage) {
						this.element.find("[data-key='" + c.key + "']").show(0);
					}
				}
			}
		},

		onClickAllComments: function (event) {
			event.preventDefault();

			this.showCommentIconsInIframe();

			this.refreshCommentList(true);
		},

		onClickPageComments: function (event) {
			event.preventDefault();

			this.showCommentIconsInIframe();

			this.refreshCommentList(false);
		}
	});
});
