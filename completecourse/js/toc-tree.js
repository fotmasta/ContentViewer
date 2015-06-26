define(["lunr", "jquery.ui"], function (lunr) {

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

			var anchor = d.find("> a");
			var label = anchor.text();

			if (anchor.hasClass("rr-updated")) {
				label += " <span class='badge'>new</span>";
			}

			var node = { desc: label, href: anchor.attr("href") };

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

			var a = $("<a>").attr("href", d.node.href);

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

			this.nodes = nodes;

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
		
		launchVideo: function (index, event) {
			event.preventDefault();
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

		setSearchIndex: function (data) {
			this.searchIndex = lunr.Index.load(data);
		},

		search: function (term) {
			var results = this.searchIndex.search(term);

			$(".search-results").empty();

			for (var i = 0; i < results.length; i++) {
				var index = results[i].ref;
				var hit = this.options.metadata[index];
				var hitResult = $("<div>", { class: "hit", text: hit.desc });
				hitResult.click($.proxy(this.launchVideo, this, index));
				$(".search-results").append(hitResult);
			}

			if (term != "") {
				this.element.parent().find(".toc").hide();
				this.element.parent().find(".search-results").show();
			} else {
				this.element.parent().find(".toc").show();
				this.element.parent().find(".search-results").hide();
			}
		},

		searchX: function (term) {
			var results = { toShow: $(), toHide: $() };

			//this.searchByTitle(term, results);
			this.searchByIndex(term, results);

			if (term != "") {
				if (results.toShow.length) {
					$("#query-summary").text("Count: " + results.toShow.length);
				} else {
					$("#query-summary").text("No matching titles. Try a different search?");
				}
			} else {
				results.toShow = this.element.find("li");
				results.toHide = $();
				$("#query-summary").text("");
			}

			results.toShow.show(300);
			results.toHide.hide(300);
		},

		searchByTitle: function (term, results) {
			results.toShow = this.element.find("li:containsNC('" + term + "')");

			results.toHide = this.element.find("li:not(:containsNC('" + term + "'))");
		},

		searchByIndex: function (term, results) {
			var result = this.searchIndex.search(term);

			results.toShow = $();
			results.toHide = this.element.find("li");

			for (var i = 0; i < result.length; i++) {
				// get rid of initial OPS/ folder
				var r = result[i].ref.replace(/^ops\//, "");

				var matching = this.element.find('a[href*="' + r + '"]');
				matching.each(function (index, element) {
					var li = $(element).parents("li");
					$.merge(results.toShow, li);
					results.toShow = $.unique(results.toShow);
					results.toHide = results.toHide.not(li);
				});
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
