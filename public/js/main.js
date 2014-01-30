$('#export-img').on('click', function(e){
    e.preventDefault();

    console.log('In development...');

});

var possibleTargets = ['other', 'navbar', 'toolbar', 'tertiary', 'secondary', 'narrow', 'wide', 'single']
    , activeTargets = []
    , tempHTML = Handlebars.compile($("#dummy-html").html())
    , currentElement
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
//        console.log(currentElement[0]["href"]);
        // TODO: add data-origin to point to layout element: data-origin = id
        // TODO: Create object and store current elements
//        $("#current-elements").append(currentElement);
    });

    $(".lego_layer").on("click", ".editor_x", function(e){
        e.stopImmediatePropagation();
        $(this).parent().remove();
    });

    $("#lego_search-result").on("click", ".lego_search-result_i", function(e){
        currentElement = $(this);
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

    $('.js-layouts-list').on('click', '.lego_search-result_i', function(e){
        e.preventDefault();

        var layerMode = $(this).find('.lego_search-result_n').data('layout');

        $('.lego_layer')
            .removeClass('__default __one-column __two-column __three-column')
            .addClass('__' + layerMode);

    });

});

