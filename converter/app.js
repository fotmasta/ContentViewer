var fs = require('fs');
var AdmZip = require('adm-zip');

var zip = new AdmZip("unleashed_template.zip");

var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.get('/', function(request, response) {
	response.send("Hello world!");
});

app.listen(app.get('port'), function() {
	console.log("Node app is running on port:" + app.get('port'))
});

function doConversion () {
	var targetDir = "unleashed_template/";

	zip.getEntries().forEach(function (entry) {
		var entryName = entry.entryName;

		zip.extractEntryTo(entry, targetDir, true, true);

		var oldPath = targetDir + entryName;

		var newPath = targetDir + entryName.toLowerCase();

		newPath = newPath.replace(".xhtml", ".html");

		fs.rename(oldPath, newPath);
	});

	fs.rename(targetDir + "OPS", targetDir + "ops");

	var toc = fs.readFileSync(targetDir + "ops/toc.html", {encoding: "UTF-8"});

	toc = toc.replace(/.xhtml/g, ".html");

	console.log(toc);
}