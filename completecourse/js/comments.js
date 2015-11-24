define(["jquery.ui", "firebase"], function () {
	$.widget("que.Comments", {

		options: {},

		_create: function (mgr) {
			var btn = this.element.find("#submit-comment");

			this.element.find("#commentText").on("input", $.proxy(this.onChangeComment, this));
			this.element.find("#submit-comment").click($.proxy(this.onClickSubmit, this));
			this.element.find("#close-button").click($.proxy(this.onClickClose, this));

			this.loadCommentsFromFirebase();

			this.comments = [];

			this.last_iframe = undefined;
		},

		clearComments: function () {
			this.element.find(".comment").remove();

			this.comments = [];
		},

		loadCommentsFromFirebase: function () {
			this.firebaseRef = new Firebase("https://ptg-comments.firebaseio.com/");
			//this.firebaseRef.child("my_office_sway/comments").on("value", $.proxy(this.onLoadComments, this));
			this.clearComments();
			this.firebaseRef.child("my_office_sway/comments").orderByChild("timestamp").on("child_added", $.proxy(this.onLoadComment, this));
			//this.firebaseRef.child("my_office_sway/comments").endAt().on("value", $.proxy(this.onLoadComments, this));

			this.showComments();
		},

		onLoadComment: function (snapshot) {
			var c = snapshot.val();
			c.key = snapshot.key();
			this.addComment(c);
		},

		onLoadComments: function (snapshot) {
			this.clearComments();

			var val = snapshot.val();
			for (var each in val) {
				var c = val[each];
				this.addComment(c);
			}
		},

		addComment: function (params) {
			var d = $("<div>", { class: "comment" });
			d.attr("data-key", params.key);

			var p = $("<p>", { class: "comment-text", text: params.text });
			d.append(p);

			var n = params.name;
			if (params.email) {
				n += " (" + params.email + ")";
			}
			var h = $("<h5>", { class: "comment-name", text: n });
			d.append(h);

			var dateFromTimestamp = new Date(params.timestamp);
			var dateOptions = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
			var dateFormatted = dateFromTimestamp.toLocaleTimeString([], dateOptions);

			var date = $("<small>", { text: dateFormatted });
			h.append(date);

			this.element.find(".tab-content").prepend(d);

			this.comments.push(params);
		},

		onClickSubmit: function () {
			var newCommentRef = this.firebaseRef.child("my_office_sway/comments").push();

			var name = this.element.find("#commentName").val();
			name = name ? name : "Anonymous";
			var email = this.element.find("#commentEmail").val();
			var text = this.element.find("#commentText").val();
			var timestamp = Date.now();

			var rec = { "name": name, email: email, "text": text, "timestamp": timestamp, "ok": false }

			var useAnchor = this.element.find("#commentAnchor").prop("checked");
			if (useAnchor) {
				// look up an anchor to use for this entry in the TOC
				var hash = this.options.manager.VideoManager("getHashForCurrentIndex");
				rec.anchor = hash;
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
				delay: 4000,
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
			this.element.find("#submit-comment").addClass("disabled");
		},

		onClickClose: function () {
			this.closePanel();
		},

		openPanel: function () {
			this.element.show("slide", {direction: "right"});
		},

		closePanel: function () {
			this.element.hide("slide", {direction: "right"});
		},

		togglePanel: function () {
			this.element.toggle("slide", {direction: "right"});
		},

		showComments: function (iframe) {
			if (iframe == undefined)
				iframe == this.last_iframe;

			if (iframe) {
				iframe.remove(".comment-anchor");

				for (var i = 0; i < this.comments.length; i++) {
					var c = this.comments[i];
					if (c.anchor) {
						var el = iframe.contents().find(c.anchor);
						if (el.length) {
							var d = $("<div>", { class: "comment-anchor", html: "&#xe0b9" });
							d.attr("data-key", c.key);
							el.parent().append(d);
							console.log("Added");
						}
					}
				}
				this.last_iframe = iframe;

				iframe.contents().find(".comment-anchor").off("click").click($.proxy(this.showCommentFromLink, this));
			}
		},

		showCommentFromLink: function (event) {
			var el = event.target;
			var key = $(el).attr("data-key");
			if (key) {
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
		}
	});
});
