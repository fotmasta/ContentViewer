define(["jquery.json"], function () {

	function makeKey (s) {
		s = s.toLowerCase();
		s = s.replace(/\s/g, "_");

		return s;
	}

	var Database = {

		items: [],
		currentIndex: undefined,

		initialize: function (toc, title) {
			if (title === undefined) {
				// NOTE: store our app data in a key named for the folder this content came from (ie, test_my_google_apps)

				var paths = window.location.pathname.split("/");
				title = paths[paths.length - 2];
			}

			this.folder = makeKey(title);

			this.items = new Array(toc.length);
			for (var i = 0; i < this.items.length; i++) {
				var item = { started: false, completed: false };
				this.items[i] = item;
			}

			this.loadFromLocalStorage();
		},

		loadFromLocalStorage: function () {
			var item = localStorage.getItem(this.folder);
			if (item) {
				var db = $.evalJSON(item);

				this.items = db.items;
				this.currentIndex = db.index;
				this.titleProperty = db.titleProperty;
			}
		},

		saveToLocalStorage: function () {
			var db = { items: this.items, index: this.currentIndex, titleProperty: this.titleProperty };

			var to_json = $.toJSON(db);

			localStorage.setItem(this.folder, to_json);
		},

		setItemProperty: function (index, property, value) {
			if (index >= this.items.length) {
				this.items[index] = {};
			}

			this.items[index][property] = value;

			this.saveToLocalStorage();
		},

		getItemProperty: function (index, property) {
			var item = this.items[index];
			if (item)
				return item[property];
			else
				return undefined;
		},

		saveCurrentIndex: function (index) {
			this.currentIndex = index;

			this.saveToLocalStorage();
		},

		getCurrentIndex: function () {
			return this.currentIndex;
		},

		saveCurrentTime: function (time) {
			if (this.currentIndex >= this.items.length) {
				this.items[index] = {};
			}

			this.items[this.currentIndex].time = time;

			this.saveToLocalStorage();
		},

		getCurrentTime: function () {
			if (this.currentIndex)
				return this.items[this.currentIndex].time;
			else
				return undefined;
		},

		getItems: function () {
			return this.items;
		},

		getPercentageComplete: function () {
			var completed = 0;
			for (var i = 0; i < this.items.length; i++) {
				if (this.items[i].completed)
					completed++;
			}
			return (completed / this.items.length);
		},

		getTitleProperty: function (key) {
			if (this.titleProperty === undefined) {
				this.titleProperty = {};
			}

			return this.titleProperty[key];
		},

		setTitleProperty: function (key, val) {
			if (this.titleProperty === undefined) {
				this.titleProperty = {};
			}

			this.titleProperty[key] = val;

			this.saveToLocalStorage();
		}

	};

	return Database;
});