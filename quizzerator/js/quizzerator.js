define(["jquery.ui", "bootstrap"], function () {

	$.widget("que.quizzerator", {
		options: {},

		_create: function () {
			$.getJSON("quiz1.json", $.proxy(this.onLoadedData, this));

			var summary = $("<div>", { class: "summary" });
			summary.append($("<h3>Score:</h3>"));
			var t = $("<table><tr><td>Correct</td><td id='correct-count'></td></tr><tr><td>Incorrect</td><td id='incorrect-count'></td></tr><tr class='total'><td>Remaining</td><td id='remaining-count'></td></tr></table>");
			t.addClass("results");
			summary.append(t);

			this.element.append(summary);
			var ol = $("<ol>", { class: "quiz-holder" });
			this.element.append(ol);

			summary.affix({ offset: { top: summary.offset().top } });

		},

		onLoadedData: function (data) {
			for (var each in data.questions) {
				var q = data.questions[each];
				this.addQuestion(q);
			}

			this.updateScore();
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

				var icon_correct = $("<i>", { class: "icon correct fa fa-2x fa-thumbs-o-up hidden" });
				li.append(icon_correct);

				var icon_incorrect = $("<i>", { class: "icon incorrect fa fa-2x fa-thumbs-o-down hidden" });
				li.append(icon_incorrect);

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

			this.element.find(".quiz-holder").append(q);
		},

		onClickAnswer: function (event) {
			var el = $(event.currentTarget);
			var q = $(event.currentTarget).parents(".question");

			var alreadySelected = el.hasClass("selected");

			el.parents(".answers-holder").find(".selected").removeClass("selected");

			var me = this;

			if (!alreadySelected) {
				el.addClass("selected");
				q.find(".checker").removeClass("inactive animated fadeOut").addClass("animated fadeInLeft");
			} else {
				q.find(".checker").addClass("animated fadeOut").animate( { _nothing: 0 }, 1000, $.proxy(me.resetButton, me, q));
			}

			q.find(".icon").addClass("hidden");

			q.attr("data-correct", null);
		},

		resetButton: function (question) {
			$(question).find(".checker").addClass("inactive");
			$(question).find(".checker button").text("Check Answer").removeClass("btn-success btn-danger").addClass("btn-primary");
		},

		onClickCheck: function (event) {
			var q = $(event.currentTarget).parents(".question");

			q.find(".icon").addClass("hidden");

			var correctAnswer = q.find(".response[data-correct=true]");
			var chosenAnswer = q.find(".response.selected");

			if (correctAnswer.is(chosenAnswer)) {
//				chosenAnswer.parent("li").find(".correct").removeClass("hidden animated").addClass("animated rollIn").show(0);
				chosenAnswer.parent("li").find(".correct").removeClass("hidden animated").show(0);
				q.find(".checker button").text("That's Correct!").removeClass("btn-primary btn-danger").addClass("btn-success");

				q.attr("data-correct", true);
			} else {
//				chosenAnswer.parent("li").find(".incorrect").removeClass("hidden animated").addClass("animated rollIn").show(0);
				chosenAnswer.parent("li").find(".incorrect").removeClass("hidden animated").show(0);
				q.find(".checker button").text("That's Not Correct! Try Again?").removeClass("btn-primary").addClass("btn-danger");

				q.attr("data-correct", false);
			}

			this.updateScore();
		},

		updateScore: function () {
			var correct = this.element.find(".question[data-correct=true]").length;
			var incorrect = this.element.find(".question[data-correct=false]").length;

			$(".summary").find("#correct-count").text(correct);
			$(".summary").find("#incorrect-count").text(incorrect);

			var remaining = this.element.find(".question").length - (correct + incorrect);

			$(".summary").find("#remaining-count").text(remaining);
		}
	});

});
