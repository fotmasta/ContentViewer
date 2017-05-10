define(["common"], function (Common) {
	var masterURL = "https://memberservices.informit.com/";

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

	function GetCommentsForTitle (isbn, callback) {
		var url = masterURL + "api/PersistentCustomerData/" + isbn + "/GetAllComments";

		var req = new XMLHttpRequest();
		req.open("GET", url, true);
		req.setRequestHeader('Content-type', 'application/json');
		req.onload = function () {
			if (callback) {
				var data = JSON.parse(this.responseText);
				var comments = [];
				for (var each in data) {
					var d = data[each];
					try {
						var rec = JSON.parse(d.Value);
						rec.isbn = isbn;
						rec.id = d.Id;
						comments.push(rec);
					} catch (e) {
						console.log("Parse error in:");
						console.log(d.Value);
					}
				}
				callback(comments);
			}
		};
		req.send();
	}

	function PostCommentForTitle (isbn, commentJSONString, callback) {
		var url = masterURL + "api/PersistentCustomerData";
		var obj = { isbn: isbn, key: "comment", value: commentJSONString, isComment: true };
		var params = JSON.stringify(obj);
		var req = new XMLHttpRequest();
		req.open("POST", url, true);
		req.setRequestHeader('Content-type', 'application/json');
		req.onload = function (event) {
			var data = JSON.parse(this.responseText);
			if (callback)
				callback(data);
		};
		try {
			req.send(params);
		} catch (e) {
			console.log("PostCommentForTitle error:")
			console.log(e);
		}
	}

	function GetDataForTitle (isbn, key, callback) {
		var url = masterURL + "api/PersistentCustomerData/" + isbn + "/" + key;
		var req = new XMLHttpRequest();
		req.open("GET", url, true);
		req.setRequestHeader('Content-type', 'application/json');
		req.onload = function (event) {
			if (this.status != 404) {
				var response = JSON.parse(this.responseText);
				if (callback) {
					var data = JSON.parse(response.Value);
					callback(data);
				}
			} else {
				callback(null);
			}
		};

		try {
			req.send();
		} catch (e) {
			// probably a 404, no data for this title
			console.log("GetDataForTitle error:")
			console.log(e);

			if (callback) {
				callback(null);
			}
		}
	}

	function SetDataForTitle (isbn, key, value, callback) {
		var url = masterURL + "api/PersistentCustomerData";
		var obj = { isbn: isbn, key: key, value: value, isComment: false };
		var params = JSON.stringify(obj);
		var req = new XMLHttpRequest();
		req.open("PUT", url, true);
		req.setRequestHeader('Content-type', 'application/json');
		req.onload = function (event) {
			if (callback)
				callback(this.responseText);
		};
		req.send(params);
	}

	var Database = {

		timestamp: undefined,
		items: [],
		currentIndex: undefined,
		callbacks: [],
		last_save: undefined,
		attemptedRemoteLoad: false,

		getVersion: function () {
			return "1.0.6";
		},

		initialize: function (toc, title, updateCallback) {
			this.title = title;

			this.databaseRef = undefined;

			this.initialRemoteDataLoad();

			this.items = new Array(toc.length);
			for (var i = 0; i < this.items.length; i++) {
				var item = { started: false, completed: false };
				this.items[i] = item;
			}

			this.updateCallback = updateCallback;

			this.loadFromLocalStorage();
		},

		loadCommentsForISBN: function (isbn, callback) {
			GetCommentsForTitle(isbn, callback);
		},

		loadCommentsFromPersistentDB: function (callback) {
			if (Common.getISBNFromLocation) {
				var isbn = Common.getISBNFromLocation();
				if (!isbn || isbn == "9780134438009") isbn = "9780134382562";
				if (isbn) {
					GetCommentsForTitle(isbn, callback);
				}
			}
		},

		postCommentToPersistentDatabase: function (commentObject, callback) {
			var isbn = commentObject.isbn;
			if (!isbn)
				isbn = Common.getISBNFromLocation();

			if (isbn) {
				PostCommentForTitle(isbn, JSON.stringify(commentObject), callback);
			}
		},

		deleteComment: function (id, callback) {
			var url = masterURL + "api/PersistentCustomerData/" + id;
			var req = new XMLHttpRequest();
			req.open('DELETE', url, true);
			req.setRequestHeader('Content-type', 'application/json');
			req.onload = function (event) {
				var data;
				if (this.responseText)
					data = JSON.parse(this.responseText);

				if (callback)
					callback(data);
			};
			req.send();
		},

		loadNotesFromPersistentDB: function (callback) {
			if (Common.getISBNFromLocation) {
				var isbn = Common.getISBNFromLocation();
				if (!isbn || isbn == "9780134438009") isbn = "9780134382562";
				if (isbn) {
					GetNotesForTitle(isbn, callback);
				}
			}
		},

		loadFromLocalStorage: function () {
			if (Common.getISBNFromLocation) {
				var isbn = Common.getISBNFromLocation();
				var item = localStorage.getItem(isbn);
				if (item) {
					var db = JSON.parse(item);

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
			}
		},

		saveToLocalStorage: function () {
			var compressedItems = shrink(this.items);

			var time = new Date().getTime();

			var db = { timestamp: time, items: compressedItems, index: this.currentIndex, titleProperty: this.titleProperty };

			var to_json = JSON.stringify(db);

			try {
				var isbn = Common.getISBNFromLocation();
				localStorage.setItem(isbn, to_json);
			} catch (e) {
				// private browsing
			}

			if (to_json != this.last_save) {
				this.saveToRemoteStorage("savedData", to_json);
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

		clearAllProgress: function () {
			for (var i = 0; i < this.items.length; i++) {
				this.items[i].completed = this.items[i].started = false;
			}

			this.saveToLocalStorage();
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

		initialRemoteDataLoad: function (user) {
			this.loadFromRemoteStorage();

			for (var i = 0; i < this.callbacks.length; i++) {
				this.callbacks[i]();
			}

			this.callbacks = [];
		},

		callWhenReady: function (callback) {
			this.callbacks.push(callback);
		},

		saveToRemoteStorage: function (key, data) {
			// THEORY: don't save to remote until we've tried loading from the remote
			if (this.attemptedRemoteLoad) {
				var isbn = Common.getISBNFromLocation();
				SetDataForTitle(isbn, key, data, $.proxy(this.onSavedToRemoteStorage, this));
			}
		},

		loadFromRemoteStorage: function () {
			if (Common.getgetISBNFromLocation) {
				var isbn = Common.getISBNFromLocation();

				GetDataForTitle(isbn, "savedData", $.proxy(this.onLoadedFromRemoteStorage, this));
			}
		},

		onLoadedFromRemoteStorage: function (data) {
			this.attemptedRemoteLoad = true;

			if (data) {
				if (this.timestamp == undefined || data.timestamp > this.timestamp) {
					if (typeof data.items == "string") {
						this.items = unshrink(data.items);
					} else {
						this.items = data.items;
					}
					this.currentIndex = data.index;
					this.titleProperty = data.titleProperty;
					this.timestamp = data.timestamp;

					if (this.updateCallback) {
						this.updateCallback();
					}

					this.saveToLocalStorage();
				}
			}
		},

		onSavedToRemoteStorage: function (result) {
			//console.log("on saved");
			//console.log(result);
		},

		setUserData: function (key, value, callback) {
			var isbn = Common.getISBNFromLocation();
			var json_value = JSON.stringify(value);
			SetDataForTitle(isbn, key, json_value, callback);
		},

		getUserData: function (key, callback) {
			var isbn = Common.getISBNFromLocation();

			GetDataForTitle(isbn, key, function (data) {
				if (callback && data)
					callback(data);
			});
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
		},

		getTitle: function () {
			return this.title;
		}
	};

	return Database;
});