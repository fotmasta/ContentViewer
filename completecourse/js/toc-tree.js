define(["lunr", "jquery.ui", "jquery.highlight"], function (lunr) {

	// case-insensitive search (found on web)
	$.extend($.expr[":"], {
		"containsNC": function (elem, i, match, array) {
			return (elem.textContent || elem.innerText || "").toLowerCase().indexOf((match[3] || "").toLowerCase()) >= 0;
		}
	});

	function setNodeAtDepth  (nodes, depth, node) {
		var depths = depth.toString().split(",");
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

	function findNodeForIndex (nodes, index) {
		for (var i = 0; i < nodes.length; i++) {
			if (nodes[i].node.index == index) {
				return nodes[i];
			} else {
				var r = findNodeForIndex(nodes[i].children, index);
				if (r) {
					return r;
				}
			}
		}

		return undefined;
	}

	function getShortLabel (node) {
		var p = node;

		while (p) {
			if (p.short)
				return p.short;
			else
				p = p.parent;
		}
		return null;
	}

	function MakeAShortLabelForSearchResults (node) {
		var depths = node.node.depth.slice();
		var short = getShortLabel(node.node);
		if (short) {
			depths[0] = short;
		}

		var label = depths.join(".");
		return label;
	}

	$.widget("que.TOCTree", {

		options: {},

		_create: function () {
			this.holder = this.element.find(".toc-holder");

			this.refresh();

			if (this.options.expander)
				$(this.options.expander).click($.proxy(this.expandOrCollapse, this));

			this.searchCounter = undefined;
		},

		refresh: function () {
			if (!this.options || !this.options.data) return;

			this.holder.empty();

			if (this.options.type == "habitat") {
				this.refreshFromHabitatData();
			} else if (this.options.type == "epub") {
				this.refreshFromMetadata();
				this.collapseTOC();
			} else {
				this.refreshFromMetadata();
			}

			var p = $("<p>", { id: "query-summary", class: "blocky", text: "" });
			this.holder.append(p);
		},

		addNodes: function (params, nodes, dest, depth) {
			for (var i = 0; i < nodes.length; i++) {
				var d = nodes[i];

				var new_depth = depth.slice();
				new_depth.push(i + 1);

				if (d) {
					this.addParentNode(params, d, dest, new_depth);
				}
			}
		},

		addParentNode: function (params, d, dest, depth) {
			var li, linkholder;

			if (d && d.node) {
				d.node.depth = depth;
				d.node.index = params.counter;

				li = $("<li>");
				dest.append(li);

				if (d && d.children && d.children.length > 0) {
					var lbl = $("<label>", {class: "tree-toggler nav-header"});
					li.append(lbl);
					linkholder = lbl;

					var ul = $("<ul>", {class: "nav nav-list tree"});
					li.append(ul);
				} else {
					linkholder = li;
				}

				li.attr("data-index", params.counter);

				var a = $("<a>").attr("href", d.node.href);

				var entry_text = d.node.desc;
				var sp = $("<span>", {class: "desc", html: " " + entry_text});

				var indicator = $("<div>", { class: "indicator" });
				sp.append(indicator);

				var short = $("<span>", {class: "level tree-toggler"});

				var short_label;
				if (depth.length <= 3) {
					short_label = depth.join(".");
				} else {
					short_label = depth[depth.length - 1];
					short.addClass("invisible");
				}

				if (d.node.short) {
					short.html(d.node.short);
				} else {
					if (this.options.type == "habitat") {
						short.html(short_label);
					} else if (this.options.type == "epub") {
						short_label = depth[depth.length - 1];
						short.addClass("invisible");
					} else {
						var shortcut = d.node.desc.toLowerCase();

						if (shortcut == "introduction") {
							short.html("<i class='fa fa-home'></i>");
						} else if (shortcut == "summary") {
							short.html("<i class='fa fa-flag'></i>");
						} else {
							short.html(d.node.desc.substr(0, 1));
						}
					}
				}

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
			}

			if (ul == undefined) ul = dest;

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

			this.addNodes( { counter: 0 }, nodes, this.holder, []);
		},

		refreshFromMetadata: function () {
			var d = this.options.data;
			var nodes = [];

			for (var i = 0; i < d.length; i++) {
				var n = d[i];
				setNodeAtDepth(nodes, n.depth, n);
			}

			this.addNodes( { counter: 0 }, nodes, this.holder, []);

			this.nodes = nodes;
		},
		
		launchVideo: function (index, event, options) {
			event.preventDefault();
			this.element.trigger("playvideo", { depth: index, options: options });

			// find the toc entry for this index and expand it
			var li = this.element.find("li[data-index=" + index + "] ul");
			if (li.length) {
				li.show(300);
			}
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
			this.searchCounter = undefined;

			if (!this.searchIndex) {
				return this.searchByTitles(term);
			}

			var results = this.searchIndex.search(term);

			$(".search-result-list").empty();

			for (var i = 0; i < results.length; i++) {
				var index = results[i].ref - 1;
				var hit = this.options.metadata[index];
				if (hit) {
					var node = findNodeForIndex(this.nodes, index);
					var label = MakeAShortLabelForSearchResults(node);
					var section_label = " <p class='section-label'>" + label + "</p>";
					var hit_label = "<p class='hit-label'>" + hit.desc + "</p>";
					var hitResult = $("<div>", {class: "hit", html: section_label + hit_label}).data("index", index);
					var me = this;
					hitResult.click(function (event) {
						var index = $(this).data("index");
						me.launchVideo(index, event, { highlight: term });
						$(".hit.selected").removeClass("selected");
						$(this).addClass("selected");
					});
					$(".search-result-list").append(hitResult);
				}
			}

			if (term != "") {
				this.showSearchPane(results.length);
			} else {
				this.element.parent().find(".toc").delay(300).show("slide");
				this.element.parent().find(".search-results").hide("slide");
			}
		},

		showSearchPane: function (resultCount) {
			this.element.parent().find(".toc").hide("slide");
			this.element.parent().find(".search-results").delay(300).show("slide");

			if (resultCount == undefined) {
				$("#hit-count").text("");
			} else {
				var lbl = resultCount + " hit" + (resultCount != 1 ? "s" : "");

				$("#hit-count").text(lbl);
			}

			// NOTE: this is a terrible kludge to try to get the search results to appear (a timeout missing or less than 500 would leave the .search-results with display: none, for some reason)
			var me = this;
			setTimeout(function () {
				me.element.parent().find(".search-results").show("slide");
			}, 500);
		},

		closeSearch: function () {
			this.element.parent().find(".toc").delay(300).show("slide");
			this.element.parent().find(".search-results").hide("slide");

			this.element.trigger("closesearch");
		},

		searchNext: function (direction) {
			var s = $(".hit.selected");
			if (s.length) {
				s = s.index() + direction;
				if (s > $(".hit").length - 1)
					s = 0;
				else if (s < 0)
					s = $(".hit").length - 1;
			} else {
				s = 0;
			}

			this.searchCounter = s;

			$(".hit").eq(this.searchCounter).click();

			// keep the selected hit scrolled in the middle
			this.autoScrollSearchResults();
		},

		autoScrollSearchResults: function () {
			var scroller = $(".search-results .scroller");
			var t = scroller.scrollTop();
			var h = scroller.height();
			var entry = $(".hit.selected");
			var p = entry.offset().top;
			var desired_top = (h * .5);
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
		},

		searchByTitles: function (term) {
			var results = { toShow: $(), toHide: $() };

			results.toShow = this.holder.find("li:containsNC('" + term + "')");
			results.toHide = this.holder.find("li:not(:containsNC('" + term + "'))");

			if (term != "") {
				if (results.toShow.length) {
					$("#query-summary").text("Count: " + results.toShow.length);
				} else {
					$("#query-summary").text("No matching titles. Try a different search?");
				}
			} else {
				results.toShow = this.holder.find("li");
				results.toHide = $();
				$("#query-summary").text("");
			}

			results.toShow.show(300);
			results.toHide.hide(300);
		},

		markStarted: function (index) {
			var el = this.holder.find("[data-index=" + index + "]");
			// only mark the first link (not the children)
			var a = el.find("a").first();
			var checked = a.find("i.checked");
			checked.remove();
			a.append("<i class='checked fa fa-adjust fa-flip-horizontal fa-lg'></i>");
		},

		markCompleted: function (index) {
			var el = this.holder.find("[data-index=" + index + "]");
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

		collapseTOC: function () {
			$(this.options.expander + " i").removeClass("fa-caret-up").addClass("fa-caret-down");
			this.holder.find("> li > ul").hide(300);
		},

		expandTOC: function () {
			$(this.options.expander + " i").removeClass("fa-caret-down").addClass("fa-caret-up");
			this.holder.find("li ul").show(300);
		},

		expandOrCollapse: function (event) {
			var vis = $(this.options.expander + " i").hasClass("fa-caret-up");

			if (vis) {
				this.collapseTOC();
			} else {
				this.expandTOC();
			}
		}
	});
});
