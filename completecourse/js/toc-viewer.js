define(["jquery.ui"], function () {

	$.widget("que.TOCViewer", {

		options: {},

		_create: function () {
			console.log("ready to go");
		},
		
		doit: function () {
			console.log("ok, I'll do it!");
		},

		_destroy: function () {
		},

		_setOption: function ( key, value ) {
			switch (key) {
				default:
					//this.options[ key ] = value;
					break;
			}

			this._super( "_setOption", key, value );
		}
	});
});
