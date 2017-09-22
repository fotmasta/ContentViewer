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

define(["database", "highlight", "jquery.ui", "bootstrap", "jquery.json"], function (database) {

	var tryAgainText = "That's not correct. Try a different response.";
	var partialTryAgainText = "That's partially correct. Keep trying.";
	var correctText = "That's correct!";

	$.widget("que.matcherator", {
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

			/*
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
			*/

			this.onLoadedData(this.options.paramData);

			$(window).on("resize.matcherator", $.proxy(this.onWindowResize, this));
		},

		onWindowResize: function () {
			this.redrawLines();
		},

		onImagesLoaded: function () {
			this.redrawLines();
		},

		onLoadedData: function (data) {
			this.data = data;

			console.log("loaded!");
			console.log(data);
			console.log(this.options);

			if (this.options.desc) {
				this.element.find("h2#page-title").text(this.options.desc);
			}

			if (this.data.settings.title) {
				this.element.find("h3.activity-title .contents").text(this.data.settings.title);
			}

			if (this.data.settings.description) {
				this.element.find("h4#instructions").text(this.data.settings.description);
			}

			switch (this.data.settings.type) {
				case "pairs":
					var holder = this.element.find("#activity");

					holder.addClass("pairs");

					var left_col = $("<div>", { class: "left column" });

					for (var i = 0; i < this.data.matching.left.length; i++) {
						var li = $("<button>", { text: this.data.matching.left[i], "data-index": i, class: "btn btn-primary choice" });
						left_col.append(li);
					}

					holder.append(left_col);

					var right_col = $("<div>", { class: "right column" });

					for (var i = 0; i < this.data.matching.right.length; i++) {
						var li = $("<button>", { text: this.data.matching.right[i], "data-index": i, class: "btn btn-success choice" });
						right_col.append(li);
					}

					holder.append(right_col);

					this.element.find(".choice").click($.proxy(this.onClickChoice, this));

					break;
				case "matrix":
					break;
			}

			/*
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
			*/
		},

		onClickChoice: function (event) {
			var target = $(event.currentTarget);

			target.parents(".column").find(".choice").removeClass("selected");
			target.addClass("selected");

			var left = this.element.find(".left .selected");
			var right = this.element.find(".right .selected");

			if (left.length && right.length) {
				this.removeLineLeft(left);
				this.removeLineRight(right);

				this.drawLineBetween(left, right);

				this.element.find(".column .selected").removeClass("selected");
			}
		},

		removeLineLeft: function (el) {
			var index = el.attr("data-index");
			var line = this.element.find(".matching-line[data-left-index=" + index + "]");
			if (line.length) {
				line.remove();
			}
		},

		removeLineRight: function (el) {
			var index = el.attr("data-index");
			var line = this.element.find(".matching-line[data-right-index=" + index + "]");
			if (line.length) {
				line.remove();
			}
		},

		drawLineBetween: function (el1, el2) {
			var one = el1;
			var two = el2;

			var activity = this.element.find("#activity");

			var w1 = one.width() + 15, h1 = one.height();
			var x1 = w1 + one.offset().left - activity.offset().left;
			var y1 = h1 * .5 + one.offset().top - activity.offset().top;

			var w2 = two.width(), h2 = two.height();
			var x2 = two.offset().left - activity.offset().left + 5;
			var y2 = h2 * .5 + two.offset().top - activity.offset().top;

			var length = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
			var angle = Math.atan2(y2 - y1, x2 - x1) / Math.PI * 180;

			var left_index = el1.attr("data-index");
			var right_index = el2.attr("data-index");

			var line = this.element.find(".matching-line[data-left-index=" + left_index + "]");

			if (line.length == 0) {
				line = $("<div>", {class: "matching-line"});
				line.attr({"data-left-index": left_index, "data-right-index": right_index});
				activity.prepend(line);
			}

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
			$(window).off("resize.matcherator");
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

	return "matcherator";
});
