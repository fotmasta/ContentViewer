define(["database", "jquery.ui", "bootstrap-confirmation"], function (Database) {

	// sort by isbn, unmoderated, timestamp
	function sortComments (a, b) {
		if (a.isbn < b.isbn)
			return -1;
		else if (a.isbn > b.isbn)
			return 1;
		else {
			if (a.ok === false) return -1;
			else if (b.ok === false) return 1;
			else
				return (a.timestamp - b.timestamp);
		}
	}

	var isbns = ["9780134382562", "9780134646831"];

	$.widget("que.CommentModerator", {

		options: {},

		_create: function () {
			this.reloadComments();
		},

		reloadComments: function () {
			this.element.find("table.comments").remove();

			var el = $("<table>", { class: "table comments table-striped table-bordered table-hover" });
			this.element.append(el);

			var h = $("<tr><th>isbn</th><th>date</th><th>category</th><th>reply</th><th>name</th><th>email</th><th>text</th><th>Ok?</th><th>Delete</th></tr>");
			el.append(h);

			this.data = [];

			for (var i = 0; i < isbns.length; i++) {
				var isbn = isbns[i];
				Database.loadCommentsForISBN(isbn, $.proxy(this.addComments, this));
			}
		},

		addComments: function (data) {
			this.data = this.data.concat(data);

			this.refreshComments();
		},

		refreshComments: function () {
			this.element.find(".comments tr").remove();

			var data = this.sortData(this.data);

			var lastISBN;

			var el = this.element.find("table");

			for (var i = 0; i < data.length; i++) {
				var rec = data[i];
				var isbn = rec.isbn;

				if (isbn != lastISBN) {
					var row = $("<tr>");
					el.append(row);

					var td = $("<td>", {text: isbn});
					td.attr("colspan", 9);
					row.append(td);
					row.addClass("success");

					lastISBN = isbn;
				}

				var row = $("<tr>");
				row.attr("data-key", rec.id);
				row.attr("data-data", JSON.stringify(rec));
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

				row.append($("<td>", {text: isbn}))
					.append($("<td>", {text: dateFormatted}))
					.append($("<td>", {text: rec.category}))
					.append($("<td>", {text: rec.parent ? "yes" : "no"}))
					.append($("<td>", {text: rec.name}))
					.append($("<td>", {text: rec.email}))
					.append($("<td>", {text: rec.text}))
					.append($("<td>", { class: "text-center ok-row" }).append(checkbox))
					.append($("<td>", { class: "text-center" }).append(deleteButton));
			}

			$('[data-toggle="confirmation"]').confirmation( { placement: "left", onConfirm: $.proxy(this.onClickDelete, this) } );
		},

		sortData: function (data) {
			var recs = data.sort(sortComments);

			return recs;
		},

		onClickOK: function (event) {
			var me = this;

			var key = $(event.target).parents("tr").attr("data-key");
			var val = $(event.target).prop("checked");

			var rec = $(event.target).parents("tr").attr("data-data");
			var obj = JSON.parse(rec);
			obj.ok = val;

			Database.postCommentToPersistentDatabase(obj, $.proxy(this.reloadComments, this));
		},

		onClickDelete: function (event) {
			var key = $(event.target).parents("tr").attr("data-key");
			Database.deleteComment(key, $.proxy(this.reloadComments, this));
		}
	});
});
