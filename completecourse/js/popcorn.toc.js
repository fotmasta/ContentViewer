(function (Popcorn) {  
  Popcorn.plugin( "toc" , {
    _setup : function( options ) {
       // setup code, fire on initialization
       // options refers to the options passed into the plugin on init
       // this refers to the popcorn object
    },
    start: function( event, options ) {
    	$(".nav-list.toc a").removeClass("active animated tada");
    	$(".nav-list.toc a").eq(options.index).hide(0).addClass("active animated slideInLeft").show(0);
    	
       // fire on options.start
       // event refers to the event object
       // options refers to the options passed into the plugin on init
       // this refers to the popcorn object
    },
    end: function( event, options ) {
       // fire on options.end
       // event refers to the event object
       // options refers to the options passed into the plugin on init
       // this refers to the popcorn object
    }
  });
})(Popcorn);