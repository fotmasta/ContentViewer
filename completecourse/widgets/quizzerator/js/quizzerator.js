var baseURL;

if (window.getInformITBaseURL)
	baseURL = window.getInformITBaseURL();
else if (window.parent.getInformITBaseURL)
	baseURL = window.parent.getInformITBaseURL();
else {
	if (window.location.hostname == "localhost") {
		baseURL = "../completecourse/";
	} else {
		baseURL = "https://s3.amazonaws.com/storefronts/streaming-video/completecourse/";
	}
}

//baseURL = "../../../completecourse/";

function decode_tabs (s) {
	if (s) {
		s = s.replace(/\\t/g, "\t");
	}
	return s;
}

requirejs.config({
	baseUrl: baseURL + "js/",
	paths: {
		"jquery": "jquery-2.1.3.min",
		"jquery.ui": "jquery-ui.min",
		"jquery.json": "jquery.json.min",
		"jquery.onscreen": "jquery.onscreen",
		"jquery.highlight": "jquery.highlight",
		"bootstrap": "bootstrap",
		"bootstrap-notify": "bootstrap-notify.min",
		"bootstrap-dialog": "bootstrap-dialog.min",
		"imagesloaded": "imagesloaded.pkgd.min",
		"popcorn": "popcorn-complete.min",
		"bootstrap-toolkit": "bootstrap-toolkit.min",
		"videojs": "video",
		"videojs-markers": "videojs-markers",
		"handlebars": "handlebars-v3.0.3",
		"lunr": "lunr.min",
		"highlight": "highlight.pack"
	},
	shim: {
		"jquery": {
			export: "$"
		},
		"jquery.ui": {
			export: "$"
		},
		"jquery.json": {
			export: "$",
			deps: ['jquery']
		},
		"jquery.onscreen": {
			export: "$",
			deps: ['jquery']
		},
		"jquery.highlight": {
			export: "$",
			deps: ['jquery']
		},
		"bootstrap": {
			export: "$",
			deps: ['jquery']
		},
		"bootstrap-notify": {
			export: "$",
			deps: ['bootstrap']
		},
		"bootstrap-dialog": {
			deps: ['bootstrap']
		},
		"popcorn": {
			export: "Popcorn"
		},
		"popcorn.timebase": {
			export: "Popcorn",
			deps: ['popcorn']
		},
		"bootstrap-toolkit": {
			export: "$",
			deps: ["jquery"]
		},
		"videojs": {
			export: "videojs",
			deps: ["jquery"]
		},
		"videojs-markers": {
			deps: ["videojs", "jquery"]
		},
		"imagesloaded": {
			export: "$",
			deps: ["jquery"]
		},
		"handlebars": {
			exports: "Handlebars"
		}
	},
	// this fixed the "appending .js" problem I was getting on informit.com
	config: {
		text: {
			useXhr: function (url, protocol, hostname, port) {
				return true;
			}
		}
	}
});

function removeMatchColors (el) {
	var s = "";
	for (var i = 1; i < 10; i++) {
		s += "matched-color" + i + " ";
	}
	el.removeClass(s);
}

function addStamp (hotspot, stamp) {
	var img = $("<img>", { class: "stamp", src: stamp });
	hotspot.append(img);
}

function left_trim (s) {
	for (var i = 0; i < s.length; i++) {
		if (s.charCodeAt(i) == 32)
			continue;
		else
			return s.substr(i);
	}
}

