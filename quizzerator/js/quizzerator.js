define(["jquery.ui"], function () {

	$.widget("que.quizzerator", {
		options: {},

		_create: function () {
			$.getJSON("quiz1.json", $.proxy(this.onLoadedData, this));

			var ol = $("<ol>", { class: "quiz-holder" });
			this.element.append(ol);
		},

		onLoadedData: function (data) {
			for (var each in data.questions) {
				var q = data.questions[each];
				this.addQuestion(q);
			}
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

				var p = $("<p>", { class: "response", html: answer });
				if (isCorrect) p.attr("data-correct", true);

				p.click($.proxy(this.onClickAnswer, this));

				li.append(p);
				answers.append(li);

			}

			var checker = $("<div>", { class: "checker" }).appendTo(q);
			var btn = $("<button>", { class: "btn btn-primary", text: "Check answer" });
			btn.click($.proxy(this.onClickCheck, this));
			btn.appendTo(checker);

			this.element.find(".quiz-holder").append(q);
		},

		onClickAnswer: function (event) {
			var el = $(event.currentTarget);

			var alreadySelected = el.hasClass("selected");

			el.parents(".answers-holder").find(".selected").removeClass("selected");

			if (!alreadySelected)
				el.addClass("selected");
		},

		onClickCheck: function (event) {
			var q = $(event.currentTarget).parents(".question");

			q.find(".response").removeClass("right wrong");

			var correctAnswer = q.find("[data-correct=true]");
			var chosenAnswer = q.find(".response.selected");

			if (correctAnswer.is(chosenAnswer)) {
				chosenAnswer.addClass("right");
			} else {
				chosenAnswer.addClass("wrong");
			}
		}
	});

});
