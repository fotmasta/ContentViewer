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

define(["database", "highlight", "jquery.ui", "bootstrap", "jquery.json"], function (database) {

	var tryAgainText = "That's not correct. Try a different response.";
	var partialTryAgainText = "That's partially correct. Keep trying.";
	var correctText = "That's correct!";

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

			this.onLoadedData(this.options.paramData);

			$(window).on("resize.quizzerator", $.proxy(this.onWindowResize, this));
		},

		onWindowResize: function () {
			this.redrawLines();
		},

		onImagesLoaded: function () {
			this.redrawLines();
		},

		onLoadedData: function (data) {
			this.data = data;

			if (this.options.desc) {
				this.element.find("h3.quiz-title .contents").text(this.options.desc);
			} else if (this.data.title) {
				this.element.find("h3.quiz-title .contents").text(this.data.title);
			}

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
				q.answers = d_q.answers.slice();
				if (d_q.choices)
					q.choices = d_q.choices.slice();

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

		addQuestion: function (q_params) {
			var isMatching = false, mq;

			var n = this.element.find(".quiz-holder li.question").length;

			var classes = "question";

			if (this.options.settings.singleView) {
				classes += " animated fadeInRight";
			}

			var q = $("<li>", {class: classes, "data-number": (n + 1) + "." });
			q.attr("data-index", q_params.index);

			var p_question = $("<p>", {html: q_params.q});

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

			if (q_params.choices) {
				isMatching = true;

				q.addClass("matching");

				mq = $("<div>", { class: "matching-container" });
				q.append(mq);

				var choices = $("<ol>", {class: "choices-holder"});
				mq.append(choices);

				for (var each in q_params.choices) {
					var choice = q_params.choices[each];

					var li = $("<li>", { class: "choice" });

					var p = $("<p>", {class: "response", html: choice});

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
				if (isMatching) {
					var choice_li = mq.find("li.choice").eq(each);
					choice_li.append(icons);
				} else {
					li.append(icons);
				}

				var icon_correct = $("<i>", {class: "icon correct fa fa-2x fa-check hidden"});
				icons.append(icon_correct);

				var icon_incorrect = $("<i>", {class: "icon incorrect fa fa-2x fa-times hidden"});
				icons.append(icon_incorrect);

				var p = $("<p>", {class: "response", html: answer});
				if (isCorrect) p.attr("data-correct", true);
				else p.attr("data-correct", false);

				p.attr("data-index", each);

				var me = this;

				p.find("img").each(function () {
					var img = $(this);
					var path = me.options.path + "/" + img.attr("src");
					img.attr("src", path);
				});

				if (isMatching) {
					p.click($.proxy(this.onClickChoice2, this));
				} else {
					p.click($.proxy(this.onClickAnswer, this));
				}

				li.append(p);

				answers.append(li);
			}

			if (isMatching) {
				mq.append(answers);
			}

			if (this.options.settings.randomizeResponses || isMatching) {
				var responses = answers.find("li.answer");

				answers.children("li.answer").sort(function () {
					return Math.round(Math.random()) - 0.5;
				}).detach().appendTo(answers);
			}

			var checker = $("<div>", {class: "checker inactive"}).appendTo(q);
			var btn = $("<button>", {class: "btn btn-primary btn-checker", text: "Check Answer"});
			btn.click($.proxy(this.onClickCheck, this));
			btn.appendTo(checker);
			var lbl = $("<span>", { class: "checker-label", text: tryAgainText });
			lbl.appendTo(checker);

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

			this.element.find(".quiz-holder").append(q);
		},

		onClickAnswer: function (event) {
			var el = $(event.currentTarget);

			this.clickResponse(el);

			var num = el.parents(".question").index();

			var id = this.id + ":" + num + ":" + el.attr("data-index");

			ga("send", "event", "interface", "quiz-response", id);
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
			var one = question.find(".choice .response.selected");
			var two = question.find(".answer .response.selected");

			if (one.length && two.length) {
				this.drawLineBetween(question, one, two);

				var index = parseInt(one.attr("data-index")) + 1;

				question.find(".choice .response.selected").removeClass("selected").addClass("matched matched-color" + index);
				question.find(".answer .response.selected").removeClass("selected").addClass("matched matched-color" + index);

				question.find(".response.selected").removeClass("selected");

				if (this.options.settings.reviewableAfterEach)
					question.find(".checker").removeClass("inactive animated fadeOut").addClass("animated fadeInLeft").find("button").removeClass("btn-danger btn-success").addClass("btn-primary").parent().find(".checker-label").css("display", "none");
			}
		},

		drawLineBetween: function (question, one, two) {
			var left_index = one.attr("data-index");
			var right_index = two.attr("data-index");
			var line = question.find(".matching-line[data-left-index=" + left_index + "]");
			if (line.length == 0) {
				line = $("<div>", {class: "matching-line"});
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
			var lines = this.element.find(".matching-line");
			var me = this;
			lines.each(function (index, line) {
				me.doDrawLine($(line));
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
				q.find(".checker button").removeClass("btn-danger").addClass("btn-primary");
			}

			q.find(".icon").addClass("hidden");

			q.attr("data-correct", null);

			if (alsoCheck) {
				this.checkQuestion(q, false);
			}

			this.updateScore();

			this.adjustSummarySize();

			if (!alsoCheck)
				this.saveResponses();
		},

		resetButton: function (question) {
			$(question).find(".checker").addClass("inactive");
			$(question).find(".checker button").removeClass("btn-success btn-danger").addClass("btn-primary").parent().find(".checker-label").css("display", "none");
		},

		getQuestionsAnswered: function () {
			var questions = this.element.find(".question");
			var answered = [];

			questions.each(function (index, question) {
				var q = $(question);
				if (q.hasClass("matching")) {
					if (q.find(".matching-line").length == q.find(".choice").length) answered.push(index);
				} else {
					if (q.find(".selected").length) answered.push(index);
				}
			});

			return answered;
			//return $.unique(this.element.find(".selected").parents(".question"));
		},

		allQuestionsAnswered: function () {
			var answered = this.getQuestionsAnswered();
			var questions = this.element.find(".question");
			return (answered && questions && answered.length == questions.length);
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

		onClickCheck: function (event) {
			var q = $(event.currentTarget).parents(".question");

			this.checkQuestion(q);
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
						q.find(".checker button").removeClass("btn-primary btn-danger").addClass("btn-success animated fadeInLeft").parent().find(".checker-label").text(correctText).css("display", "inline");
					} else {
						q.find(".checker button").removeClass("btn-primary btn-danger").addClass("btn-success").parent().find(".checker-label").text(correctText).css("display", "inline");
						q.find(".checker").removeClass("animated");
					}

					q.attr("data-correct", true);
				} else {
					if (animate != false) {
						q.find(".checker button").removeClass("btn-primary").addClass("btn-danger animated fadeInLeft").parent().find(".checker-label").text(tryAgainText).css("display", "inline");
					} else {
						q.find(".checker button").removeClass("btn-primary").addClass("btn-danger").parent().find(".checker-label").text(tryAgainText).css("display", "inline");
						q.find(".checker").removeClass("animated");
					}

					q.find(".checker").removeClass("inactive");

					q.attr("data-correct", false);

					q.find(".hint").css("display", "block");
				}
			} else {
				var correctAnswer = q.find(".response[data-correct=true]");
				var chosenAnswer = q.find(".response.selected");

				if (correctAnswer.not(chosenAnswer).length == 0 && chosenAnswer.not(correctAnswer).length == 0) {
					// all correct
					chosenAnswer.parent("li").find(".correct").removeClass("hidden");
					if (animate != false) {
						chosenAnswer.parent("li").find(".icons").removeClass("hidden animated").hide(0).addClass("animated rollIn").show(0);
						q.find(".checker button").removeClass("btn-primary btn-danger").addClass("btn-success animated fadeInLeft").parent().find(".checker-label").text(correctText).css("display", "inline");
					} else {
						chosenAnswer.parent("li").find(".icons").removeClass("hidden animated").show(0);
						q.find(".checker button").removeClass("btn-primary btn-danger").addClass("btn-success").parent().find(".checker-label").text(correctText).css("display", "inline");
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
						q.find(".checker button").removeClass("btn-primary").addClass("btn-danger animated fadeInLeft").parent().find(".checker-label").text(responseText).css("display", "inline");
					} else {
						chosenAnswer.parent("li").find(".icons").removeClass("hidden animated").show(0);
						q.find(".checker button").removeClass("btn-primary").addClass("btn-danger").parent().find(".checker-label").text(responseText).css("display", "inline");
						q.find(".checker").removeClass("animated");
					}

					q.find(".checker").removeClass("inactive");

					q.attr("data-correct", false);

					q.find(".hint").css("display", "block");
				}
			}

			this.updateScore();
		},

		markAllCorrectResponses: function () {
			var questions = this.element.find(".question");
			for (var i = 0; i < questions.length; i++) {
				var q = questions.eq(i);

				var correctAnswer = q.find(".response[data-correct=true]");

				// show the right responses
				correctAnswer.parent("li").find(".correct").removeClass("hidden");

				// show the hint
				q.find(".checker").removeClass("inactive");
				q.find(".hint").css("display", "block");
			}
		},

		onClickCheckAll: function (event) {
			this.checkAllQuestions(true);
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
				ga("send", "event", "interface", "quiz-check-all", note);
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

					if (resp.length == undefined) resp = [resp];

					var alsoCheckAnswers = (this.options.settings.reviewableAfterEach || this.allQuestionsAnswered());

					var q = this.element.find(".question").eq(i);
					if (q.length) {
						var isMatching = false;
						var question_params = this.data.questions[i];
						if (question_params.choices) {
							isMatching = true;
						}

						if (!isMatching) {
							for (var j = 0; j < resp.length; j++) {
								var r = resp[j];
								if (r != -1) {
									var r_el = q.find(".response[data-index=" + r + "]");
									if (r_el.length)
										this.clickResponse(r_el, alsoCheckAnswers);
								}
							}
						} else if (isMatching) {
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

							this.showInstructions(q);
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
				var isMatching = false;
				if (question_params.choices) {
					isMatching = true;
				}
				if (!isMatching) {
					var answers = q.find(".response");
					var chosen = q.find(".response.selected");
					var indices = $.map(chosen, function (item, index) {
						return $(item).attr("data-index");
					});
					responses.push(indices);
				} else {
					var pairs = q.find(".matching-line");
					var indices = $.map(pairs, function (item, index) {
						var left = $(item).attr("data-left-index");
						var right = $(item).attr("data-right-index");
						return [left, right];
					});
					responses.push(indices);
				}
			}

			var obj = {responses: responses, attempts: this.attempts};
			var to_json = $.toJSON(obj);

			this.db.setTitleProperty(this.id, to_json);
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
			this.element.find(".matching-line").remove();
			removeMatchColors(this.element.find(".matched"));
			this.element.find(".matched").removeClass("matched");

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

			ga("send", "event", "interface", "quiz-restart", this.id);
		},

		onClickStartOver: function () {
			this.options.iframe.showAlert("Start Over", "Are you sure you want to clear your quiz responses and start over?", $.proxy(this.onStartOver, this));
		},

		onClickClear: function () {
			var thisQ = this.element.find(".question").eq(this.currentQuestion);

			thisQ.attr( { "data-correct": null  } );
			thisQ.find(".response").removeClass("selected");
			thisQ.find(".matching-line").remove();
			removeMatchColors(thisQ.find(".matched"));
			thisQ.find(".matched").removeClass("matched");

			thisQ.find(".icon").addClass("hidden");
			thisQ.find(".checker").addClass("inactive");
			thisQ.find(".hint").css("display", "none");

			this.updateScore();

			this.saveResponses();

			this.adjustSummarySize();
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

			thisQ.find(".checker button").removeClass("btn-success");

			var total = this.element.find(".question").length;
			this.element.find(".position-label").text("Question " + (this.currentQuestion + 1) + " of " + total).click($.proxy(this.onClickSecretPosition, this));

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
		},

		onClickSubmit: function () {
			this.attempts++;

			this.checkAllQuestions(false);

			this.updateScore();

			this.saveResponses();

			// now show correct answers and explanations
			this.markAllCorrectResponses();

			this.element.toggleClass("grading");

			// this will show the summary pane and scroll to it

			var me = this;

			setTimeout(function () {
				var t = me.element.find(".summary").offset().top;
				var h = $(window).height() * .5;
				$(window).animate({scrollTop: t - h}, 1000);
			}, 200);
		},

		unload: function () {
			$(window).off("resize.quizzerator");
		},

		onClickSecretPosition: function (event) {
			this.markAllAnswersCorrectly();
		},

		markAllAnswersCorrectly: function () {
			var questions = this.element.find(".question");
			for (var i = 0; i < questions.length; i++) {
				var q = questions.eq(i);
				var correctAnswer = q.find(".response[data-correct=true]");
				q.find(".response").removeClass("selected");
				correctAnswer.addClass("selected");
			}

			this.checkAllQuestions(false);

			this.updateScore();

			// now show correct answers and explanations
			this.markAllCorrectResponses();

			this.element.toggleClass("grading");

			// this will show the summary pane and scroll to it

			var me = this;

			setTimeout(function () {
				var t = me.element.find(".summary").offset().top;
				var h = $(window).height() * .5;
				$(window).animate({scrollTop: t - h}, 1000);
			}, 200);
		}
	});

	return "quizzerator";
});
