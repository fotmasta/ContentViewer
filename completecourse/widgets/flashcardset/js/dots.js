/**
 * dots.js v1.0.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2014, Codrops
 * http://www.codrops.com
 */
;(function (window) {

	'use strict';

	function extend (a, b) {
		for (var key in b) {
			if (b.hasOwnProperty(key)) {
				a[key] = b[key];
			}
		}
		return a;
	}

	function DotNav (el, options) {
		this.nav = el;
		this.current = 0;
		this.options = extend({}, this.options);
  		extend(this.options, options);
  		this._init();
	}

	DotNav.prototype.options = {};

	DotNav.prototype._init = function () {
		var dots = [].slice.call(this.nav.querySelectorAll('li')), self = this;

		dots.forEach(function (dot, idx) {
			dot.addEventListener('click', function(ev) {
				ev.preventDefault();
				if (idx !== self.current) {
					dots[self.current].className = '';

					setTimeout(function () {
						dot.className += ' current';
						self.current = idx;
						if (typeof self.options.callback === 'function') {
							self.options.callback(self.current);
						}

						$(self.nav).find(".dummy").animate({left: $(dot).position().left}, 100);
					}, 25);
				}
			});
		});
	};

	DotNav.prototype.selectByIndex = function (idx) {
		var dot = $(this.nav).find("li:not('.dummy')").removeClass("current").eq(idx);
		if (dot.length) {
			dot.addClass("current");
			var dummy = $(this.nav).find(".dummy");
			if (dummy.length)
				dummy.animate({left: $(dot).position().left}, 100);
			this.current = idx;
		}
	}

	// add to global namespace
	window.DotNav = DotNav;

})( window );