define(["database", "imagesloaded", "highlight", "jquery.ui", "bootstrap", "jquery.json"], function (database, imagesLoaded) {

	var tryAgainText = "That's not correct. Try a different response.";
	var partialTryAgainText = "That's partially correct. Keep trying.";
	var correctText = "That's correct!";

	function analytics () {
		if (window.location.hostname == "localhost") {
			just_log.apply(this, arguments);
		} else {
			ga.apply(this, arguments);
		}
	}

	function just_log (a, b, c, d, e) {
		console.log("analytics: " + a + " " + b + " " + c + " " + d + " " + e);
	}

	function showAndFadeCheckmark (checkmark, x, y, callback) {
		checkmark.removeClass("fadeOut tada").hide().addClass("animated tada").css({ left: x, top: y }).show();
		setTimeout(function () {
			checkmark.addClass("fadeOut");
			if (callback) {
				callback();
			}
		}, 1000);
	}

	$.widget("que.quizzerator", {
		options: {},

		_create: function () {
			this.db = database;

			this.id = "quiz_id";

			this.currentQuestion = 0;
			this.attempts = 1;

			this.options.settings = { reviewableAfterEach: true };

			var quizFile = this.options.data;

			// use filename for quiz id
			var regex = /([^\/]+)(\.json)$/;
			match = quizFile.match(regex);
			if (match && match.length) {
				this.id = match[1];
			} else {
				this.id = quizFile;
			}

			//$.get(quizFile, $.proxy(this.onLoadedData, this));

			var summary = $("<div>", {class: "summary"});
			var container = $("<div>", {class: "holder"});
			summary.append(container);
			container.append($("<h3>Score:</h3>"));
			var t = $("<table><tr class='attempts'><td>Attempts</td><td id='attempts-count'></td></tr><tr class='answered'><td>Answered</td><td id='answered-count'></td></tr><tr><td>Correct</td><td id='correct-count'></td></tr><tr><td>Incorrect</td><td id='incorrect-count'></td></tr><tr class='total'><td>Score</td><td id='score-result'></td></tr></table>");
			t.addClass("results");
			container.append(t);
			var btn = $("<button>", {
				id: "check-all",
				class: "btn btn-success btn-sm center-block shrunk",
				text: "Check All"
			});
			btn.click($.proxy(this.onClickCheckAll, this));
			container.append(btn);

			btn = $("<button>", {
				id: "start-over",
				class: "btn btn-warning btn-sm center-block shrunk",
				text: "Start Over"
			});
			btn.click($.proxy(this.onClickStartOver, this));
			container.append(btn);

			this.element.append(summary);

			var ol = $("<ol>", {class: "quiz-holder"});
			this.element.find("#controls").before(ol);

			this.element.find("#start-over-button").click($.proxy(this.onClickStartOver, this));
			this.element.find("#clear-button").click($.proxy(this.onClickClear, this));
			this.element.find("#previous-button").click($.proxy(this.onClickPrevious, this));
			this.element.find("#next-button").click($.proxy(this.onClickNext, this));
			this.element.find("#submit-button").click($.proxy(this.onClickSubmit, this));

			this.element.find(".quiz-title").click($.proxy(this.onClickSecretPosition, this));

			this.onLoadedData(this.options.paramData);

			$(window).on("resize.quizzerator", $.proxy(this.onWindowResize, this));

			var iframe = this.options.iframe.iframe[0], win = iframe.contentWindow, doc = win.document;
			doc.addEventListener("keydown", $.proxy(this.onWindowKeydown, this));
		},

		onWindowResize: function () {
			this.redrawLines();

			this.redrawHotspots();
		},

		onImagesLoaded: function () {
			this.redrawLines();

			this.redrawHotspots();
		},

		onLoadedData: function (data) {
			this.data = data;

			var preferredTitle = "";

			// not sure if we always want to grab the data.title first ...
			if (data.questionType == "matching") {
				preferredTitle = this.data.title ? this.data.title : this.options.desc;
			} else {
				preferredTitle = this.options.desc ? this.options.desc : this.data.title;
			}

			this.element.find("h3.quiz-title .contents").text(preferredTitle);

			if (this.data.reviewableAfterEach !== undefined) {
				this.options.settings.reviewableAfterEach = (String(this.data.reviewableAfterEach) == "true");
			}

			if (this.data.usesExplanations !== undefined) {
				this.options.settings.usesExplanations = (String(this.data.usesExplanations) == "true");
			}

			if (this.data.randomizeResponses !== undefined) {
				this.options.settings.randomizeResponses = (String(this.data.randomizeResponses) == "true");
			}

			if (this.data.singleView !== undefined) {
				this.options.settings.singleView = (String(this.data.singleView) == "true");
			}

			if (this.options.settings.singleView) {
				this.element.addClass("single-view");
			}

			if (this.data.syntaxHighlighting != undefined && this.data.syntaxHighlighting != "") {
				this.options.settings.syntaxHighlighting = String(this.data.syntaxHighlighting);
			}

			for (var i = 0; i < this.data.questions.length; i++) {
				var d_q = this.data.questions[i];

				var q = {};

				q.index = i;
				q.q = d_q.text;
				q.hint = d_q.ref;
				q.questionType = this.data.questionType;
				if (d_q.answers)
					q.answers = d_q.answers.slice();
				if (d_q.choices)
					q.choices = d_q.choices.slice();
				if (d_q.steps)
					q.steps = d_q.steps.slice();
				if (d_q.instructions)
					q.instructions = d_q.instructions;
				q.headings = d_q.headings;

				this.addQuestion(q);
			}

			if (this.options.settings.singleView) {
				this.updateCurrentQuestion();
			}

			this.options.iframe.overrideLinks();

			this.convertHintLinksToHumanReadable();

			this.loadResponses();

			this.updateScore();

			this.adjustSummarySize();

			if (this.options.settings.syntaxHighlighting != undefined) {
				var language = this.options.settings.syntaxHighlighting;

				this.element.find("code").each(function (i, block) {
					$(block).addClass(language);
					hljs.highlightBlock(block);
				});
			}
		},

		getQuestionType: function (questionData) {
			if (questionData.questionType) {
				return questionData.questionType;
			} else {
				var questionType = "multiple choice";
				if (questionData.headings) questionType = "matrix";
				else if (questionData.choices) questionType = "matching";
				else if (questionData.steps && questionData.steps[0].order != undefined) questionType = "sorting";
				else if (questionData.steps) questionType = "exercise";

				return questionType;
			}
		},

		addQuestion: function (q_params) {
			var n = this.element.find(".quiz-holder li.question").length;

			var classes = "question";

			if (this.options.settings.singleView) {
				classes += " animated fadeInRight single-view";
			}

			var q = $("<li>", {class: classes, "data-number": (n + 1) + "." });
			q.attr("data-index", q_params.index);

			var p_question = $("<p>", {class: "description", html: q_params.q});

			var me = this;

			// add paths to the images (unless they're data URIs)
			p_question.find("img").each(function () {
				var img = $(this);
				var src = img.attr("src");
				if (src && src.indexOf("data:image/") == -1) {
					var path = me.options.path + "/" + src;
					img.attr("src", path);
				}
			});

			q.append(p_question);

			var instruct = $("<div>", { class: "instructions" } );
			q.append(instruct);

			var answers = $("<ol>", {class: "answers-holder"});
			q.append(answers);

			var params = { questionEl: q, questionData: q_params, answersEl: answers };

			switch (this.getQuestionType(q_params)) {
				case "multiple choice":
					this.setupForMultipleChoice(params);
					break;
				case "matching":
					this.setupForMatching(params);
					break;
				case "matrix":
					this.setupForMatrix(params);
					break;
				case "exercise":
					this.setupForExercise(params);
					break;
				case "sorting":
					this.setupForSorting(params);
					break;
			}

			var checker = $("<div>", {class: "checker inactive"}).appendTo(q);
			var container = $("<div>", { class: "hint-holder"}).appendTo(checker);
			var btn = $("<button>", {class: "btn btn-primary btn-checker", text: "Check Answer"});
			btn.click($.proxy(this.onClickCheck, this));
			btn.appendTo(container);
			var lbl = $("<span>", { class: "checker-label", html: tryAgainText });
			lbl.appendTo(container);

			var btnReveal = $("<button>", {
				class: "btn btn-primary btn-reveal btn-xs hidden",
				text: "Reveal Answer"
			});
			btnReveal.appendTo(checker);
			btnReveal.click($.proxy(this.onClickRevealOne, this));

			if (!this.options.settings.singleView) {
				var btnReset = $("<button>", {
					class: "btn btn-info btn-reset btn-xs",
					text: "Reset Question"
				});
				btnReset.appendTo(checker);
				btnReset.click($.proxy(this.onClickResetOne, this));
			}

			if (q_params.hint) {
				if (this.options.settings.usesExplanations) {
					var expl = $("<p>", {class: "hint explanation", html: "<i class='fa fa-bookmark text-danger'></i> "});
					var text = $("<span>", {text: q_params.hint});
					expl.append(text);
					checker.append(expl);
				} else {
					var hint = $("<p>", {class: "hint", html: "<i class='fa fa-bookmark text-danger'></i> Hint: "});
					var link = $("<a>", {href: q_params.hint, text: q_params.hint});
					hint.append(link);
					checker.append(hint);
				}
			}

			switch (this.getQuestionType(q_params)) {
				case "exercise":
					this.postSetupForExercise(params);
					break;
			}

			this.element.find(".quiz-holder").append(q);
		},

		setupForMatrix: function (params) {
			var q = params.questionEl, q_params = params.questionData, answers = params.answersEl;

			q.addClass("matrix");

			var cols = q_params.headings;

			var t = $("<table>", { class: "matrix-table" });
			q.find(".instructions").append(t);
			var tr = $("<tr>");
			t.append(tr);

			tr.append($("<th>"));

			var th = $("<th>", { text: cols[0] });
			tr.append(th);

			var n = cols.length - 2;

			th = $("<th>", { text: cols[1], colspan: n });
			tr.append(th);

			tr = $("<tr>");
			t.append(tr);

			tr.append($("<th>"));
			tr.append($("<th>"));

			for (var i = 0; i < n; i++) {
				th = $("<th>", { text: cols[i + 2] });
				tr.append(th);
			}

			var availableAnswers = [];

			for (var i = 0; i < q_params.answers.length; i++) {
				var a = q_params.answers[i];

				if (availableAnswers.indexOf(a) == -1) {
					availableAnswers.push(a);
				}
			}

			var dd = '<select>';
			for (var i = 0; i < availableAnswers.length; i++) {
				var s = '<option value="' + availableAnswers[i] + '">' + availableAnswers[i] + '</option>';
				dd += s;
			}
			dd += '</select>';

			var me = this;

			for (var i = 0; i < q_params.choices.length; i++) {
				tr = $("<tr>");
				t.append(tr);

				var td = $("<td>");

				var icons = $("<div>", {class: "icons"});
				td.append(icons);

				var icon_correct = $("<i>", {class: "icon correct fa fa-2x fa-check hidden"});
				icons.append(icon_correct);

				var icon_incorrect = $("<i>", {class: "icon incorrect fa fa-2x fa-times hidden"});
				icons.append(icon_incorrect);

				tr.append(td);

				td = $("<td>", { text: q_params.choices[i] });
				tr.append(td);

				for (var j = 0; j < n; j++) {
					td = $("<td>", { class: "empty user-entry", "data-row": i, "data-col": j });

					var dropdown = $(dd);
					dropdown.change(function (event) {
						var val = $(event.currentTarget).val();
						var r = $(event.currentTarget).attr("data-row");
						var c = $(event.currentTarget).attr("data-col");
						me.onMatrixAnswer(event, r, c, val);
					});
					// default to 'no value'
					dropdown[0].selectedIndex = -1;

					td.append(dropdown);

					var hiddenAnswer = $("<span>", { text: q_params.answers[i * n + j], class: "hidden-answer hidden" });
					td.append(hiddenAnswer);

					dropdown.on("dragenter", function (event) {
						$(event.currentTarget).parent().addClass("over");
					});
					dropdown.on("dragleave", function (event) {
						$(event.currentTarget).parent().removeClass("over");
					});
					dropdown.on("dragover", function (event) {
						event.originalEvent.dataTransfer.dropEffect = "move";
						return false;
					});
					dropdown.on("drop", function (event) {
						$(event.currentTarget).parent().removeClass("over");
						var t = event.originalEvent.dataTransfer.getData("text/plain");
						var r = $(event.currentTarget).parent().attr("data-row");
						var c = $(event.currentTarget).parent().attr("data-col");
						me.onMatrixAnswer(event, r, c, t);
					});

					tr.append(td);
				}
			}

			tf = $("<tfoot>");
			t.append(tf);

			tf.append($("<td>"));
			tf.append($("<td>"));

			var td = $("<td>", { colspan: n, id: "available-container" });
			tf.append(td);

			td.append("<p class='small'>Answer using the dropdown boxes above or drag-and-drop the choices below:</p>");

			for (var i = 0; i < availableAnswers.length; i++) {
				var btn = $("<button>", { class: "btn btn-primary matrix-choice", text: availableAnswers[i] });
				btn.attr("draggable", true);

				var t = availableAnswers[i];
				var onDragStart = function (val, event) {
					event.originalEvent.dataTransfer.setData("text/plain", val);
				}
				btn.on("dragstart", onDragStart.bind(this, t));

				td.append(btn);
			}
		},

		setupForMultipleChoice: function (params) {
			var q = params.questionEl, q_params = params.questionData, answers = params.answersEl;

			q.addClass("multiple-choice");

			for (var each in q_params.answers) {
				var answer = q_params.answers[each];

				var isCorrect = false;
				if (answer.substr(0, 1) == "*") {
					isCorrect = true;
					answer = answer.substr(1);
				}

				var li = $("<li>", { class: "answer" });

				var icons = $("<div>", {class: "icons"});
				li.append(icons);

				var icon_correct = $("<i>", {class: "icon correct fa fa-2x fa-check hidden"});
				icons.append(icon_correct);

				var icon_incorrect = $("<i>", {class: "icon incorrect fa fa-2x fa-times hidden"});
				icons.append(icon_incorrect);

				var p = $("<button>", {class: "btn btn-primary response", html: answer });
				if (isCorrect) p.attr("data-correct", true);
				else p.attr("data-correct", false);

				p.attr("data-index", each);

				var me = this;

				p.find("img").each(function () {
					var img = $(this);
					var path = me.options.path + "/" + img.attr("src");
					img.attr("src", path);
				});

				p.click($.proxy(this.onClickAnswer, this));

				li.append(p);

				answers.append(li);
			}

			if (this.options.settings.randomizeResponses) {
				var responses = answers.find("li.answer");

				answers.children("li.answer").sort(function () {
					return Math.round(Math.random()) - 0.5;
				}).detach().appendTo(answers);
			}
		},

		setupForMatching: function (params) {
			var q = params.questionEl, q_params = params.questionData, answers = params.answersEl;

			q.addClass("matching");

			var mq = $("<div>", { class: "matching-container" });
			q.append(mq);

			var choices = $("<ol>", {class: "choices-holder"});
			mq.append(choices);

			for (var each in q_params.choices) {
				var choice = q_params.choices[each];

				var li = $("<li>", { class: "choice" });

				var p = $("<button>", {class: "response", html: choice});

				p.attr("data-index", each);

				var me = this;

				p.find("img").each(function () {
					var img = $(this);
					var path = me.options.path + "/" + img.attr("src");
					img.attr("src", path);
				});

				p.click($.proxy(this.onClickChoice1, this));
				li.append(p);

				choices.append(li);
			}

			for (var each in q_params.answers) {
				var answer = q_params.answers[each];

				var isCorrect = false;
				if (answer.substr(0, 1) == "*") {
					isCorrect = true;
					answer = answer.substr(1);
				}

				var li = $("<li>", { class: "answer" });

				var icons = $("<div>", {class: "icons"});
				var choice_li = mq.find("li.choice").eq(each);
				choice_li.append(icons);

				var icon_correct = $("<i>", {class: "icon correct fa fa-2x fa-check hidden"});
				icons.append(icon_correct);

				var icon_incorrect = $("<i>", {class: "icon incorrect fa fa-2x fa-times hidden"});
				icons.append(icon_incorrect);

				var p = $("<button>", {class: "response", html: answer});
				if (isCorrect) p.attr("data-correct", true);
				else p.attr("data-correct", false);

				p.attr("data-index", each);

				var me = this;

				p.find("img").each(function () {
					var img = $(this);
					var path = me.options.path + "/" + img.attr("src");
					img.attr("src", path);
				});

				p.click($.proxy(this.onClickChoice2, this));

				li.append(p);

				answers.append(li);
			}

			mq.append(answers);

			var responses = answers.find("li.answer");

			answers.children("li.answer").sort(function () {
				return Math.round(Math.random()) - 0.5;
			}).detach().appendTo(answers);
		},

		setupForExercise: function (params) {
			var q = params.questionEl, q_params = params.questionData, answers = params.answersEl;

			q.addClass("exercise");

			q.find(".description").text(this.data.title);

			q.find(".instructions").html(q_params.instructions);

			var ol = q.find("ol.answers-holder");

			// hardcoded window height minus navbar minus exercise controls minus border radius minus small buffer
			var wh = $(window).outerHeight() - 150;

			var me = this;

			function parseExerciseActionField (p) {
				var r = {};
				var lines = p.split("\n");
				for (var i = 0; i < lines.length; i++) {
					var line = lines[i];
					if (line.indexOf("prompt:") == 0) {
						r.prompt = left_trim(line.substr(7));
					} else if (line.indexOf("prefill:") == 0) {
						r.prefill = line.substr(8).trim();
					} else if (line.indexOf("hint:") == 0) {
						r.hint = line.substr(5).trim();
					} else if (line.indexOf("regex:") == 0) {
						r.regex = line.substr(6).trim();
					} else if (line.indexOf("placeholder:") == 0) {
						r.placeholder = line.substr(12).trim();
					} else if (line.indexOf("class:") == 0) {
						r.class = line.substr(6).trim();
					} else if (line.indexOf("instructions:") == 0) {
						r.instructions = line.substr(13).trim();
					} else if (line.indexOf("auto:") == 0) {
						r.auto = line.substr(5).trim();
					} else if (line.indexOf("stamp:") == 0) {
						r.stamp = line.substr(6).trim();
					} else if (line.indexOf("post:") == 0) {
						r.postfill = line.substr(5).trim();
					} else {
						r.answer = line;
					}
				}

				return r;
			}

			for (var i = 0; i < q_params.steps.length; i++) {
				var step = q_params.steps[i];
				var step_el = $("<li>", { class: "step" });
				if (i == 0) {
					step_el.addClass("current");
				}

				step_el.attr("data-type", step.type);

				if (step.type == "result" || step.type == "text_result") {
					step_el.attr("data-correct", true);
				}

				var props = parseExerciseActionField(step.action);

				step_el.attr({ "data-hint": props.hint, "data-answer": props.answer, "data-regex": props.regex, "data-placeholder": props.placeholder, "data-auto": props.auto, "data-stamp": props.stamp });

				var div = $("<div>", { class: "step" });
				var lbl = $("<p>", { class: "step-label", html: step.label });
				div.append(lbl);

				var img_div = $("<div>", { class: "image-holder" });

				if (step.image && step.image.substr(0, 7) == "console") {
					step.image = baseURL + "css/images/console.png";
				}

				var img = $("<img>", { class: "hotspot", src: step.image });

				//img[0].oncontextmenu = function () { return false; };

				img.css("max-height", wh);
				img_div.append(img);

				switch (step.type) {
					case "text":
					case "text_result":
					case "keydown":
						img_div.click(function (event) {
							if (!$(event.target).hasClass("entry")) {
								me.onClickIncorrectArea(event);
							}
						});

						img_div[0].oncontextmenu = function (event) {
							me.onClickIncorrectArea(event);
							return false;
						}
						break;

					default:
						img_div.click($.proxy(this.onClickIncorrectArea, this));
						img_div[0].oncontextmenu = function (event) {
							me.onClickIncorrectArea(event);
							return false;
						}

						break;
				}

				var rects = [];

				if ((step.type == "text" || step.type == "text_result" || step.type == "keydown") && !step.hotspot) {
					rects = ["20,30,50,20"];
				} else if (step.hotspot) {
					var rects = step.hotspot.split(";");
				}

				for (var j = 0; j < rects.length; j++) {
					var rect = rects[j].split(",");
					css = { left: rect[0] + "px", top: rect[1] + "px", width: rect[2] + "px", height: rect[3] + "px" }

					hotspot = $("<div>", {class: "hotspot"});
					hotspot.attr("data-rect", rect);
					hotspot.css(css);
					img_div.append(hotspot);

					switch (step.type) {
						case "text":
						case "text_result":
						case "keydown":
							var s1 = $("<span>", { class: "prompt" + (props.class ? " " + props.class : ""), html: decode_tabs(props.prompt) });
							hotspot.append(s1);

							if (step.type != "keydown") {
								var s1a = $("<span>", {
									class: "prefill" + (props.class ? " " + props.class : ""),
									text: decode_tabs(props.prefill)
								});
								hotspot.append(s1a);

								var s2 = $("<span>", {
									class: "entry" + (props.class ? " " + props.class : ""),
									contenteditable: true,
									text: props.placeholder
								});
								s2.on("focus", function (event) {
									$(event.target).siblings(".prefill").addClass("has-focus");
									$(event.target).addClass("has-focus");
								});
								s2.blur(function (event) {
									$(event.target).siblings(".prefill").removeClass("has-focus");
									$(event.target).removeClass("has-focus");
									var h = $(event.target).parents(".hotspot");
									if (h.hasClass("revealed"))
										me.onExerciseInput(event);
								});
								s2.on("input", $.proxy(this.onExerciseInput, this));
								s2.on("keydown", $.proxy(this.onExerciseKeyDown, this));

								hotspot.append(s2);
							}

							if (props.postfill) {
								var s3 = $("<span>", { class: "postfill" + (props.class ? " " + props.class : ""), html: decode_tabs(props.postfill) });
								hotspot.append(s3);
							}

							break;
						default:
							hotspot[0].oncontextmenu = $.proxy(this.onClickHotspot, this);
							hotspot.click($.proxy(this.onClickHotspot, this));

							break;
					}
				}

				div.append(img_div);
				step_el.append(div);
				ol.append(step_el);
			}

			var bigX = $("<div>", { class: "incorrectX" } );
			q.append(bigX);

			var bigCheck = $("<div>", { class: "correctMark" } );
			q.append(bigCheck);

			imagesLoaded(q, function () {
				me.onImagesLoaded();
			});
		},

		setupForSorting: function (params) {
			var q = params.questionEl, q_params = params.questionData, answers = params.answersEl;
			var me = this;

			q.addClass("sorting");

			q.find(".instructions").html(q_params.instructions);

			var mq = $("<div>", { class: "sorting-container" });
			q.append(mq);

			var steps = $("<ol>", {class: "steps-holder choices-holder"});
			mq.append(steps);

			var numIgnored = 0;

			var availableAnswers = ["&#xf05e;"];
			for (var i = 0; i < q_params.steps.length; i++) {
				availableAnswers.push(i + 1);
				var step = q_params.steps[i];
				if (step.order === "") {
					numIgnored++;
				}
			}

			function saveProgress (q) {
				me.updateAndSave(q, false);
			}

			function moveUp (a, b) {
				if (a.hasClass("moving")) return;

				a.addClass("moving");

				var ha = a.outerHeight() + 10;
				var hb = b.outerHeight() + 10;
				a.css("transform", "translateY(-" + hb + "px)");
				b.css("transform", "translateY(" + ha + "px)");
				setTimeout(function () {
					a.css("transition", "none");
					b.css("transition", "none");
					a.css("transform", "");
					b.css("transform", "");
					b.insertAfter(a);
					setTimeout(function () {
						a.css("transition", transitionCSS);
						b.css("transition", transitionCSS);
						a.removeClass("moving");
						var q = a.parents(".question");
						me.showCheckButton(q, true);
						saveProgress(q);
					}, 100);
				}, 250);
			}

			function moveDown (a, b) {
				if (a.hasClass("moving")) return;

				a.addClass("moving");

				var ha = a.outerHeight() + 10;
				var hb = b.outerHeight() + 10;
				a.css("transform", "translateY(" + hb + "px)");
				b.css("transform", "translateY(-" + ha + "px)");

				setTimeout(function () {
					a.css("transition", "none");
					b.css("transition", "none");
					a.css("transform", "");
					b.css("transform", "");
					b.insertBefore(a);
					setTimeout(function () {
						a.css("transition", transitionCSS);
						b.css("transition", transitionCSS);
						a.removeClass("moving");
						var q = a.parents(".question");
						me.showCheckButton(q, true);
						saveProgress(q);
					}, 100);
				}, 250);
			}

			for (var each in q_params.steps) {
				var step = q_params.steps[each];

				var li = $("<li>", { class: "step" });

				li.hover(function (event) {
					$(event.currentTarget).parents("ol").find("li.selected").removeClass("selected");
					$(event.currentTarget).addClass("selected");
					$(event.currentTarget).find(".sort-step").focus();
				});

				var stepBtn = $("<div>", { tabindex: 0, class: "sort-step" });

				var p = $("<p>", { html: step.label });

				stepBtn.focus(function (event) {
					$(event.currentTarget).parents("ol").find("li.selected").removeClass("selected");
					$(event.currentTarget).parents("li").addClass("selected");
				});

				stepBtn.keydown(function (event) {
					switch (event.keyCode) {
						case 38:
							var a = $(event.currentTarget).parents("li").eq(0);
							var b = a.prev();
							moveUp(a, b);
							var q = a.parents(".question");
							saveProgress(q);
							event.preventDefault();
							break;
						case 40:
							var a = $(event.currentTarget).parents("li").eq(0);
							var b = a.next();
							moveDown(a, b);
							var q = a.parents(".question");
							saveProgress(q);
							event.preventDefault();
							break;
					}
				});

				stepBtn.append(p);
				li.append(stepBtn);

				var btns = $("<div>", { class: "nav-buttons" } );

				var transitionCSS = "transform .25s ease-in-out";

				var up = $("<button class='btn btn-default'><i class='fa fa-2x fa-arrow-circle-o-up'></i></button>").appendTo(btns);
				up.click(function (event) {
					var a = $(event.currentTarget).parents("li").eq(0);
					var b = a.prev();
					moveUp(a, b);
				});

				if (numIgnored > 0) {
					var skip = $("<button class='ignore-btn btn btn-default'><i class='fa fa-2x fa-ban'></i></button>");
					stepBtn.append(skip);
					skip.click(function (event) {
						var a = $(event.currentTarget).parents("li").eq(0);
						a.toggleClass("ignored");
						var q = a.parents(".question");
						me.showCheckButton(q, true);
						saveProgress(q);
					});
					var lbl = $("<span>", {text: "Ignore"});
					skip.append(lbl);
				}

				var down = $("<button class='btn btn-default'><i class='fa fa-2x fa-arrow-circle-o-down'></i></button>").appendTo(btns);
				down.click(function (event) {
					var a = $(event.currentTarget).parents("li").eq(0);
					var b = a.next();
					moveDown(a, b);
				});

				li.append(btns);

				var icons = $("<div>", {class: "icons"});
				li.append(icons);

				var icon_correct = $("<i>", {class: "icon correct fa fa-2x fa-check hidden"});
				icons.append(icon_correct);

				var icon_incorrect = $("<i>", {class: "icon incorrect fa fa-2x fa-times hidden"});
				icons.append(icon_incorrect);

				li.attr( { "data-index": each, "data-order": step.order } );

				steps.append(li);
			}

			this.loadJqueryUIintoThisIframe(function () {
				var iframe = me.options.iframe.iframe[0];
				var win = iframe.contentWindow;
				win.jQuery(".steps-holder").sortable({ cursor: "pointer", axis: "y", update: $.proxy(me.onChangedSorting, me) });
			});
		},

		onChangedSorting: function (event) {
			var q = $(event.target).parents(".question");
			this.showCheckButton(q, true);
			this.updateAndSave(q, false);
		},

		postSetupForExercise: function (params) {
			var q = params.questionEl, q_params = params.questionData, answers = params.answersEl;

			q.find(".checker").removeClass("inactive").find(".btn-checker").text("Hint");
			q.find(".checker .btn-reset").text("Reset Exercise");

			var btnBack = $("<button>", {
				class: "btn btn-info btn-back btn-xs"
			}).css("display", "none");
			$("<i>", { class: "fa fa-backward" }).appendTo(btnBack);
			$("<span>", { text: " Go Back" }).appendTo(btnBack);
			q.find(".checker .btn-reset").before(btnBack);
			btnBack.click($.proxy(this.onClickBackStep, this));

			q.find(".btn-reveal").removeClass("btn-primary").addClass("btn-danger");
		},

		onMatrixAnswer: function (event, row, col, val) {
			var q = $(event.currentTarget).parents(".question");

			this.setMatrixAnswer(q, row, col, val, false);

			if (this.options.settings.reviewableAfterEach && this.questionIsFilledOut(q)) {
				q.find(".checker").removeClass("inactive animated fadeOut").addClass("animated fadeInLeft").find("button.btn-checker").removeClass("btn-danger btn-success").addClass("btn-primary").parent().find(".checker-label").css("display", "none");
			}
		},

		getMatrixAnswer: function (q, row, col) {
			var cell = q.find(".user-entry[data-row=" + row + "][data-col=" + col + "]");
			var ind = cell.find("select")[0].selectedIndex;
			return cell.find("select").val();
		},

		setMatrixAnswer: function (q, row, col, val, alsoCheck) {
			var cell = q.find(".user-entry[data-row=" + row + "][data-col=" + col + "]");
			cell.find("select").val(val);

			if (val != "" && val != null) {
				cell.removeClass("empty");
				var checkTheAnswer = this.questionIsFilledOut(q);
				this.updateAndSave(q, alsoCheck && checkTheAnswer);
			}
		},

		onClickAnswer: function (event) {
			var el = $(event.currentTarget);

			this.clickResponse(el);

			var num = el.parents(".question").index();

			var id = this.id + ":" + num + ":" + el.attr("data-index");

			analytics("send", "event", "interface", "quiz-response", id);
		},

		onClickChoice1: function (event) {
			var el = $(event.target);

			this.clickChoice1(el);

			var q = el.parents(".question");
			this.showInstructions(q);
		},

		clickChoice1: function (el, alsoCheck) {
			var selected = !el.hasClass("selected");

			var q = el.parents(".question");
			if (q.length) {
				q.find(".choice .response").removeClass("selected");
				if (selected) el.addClass("selected");

				this.eraseLineConnectedTo({ question: q, left: el });
			}

			this.checkForTwoChoices(q);

			this.updateAndSave(q, alsoCheck);
		},

		onClickChoice2: function (event) {
			var el = $(event.target);

			this.clickChoice2(el);

			var q = el.parents(".question");
			this.showInstructions(q);
		},

		clickChoice2: function (el, alsoCheck) {
			var selected = !el.hasClass("selected");

			var q = el.parents(".question");
			if (q.length) {
				q.find(".answer .response").removeClass("selected");
				if (selected) el.addClass("selected");

				this.eraseLineConnectedTo({ question: q, right: el });
			}

			this.checkForTwoChoices(q);

			this.updateAndSave(q, alsoCheck);
		},

		showInstructions: function (question) {
			var one = question.find(".choice .response.selected");
			var two = question.find(".answer .response.selected");
			var matched = question.find(".matching-line");
			var total = question.find(".choice");

			question.find(".instructions").removeClass("instruct-start instruct-left instruct-right instruct-complete");

			if (matched.length == total.length) {
				question.find(".instructions").addClass("instruct-complete");
			} else if ( (!one.length && !two.length) || (one.length && two.length) ) {
				question.find(".instructions").addClass("instruct-start");
			} else if (one.length) {
				question.find(".instructions").addClass("instruct-right");
			} else if (two.length) {
				question.find(".instructions").addClass("instruct-left");
			}

			this.redrawLines();
		},

		checkForTwoChoices: function (question) {
			var showCheckButton = false;

			var one = question.find(".choice .response.selected");
			var two = question.find(".answer .response.selected");

			if (one.length && two.length) {
				this.drawLineBetween(question, one, two);

				var index = parseInt(one.attr("data-index")) + 1;

				question.find(".choice .response.selected").removeClass("selected").addClass("matched matched-color" + index);
				question.find(".answer .response.selected").removeClass("selected").addClass("matched matched-color" + index);

				question.find(".response.selected").removeClass("selected");

				if (this.options.settings.reviewableAfterEach) {
					if (this.questionIsFilledOut(question)) {
						showCheckButton = true;
					}
				}
			}

			this.showCheckButton(question, showCheckButton);
		},

		showCheckButton: function (q, show) {
			if (show) {
				q.find(".checker").removeClass("inactive animated fadeOut").addClass("animated fadeInLeft").find("button").removeClass("btn-danger btn-success").addClass("btn-primary").parent().find(".checker-label").css("display", "none");
			} else {
				q.find(".checker").addClass("inactive");
				q.find(".checker .btn-checker").removeClass("btn-success btn-danger").addClass("btn-primary").parent().find(".checker-label").css("display", "none");
			}
		},

		drawLineBetween: function (question, one, two, actual) {
			if (actual === undefined) actual = true;

			var lineClass = actual ? "matching-line" : "teacher-line";

			var left_index = one.attr("data-index");
			var right_index = two.attr("data-index");
			var line = question.find("." + lineClass + "[data-left-index=" + left_index + "]");
			if (line.length == 0) {
				line = $("<div>", {class: lineClass });
				line.attr({"data-left-index": left_index, "data-right-index": right_index, "data-question-index": question.attr("data-index")});
				question.prepend(line);
			}

			this.doDrawLine(line);
		},

		doDrawLine: function (line) {
			var question = this.element.find(".question[data-index=" + line.attr("data-question-index") + "]");

			var one = question.find(".choice .response[data-index=" + line.attr("data-left-index") + "]");
			var two = question.find(".answer .response[data-index=" + line.attr("data-right-index") + "]");

			var w1 = one.width() + 15, h1 = one.height();
			var x1 = w1 + one.offset().left - question.offset().left;
			var y1 = h1 * .5 + one.offset().top - question.offset().top;

			var w2 = two.width(), h2 = two.height();
			var x2 = two.offset().left - question.offset().left + 5;
			var y2 = h2 * .5 + two.offset().top - question.offset().top;

			var length = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
			var angle = Math.atan2(y2 - y1, x2 - x1) / Math.PI * 180;

			if (line) {
				line.css({
					top: y1,
					left: x1,
					width: length,
					height: 10,
					"transform-origin": "left",
					transform: "rotateZ(" + angle + "deg)"
				});
			}
		},

		redrawLines: function () {
			var lines = this.element.find(".matching-line, .teacher-line");
			var me = this;
			lines.each(function (index, line) {
				me.doDrawLine($(line));
			});
		},

		doResizeHotspot: function (hotspot) {
			var scale = hotspot.width() / hotspot[0].naturalWidth;

			var rect = hotspot.parent().find("div.hotspot");
			rect.each(function (index, this_rect) {
				var r = $(this_rect).attr("data-rect");
				if (r) {
					var r_rect = r.split(",");
					$(this_rect).css({ left: r_rect[0] * scale + "px", top: r_rect[1] * scale + "px", width: r_rect[2] * scale + "px", height: r_rect[3] * scale + "px" });
					$(this_rect).attr("data-scale", scale);
				}
			});
		},

		redrawHotspots: function () {
			var hotspots = this.element.find("img.hotspot");
			var me = this;
			hotspots.each(function (index, hotspot) {
				me.doResizeHotspot($(hotspot));
			});

			var exercises = this.element.find("li.exercise");
			exercises.each(function (index, q) {
				me.sizeHolderToFitExercises($(q));
			});
		},

		eraseLineConnectedTo: function (options) {
			var question = options.question;
			var line;
			if (options.left) {
				line = question.find(".matching-line[data-left-index=" + options.left.attr("data-index") + "]");
			} else if (options.right) {
				line = question.find(".matching-line[data-right-index=" + options.right.attr("data-index") + "]");
			}
			if (line.length) {
				var left_index = line.attr("data-left-index");
				var right_index = line.attr("data-right-index");
				var left = question.find(".choice .response[data-index=" + left_index + "]");
				var right = question.find(".answer .response[data-index=" + right_index + "]");
				left.removeClass("matched");
				right.removeClass("matched");
				removeMatchColors(left);
				removeMatchColors(right);
				left.css("background-color", "");
				right.css("background-color", "");

				line.remove();
			}
		},

		clickResponse: function (response, alsoCheck) {
			var me = this;

			var q = $(response).parents(".question");

			var alreadySelected = response.hasClass("selected");

			var correctAnswer = q.find(".response[data-correct=true]");
			var chosenAnswer = q.find(".response.selected");
			if (correctAnswer.length > 1) {
				response.toggleClass("selected");
			} else {
				response.parents(".answers-holder").find(".selected").removeClass("selected");
			}

			if (!alreadySelected) {
				response.addClass("selected");
				if (this.options.settings.reviewableAfterEach)
					q.find(".checker").removeClass("inactive animated fadeOut").addClass("animated fadeInLeft").find("button").removeClass("btn-danger").addClass("btn-primary").parent().find(".checker-label").css("display", "none");
			} else if (chosenAnswer.length > 1) {
				if (this.options.settings.reviewableAfterEach)
					q.find(".checker").removeClass("inactive animated fadeOut").addClass("animated fadeInLeft").find("button").removeClass("btn-danger").addClass("btn-primary").parent().find(".checker-label").css("display", "none");
			} else {
				if (this.options.settings.reviewableAfterEach)
					q.find(".checker").addClass("animated fadeOut").animate({_nothing: 0}, 1000, $.proxy(me.resetButton, me, q));
			}

			this.updateAndSave(q, alsoCheck);
		},

		updateAndSave: function (questionElement, alsoCheck) {
			var q = questionElement;

			if (!alsoCheck && !this.options.settings.reviewableAfterEach) {
				q.find(".checker .btn-checker").removeClass("btn-danger").addClass("btn-primary");
			}

			q.find(".icon").addClass("hidden");

			q.attr("data-correct", null);

			if (alsoCheck) {
				this.checkQuestion(q, false);
			}

			this.updateScore();

			this.adjustSummarySize();

			//if (!alsoCheck)
			this.saveResponses();
		},

		resetButton: function (question) {
			$(question).find(".checker").addClass("inactive");
			$(question).find(".checker .btn-checker").removeClass("btn-success btn-danger").addClass("btn-primary").parent().find(".checker-label").css("display", "none");
		},

		getQuestionsAnswered: function () {
			var answered = [];

			for (var i = 0; i < this.data.questions.length; i++) {
				var q = this.element.find(".question").eq(i);
				switch (this.getQuestionType(this.data.questions[i])) {
					case "matching":
						if (q.find(".matching-line").length == q.find(".choice").length) answered.push(i);
						break;
					case "multiple choice":
						if (q.find(".selected").length) answered.push(i);
						break;
					case "matrix":
						var submitted = [];
						var rowCount = this.data.questions[i].choices.length;
						var columnCount = this.data.questions[i].headings.length - 2;
						for (var j = 0; j < rowCount; j++) {
							var rows = q.find("table.matrix-table tr");
							var row = rows.eq(i + 2);
							for (var k = 0; k < columnCount; k++) {
								var response = this.getMatrixAnswer(q, j, k);
								if (response)
									submitted.push(response);
							}
						}

						if (submitted.length == rowCount * columnCount)
							answered.push(i);
						break;
					case "exercise":
						if (q.attr("data-correct")) {
							answered.push(i);
						}
						break;
					case "sorting":
						if (q.attr("data-correct")) {
							answered.push(i);
						}
						break;
				}
			}

			return answered;
		},

		allQuestionsAnswered: function () {
			var answered = this.getQuestionsAnswered();
			var questions = this.element.find(".question");
			return (answered && questions && answered.length == questions.length);
		},

		questionIsFilledOut: function (q) {
			var index = q.attr("data-index");
			var type = this.getQuestionType(this.data.questions[index]);
			var filledOut = true;

			switch (type) {
				case "multiple choice":
					filledOut = q.find(".response.selected").length > 0;
					break;
				case "matching":
					var lines = q.find(".matching-line").length;
					var choices = q.find(".choice").length;
					filledOut = (lines == choices);
					break;
				case "matrix":
					var rowCount = this.data.questions[index].choices.length;
					var columnCount = this.data.questions[index].headings.length - 2;
					for (var i = 0; i < rowCount; i++) {
						var rows = q.find("table.matrix-table tr");
						var row = rows.eq(i + 2);
						for (var j = 0; j < columnCount; j++) {
							var response = this.getMatrixAnswer(q, i, j);
							if (response === "" || response === null) {
								filledOut = false;
							}
						}
					}
					break;
			}

			return filledOut;
		},

		adjustSummarySize: function () {
			var answered = this.getQuestionsAnswered();

			var me = this;

			var doHeightAdjustment = function () {
				me.element.find("#check-all").addClass("unhidden");
				me.element.find("#start-over").addClass("unhidden");

				if (!me.options.settings.singleView) {
					var h = me.element.find(".holder").outerHeight();
					me.element.find(".summary").height(h);
				}
			}

			if (this.options.settings.reviewableAfterEach) {
				if (answered.length) {
					this.element.find("#check-all").removeClass("shrunk");
					this.element.find("#start-over").removeClass("shrunk");
				} else {
					this.element.find("#check-all").addClass("shrunk");
					this.element.find("#start-over").addClass("shrunk");
				}
				setTimeout(doHeightAdjustment, 500);
			} else {
				var questions = this.element.find(".question");
				if (answered.length == questions.length) {
					this.element.find("#check-all").removeClass("shrunk");
					this.element.find("#start-over").removeClass("shrunk");
				} else {
					this.element.find("#check-all").addClass("shrunk");
					this.element.find("#start-over").addClass("shrunk");
				}
				setTimeout(doHeightAdjustment, 500);
			}
		},

		onClickCheck: function (event, q) {
			if (q == undefined)
				q = $(event.currentTarget).parents(".question");

			var questionAttempts = q.attr("data-attempts");
			if (questionAttempts === undefined) {
				questionAttempts = 1;
			} else {
				questionAttempts++;
			}
			q.attr("data-attempts", questionAttempts);

			if (questionAttempts >= 2) {
				q.find(".btn-reveal").removeClass("hidden");
			}

			this.checkQuestion(q);

			var index = q.attr("data-index");
			var t = this.getQuestionType(this.data.questions[index]);
			if (t != "exercise") {
				// ANALYTICS for "checking answer" (exercises are counted when advanced)
				var s = this.getQuestionIDandResponses(q);
				analytics("send", "event", "interface", "quiz-check", s);
			}
		},

		resetAttempts: function (q) {
			q.attr("data-attempts", "0");
		},

		checkQuestion: function (q, animate) {
			q.find(".icon").addClass("hidden");

			if (q.hasClass("matching")) {
				var lines = q.find(".matching-line");
				var totalRight = 0;
				lines.each(function (index, line) {
					var left = $(line).attr("data-left-index");
					var right = $(line).attr("data-right-index");

					var choice = q.find(".choice").eq(left);

					if (left == right) {
						totalRight++;
						choice.find(".correct").removeClass("hidden");
					} else {
						choice.find(".incorrect").removeClass("hidden");
					}

					if (animate != false) {
						choice.find(".icons").removeClass("hidden animated").hide(0).addClass("animated rollIn").show(0);
					} else {
						choice.removeClass("hidden animated").show(0);
					}
				});

				if (totalRight == q.find(".choice").length) {
					if (animate != false) {
						q.find(".checker .btn-checker").removeClass("btn-primary btn-danger").addClass("btn-success animated fadeInLeft").parent().find(".checker-label").html(correctText).css("display", "inline");
					} else {
						q.find(".checker .btn-checker").removeClass("btn-primary btn-danger").addClass("btn-success").parent().find(".checker-label").html(correctText).css("display", "inline");
						q.find(".checker").removeClass("animated");
					}

					q.attr("data-correct", true);
				} else {
					if (animate != false) {
						q.find(".checker .btn-checker").removeClass("btn-primary").addClass("btn-danger animated fadeInLeft").parent().find(".checker-label").html(tryAgainText).css("display", "inline");
					} else {
						q.find(".checker .btn-checker").removeClass("btn-primary").addClass("btn-danger").parent().find(".checker-label").html(tryAgainText).css("display", "inline");
						q.find(".checker").removeClass("animated");
					}

					q.find(".checker").removeClass("inactive");

					q.attr("data-correct", false);

					q.find(".hint").css("display", "block");
				}
			} else if (q.hasClass("multiple-choice")) {
				var correctAnswer = q.find(".response[data-correct=true]");
				var chosenAnswer = q.find(".response.selected");

				if (correctAnswer.not(chosenAnswer).length == 0 && chosenAnswer.not(correctAnswer).length == 0) {
					// all correct
					chosenAnswer.parent("li").find(".correct").removeClass("hidden");
					if (animate != false) {
						chosenAnswer.parent("li").find(".icons").removeClass("hidden animated").hide(0).addClass("animated rollIn").show(0);
						q.find(".checker .btn-checker").removeClass("btn-primary btn-danger").addClass("btn-success animated fadeInLeft").parent().find(".checker-label").html(correctText).css("display", "inline");
					} else {
						chosenAnswer.parent("li").find(".icons").removeClass("hidden animated").show(0);
						q.find(".checker .btn-checker").removeClass("btn-primary btn-danger").addClass("btn-success").parent().find(".checker-label").html(correctText).css("display", "inline");
						q.find(".checker").removeClass("animated");
					}

					q.attr("data-correct", true);
				} else {
					var responseText = correctAnswer.length > 1 ? partialTryAgainText : tryAgainText;

					// some incorrect
					chosenAnswer.each(function (index, item) {
						if ($.inArray(item, correctAnswer) > -1)
							$(item).parent("li").find(".correct").removeClass("hidden");
						else
							$(item).parent("li").find(".incorrect").removeClass("hidden");
					});
					if (animate != false) {
						chosenAnswer.parent("li").find(".icons").removeClass("hidden animated").hide(0).addClass("animated rollIn").show(0);
						q.find(".checker .btn-checker").removeClass("btn-primary").addClass("btn-danger animated fadeInLeft").parent().find(".checker-label").html(responseText).css("display", "inline");
					} else {
						chosenAnswer.parent("li").find(".icons").removeClass("hidden animated").show(0);
						q.find(".checker .btn-checker").removeClass("btn-primary").addClass("btn-danger").parent().find(".checker-label").html(responseText).css("display", "inline");
						q.find(".checker").removeClass("animated");
					}

					q.find(".checker").removeClass("inactive");

					q.attr("data-correct", false);

					q.find(".hint").css("display", "block");
				}
			} else if (q.hasClass("matrix")) {
				var index = q.attr("data-index");
				var answers = this.data.questions[index].answers;
				var submitted = [];
				var rowCount = this.data.questions[index].choices.length;
				var columnCount = this.data.questions[index].headings.length - 2;
				var allCorrect = true, partialCorrect = false;
				for (var i = 0; i < rowCount; i++) {
					var rows = q.find("table.matrix-table tr");
					var row = rows.eq(i + 2);
					var rowCorrect = true;
					for (var j = 0; j < columnCount; j++) {
						var response = this.getMatrixAnswer(q, i, j);
						submitted.push(response);
						var n = i * columnCount + j;
						if (answers[n] !== submitted[n]) {
							rowCorrect = false;
							allCorrect = false;
						} else {
							partialCorrect = true;
						}
					}

					if (rowCorrect) {
						q.find(".icons").eq(i).find(".correct").removeClass("hidden");
					} else {
						q.find(".icons").eq(i).find(".incorrect").removeClass("hidden");
					}
				}

				var responseText;

				if (allCorrect) {
					responseText = correctText;

					if (animate != false) {
						q.find(".icons").removeClass("hidden animated").hide(0).addClass("animated rollIn").show(0);
						q.find(".checker .btn-checker").removeClass("btn-primary btn-danger").addClass("btn-success animated fadeInLeft").parent().find(".checker-label").html(responseText).css("display", "inline");
					} else {
						q.find(".icons").removeClass("hidden animated").show(0);
						q.find(".checker .btn-checker").removeClass("btn-primary btn-danger").addClass("btn-success").parent().find(".checker-label").html(responseText).css("display", "inline");
						q.find(".checker").removeClass("animated");
					}
				} else {
					responseText = partialCorrect ? partialTryAgainText : tryAgainText;
					q.find(".hint").css("display", "block");

					if (animate != false) {
						q.find(".icons").removeClass("hidden animated").hide(0).addClass("animated rollIn").show(0);
						q.find(".checker .btn-checker").removeClass("btn-primary").addClass("btn-danger animated fadeInLeft").parent().find(".checker-label").html(responseText).css("display", "inline");
					} else {
						q.find(".checker .btn-checker").removeClass("btn-primary").addClass("btn-danger").parent().find(".checker-label").html(responseText).css("display", "inline");
						q.find(".checker").removeClass("animated");
					}
				}

				q.find(".checker").removeClass("inactive");

				q.attr("data-correct", allCorrect);
			} else if (q.hasClass("exercise")) {
				var hint = q.find("li.step.current").attr("data-hint");
				if (!hint) {
					hint = q.find("li.step.current").attr("data-answer");
				}

				q.find(".checker-label").html(hint).css("display", "inline");
			} else if (q.hasClass("sorting")) {
				var index = q.attr("data-index");
				var steps = q.find(".step");
				var answer = steps.map(function (index, item) {
					var order = $(item).attr("data-order");
					if (order == "" && $(item).hasClass("ignored")) {
						order = "correctly ignored";
					} else if (order != "" && $(item).hasClass("ignored")) {
						order = "incorrect";
					}
					return order;
				}).toArray();

				var current_need = 1;
				var allCorrect = true, partialCorrect = false;
				for (var i = 0; i < answer.length; i++) {
					var a = answer[i];
					if (a == "correctly ignored" || a == current_need) {
						// correct
						q.find(".icons").eq(i).find(".correct").removeClass("hidden");
						partialCorrect = true;
					} else {
						// incorrect
						q.find(".icons").eq(i).find(".incorrect").removeClass("hidden");
						allCorrect = false;
					}

					if (a.indexOf("ignored") == -1) {
						current_need++;
					}
				}

				this.showResponseText(q, allCorrect, partialCorrect, true);

				q.attr("data-correct", allCorrect);
			}

			this.updateScore();
		},

		showResponseText: function (q, allCorrect, partialCorrect, animate) {
			var responseText;

			if (allCorrect) {
				responseText = correctText;

				if (animate != false) {
					q.find(".icons").removeClass("hidden animated").hide(0).addClass("animated rollIn").show(0);
					q.find(".checker .btn-checker").removeClass("btn-primary btn-danger").addClass("btn-success animated fadeInLeft").parent().find(".checker-label").html(responseText).css("display", "inline");
				} else {
					q.find(".icons").removeClass("hidden animated").show(0);
					q.find(".checker .btn-checker").removeClass("btn-primary btn-danger").addClass("btn-success").parent().find(".checker-label").html(responseText).css("display", "inline");
					q.find(".checker").removeClass("animated");
				}
			} else {
				responseText = partialCorrect ? partialTryAgainText : tryAgainText;
				q.find(".hint").css("display", "block");

				if (animate != false) {
					q.find(".icons").removeClass("hidden animated").hide(0).addClass("animated rollIn").show(0);
					q.find(".checker .btn-checker").removeClass("btn-primary").addClass("btn-danger animated fadeInLeft").parent().find(".checker-label").html(responseText).css("display", "inline");
				} else {
					q.find(".checker .btn-checker").removeClass("btn-primary").addClass("btn-danger").parent().find(".checker-label").html(responseText).css("display", "inline");
					q.find(".checker").removeClass("animated");
				}
			}

		},

		showCorrectResponses: function () {
			var questions = this.element.find(".question");
			for (var i = 0; i < questions.length; i++) {
				var q = questions.eq(i);

				this.revealAnswer(q, i);

				// show the hint
				q.find(".checker").removeClass("inactive");
				q.find(".hint").css("display", "block");
			}
		},

		revealAnswer: function (q, index) {
			switch (this.getQuestionType(this.data.questions[index])) {
				case "multiple choice":
					var correctAnswer = q.find(".response[data-correct=true]");

					// show the right responses
					correctAnswer.parent("li").find(".correct").removeClass("hidden");

					// show the hint
					q.find(".checker").removeClass("inactive");
					q.find(".hint").css("display", "block");
					break;
				case "matching":
					var resp = this.data.questions[index].answers;
					for (var j = 0; j < resp.length; j++) {
						var r_el1 = q.find(".choice .response[data-index=" + j + "]");
						var r_el2 = q.find(".answer .response[data-index=" + j + "]");
						this.drawLineBetween(q, r_el1, r_el2, false);
					}
					break;
				case "matrix":
					q.find(".hidden-answer").removeClass("hidden");
					break;
				case "exercise":
					var type = q.find(".step.current").attr("data-type");
					q.find(".step.current .hotspot").addClass("revealed");
					if (type == "text" || type == "keydown") {
						var answer = q.find(".step.current").attr("data-answer");
						q.find(".step.current span.entry").text(answer).focus();
						q.find(".btn-reveal").removeClass("btn-danger").addClass("btn-success").text("Go to Next Step");
					}
					break;
				case "sorting":
					q.find(".icon").addClass("hidden");
					var steps = q.find("li.step");
					steps.removeClass("ignored");
					steps.sort(function (a,b) {
						var keyA = $(a).attr("data-order");
						keyA = keyA == "" ? "Z" : keyA;
						var keyB = $(b).attr("data-order");
						keyB = keyB == "" ? "Z" : keyB;

						if (keyA < keyB) return -1;
						if (keyA > keyB) return 1;
						return 0;
					});
					var stepHolder = q.find(".steps-holder");
					$.each(steps, function (index, li) {
						stepHolder.append(li);
						var step = $(li);
						if (step.attr("data-order") == "") {
							step.addClass("ignored");
						}
					});
					break;
			}
		},

		onClickRevealOne: function (event) {
			var q = $(event.currentTarget).parents(".question");
			var index = q.attr("data-index");

			if ($(event.currentTarget).text() == "Go to Next Step") {
				this.advanceToNextExerciseStep(q);
			} else {
				this.revealAnswer(q, index);

				// ANALYTICS
				var s = this.getQuestionIDandResponses(q);
				analytics("send", "event", "interface", "quiz-reveal", s);
			}
		},

		onClickBackStep: function (event) {
			var q = $(event.currentTarget).parents(".question");
			this.backToPreviousExerciseStep(q);
		},

		markCorrectResponses: function () {
			var questions = this.element.find(".question");
			for (var i = 0; i < questions.length; i++) {
				var q = questions.eq(i);

				this.correctAnswer(q, i);
			}
		},

		correctAnswer: function (q, index) {
			switch (this.getQuestionType(this.data.questions[index])) {
				case "multiple choice":
					var correctAnswer = q.find(".response[data-correct=true]");
					q.find(".response").removeClass("selected");
					correctAnswer.addClass("selected");

					this.checkQuestion(q, true);
					break;
				case "matching":
					var resp = this.data.questions[index].answers;
					for (var j = 0; j < resp.length; j++) {
						var r_el = q.find(".choice .response[data-index=" + j + "]");
						this.clickChoice1(r_el, false);
						r_el = q.find(".answer .response[data-index=" + j + "]");
						this.clickChoice2(r_el, true);
					}
					break;
				case "matrix":
					var answers = this.data.questions[index].answers;
					var submitted = [];
					var rowCount = this.data.questions[index].choices.length;
					var columnCount = this.data.questions[index].headings.length - 2;
					for (var i = 0; i < rowCount; i++) {
						var rows = q.find("table.matrix-table tr");
						var row = rows.eq(i + 2);
						var rowCorrect = true;
						for (var j = 0; j < columnCount; j++) {
							var n = i * columnCount + j;
							this.setMatrixAnswer(q, i, j, answers[n]);
						}
					}
					this.checkQuestion(q, true);
					break;
			}
		},

		onClickResetOne: function (event) {
			var q = $(event.currentTarget).parents(".question");

			this.clearQuestion(q);
		},

		onClickCheckAll: function (event) {
			this.checkAllQuestions(true);
		},

		clearQuestion: function (q) {
			var index = q.attr("data-index");

			q.attr( { "data-correct": null  } );

			var t = this.getQuestionType(this.data.questions[index]);

			switch (t) {
				case "multiple choice":
					q.find(".response").removeClass("selected");
					break;
				case "matching":
					q.find(".response").removeClass("selected");
					q.find(".matching-line, .teacher-line").remove();
					removeMatchColors(q.find(".matched"));
					q.find(".matched").removeClass("matched");
					break;
				case "matrix":
					q.find(".user-entry").addClass("empty").find("select").val("");
					q.find(".hidden-answer").addClass("hidden");
					break;
				case "exercise":
					q.find("li.step").attr("data-correct", null);
					q.find("li.step.current").removeClass("current");
					q.find("li.step").eq(0).addClass("current");

					this.resetExerciseControls(q);
					break;
				case "sorting":
					q.find("li.step.ignored").removeClass("ignored");
					// put back in index order
					var steps = q.find("li.step");
					steps.sort(function (a,b) {
						var keyA = $(a).attr("data-index");
						var keyB = $(b).attr("data-index");

						if (keyA < keyB) return -1;
						if (keyA > keyB) return 1;
						return 0;
					});
					var stepHolder = q.find(".steps-holder");
					$.each(steps, function (index, li) {
						stepHolder.append(li);
					});
					break;
			}

			q.find(".icon").addClass("hidden");
			if (t != "exercise") {
				q.find(".checker").addClass("inactive");
			}
			q.find(".hint").css("display", "none");

			this.saveResponses();
			this.updateScore();
			this.adjustSummarySize();
		},

		checkAllQuestions: function (animate) {
			var questions = this.element.find(".question");
			for (var i = 0; i < questions.length; i++) {
				var q = questions.eq(i);
				this.checkQuestion(q, animate);
			}

			if (event) {
				var score = this.getScore() + "%";
				var note = this.id + ":" + score;
				analytics("send", "event", "interface", "quiz-check-all", note);
			}
		},

		getScore: function () {
			var correct = this.element.find(".question[data-correct=true]").length;
			var total = this.element.find(".question").length;
			var score = Math.round((correct / total) * 100);
			return score;
		},

		updateScore: function () {
			var correct = this.element.find(".question[data-correct=true]").length;
			var incorrect = this.element.find(".question[data-correct=false]").length;

			this.element.find(".summary").find("#correct-count").text(correct);
			this.element.find("#incorrect-count").text(incorrect);

			if (this.summary)
				this.summary.find("#incorrect-count").text(incorrect);

			this.element.find("#attempts-count").text(this.attempts);

			var total = this.element.find(".question").length;

			var answered = this.getQuestionsAnswered();

			this.element.find("#answered-count").text(answered.length + " / " + total);

			var score = Math.round((correct / total) * 100);

			this.element.find("#score-result").text(score + "%");
		},

		loadResponses: function () {
			var quizData = this.db.getTitleProperty(this.id);

			if (quizData) {
				var obj = $.evalJSON(quizData);

				if (obj.attempts) {
					this.attempts = obj.attempts;
				}

				for (var i = 0; i < obj.responses.length; i++) {
					var resp = obj.responses[i];

					if (resp == null) break;

					if (resp.length == undefined) resp = [resp];

					var q = this.element.find(".question").eq(i);

					var alsoCheckAnswers = this.allQuestionsAnswered() || (this.options.settings.reviewableAfterEach && this.questionIsFilledOut(q));

					if (q.length) {
						var question_params = this.data.questions[i];

						switch (this.getQuestionType(this.data.questions[i])) {
							case "matching":
								for (var j = 0; j < resp.length; j += 2) {
									var r = resp[j];
									var r_el = q.find(".choice .response[data-index=" + r + "]");
									if (r_el.length) {
										this.clickChoice1(r_el, alsoCheckAnswers);
									}
									r = resp[j + 1];
									r_el = q.find(".answer .response[data-index=" + r + "]");
									if (r_el.length) {
										this.clickChoice2(r_el, alsoCheckAnswers);
									}
								}

								var recheckAnswers = this.allQuestionsAnswered() || (this.options.settings.reviewableAfterEach && this.questionIsFilledOut(q));
								if (recheckAnswers)
									this.checkQuestion(q, false);

								this.showInstructions(q);
								break;
							case "multiple choice":
								for (var j = 0; j < resp.length; j++) {
									var r = resp[j];
									if (r != -1) {
										var r_el = q.find(".response[data-index=" + r + "]");
										if (r_el.length)
											this.clickResponse(r_el, alsoCheckAnswers);
									}
								}

								var recheckAnswers = this.allQuestionsAnswered() || (this.options.settings.reviewableAfterEach && this.questionIsFilledOut(q));
								if (recheckAnswers)
									this.checkQuestion(q, false);

								break;
							case "matrix":
								var answers = this.data.questions[i].answers;
								var rowCount = this.data.questions[i].choices.length;
								var columnCount = this.data.questions[i].headings.length - 2;
								var cellIndex = 0;
								for (var j = 0; j < rowCount; j++) {
									var rows = q.find("table.matrix-table tr");
									var row = rows.eq(j + 2);
									for (var k = 0; k < columnCount; k++) {
										this.setMatrixAnswer(q, j, k, resp[cellIndex++], alsoCheckAnswers);
									}
								}

								var recheckAnswers = this.allQuestionsAnswered() || (this.options.settings.reviewableAfterEach && this.questionIsFilledOut(q));
								if (recheckAnswers)
									this.checkQuestion(q, false);
								break;
							case "exercise":
								if (resp.indexOf(null) !== -1) {
									// not done yet, have to start from the beginning
								} else {
									q.attr("data-correct", true);
									this.setExerciseStepsToCorrect(q);
									this.gotoLastExerciseStep(q);
								}
								break;
							case "sorting":
								var changed = false;
								var stepHolder = q.find(".steps-holder");
								for (var i = 0; i < resp.length * .5; i++) {
									var ind = resp[i * 2];
									if (ind != i) {
										changed = true;
									}
									var step = stepHolder.find("[data-index=" + ind + "]");
									var ignore = resp[i * 2 + 1];
									if (ignore) {
										step.addClass("ignored");
										changed = true;
									}
									stepHolder.append(step);
								}
								if (changed) {
									this.checkQuestion(q, false);
									this.showCheckButton(q, true);
								}
								break;
						}
					}
				}

				// if all questions were answered, grade them
				if (!this.options.settings.reviewableAfterEach && this.allQuestionsAnswered()) {
					this.onClickCheckAll();
				}
			}
		},

		saveResponses: function () {
			var responses = [];

			var questions = this.element.find(".question");
			for (var i = 0; i < questions.length; i++) {
				var q = questions.eq(i);
				var question_params = this.data.questions[i];
				var type = this.getQuestionType(question_params);
				var isMatching = false;
				if (question_params.choices) {
					isMatching = true;
				}

				var response = this.getResponses(q);

				responses.push(response);
			}

			var obj = {responses: responses, attempts: this.attempts};
			var to_json = $.toJSON(obj);

			this.db.setTitleProperty(this.id, to_json);
		},

		getQuestionIDandResponses: function (q) {
			var id = this.id + " #" + q.attr("data-index") + ":";
			return id + this.getResponses(q).toString();
		},

		getResponses: function (q) {
			var i = q.attr("data-index");

			var question_params = this.data.questions[i];
			var type = this.getQuestionType(question_params);

			switch (type) {
				case "multiple choice":
					var answers = q.find(".response");
					var chosen = q.find(".response.selected");
					var indices = $.map(chosen, function (item, index) {
						return $(item).attr("data-index");
					});
					return indices;
					break;
				case "matching":
					var pairs = q.find(".matching-line");
					var indices = $.map(pairs, function (item, index) {
						var left = $(item).attr("data-left-index");
						var right = $(item).attr("data-right-index");
						return [left, right];
					});
					return indices;
					break;
				case "matrix":
					var answers = this.data.questions[i].answers;
					var submitted = [];
					var rowCount = this.data.questions[i].choices.length;
					var columnCount = this.data.questions[i].headings.length - 2;
					for (var j = 0; j < rowCount; j++) {
						var rows = q.find("table.matrix-table tr");
						var row = rows.eq(j + 2);
						for (var k = 0; k < columnCount; k++) {
							var response = this.getMatrixAnswer(q, j, k);
							submitted.push(response);
						}
					}
					return submitted;
					break;
				case "exercise":
					var steps = q.find("li.step");
					var correct = $.map(steps, function (item, index) {
						return [$(item).attr("data-correct")];
					});
					return correct;
					break;
				case "sorting":
					var steps = q.find("li.step");
					var order = $.map(steps, function (item, index) {
						return [$(item).attr("data-index"), $(item).hasClass("ignored")];
					});
					return order;
					break;
			}
		},

		convertHintLinksToHumanReadable: function () {
			var hints = [];

			var questions = this.element.find(".question");
			for (var i = 0; i < questions.length; i++) {
				var q = questions.eq(i);
				var hint = q.find(".hint a");
				if (hint.length) {
					var href = hint.attr("href");
					if (href) {
						hints.push({index: i, href: href});
					}
				}
			}

			var list = this.options.iframe.returnHumanReadableTOCNames(hints);

			for (var i = 0; i < list.length; i++) {
				var entry = list[i];

				var q = questions.eq(entry.index);
				q.find(".hint a").text(entry.title).attr("href", entry.href);
			}
		},

		isComplete: function () {
			var correct = this.element.find(".question[data-correct=true]").length;
			var total = this.element.find(".question").length;
			return (correct == total);
		},

		onScroll: function (event) {
			if (!this.options.settings.singleView) {
				var t = $(event.target).scrollTop() + 140;
				var sum = this.element.find(".summary");
				var curtop = sum.offset().top;
				if (sum.css("top") == "auto" || Math.abs(curtop - t) > 20) {
					sum.offset({top: t});
				}
			}
		},

		onStartOver: function () {
			this.element.find(".question").attr( { "data-correct": null  } );
			this.element.find(".response").removeClass("selected");
			this.element.find(".matching-line, .teacher-line").remove();
			removeMatchColors(this.element.find(".matched"));
			this.element.find(".matched").removeClass("matched");
			this.element.find(".user-entry").addClass("empty").find("select").val("");
			this.element.find(".hidden-answer").addClass("hidden");

			this.element.find(".icon").addClass("hidden");
			this.element.find(".checker").addClass("inactive");
			this.element.find(".hint").css("display", "none");

			this.element.find(".current").removeClass("current");
			this.element.removeClass("grading");

			if (this.options.settings.singleView) {
				this.currentQuestion = 0;
				this.updateCurrentQuestion();
			}

			this.updateScore();

			this.saveResponses();

			this.adjustSummarySize();

			analytics("send", "event", "interface", "quiz-restart", this.id);
		},

		onClickStartOver: function () {
			this.options.iframe.showAlert("Start Over", "Are you sure you want to clear your quiz responses and start over?", $.proxy(this.onStartOver, this));
		},

		onClickClear: function () {
			var thisQ = this.element.find(".question").eq(this.currentQuestion);

			this.clearQuestion(thisQ);
		},

		onClickPrevious: function () {
			if (this.currentQuestion > 0) {
				this.currentQuestion--;
				this.updateCurrentQuestion();
			}
		},

		onClickNext: function () {
			if (this.currentQuestion < this.element.find(".question").length - 1) {
				this.currentQuestion++;
				this.updateCurrentQuestion();
			}
		},

		updateCurrentQuestion: function () {
			var thisQ = this.element.find(".question").eq(this.currentQuestion);

			this.element.find(".question").removeClass("current");
			thisQ.addClass("current");

			thisQ.find(".checker .btn-checker").removeClass("btn-success");

			var total = this.element.find(".question").length;
			this.element.find(".position-label").text("Question " + (this.currentQuestion + 1) + " of " + total);

			if (this.currentQuestion >= total - 1) {
				this.element.find("#next-button").attr("disabled", true);
			} else {
				this.element.find("#next-button").attr("disabled", false);
			}

			if (this.currentQuestion <= 0) {
				this.element.find("#previous-button").attr("disabled", true);
			} else {
				this.element.find("#previous-button").attr("disabled", false);
			}

			// redraw the lines in case they were off-screen
			this.redrawLines();
		},

		onClickSubmit: function () {
			this.attempts++;

			this.checkAllQuestions(false);

			this.updateScore();

			this.saveResponses();

			this.element.addClass("grading");

			// now show correct answers and explanations
			this.showCorrectResponses();

			// this will show the summary pane and scroll to it

			var me = this;

			setTimeout(function () {
				me.redrawLines();

				var t = me.element.find(".summary").offset().top;
				var h = $(window).height() * .5;
				$(window).animate({scrollTop: t - h}, 1000);
			}, 200);
		},

		unload: function () {
			$(window).off("resize.quizzerator");
		},

		showIncorrectSpot: function (event, q) {
			if (q == undefined)
				q = $(event.target).parents(".question");
			var bigX = q.find(".incorrectX");

			var x, y;
			if (event.pageX) {
				x = event.pageX;
				y = event.pageY;
			} else {
				var step = q.find("li.step.current");
				var rect = step.find("div.hotspot");
				var domRect = rect[0].getBoundingClientRect();
				x = domRect.left + domRect.width * .5;
				y = domRect.top + domRect.height * .5;
			}

			bigX.removeClass("shake fadeOut").hide().addClass("animated shake").css({ left: x, top: y }).show();
			setTimeout(function () {
				bigX.addClass("fadeOut");
			}, 1000);
		},

		showCorrectSpot: function (event, callback, q) {
			if (q == undefined) {
				q = $(event.target).parents(".question");
			}
			var step = q.find("li.step.current");
			var nextStep = step.next("li.step");

			var callbackCalled = false;

			if (nextStep.length) {
				// if the next step is a "result" (ie, no action required), show it now before the checkmark animation
				var nextSlideType = nextStep.eq(0).attr("data-type");
				if (nextSlideType == "result" || nextSlideType == "text_result") {
					if (callback) {
						callbackCalled = true;
						callback();
						setTimeout(function () {
							var x = event.pageX, y = event.pageY;
							var bigX = q.find(".correctMark");
							showAndFadeCheckmark(bigX, x, y);
						}, 350);
					}
				}
			}

			if (!callbackCalled) {
				var x, y;
				if (event.pageX) {
					x = event.pageX;
					y = event.pageY;
				} else {
					var rect = step.find("div.hotspot");
					var domRect = rect[0].getBoundingClientRect();
					x = domRect.left + domRect.width * .5;
					y = domRect.top + domRect.height * .5;
				}
				var bigX = q.find(".correctMark");
				showAndFadeCheckmark(bigX, x, y, callback);
			}
		},

		onClickHotspot: function (event) {

			var step = $(event.currentTarget).parents("li.step");
			var type = step.attr("data-type");

			var q = step.parents(".question");
			if (q.attr("data-correct")) {
				return;
			}

			var correct = false;

			switch (type) {
				case "clicks":
					var hotspot = $(event.currentTarget);
					if (hotspot.attr("data-correct") != "true") {
						var stamp = step.attr("data-stamp");
						addStamp(hotspot, stamp);

						hotspot.attr("data-correct", true);

						var hotspots = step.find("div.hotspot");
						var incorrect = hotspots.filter(function (index, item) {
							if ($(item).attr("data-correct") != "true") return item;
						});

						// correct = undefined means: don't show an "incorrect spot"
						if (incorrect.length == 0) correct = true;
						else correct = undefined;

						this.showCorrectSpot(event);
					}
					break;
				case "click":
					if (event.which == 1)
						correct = true;
					break;
				case "right-click":
					if (event.which == 3)
						correct = true;
					break;
			}

			if (correct == true) {
				step.attr("data-correct", true);

				this.saveResponses();

				var q = step.parents(".question");

				// advance after short feedback
				this.showCorrectSpot(event, $.proxy(this.advanceToNextExerciseStep, this, q));
			} else if (correct == false) {
				this.showIncorrectSpot(event);
			}

			event.stopImmediatePropagation();

			return false;
		},

		backToPreviousExerciseStep: function (q) {
			var step = q.find("li.step.current");

			var prevStep = step.prev("li.step");

			if (prevStep.length) {
				prevStep.addClass("current");
				step.removeClass("current");

				this.resetExerciseControls(q);
			}
		},

		gotoLastExerciseStep: function (q) {
			var step = q.find("li.step.current");

			var lastStep = q.find("li.step").last();

			if (lastStep.length) {
				lastStep.addClass("current");
				step.removeClass("current");

				this.resetExerciseControls(q);
			}
		},

		setExerciseStepsToCorrect: function (q) {
			var steps = q.find("li.step");
			steps.attr("data-correct", true);
		},

		advanceToNextExerciseStep: function (q) {
			var step = q.find("li.step.current");

			var nextStep = step.next("li.step");

			if (nextStep.length) {
				nextStep.addClass("current");
				step.removeClass("current");

				var delay = undefined;
				if (nextStep.attr("data-type") == "result")
					delay = 1500;
				else if (nextStep.attr("data-type") == "text_result")
					delay = 3000;
				else if (nextStep.attr("data-type") == "delay")
					delay = 6000;

				// "result" steps auto-advance after 1.5 seconds
				if (delay)  {
					var me = this;
					setTimeout(function () {
						me.advanceToNextExerciseStep(q);
					}, delay);
				}
			} else {
				q.attr("data-correct", true);

				this.updateScore();
			}

			this.resetExerciseControls(q);

			var s = this.getQuestionIDandResponses(q);
			analytics("send", "event", "interface", "quiz-check", s);
		},

		resetExerciseControls: function (q) {
			this.resetAttempts(q);

			q.find(".checker-label").css("display", "none");
			q.find(".btn-reveal").addClass("hidden");
			q.find(".hotspot.revealed").removeClass("revealed");

			q.find(".btn-reveal").removeClass("btn-success").addClass("btn-danger").text("Reveal Answer");

			var step = q.find("li.step.current");

			step.find("div.hotspot").attr("data-correct", false);
			step.find("img.stamp").remove();

			var prevStep = step.prev("li.step");
			q.find(".btn-back").css("display", prevStep.length ? "block" : "none");

			if (q.attr("data-correct")) {
				// all done; freeze on last step
				q.find(".btn-checker").addClass("hidden");
				step.find("span.entry").prop("contenteditable", false);
			} else {
				if (step.length) {
					step.find("span.entry").prop("contenteditable", true);
					q.find(".btn-checker").removeClass("hidden");
					var pl = step.attr("data-placeholder");
					step.find("span.entry").text(pl ? pl : "").focus();
				} else {
					q.find(".btn-checker").addClass("hidden");
				}
			}
		},

		sizeHolderToFitExercises: function (q) {
			var items = q.find("li.step");
			var heights = items.map(function (index, step) {
				return $(step).height();
			});

//			var max = Math.max.apply(this, heights);

			const max = heights.toArray().reduce(function(max, value) {
				return value > max ? value : max;
			}, 0);

			// leave room for biggest image (plus padding/round border):
			q.find(".answers-holder").height(max + 10);
		},

		onClickIncorrectArea: function (event) {
			var field = $(event.target);

			var q = field.parents(".question");

			if (q.attr("data-correct")) {
				return;
			}

			this.showIncorrectSpot(event);

			this.onClickCheck(event);
		},

		onExerciseKeyDown: function (event) {
			if (event.keyCode == 13 || event.keyCode == 9) {
				this.onExerciseInput(event, true);
				event.preventDefault();
			}
		},

		onWindowKeydown: function (event) {
			// NOTE: this won't work if there's more than one 'keydown' step that's current (ie, from multiple questions on a page)
			var step = this.element.find("li.step.current");

			var q = step.parents(".question");

			if (q.attr("data-correct")) {
				return;
			}

			var type = step.attr("data-type");
			if (type == "keydown" && event.key && event.key.length == 1) {
				var isCorrect = true;
				var answers = step.attr("data-answer").split(" ");

				for (var i = 0; i < answers.length; i++) {
					var answer = answers[i];
					switch (answer) {
						case "control":
							break;
						default:
							if (event.key != answer) isCorrect = false;
					}
				}

				if (answers.indexOf("control") != -1) {
					if (!event.ctrlKey) isCorrect = false;
				} else {
					if (event.ctrlKey) isCorrect = false;
				}

				if (isCorrect) {
					step.attr("data-correct", true);

					this.saveResponses();

					this.showCorrectSpot(event, $.proxy(this.advanceToNextExerciseStep, this, q), q);
				} else {
					this.onClickCheck(event, q);
					this.showIncorrectSpot(event, q);
				}
			}
		},

		onExerciseInput: function (event, checkNow) {
			var field = $(event.target);
			var entry = field.text();

			var q = field.parents(".question");

			if (q.attr("data-correct")) {
				return;
			}

			//var step = field.parents("li.step");
			var step = q.find("li.step.current");
			var inputstring = step.attr("data-regex");
			var answer = step.attr("data-answer");

			var advanceWithoutReturn = step.attr("data-auto");

			var isCorrect = false;
			if (inputstring) {
				var flags = inputstring.replace(/.*\/([gimy]*)$/, '$1');
				var pattern = inputstring.replace(new RegExp('^/(.*?)/' + flags + '$'), '$1');
				var regex = new RegExp(pattern, flags);

				if (entry.match(regex)) {
					isCorrect = true;
				}
			} else {
				if (entry == answer) {
					isCorrect = true;
				}
			}

			if (checkNow || advanceWithoutReturn) {
				if (isCorrect) {
					step.attr("data-correct", true);

					this.saveResponses();

					this.showCorrectSpot(event, $.proxy(this.advanceToNextExerciseStep, this, q));
				}
			}

			if (!isCorrect) {
				if (entry && answer && ( checkNow || (entry.length >= answer.length) )) {
					this.onClickCheck(event);

					if (checkNow) {
						this.showIncorrectSpot(event);
					}
				}
			}

			if (checkNow) {
				return isCorrect;
			}
		},

		onClickSecretPosition: function (event) {
			if (event.shiftKey) {
				this.cheatCode();
			}
		},

		cheatCode: function () {
			this.markCorrectResponses();

			this.onClickSubmit();
		},

		// JQuery UI Sortable (for Sorting exercises) doesn't work in iFrames unless jquery is actually loaded in that iframe, hence:
		loadJqueryUIintoThisIframe: function (callback) {
			var iframe = this.options.iframe.iframe[0];

			var win = iframe.contentWindow, doc = win.document, body = doc.body, jQueryLoaded = false, jQuery;

			function loadLibrary() {
				body.removeChild(jQuery);
				jQuery = null;

				win.jQuery.ajax({
					url: baseURL + "js/jquery-ui.min.js",
					dataType: 'script',
					cache: true,
					success: function () {
						callback();
					}
				});
			}

			jQuery = doc.createElement('script');

			// based on https://gist.github.com/getify/603980
			jQuery.onload = jQuery.onreadystatechange = function () {
				if ((jQuery.readyState && jQuery.readyState !== 'complete' && jQuery.readyState !== 'loaded') || jQueryLoaded) {
					return false;
				}
				jQuery.onload = jQuery.onreadystatechange = null;
				jQueryLoaded = true;

				loadLibrary();
			};

			jQuery.src = baseURL + "js/jquery-2.1.3.min.js";
			body.appendChild(jQuery);
		}
	});

	return "quizzerator";
});
