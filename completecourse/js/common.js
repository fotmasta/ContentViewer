define([], function () {

	return {

		makeFirebaseFriendly: function (path) {
			return path.toLowerCase().replace(/\s/g, "_").replace(/\./g, "_");
		}

	};

});