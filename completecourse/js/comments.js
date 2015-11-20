define(["jquery.ui", "firebase"], function () {
	$.widget("que.Comments", {

		options: {},

		_create: function () {
			var btn = this.element.find("#submit-comment");
			console.log(btn);

			this.element.find("#submit-comment").click($.proxy(this.onClickSubmit, this));

			this.loadCommentsFromFirebase();
		},

		clearComments: function () {
			this.element.find(".comment").remove();
		},

		loadCommentsFromFirebase: function () {
			this.firebaseRef = new Firebase("https://ptg-comments.firebaseio.com/");
			this.firebaseRef.child("my_office_sway/comments").on("value", $.proxy(this.onLoadComments, this));
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

			var p = $("<p>", { class: "comment-text", text: params.text });
			d.append(p);

			var h = $("<h5>", { class: "comment-name", text: params.name });
			d.append(h);

			var date = $("<small>", { text: params.date });
			h.append(date);

			this.element.find(".tab-content").append(d);
		},

		onClickSubmit: function () {
			var newCommentRef = this.firebaseRef.child("my_office_sway/comments").push();

			var name = this.element.find("#commentName").val();
			var text = this.element.find("#commentText").val();
			var date = new Date().toString();

			newCommentRef.set({ "name": name, "text": text, "date": date, "ok": false });
		}
	});
});
