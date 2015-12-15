define(["jquery.ui", "firebase", "bootstrap-confirmation"], function () {

	$.widget("que.CommentModerator", {

		options: {},

		_create: function () {
			var me = this;

			var ref = new Firebase("https://ptg-comments.firebaseio.com");
			ref.onAuth(function(authData) {
				if (authData) {
					console.log("User " + authData.uid + " is logged in with " + authData.provider);
					me.loadCommentsFromFirebase();
				} else {
					console.log("User is not logged in");
				}
			});
		},

		isLoggedIn: function (callback) {
		},

		authorizeAnonymously: function () {
			var ref = new Firebase("https://ptg-comments.firebaseio.com");
			ref.authAnonymously($.proxy(this.onAuthorized, this));
		},

		authorizeWithPassword: function (email, password) {
			var ref = new Firebase("https://ptg-comments.firebaseio.com");
			ref.authWithPassword(
				{
					email    : email,
					password : password
				},
				$.proxy(this.onAuthorized, this),
				{
					remember: "sessionOnly"
				}
			);
		},

		onAuthorized: function (error, authData) {
			if (error) {
				console.log("Login Failed!", error);
			} else {
				this.loadCommentsFromFirebase();
			}
		},

		loadCommentsFromFirebase: function () {
			this.firebaseRef = new Firebase("https://ptg-comments.firebaseio.com/titles");
			this.firebaseRef.on("value", $.proxy(this.onLoadComments, this));
		},

		onLoadComments: function (snapshot) {
			this.element.find(".comments").remove();

			var el = $("<table>", { class: "table comments table-striped table-bordered table-hover" });
			this.element.append(el);

			var h = $("<tr><th>title</th><th>date</th><th>category</th><th>reply</th><th>name</th><th>email</th><th>text</th><th>Ok?</th><th>Delete</th></tr>");
			el.append(h);

			var data = snapshot.val();

			var lastTitle;

			for (var each in data) {
				var titleName = each;
				var title = data[each];
				for (var c in title.comments) {
					var rec = title.comments[c];

					var row = $("<tr>");
					var key = titleName + "/comments/" + c;
					row.attr("data-key", key);
					el.append(row);

					var dateFromTimestamp = new Date(rec.timestamp);
					var dateOptions = { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" };
					var dateFormatted = dateFromTimestamp.toLocaleTimeString([], dateOptions);

					var checkbox = $("<input>", { type: "checkbox" });
					checkbox.click($.proxy(this.onClickOK, this));
					if (rec.ok)
						checkbox.prop("checked", "true");

					var deleteButton = $("<button>", { class: "btn btn-danger"}).append($("<span>", { class: "glyphicon glyphicon-remove"}));
					deleteButton.attr( { "data-toggle": "confirmation", "data-placement": "left" } );

					row.append($("<td>", {text: titleName}))
						.append($("<td>", {text: dateFormatted}))
						.append($("<td>", {text: rec.category}))
						.append($("<td>", {text: rec.parent ? "yes" : "no"}))
						.append($("<td>", {text: rec.name}))
						.append($("<td>", {text: rec.email}))
						.append($("<td>", {text: rec.text}))
						.append($("<td>", { class: "text-center ok-row" }).append(checkbox))
						.append($("<td>", { class: "text-center" }).append(deleteButton));

					if (title != lastTitle) {
						row.addClass("success");
						lastTitle = title;
					}
				}
			}

			$('[data-toggle="confirmation"]').confirmation( { placement: "left", onConfirm: $.proxy(this.onClickDelete, this) } );
		},

		onClickOK: function (event) {
			var me = this;

			var key = $(event.target).parents("tr").attr("data-key");
			var val = $(event.target).prop("checked");
			this.firebaseRef.child(key).update( { ok: val }, function (result) {
				if (result !== null) {
					me.loadCommentsFromFirebase();
				}
			});
		},

		onClickDelete: function (event) {
			var key = $(event.target).parents("tr").attr("data-key");
			this.firebaseRef.child(key).remove();
		}
	});
});
