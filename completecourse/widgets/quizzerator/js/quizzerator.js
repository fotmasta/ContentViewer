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
		"firebase": "https://cdn.firebase.com/js/client/2.3.2/firebase"
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
		},
		"firebase": {
			export: "Firebase"
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

define(["database", "jquery.ui", "bootstrap", "jquery.json"], function (database) {
	$.widget("que.quizzerator", {
		options: {},

		_create: function () {
			this.db = database;

			this.id = "quiz_id";

			this.currentQuestion = 0;

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
			var t = $("<table><tr class='answered'><td>Answered</td><td id='answered-count'></td></tr><tr><td>Correct</td><td id='correct-count'></td></tr><tr><td>Incorrect</td><td id='incorrect-count'></td></tr><tr class='total'><td>Score</td><td id='score-result'></td></tr></table>");
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
			this.element.find("#controls").prepend(ol);

			this.element.find("#previous-button").click($.proxy(this.onClickPrevious, this));
			this.element.find("#next-button").click($.proxy(this.onClickNext, this));

			this.onLoadedData(this.options.paramData);
		},

		onLoadedData: function (data) {
			this.data = data;

			if (this.options.desc) {
				this.element.find("h3.quiz-title").text(this.options.desc);
			} else if (this.data.title) {
				this.element.find("h3.quiz-title").text(this.data.title);
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

			for (var i = 0; i < this.data.questions.length; i++) {
				var d_q = this.data.questions[i];

				var q = {};

				q.q = d_q.text;
				q.hint = d_q.ref;
				q.answers = d_q.answers.slice();

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
		},

		addQuestion: function (q_params) {
			var q = $("<li>", {class: "question"});

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

			var answers = $("<ol>", {class: "answers-holder"});
			q.append(answers);

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

				var p = $("<p>", {class: "response", html: answer});
				if (isCorrect) p.attr("data-correct", true);

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

			var checker = $("<div>", {class: "checker inactive"}).appendTo(q);
			var btn = $("<button>", {class: "btn btn-primary", text: "Check Answer"});
			btn.click($.proxy(this.onClickCheck, this));
			btn.appendTo(checker);

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
					q.find(".checker").removeClass("inactive animated fadeOut").addClass("animated fadeInLeft").find("button").removeClass("btn-danger").addClass("btn-primary").text("Check Answer");
			} else if (chosenAnswer.length > 1) {
				if (this.options.settings.reviewableAfterEach)
					q.find(".checker").removeClass("inactive animated fadeOut").addClass("animated fadeInLeft").find("button").removeClass("btn-danger").addClass("btn-primary").text("Check Answer");
			} else {
				if (this.options.settings.reviewableAfterEach)
					q.find(".checker").addClass("animated fadeOut").animate({_nothing: 0}, 1000, $.proxy(me.resetButton, me, q));
			}

			if (!alsoCheck && !this.options.settings.reviewableAfterEach) {
				q.find(".checker button").removeClass("btn-danger").addClass("btn-primary").text("Check Answer");
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
			$(question).find(".checker button").text("Check Answer").removeClass("btn-success btn-danger").addClass("btn-primary");
		},

		getQuestionsAnswered: function () {
			return $.unique(this.element.find(".selected").parents(".question"));
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
				var h = me.element.find(".holder").outerHeight();
				me.element.find(".summary").height(h);
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

			var correctAnswer = q.find(".response[data-correct=true]");
			var chosenAnswer = q.find(".response.selected");

			if (correctAnswer.not(chosenAnswer).length == 0 && chosenAnswer.not(correctAnswer).length == 0) {
				// all correct
				chosenAnswer.parent("li").find(".correct").removeClass("hidden");
				if (animate != false) {
					chosenAnswer.parent("li").find(".icons").removeClass("hidden animated").hide(0).addClass("animated rollIn").show(0);
					q.find(".checker button").text("That's Correct!").removeClass("btn-primary btn-danger").addClass("btn-success animated fadeInLeft");
				} else {
					chosenAnswer.parent("li").find(".icons").removeClass("hidden animated").show(0);
					q.find(".checker button").text("That's Correct!").removeClass("btn-primary btn-danger").addClass("btn-success");
					q.find(".checker").removeClass("animated");
				}

				q.attr("data-correct", true);
			} else {
				// some incorrect
				chosenAnswer.each(function (index, item) {
					if ($.inArray(item, correctAnswer) > -1)
						$(item).parent("li").find(".correct").removeClass("hidden");
					else
						$(item).parent("li").find(".incorrect").removeClass("hidden");
				});
				if (animate != false) {
					chosenAnswer.parent("li").find(".icons").removeClass("hidden animated").hide(0).addClass("animated rollIn").show(0);
					q.find(".checker button").text("That's Not Correct! Try Again?").removeClass("btn-primary").addClass("btn-danger animated fadeInLeft");
				} else {
					chosenAnswer.parent("li").find(".icons").removeClass("hidden animated").show(0);
					q.find(".checker button").text("That's Not Correct! Try Again?").removeClass("btn-primary").addClass("btn-danger");
					q.find(".checker").removeClass("animated");
				}

				q.find(".checker").removeClass("inactive");

				q.attr("data-correct", false);

				q.find(".hint").css("display", "block");
			}

			this.updateScore();
		},

		onClickCheckAll: function (event) {
			var questions = this.element.find(".question");
			for (var i = 0; i < questions.length; i++) {
				var q = questions.eq(i);
				this.checkQuestion(q);
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

				for (var i = 0; i < obj.responses.length; i++) {
					var resp = obj.responses[i];

					if (resp.length == undefined) resp = [resp];

					var alsoCheckAnswers = (this.options.settings.reviewableAfterEach || this.allQuestionsAnswered());

					for (var j = 0; j < resp.length; j++) {
						var r = resp[j];
						if (r != -1) {
							var q = this.element.find(".question").eq(i);
							if (q.length) {
								var r_el = q.find(".response[data-index=" + r + "]");
								if (r_el.length)
									this.clickResponse(r_el, alsoCheckAnswers);
							}
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
				var answers = q.find(".response");
				var chosen = q.find(".response.selected");
				var indices = $.map(chosen, function (item, index) {
					return $(item).attr("data-index");
				});
				responses.push(indices);
			}

			var obj = {responses: responses};
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
			var t = $(event.target).scrollTop() + 140;
			var sum = this.element.find(".summary");
			var curtop = sum.offset().top;
			if (sum.css("top") == "auto" || Math.abs(curtop - t) > 20) {
				sum.offset({top: t});
			}
		},

		onStartOver: function () {
			this.element.find(".question").attr( { "data-correct": null  } );
			this.element.find(".response").removeClass("selected");

			this.element.find(".icon").addClass("hidden");
			this.element.find(".checker").addClass("inactive");
			this.element.find(".hint").css("display", "none");

			this.updateScore();

			this.adjustSummarySize();

			ga("send", "event", "interface", "quiz-restart", this.id);
		},

		onClickStartOver: function () {
			this.options.iframe.showAlert("Start Over", "Are you sure you want to clear your quiz responses and start over?", $.proxy(this.onStartOver, this));
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
			thisQ.hide(0).addClass("current").show(0);
		}
	});

	return "quizzerator";
});
