define(["jquery.json"], function () {

	var Database = {

		items: [],
		currentIndex: undefined,

		initialize: function (toc) {
			this.items = new Array(toc.length);
			for (var i = 0; i < this.items.length; i++) {
				var item = { started: false, completed: false };
				this.items[i] = item;
			}

			this.loadFromLocalStorage();
		},

		loadFromLocalStorage: function () {
			var item = localStorage.getItem("PTG:db");
			if (item) {
				var db = $.evalJSON(item);

				this.items = db.items;
				this.currentIndex = db.index;
			}
		},

		saveToLocalStorage: function () {
			var db = { items: this.items, index: this.currentIndex };

			var to_json = $.toJSON(db);

			localStorage.setItem("PTG:db", to_json);
		},

		setItemProperty: function (index, property, value) {
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
		}
	};

	return Database;
});