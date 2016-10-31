define(["common", "jquery.json", "firebase/app", "firebase/auth", "firebase/database"], function (Common) {

	function shrink (itemsArray) {
		var s = [];
		for (var i = 0; i < itemsArray.length; i++) {
			var it = itemsArray[i];
			if (it) {
				s[i * 2] = it.started ? "s" : " ";
				s[i * 2 + 1] = it.completed ? "c" : " ";
			} else {
				s[i*2] = "  ";
			}
		}
		var st = s.join("");

		return st;
	}

	function unshrink (st) {
		var itemsArray = [];
		var n = st.length / 2;
		for (var i = 0; i < n; i++) {
			var obj = {
				started: st[i*2] == "s",
				completed: st[i*2+1] == "c"
			};
			itemsArray[i] = obj;
		}
		return itemsArray;
	}

	function initializeFirebaseApp () {
		var config = {
			apiKey: "AIzaSyAZQ32Kl7R85rXw3KDVAjl3oWkqkzlCpz4",
			authDomain: "ptg-comments.firebaseapp.com",
			databaseURL: "https://ptg-comments.firebaseio.com",
			storageBucket: "ptg-comments.appspot.com",
		};

		firebase.initializeApp(config);
	}

	function signinToFirebase () {
		firebase.auth().signInAnonymously().catch(function (error) {
			// Handle Errors here.
			var errorCode = error.code;
			var errorMessage = error.message;
			console.log("error signing in");
			console.log(error);
		});
	}

	function signoutFromFirebase () {
		firebase.auth().signOut();
	}

	var Database = {

		timestamp: undefined,
		items: [],
		currentIndex: undefined,
		callbacks: [],
		remoteAuthorized: false,
		last_save: undefined,
		attemptedRemoteLoad: false,

		getVersion: function () {
			return "1.0.5";
		},

		initialize: function (toc, title, updateCallback) {
			this.databaseRef = undefined;

			this.authorize();

			if (title === undefined) {
				// NOTE: store our app data in a key named for the folder this content came from (ie, test_my_google_apps)

				var paths = window.location.pathname.split("/");
				title = paths[paths.length - 2];
			}

			this.folder = Common.makeFirebaseFriendly(title);

			this.items = new Array(toc.length);
			for (var i = 0; i < this.items.length; i++) {
				var item = { started: false, completed: false };
				this.items[i] = item;
			}

			this.updateCallback = updateCallback;

			this.loadFromLocalStorage();
		},

		loadFromLocalStorage: function () {
			var item = localStorage.getItem(this.folder);
			if (item) {
				var db = $.evalJSON(item);

				if (this.timestamp == undefined || db.timestamp > this.timestamp) {
					if (typeof db.items == "string") {
						this.items = unshrink(db.items);
					} else {
						this.items = db.items;
					}
					this.currentIndex = db.index;
					this.titleProperty = db.titleProperty;
					this.timestamp = db.timestamp;
				}
			}
		},

		saveToLocalStorage: function () {
			var compressedItems = shrink(this.items);

			var time = new Date().getTime();

			var db = { timestamp: time, items: compressedItems, index: this.currentIndex, titleProperty: this.titleProperty };

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
			if (index >= this.items.length || this.items[index] == undefined) {
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
				this.items[this.currentIndex] = {};
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
			initializeFirebaseApp();

			signinToFirebase();

			firebase.auth().onAuthStateChanged($.proxy(this.onAuthorizedCallback, this));

			window.onbeforeunload = signoutFromFirebase;

			//this.databaseRef = new Firebase("https://ptg-comments.firebaseio.com");
			//this.databaseRef.authAnonymously($.proxy(this.onAuthorizedCallback, this));
		},

		onAuthorizedCallback: function (user) {
			this.databaseRef = firebase.database().ref();

			this.remoteAuthorized = true;

			this.loadFromRemoteStorage();

			for (var i = 0; i < this.callbacks.length; i++) {
				this.callbacks[i]();
			}

			this.callbacks = [];
		},

		onAuthorized: function (callback) {
			if (this.remoteAuthorized) {
				callback();
			} else {
				this.callbacks.push(callback);
			}
		},

		callWhenReady: function (callback) {
			this.callbacks.push(callback);
		},

		setCustomerID: function (id) {
			this.customerID = id;
			//this.userStorageRef = new Firebase("https://ptg-comments.firebaseio.com/users/" + id);
		},

		getCustomerID: function () {
			return this.customerID;
		},

		saveToRemoteStorage: function (folder, data) {
			// THEORY: don't save to remote until we've tried loading from the remote
			if (this.attemptedRemoteLoad) {
				if (this.customerID) {
					this.databaseRef.child("users/" + this.customerID + "/" + folder).set(data);
				}
			}
		},

		loadFromRemoteStorage: function () {
			if (this.customerID) {
				this.attemptedRemoteLoad = true;

				var me = this;

				this.databaseRef.child("users/" + this.customerID + "/" + this.folder).once("value", function (snapshot) {
					var item = snapshot.val();

					if (item) {
						var db = $.evalJSON(item);

						if (this.timestamp == undefined || db.timestamp > me.timestamp) {
							if (typeof db.items == "string") {
								me.items = unshrink(db.items);
							} else {
								me.items = db.items;
							}
							me.currentIndex = db.index;
							me.titleProperty = db.titleProperty;
							me.timestamp = db.timestamp;

							if (me.updateCallback) {
								me.updateCallback();
							}
						}
					}
				});
			}
		},

		setUserData: function (key, value) {
			if (!this.remoteAuthorized) {
				this.callWhenReady($.proxy(this.setUserData, this, key, value));
			} else {
				if (this.customerID) {
					this.databaseRef.child("users/" + this.customerID + "/userdata").child(key).set(value);
				}
			}
		},

		getUserData: function (key, callback) {
			if (!this.remoteAuthorized) {
				this.callWhenReady($.proxy(this.getUserData, this, key, callback));
			} else {
				if (this.customerID) {
					this.databaseRef.child("users/" + this.customerID + "/userdata").child(key).once("value", function (snapshot) {
						var item = snapshot.val();

						callback(item);
					});
				}
			}
		},

		getTitleData: function (callback) {
			if (!this.remoteAuthorized) {
				this.callWhenReady($.proxy(this.getTitleData, this, callback));
			} else {
				if (this.customerID) {
					this.databaseRef.child("users/" + this.customerID).once("value", callback);
				}
			}
		},

		getTitlesRef: function () {
			if (this.databaseRef)
				return this.databaseRef.child("titles");
		}
	};

	return Database;
});