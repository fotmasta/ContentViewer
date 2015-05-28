define(["jquery.ui"], function () {

	// case-insensitive search (found on web)
	$.extend($.expr[":"], {
		"containsNC": function (elem, i, match, array) {
			return (elem.textContent || elem.innerText || "").toLowerCase().indexOf((match[3] || "").toLowerCase()) >= 0;
		}
	});

	function setNodeAtDepth  (nodes, depth, node) {
		var depths = depth.split(",");
		var curLevel = nodes;
		for (var i = 0; i < depths.length; i++) {
			var curDepth = depths[i];
			if (curLevel[curDepth] == undefined) {
				curLevel[curDepth] = { node: null, children: [] };
			}

			if (i == depths.length - 1) {
				curLevel[curDepth].node = node;
			}

			curLevel = curLevel[curDepth].children;
		}
	}

	function convertHabitatDataToNodes (data) {
		var nodes = [];

		addChildNodes(nodes, data.find("> li"));

		return nodes;
	}

	function addChildNodes (nodes, children) {
		for (var i = 0; i < children.length; i++) {
			var d = children.eq(i);

			var node = { desc: d.find("> a").text() };

			var obj = { node: node, children: [] };

			nodes[i] = obj;

			addChildNodes(obj.children, d.find("> ol > li"));
		}
	}

	$.widget("que.TOCTree", {

		options: {},

		_create: function () {
			this.refresh();

			if (this.options.expander)
				$(this.options.expander).click($.proxy(this.expandOrCollapse, this));
		},

		refresh: function () {
			if (!this.options || !this.options.data) return;

			this.element.empty();

			if (this.options.type == "habitat")
				this.refreshFromHabitatData();
			else
				this.refreshFromMetadata();

			var p = $("<p>", { id: "query-summary", class: "blocky", text: "" });
			this.element.append(p);
		},

		addNodes: function (params, nodes, dest, depth) {
			for (var i = 0; i < nodes.length; i++) {
				var d = nodes[i];

				var new_depth = depth.slice();
				new_depth.push(i + 1);

				this.addParentNode(params, d, dest, new_depth);
			}
		},

		addParentNode: function (params, d, dest, depth) {
			var li, linkholder;

			li = $("<li>");
			dest.append(li);

			if (d.children.length > 0) {
				var lbl = $("<label>", {class: "tree-toggler nav-header"});
				li.append(lbl);
				linkholder = lbl;

				var ul = $("<ul>", { class: "nav nav-list tree" });
				li.append(ul);
			} else {
				linkholder = li;
			}

			li.attr("data-index", params.counter);

			var a = $("<a href='#'>");

			var entry_text = d.node.desc;
			var sp = $("<span>", { class: "desc", html: " " + entry_text });

			var short = $("<span>", { class: "level tree-toggler" });

			var short_label;
			if (depth.length <= 2) {
				short_label = depth.join(".");
			} else {
				short_label = depth[depth.length - 1];
				short.addClass("invisible");
			}

			short.html(short_label);

			a.append(short);

			a.append(sp);

			a.appendTo(linkholder);

			a.click($.proxy(this.launchVideo, this, params.counter));

			short.click(function (event) {
				event.preventDefault();
				event.stopPropagation();
				$(this).parents("li").eq(0).children('ul.tree').toggle(300);
			});

			params.counter++;

			this.addNodes(params, d.children, ul, depth);
		},

		refreshFromHabitatData: function () {
			var ol = $(this.options.data).find("nav > ol");

			// for some reason, this fallback was necessary when running locally (or when some of the js code was loaded via AWS?)
			if (ol.length == 0) {
				ol = $(this.options.data).children().eq(1);
			}

			var nodes = convertHabitatDataToNodes(ol);

			this.addNodes( { counter: 0 }, nodes, this.element, []);
		},

		refreshFromMetadata: function () {
			var d = this.options.data;
			var nodes = [];

			for (var i = 0; i < d.length; i++) {
				var n = d[i];
				setNodeAtDepth(nodes, n.depth, n);
			}

			this.addNodes( { counter: 0 }, nodes, this.element, []);
		},

		refreshFromMetadataX: function () {
			var depths = [];
			var last_depth = undefined;
			var current_ul;

			for (var i = 0; i < this.options.data.length; i++) {
				var d = this.options.data[i];

				var depth = d.depth.split(",");

				depth = $.map(depth, function (el, index) { return parseInt(el); });

				var li, linkholder;

				if (depth[0] != last_depth) {
					li = $("<li>");
					this.element.append(li);

					var lbl = $("<label>", { class: "tree-toggler nav-header" });
					li.append(lbl);
					linkholder = lbl;

					var ul = $("<ul>", { class: "nav nav-list tree" });
					li.append(ul);

					current_ul = ul;
				} else {
					li = $("<li>");
					li.appendTo(current_ul);

					linkholder = li;
				}

				li.attr("id", d.id).attr("data-index", i);

				var a = $("<a href='#'>");
				var sp = $("<span>", { class: "desc", html: " " + d.desc });

				switch (d.type) {
					case "quiz":
						a.addClass("quiz");
						break;
				}

				if (d.short) {
					var short = $("<span>", { class: "level tree-toggler" });

					// kludge for quiz coloring
					if (d.short.indexOf("question") != -1) {
						short.addClass("quiz-background");
					}

					short.html(d.short);

					a.append(short);

					if (d.timestamp) {
						var time = $("<span>", { class: "timestamp", text: d.timestamp });
						a.append(time);
					}
				}

				a.append(sp);

				a.appendTo(linkholder);

				if (d.callback)
					a.click(d.callback);
				else
					a.click($.proxy(this.launchVideo, this, i));

				last_depth = depth[0];
			}
		},
		
		launchVideo: function (index) {
			this.element.trigger("playvideo", index);
		},
		
		_destroy: function () {
		},

		_setOption: function ( key, value ) {
			switch (key) {
				case "data":
					this.options["data"] = value;
					this.refresh();
					break;
				default:
					//this.options[ key ] = value;
					break;
			}

			this._super( "_setOption", key, value );
		},

		search: function (term) {
			var toShow = this.element.find("li:containsNC('" + term + "')");

			toShow.show(300);

			this.element.find("li:not(:containsNC('" + term + "'))").hide(300);

			if (term != "") {
				if (toShow.length) {
					$("#query-summary").text("Count: " + toShow.length);
				} else {
					$("#query-summary").text("No matching titles. Try a different search?");
				}
			} else {
				$("#query-summary").text("");
			}
		},

		markStarted: function (index) {
			var el = this.element.find("[data-index=" + index + "]");
			var a = el.find("a");
			var checked = a.find("i.checked");
			checked.remove();
			a.append("<i class='checked fa fa-adjust fa-flip-horizontal fa-lg'></i>");
		},

		markCompleted: function (index) {
			var el = this.element.find("[data-index=" + index + "]");
			var a = el.find("> label a, > a");
			var checked = a.find("i.checked");
			checked.remove();
			a.append("<i class='checked fa fa-check-circle fa-lg'></i>");

			a.find("span.desc").addClass("completed");
		},

		setStatus: function (items) {
			for (var i = 0; i < items.length; i++) {
				var item = items[i];
				if (item.completed)
					this.markCompleted(i);
				else if (item.started)
					this.markStarted(i);
			}
		},

		expandOrCollapse: function (event) {
			var vis = $(".toc > li > ul").is(":visible");

			if (vis) {
				$(this.options.expander + " i").removeClass("fa-caret-up").addClass("fa-caret-down");
				this.element.find("> li > ul").hide(300);
				//$(".toc > li > ul").hide(300);
			} else {
				$(this.options.expander + " i").removeClass("fa-caret-down").addClass("fa-caret-up");
				this.element.find("li ul").show(300);
				//$(".toc li ul").show(300);
			}
		}
	});
});
