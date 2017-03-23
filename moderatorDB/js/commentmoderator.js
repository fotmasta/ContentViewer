define(["database", "jquery.ui", "bootstrap-confirmation"], function (Database) {

	// sort by isbn, unmoderated, timestamp
	function sortComments (a, b) {
		if (a.isbn < b.isbn)
			return -1;
		else if (a.isbn > b.isbn)
			return 1;
		else {
			if (a.ok === false && b.ok === true) return -1;
			else if (a.ok === true && b.ok === false) return 1;
			else
				return (a.timestamp - b.timestamp);
		}
	}

	function lookForTitleLocally (isbn) {
		if (localStorage) {
			var db = localStorage.getItem("isbn_titles");
			if (db) {
				var titles = JSON.parse(db);
				return titles[isbn];
			}
		}

		return undefined;
	}

	function saveTitleLocally (isbn, title) {
		if (localStorage) {
			var titles;
			var db = localStorage.getItem("isbn_titles");
			if (db) {
				titles = JSON.parse(db);
			} else {
				titles = {};
			}

			titles[isbn] = title;

			localStorage.setItem("isbn_titles", JSON.stringify(titles));
		}
	}

	var isbns = [];

	$.widget("que.CommentModerator", {

		options: {},

		_create: function () {
			this.options.filter = "unmoderated";

			this.titleCount = this.titleCountReceived = 0;

			var me = this;

			/* testing:
			this.getTitleForISBN("9780134547312", function (title) {
				console.log("got = " + title);
			});
			*/

			var options = $("<div>", { class: "options "});
			this.element.prepend(options);

			options.append($("<label>", { text: "Show:"}));

			var check1 = $("<input name='moderation' value='moderated' type='radio'> Moderated</input>");
			var check2 = $("<input name='moderation' value='unmoderated' type='radio' checked> Unmoderated</input>");

			options.append(check1);
			options.append(check2);

			$("input[name='moderation']").change($.proxy(this.onClickFilter, this));

			$.get("isbns.txt", function (data) {
				isbns = data.split("\n");

				me.reloadComments();
			});
		},

		reloadComments: function () {
			this.element.find("table.comments").remove();

			var el = $("<table>", { class: "table comments table-striped table-bordered table-hover" });
			this.element.find("div.comments").append(el);

			var h = $("<tr><th>isbn</th><th>date</th><th>category</th><th>reply</th><th>name</th><th>email</th><th>text</th><th>Ok?</th><th>Delete</th></tr>");
			el.append(h);

			this.data = [];

			this.titleCount = this.titleCountReceived = 0;

			for (var i = 0; i < isbns.length; i++) {
				var isbn = isbns[i];
				if (isbn.charAt(0) != "*") {
					this.titleCount++;
					Database.loadCommentsForISBN(isbn, $.proxy(this.addComments, this));
				}
			}
		},

		addComments: function (data) {
			this.titleCountReceived++;

			var percentDone = this.titleCountReceived / this.titleCount;

			$(".progressCircle").ProgressCircle("setPercent", percentDone);

			var progressVisible = $(".progressCircle").ProgressCircle("isVisible");

			if (percentDone >= 1 && progressVisible) {
				$(".progressCircle").ProgressCircle("hide");
			} else if (percentDone < 1 && !progressVisible) {
				$(".progressCircle").ProgressCircle("show");
			}

			this.data = this.data.concat(data);

			/* refresh method?
			var me = this;

			if (this.delayedRefresh) {
				clearTimeout(this.delayedRefresh);
				this.delayedRefresh = undefined;
			}

			this.delayedRefresh = setTimeout(function () {
				me.refreshComments();
			}, 250);
			*/

			this.refreshComments();
		},

		findCommentWithSource: function (id) {
			for (var i = 0; i < this.data.length; i++) {
				var rec = this.data[i];
				if (rec.source == id) return true;
			}
			return false;
		},

		refreshComments: function () {
			this.element.find(".comments tr").remove();

			var filteredData = [];

			for (var i = 0; i < this.data.length; i++) {
				var rec = this.data[i];
				if ( (this.options.filter == "moderated" && rec.ok) || (this.options.filter == "unmoderated" && !rec.ok) ) {
					if (this.findCommentWithSource(rec.id)) {
					} else {
						filteredData.push(rec);
					}
				}
			}

			filteredData = this.sortData(filteredData);

			var lastISBN;

			var el = this.element.find("table");

			var added = 0;

			for (var i = 0; i < filteredData.length; i++) {
				var rec = filteredData[i];

				var isbn = rec.isbn;

				if (isbn != lastISBN) {
					var row = $("<tr>");
					el.append(row);

					var td = $("<td>", {text: isbn});
					td.attr("colspan", 9);
					row.append(td);
					row.addClass("success");

					lastISBN = isbn;

					this.getTitleForISBN(isbn, function (title) {
						td.text(title + " (" + isbn + ")");
					});
				}

				var row = $("<tr>");
				row.attr("data-key", rec.id);

				var s = JSON.stringify(rec);

				// not sure where this weird carriage return (\r) is coming from during stringify, but remove it:
				s = s.replace("\\r", "");

				row.attr("data-data", s);
				el.append(row);

				var dateFromTimestamp = new Date(rec.timestamp);
				var dateOptions = {
					year: "numeric",
					month: "numeric",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit"
				};
				var dateFormatted = dateFromTimestamp.toLocaleTimeString([], dateOptions);

				var checkbox = $("<input>", {type: "checkbox"});
				checkbox.click($.proxy(this.onClickOK, this));
				if (rec.ok)
					checkbox.prop("checked", "true");

				var deleteButton = $("<button>", {class: "btn btn-danger"}).append($("<span>", {class: "glyphicon glyphicon-remove"}));
				deleteButton.attr({"data-toggle": "confirmation", "data-placement": "left"});

				//row.append($("<td>", {text: isbn}))
				row
					.append($("<td>", {text: dateFormatted}))
					.append($("<td>", {text: rec.category}))
					.append($("<td>", {text: rec.parent ? "reply" : "" }))
					.append($("<td>", {text: rec.name}))
					.append($("<td>", {text: rec.email}))
					.append($("<td>", {text: rec.text}));

				if (this.options.filter == "unmoderated") {
					row.append($("<td>", {class: "text-center ok-row"}).append(checkbox));
				}

				row.append($("<td>", {class: "text-center"}).append(deleteButton));

				added++;
			}

			$('[data-toggle="confirmation"]').confirmation( { placement: "left", onConfirm: $.proxy(this.onClickDelete, this) } );

			$("#no-unmoderated-comments").css("display", (added > 0) ? "none" : "block");
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

			// moderated => .ok set to true, .source = id of original comment
			obj.ok = val;
			obj.source = key;

			if (obj.id)
				delete obj.id;

			Database.postCommentToPersistentDatabase(obj, $.proxy(this.reloadComments, this));
		},

		onClickDelete: function (event) {
			var key = $(event.target).parents("tr").attr("data-key");
			var rec = $(event.target).parents("tr").attr("data-data");

			Database.deleteComment(key, $.proxy(this.reloadComments, this));
		},

		getTitleForISBN: function (isbn, callback) {
			var t = lookForTitleLocally(isbn);

			if (t === undefined) {
				saveTitleLocally(isbn, "pending");
				callback("pending");

				var url = "https://persistent-data.herokuapp.com/www.informit.com/search/index.aspx?query=" + isbn;

				$.get(url, function (data) {
					var regex = /<h1>([\s\S]+?)<\/h1>/;
					var title = data.match(regex);
					if (title && callback) {
						t = title[1].trim();
						callback(t);

						saveTitleLocally(isbn, t);
					}
				});
			} else {
				callback(t);
			}
		},

		onClickFilter: function (event) {
			this.options.filter = $(event.target).val();

			//this.refreshComments();

			this.reloadComments();
		}
	});

	$.widget("que.ProgressCircle", {

		options: {},

		_create: function () {
			this.radius = 30;
			this.numUnits = 10;
			this.centerX = 80, this.centerY = 30;
			this.visible = false;

			for (var i = 0; i < this.numUnits; i++) {
				var img = $("<img>", { class: "pill back", src: "pill.png" });
				var degrees = (360 / this.numUnits) * i;
				var radians = (degrees - 90) / 180 * Math.PI;
				var scale = 0;
				var x = this.centerX + Math.floor(Math.cos(radians) * this.radius);
				var y = this.centerY + Math.floor(Math.sin(radians) * this.radius);
				var s = "translate(" + x + "px," + y + "px) rotate(" + degrees + "deg) scaleY(" + scale + ")";
				img.css("transform", s);
				this.element.append(img);

				var img = $("<img>", { class: "pill front", src: "pill_empty.png" });
				var s = "translate(" + x + "px," + y + "px) rotate(" + degrees + "deg)";
				img.css("transform", s);
				this.element.append(img);
			}
		},

		setPercent: function (percent) {
			var pills = this.element.find(".pill.back");

			var active;

			for (var i = 0; i < this.numUnits; i++) {
				var fill1 = (i / this.numUnits);
				var fill2 = ((i + 1) / this.numUnits);
				var scale = 0;
				if (percent >= fill2) {
					scale = 1.0;
					active = i;
				} else if (percent > fill1) {
					active = i;
					scale = (percent - fill1) / (1 / this.numUnits);
				}

				var degrees = (360 / this.numUnits) * i;
				var radians = (degrees - 90) / 180 * Math.PI;
				var x = this.centerX + Math.floor(Math.cos(radians) * this.radius);
				var y = this.centerY + Math.floor(Math.sin(radians) * this.radius);
				var s = "translate(" + x + "px," + y + "px) rotate(" + degrees + "deg) scaleY(" + scale + ")";

				pills.eq(i).css("transform", s);
			}

			var rotation = -Math.floor(active * (360 / this.numUnits));
			this.element.css("transform", "rotate(" + rotation + "deg)");
		},

		hide: function () {
			this.element.css("opacity", 0);
			this.visible = false;
		},

		show: function () {
			this.element.css("opacity", 1);
			this.visible = true;
		},

		isVisible: function () {
			return this.visible;
		}
	});
});
