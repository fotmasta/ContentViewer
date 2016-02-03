define(["jquery.json", "firebase"], function () {

	function makeKey (s) {
		s = s.toLowerCase();
		s = s.replace(/\s/g, "_");

		return s;
	}

	var Database = {

		items: [],
		currentIndex: undefined,
		callbacks: [],
		remoteAuthorized: false,
		last_save: undefined,
		attemptedRemoteLoad: false,

		initialize: function (toc, title, updateCallback) {
			this.authorize();

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

			this.updateCallback = updateCallback;

			this.loadFromLocalStorage();
		},

		loadFromLocalStorage: function () {
			console.log("load from local storage");

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

			try {
				localStorage.setItem(this.folder, to_json);
			} catch (e) {
				// private browsing
			}

			if (to_json != this.last_save) {
				this.saveToRemoteStorage(this.folder, to_json);
				this.last_save = to_json;
			}
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
				if (this.items[i] && this.items[i].completed)
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
		},

		authorize: function () {
			var ref = new Firebase("https://ptg-comments.firebaseio.com");
			ref.authAnonymously($.proxy(this.onAuthorizedCallback, this));
		},

		onAuthorizedCallback: function (error, authData) {
			if (error) {
				console.log("Login Failed!", error);
			} else {
				console.log("remote authorized");

				this.remoteAuthorized = true;

				this.loadFromRemoteStorage();

				for (var i = 0; i < this.callbacks.length; i++) {
					this.callbacks[i]();
				}
			}
		},

		onAuthorized: function (callback) {
			if (this.remoteAuthorized) {
				callback();
			} else {
				this.callbacks.push(callback);
			}
		},

		setCustomerID: function (id) {
			console.log("using customer id " + id);
			this.userStorageRef = new Firebase("https://ptg-comments.firebaseio.com/users/" + id);
		},

		saveToRemoteStorage: function (folder, data) {
			// THEORY: don't save to remote until we've tried loading from the remote
			if (this.attemptedRemoteLoad) {
				console.log("trying to save to remote");

				if (this.userStorageRef) {
					this.userStorageRef.child(folder).set(data);
					console.log("saved");
				}
			}
		},

		loadFromRemoteStorage: function () {
			console.log("loading from remote");

			if (this.userStorageRef) {
				this.attemptedRemoteLoad = true;

				var me = this;

				this.userStorageRef.child(this.folder).once("value", function (snapshot) {
					var item = snapshot.val();

					if (item) {
						var db = $.evalJSON(item);

						me.items = db.items;
						me.currentIndex = db.index;
						me.titleProperty = db.titleProperty;

						console.log("loaded");

						if (me.updateCallback) {
							me.updateCallback();
						}
					} else {
						console.log("nothing on remote");
					}
				});
			}
		}
	};

	return Database;
});