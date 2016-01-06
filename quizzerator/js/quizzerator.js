define(["jquery.ui", "bootstrap", "jquery.json"], function () {

	$.widget("que.quizzerator", {
		options: {},

		_create: function () {
			$.getJSON("quiz1.json", $.proxy(this.onLoadedData, this));

			var summary = $("<div>", { class: "summary" });
			var container = $("<div>", { class: "holder" });
			summary.append(container);
			container.append($("<h3>Score:</h3>"));
			var t = $("<table><tr><td>Correct</td><td id='correct-count'></td></tr><tr><td>Incorrect</td><td id='incorrect-count'></td></tr><tr class='total'><td>Remaining</td><td id='remaining-count'></td></tr></table>");
			t.addClass("results");
			container.append(t);
			var btn = $("<button>", { id: "check-all", class: "btn btn-success btn-sm center-block shrunk", text: "Check All" });
			btn.click($.proxy(this.onClickCheckAll, this));
			container.append(btn);

			this.element.append(summary);

			var ol = $("<ol>", { class: "quiz-holder" });
			this.element.append(ol);

			summary.affix({ offset: { top: summary.offset().top } });
		},

		onLoadedData: function (data) {
			this.data = data;

			for (var each in data.questions) {
				var q = data.questions[each];
				this.addQuestion(q);
			}

			this.loadResponses();

			this.updateScore();

			this.adjustSummarySize();
		},

		addQuestion: function (q_params) {
			var q = $("<li>", { class: "question" });

			var p_question = $("<p>", { text: q_params.q });
			q.append(p_question);

			var answers = $("<ol>", { class: "answers-holder" });
			q.append(answers);

			for (var each in q_params.answers) {
				var answer = q_params.answers[each];

				var isCorrect = false;
				if (answer.substr(0, 1) == "*") {
					isCorrect = true;
					answer = answer.substr(1);
				}

				var li = $("<li>");

				var icons = $("<div>", { class: "icons" });
				li.append(icons);

				var icon_correct = $("<i>", { class: "icon correct fa fa-2x fa-thumbs-o-up hidden" });
				icons.append(icon_correct);

				var icon_incorrect = $("<i>", { class: "icon incorrect fa fa-2x fa-thumbs-o-down hidden" });
				icons.append(icon_incorrect);

				var p = $("<p>", { class: "response", html: answer });
				if (isCorrect) p.attr("data-correct", true);

				p.click($.proxy(this.onClickAnswer, this));
				li.append(p);

				answers.append(li);

			}

			var checker = $("<div>", { class: "checker inactive" }).appendTo(q);
			var btn = $("<button>", { class: "btn btn-primary", text: "Check Answer" });
			btn.click($.proxy(this.onClickCheck, this));
			btn.appendTo(checker);

			var hint = $("<p>", { class: "hint", html: "<i class='fa fa-bookmark text-danger'></i> Hint: " });
			var link = $("<a>", { href: q_params.hint, text: q_params.hint });
			hint.append(link);
			checker.append(hint);

			this.element.find(".quiz-holder").append(q);
		},

		onClickAnswer: function (event) {
			var el = $(event.currentTarget);

			this.clickResponse(el);
		},

		clickResponse: function (response) {
			var q = $(response).parents(".question");

			var alreadySelected = response.hasClass("selected");

			response.parents(".answers-holder").find(".selected").removeClass("selected");

			var me = this;

			if (!alreadySelected) {
				response.addClass("selected");
				q.find(".checker").removeClass("inactive animated fadeOut").addClass("animated fadeInLeft").find("button").removeClass("btn-danger").addClass("btn-primary").text("Check Answer");
			} else {
				q.find(".checker").addClass("animated fadeOut").animate( { _nothing: 0 }, 1000, $.proxy(me.resetButton, me, q));
			}

			q.find(".icon").addClass("hidden");

			q.attr("data-correct", null);

			this.updateScore();
			
			this.adjustSummarySize();

			this.saveResponses();
		},

		resetButton: function (question) {
			$(question).find(".checker").addClass("inactive");
			$(question).find(".checker button").text("Check Answer").removeClass("btn-success btn-danger").addClass("btn-primary");
		},

		adjustSummarySize: function () {
			var answered = this.element.find(".selected");

			var me = this;

			if (answered.length) {
				this.element.find("#check-all").removeClass("shrunk");
				setTimeout(function () {
					me.element.find("#check-all").addClass("unhidden");
				}, 500);
			} else {
				this.element.find("#check-all").addClass("shrunk");
				setTimeout(function () {
					me.element.find("#check-all").removeClass("unhidden");
				}, 500);
			}

			var h = this.element.find(".holder").outerHeight();
			this.element.find(".summary").height(h);
		},

		onClickCheck: function (event) {
			var q = $(event.currentTarget).parents(".question");

			this.checkQuestion(q);
		},

		checkQuestion: function (q) {
			q.find(".icon").addClass("hidden");

			var correctAnswer = q.find(".response[data-correct=true]");
			var chosenAnswer = q.find(".response.selected");

			if (correctAnswer.is(chosenAnswer)) {
				chosenAnswer.parent("li").find(".correct").removeClass("hidden");
				chosenAnswer.parent("li").find(".icons").removeClass("hidden animated").hide(0).addClass("animated rollIn").show(0);
				q.find(".checker button").text("That's Correct!").removeClass("btn-primary btn-danger").addClass("btn-success");

				q.attr("data-correct", true);
			} else {
				chosenAnswer.parent("li").find(".incorrect").removeClass("hidden");
				chosenAnswer.parent("li").find(".icons").removeClass("hidden animated").hide(0).addClass("animated rollIn").show(0);
				q.find(".checker button").text("That's Not Correct! Try Again?").removeClass("btn-primary").addClass("btn-danger");
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
		},

		updateScore: function () {
			var correct = this.element.find(".question[data-correct=true]").length;
			var incorrect = this.element.find(".question[data-correct=false]").length;

			$(".summary").find("#correct-count").text(correct);
			$(".summary").find("#incorrect-count").text(incorrect);

			var remaining = this.element.find(".question").length - (correct + incorrect);

			$(".summary").find("#remaining-count").text(remaining);
		},

		loadResponses: function () {
			var key = this.data.id;

			var item = localStorage.getItem(key);
			if (item) {
				var obj = $.evalJSON(item);

				for (var i = 0; i < obj.responses.length; i++) {
					var resp = obj.responses[i];
					if (resp != -1) {
						var q = this.element.find(".question").eq(i);
						if (q.length) {
							var r = q.find(".response").eq(resp);
							if (r.length)
								this.clickResponse(r);
						}
					}
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
				var index = answers.index(chosen);
				responses.push(index);
			}

			var obj = { responses: responses };
			var to_json = $.toJSON(obj);

			var key = this.data.id;

			localStorage.setItem(key, to_json)
		}
	});

});
