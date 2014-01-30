// GLOBALS
var
    possibleTargets = ['other', 'navbar', 'tertiary', 'secondary', 'primary']
//    , possibleTargets = ['other', 'navbar', 'toolbar', 'tertiary', 'secondary', 'narrow', 'wide', 'single']
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

//  NEW:
//  0 или пусто - overlay
//  1 - primary
//  2 - secondary
//  4 - tertiary
//  8 - navbar
//  16 - other


var parseTargets = function(targets) {
    var result = [];
    for (var mask = 16, i = 0; mask > 0; mask >>= 1, i++) {
        if (mask & targets) {
            result.push(possibleTargets[i]);
        }
    }
    return result;
};

var getTextNodesIn = function(el) {
    return $(el).find(":not(iframe)").addBack().contents().filter(function() {
        return this.nodeType == 3;
    });
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
    if (activeElement != undefined) activeElement.attr('data-active', 'false');
    current.attr('data-active', 'true');
    activeElement = current;
//    activeElement.data('editable', 'true');
}

var killElement = function (url, num) {
    addedElements[url][num].remove();
    addedElements[url][num] = null;

    $(".lego_widget_ul-i[data-origin='"+url+"'][data-num='"+num+"']").remove();
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

        var parent = $(this).parent()
            , origin = parent.data("origin")
            , num = parent.data("num")

        switchActive(addedElements[origin][num])
    });

    $("#current-elements").on("click", ".lego_ic_close", function() {

        var parent = $(this).parent()
            , origin  = parent.data("origin")
            , num = parent.data("num")
        ;

        killElement(origin, num);
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

        if (chosenNavigation) {
            var path = chosenNavigation[0]["href"].split('/')
                , name = chosenNavigation.text()
    //            , id = path[path.length-1]
                , url = path[path.length-2] + "/" + path[path.length-1]
                , count
            ;

            if (!addedElements[url]) addedElements[url] = [];
            count = addedElements[url].length;

            $("#current-elements").append("<li class='lego_widget_ul-i' data-origin = '" + url + "' data-num=" + count + "><a class='lego_lk' href = '" + url + "'>" + name + "</a><span class='lego_ic lego_ic_close'></span></li>");

            var currentHTML = $(tempHTML).attr("data-url", url).attr("data-num", count);

            addedElements[url][count] = currentHTML;

            $(this).append(currentHTML);

            switchActive(currentHTML);

            // Parse inserted elem
            modifiers.lookForHTMLMod();


            $(".lego_layer").addClass('__hide-bg');
        }
        //Clearing chosen
        chosenNavigation = false;
        $('.lego_layer *').removeClass('editable');
    });

    $("#lego_search-result").on("click", ".lego_search-result_i", function(e){
        chosenNavigation = $(this);
        e.preventDefault();

        var url = chosenNavigation.attr('href').substring(1);
        var specsMaster = globalOptions.specsMaster.current;
        $.ajax(specsMaster+'/api', {
            data: {
                specID: url
            },
            method: 'POST',
            success: function (data) {

				if (data['sections'] !== undefined ) {
					for (k in data['sections'][0]) {
						tempHTML = data['sections'][0][k];
					}
				} else {
					$('.editable').removeClass('editable');
					console.log('No html data there!');
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

        for (var j = 0; j < results.length; j++) {
            var elem = $('[data-target="' + results[j] + '"]');
            activeTargets.push(elem);
            elem.addClass('editable');
        }

        var overlay = $('[data-target="overlay"]');

        overlay.addClass('editable');
        activeTargets.push(overlay);
    });

    $('.js-layouts-list').on('click', '.lego_search-result_i', function(e){
        e.preventDefault();

        var layerMode = $(this).find('.lego_search-result_n').data('layout');

        $('.lego_layer')
            .removeClass('__default __one-column __two-column __three-column __hide-bg')
            .addClass('__' + layerMode);

    });

    $('.lego_layer')
        .on('click', '[data-target]', function( e ) {

            $('[contenteditable]').attr('contenteditable', 'false');

            var clickedEl = getTextNodesIn( e.target).parent();
            clickedEl.attr('contenteditable', 'true');
        });
});

