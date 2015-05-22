define(["jquery"], function () {
	console.log("initializing");
	var el = $("body");
	console.log(el);
	var p = $("<p>", { text: "Hello world." });
	el.append(p);
});