// TODO: rename .xhtml to .html
// TODO: change internal references from .xhtml to .html

var AdmZip = require('adm-zip');

var zip = new AdmZip("unleashed_template.zip");

/*
var zipEntries = zip.getEntries();

zipEntries.forEach(function(zipEntry) {
	console.log(zipEntry.toString()); // outputs zip entries information
	if (zipEntry.entryName == "my_file.txt") {
		console.log(zipEntry.data.toString('utf8'));
	}
});
*/

var targetDir = "unleashed_template/";

zip.getEntries().forEach(function(entry) {
	var entryName = entry.entryName;

	var targetPath = entryName.toLowerCase();

	zip.extractEntryTo(entry, targetDir + targetPath, true, true);
});

//zip.extractAllTo("unleashed_template", true);