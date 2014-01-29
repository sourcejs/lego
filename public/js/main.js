$('#export-img').on('click', function(e){
    e.preventDefault();

    html2canvas($('.lego_main'), {
      onrendered: function(canvas) {
          var dataURL= canvas.toDataURL();

          var data = encodeURIComponent(dataURL);

          $("body").append("<iframe src='/screenshot?base64=" + data + "' style='display: none;' ></iframe>");
      }
    });
});

var possibleTargets = ['other', 'navbar', 'toolbar', 'tertiary', 'secondary', 'narrow', 'wide', 'single']
    , activeTargets = []
    , tempHTML = Handlebars.compile($("#dummy-html").html())
    ;

//  Расположение определяется степенью двойки:
//  0 - overlay (исключение)
//  1 - single (primary)
//  2 - wide (primary)
//  4 - narrow (primary)
//  8 - secondary
//  16 - tertiary
//  32 - toolbar
//  64 - navbar
//  128 - other

var parseTargets = function(targets) {
    var result = [];
    for (var mask = 128, i = 0; mask > 0; mask >>= 1, i++) {
        if (mask & targets) {
            result.push(possibleTargets[i]);
        }
    }
    return result;
};

Handlebars.registerHelper('editor', function(context, options) {
    var wrap = '';

    for(var i=0, j=context.length; i<j; i++) {
        wrap += "<span>" + options.fn(context[i]) + "</span>";
    }

    return wrap;
});

$(document).ready(function(){

    $(".lego_toggler").on("click", ".lego_toggle_i", function(){
        $(this).parent().children().each( function() {
            $(this).toggleClass("__active")
        });
        $('.lego_search-result').toggleClass("__list");
    });

    $(".lego_search-result").on("click", ".lego_search-result_h", function(){
        $(this).parent().toggleClass("__closed");
    });

    $(".lego_layer").on("click", ".editable", function(){
        $(this).append(tempHTML());
    });

    $(".lego_layer").on("click", ".editor_x", function(e){
        e.stopImmediatePropagation();
        $(this).parent().remove();
    });

    $(".lego_search-result").on("click", ".lego_search-result_i", function(e){
        e.preventDefault();
        if (activeTargets.length) {
            for (var i = 0; i < activeTargets.length; i++) {
                activeTargets[i].removeClass('editable');
            }
            activeTargets = [];
        }

        var targets = $(this)[0].dataset.target
            , results = (targets == 0) ? 0 : parseTargets(targets)
            ;

        if (!results) {
            var overlay = $('.lego_layer');
            overlay.addClass('editable');
            activeTargets.push(overlay);
        } else {
            for (var j = 0; j < results.length; j++) {
                var elem = $('[data-target="' + results[j] + '"]');
                activeTargets.push(elem);
                elem.addClass('editable');
            }
        }
    });

});

