// GLOBALS
var
    possibleTargets = ['other', 'navbar', 'tertiary', 'secondary', 'primary']
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
    result.push('overlay');
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
}

// html - optional new html code
var modifyElement = function (url, num, html) {

    if (html === undefined) {
        addedElements[url][num].remove();
        addedElements[url][num] = null;
        $(".lego_widget_ul-i[data-origin='"+url+"'][data-num='"+num+"']").remove();
    } else {
        var wrapper = addedElements[url][num].wrap("<div></div>").parent()
            , jHTML = $(html).attr("data-url", url).attr("data-num", num).attr("data-active", "true")
        ;

        addedElements[url][num].remove();

        wrapper.append(jHTML).contents().unwrap('<div></div>');

        addedElements[url][num] = jHTML;
    }
};

var clearChosen = function(){
    //Clearing chosen
    chosenNavigation = false;
    tempHTML = false;
    $('.lego_layer *').removeClass('editable');
};

var insertChosen = function(targetContainer){
    var target = targetContainer;

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

        switchActive(currentHTML);
        $(target).append(currentHTML);

        // Parse inserted elem
        modifiers.lookForHTMLMod();

        $(".lego_layer").addClass('__hide-bg');
    }

    clearChosen();
};

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
    ;

    switchActive(addedElements[origin][num]);
});

$("#current-elements").on("click", ".lego_ic_close", function() {

    var parent = $(this).parent()
        , origin  = parent.data("origin")
        , num = parent.data("num")
    ;

    modifyElement(origin, num);
});

$(".lego_layer").on("click", ".editable", function(){
    insertChosen(this);
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

            //element always have minimum of one target
            if (activeTargets.length < 3) {
                for(var i=0; i < activeTargets.length; i++){
                    if (activeTargets[i].is(':visible')) {
                        insertChosen(activeTargets[i]);
                    }
                }
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
        , results = parseTargets(targets)
    ;

    for (var j = 0; j < results.length; j++) {
        var elem = $('[data-target="' + results[j] + '"]');
        activeTargets.push(elem);
        elem.addClass('editable');
    }
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

