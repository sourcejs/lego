// GLOBALS
var possibleTargets = ['other', 'navbar', 'toolbar', 'tertiary', 'secondary', 'narrow', 'wide', 'single']
    , activeTargets = []
    , tempHTML
    , chosenNavigation
    , activeElement
    , addedElements = {}
    ;
// /GLOBALS

$('#export-img').on('click', function(e){
    e.preventDefault();

    console.log('In development...');

});

$('#save-html').on('click', function(e){
    e.preventDefault();

    var html = $('#working-space')[0].outerHTML;

    var data = {
        html: html
    };

    $.ajax({
        url: '/save',
        data: data,
        success:function( data ) {
            if (data.success) {
                $('#save-html').after('<li><a class="lego_lk" href="/s/'+data.name+'">HTML saved:'+data.name+'</a></li>')
            }
        }
    });
});

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

var switchActive = function(current) {

    if (activeElement != undefined) activeElement.removeClass('active-editable');
    activeElement = current;
    activeElement.addClass('active-editable');

}

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

    $("#current-elements").on("click", ".lego_lk", function(e) {
        e.preventDefault();

        var parent = $(this).parent();

        origin = parent.data("origin")
            , idArr = origin.split("/")[1]
            , id = idArr.split("[");

        id[1] = id[1].split("]")[0];

        switchActive(addedElements[id[0]][id[1]])
    });

    $("#current-elements").on("click", ".lego_ic_close", function(e) {
        var parent = $(this).parent();
            origin = parent.data("origin")
            , idArr = origin.split("/")[1]
            , id = idArr.split("[");

        id[1] = id[1].split("]")[0];

        parent.remove();

        addedElements[id[0]][id[1]].remove();
        addedElements[id[0]][id[1]] = null;
    });

//    $("#current-elements").on("mouseenter", ".lego_widget_ul-i", function() {
//        console.log("hovered")
//        var origin = $(this).data("origin");
//        var parsedOrigin = origin.split("[");
//        parsedOrigin[1] = parsedOrigin[1].split("]")[0];
//        addedElements[parsedOrigin[0]][parsedOrigin[1]].addClass('__highlighted');
//    });
//
//    $("#current-elements").on("mouseleave", ".lego_widget_ul-i", function() {
//        var origin = $(this).data("origin");
//        var parsedOrigin = origin.split("[");
//        parsedOrigin[1] = parsedOrigin[1].split("]")[0];
//        addedElements[parsedOrigin[0]][parsedOrigin[1]].removeClass('__highlighted');
//    });

    $(".lego_layer").on("click", ".editable", function(){

        var path = chosenNavigation[0]["href"].split('/')
            , name = chosenNavigation.text()
            , id = path[path.length-1]
            , url = path[path.length-2] + "/" + path[path.length-1]
            , count
        ;

        if (!addedElements[id]) addedElements[id] = [];
        count = addedElements[id].length;

        $("#current-elements").append("<li class='lego_widget_ul-i' data-origin = '" + url + "[" + count + "]'><a class='lego_lk' href = '" + url + "'>" + name + "</a><span class='lego_ic lego_ic_close'></span></li>");

        var currentHTML = $(tempHTML).attr("data-url", url);

        addedElements[id][count] = currentHTML;

        switchActive(currentHTML);

        $(this).append(currentHTML);
        $(".lego_layer").addClass('__hide-bg');
    });

    $(".lego_layer").on("click", ".editor_x", function(e){
        e.stopImmediatePropagation();
        $(this).parent().remove();

        if ( !$('.editor').length ) $(".lego_layer").removeClass('__hide-bg');
    });

    $("#lego_search-result").on("click", ".lego_search-result_i", function(e){
        chosenNavigation = $(this);
        e.preventDefault();

        var url = chosenNavigation.attr('href').substring(1);
        $.ajax('http://localhost:8080/api', {
            data: {
                specID: url
            },
            method: 'POST',
            success: function (data) {

                for (k in data['sections'][0]) {
                    tempHTML = data['sections'][0][k];
                }
            }
        });

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

