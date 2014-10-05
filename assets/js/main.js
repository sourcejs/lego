var possibleTargets = ['other', 'navbar', 'tertiary', 'secondary', 'primary'];
var activeTargets = [];
var addedElements = {};
var acceptsHTML = false;

// State variables
var tempHTML;
var chosenNavigation;
var activeElement;

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

    var hostUrl = window.location.host;

    $.ajax({
        url: '/save',
        cache: false,
        data: data,
        success:function( data ) {
            if (data.success) {
                if($('#save-html-lk').length === 0) {
                    $('#save-html').after('<input type="text" id="save-html-lk" class="lego_lt" value="' + hostUrl+ '/s/'+data.name+'">');
                } else {
                    console.log(hostUrl +'/s/'+data.name);

                    $('#save-html-lk').val(hostUrl +'/s/'+data.name);
                }

                $('#save-html-lk').trigger('select');
            }
        }
    });
});

//  0 или пусто - overlay (добавляется автоматически)
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

// html - optional new html code
var modifyElement = function (url, dataId, html) {

    var removeWithChildren = function(url, id) {
        var arr = addedElements[url][id].find('[data-id][data-url]');
        arr.each(function() {
            var chUrl = this.dataset['url'],
                chId = this.dataset['id'];

            addedElements[chUrl][chId].remove();
            addedElements[chUrl][chId] = null;

            $(".lego_widget_ul-i[data-origin='"+chUrl+"'][data-id='"+chId+"']").remove();
        });
        addedElements[url][id].remove();
        addedElements[url][id] = null;
        $(".lego_widget_ul-i[data-origin='"+url+"'][data-id='"+id+"']").remove();
    };

    if (html === undefined) {
        removeWithChildren(url, dataId);
    } else {
        var wrapper = addedElements[url][dataId].wrap("<div></div>").parent();
        var jHTML = $(html).attr("data-url", url).attr("data-active", "true").attr("data-id", dataId);

        addedElements[url][dataId].remove();

        wrapper.append(jHTML).contents().unwrap('<div></div>');

        addedElements[url][dataId] = jHTML;
        activeElement = addedElements[url][dataId];
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
        var path = chosenNavigation[0]["href"].split('/');
        var name = chosenNavigation.text();
        var url = path[path.length-2] + "/" + path[path.length-1];
        //var currentHTML = $(tempHTML).attr("data-url", url).attr('data-container', acceptsHTML);
        var currentHTML = $('<div data-active="true"></div>'); // отрендерим самостоятельно
        var dataId, menuItem;

        var virtualBlock = new VirtualBlock(url);
        var specId = virtualBlock.element.specId;

        if (!addedElements[url]) {
            addedElements[url] = [];
        }

        // Добавляем новый элемент, сбросим признак активности
        $('[data-active="true"]').removeAttr('data-active');

        $(target).append(currentHTML);

        // Работа с виртуальным блоком и рендер
        modifiers.getSpecHTML(specId, function () {

            modifiers
                .generateVariationsList(specId)
                .generateModificatorsList(virtualBlock.id)
                .setupVariationsList(virtualBlock.id)
                .setupModificatorsList(virtualBlock.id)
                .render(virtualBlock.id);
        });


        // Добавить ссылку на элемент в правое меню
        dataId = virtualBlock.id;
        menuItem = "<li class='lego_widget_ul-i' data-id=" + dataId + ">" +
                "<a class='lego_lk' href = '" + globalOptions.specsMaster.current + '/' +  url + "'>" + name + "</a>" +
                "<span class='lego_ic lego_ic_close'></span>" +
            "</li>";
        $("#current-elements").append(menuItem);
        addedElements[url][dataId] = currentHTML;


        $(".lego_layer").addClass('__hide-bg');
    }

    $("#current-elements .lego_lk").removeClass("__active");
    $("#current-elements .lego_widget_ul-i:last-child .lego_lk").addClass('__active');
    clearChosen();

};

$(".lego_toggler").on("click", ".lego_toggle_i", function () {
    var targetNode = $('.lego_search-result.__layout');

    $(this)
        .addClass("__active")
        .siblings()
        .removeClass('__active');

    if ($(this).attr('data-target') === 'list') {
        targetNode.addClass("__list");
    } else {
        targetNode.removeClass("__list");
    }

});

$(".lego_layer").on("click", ".editable", function(){
    insertChosen(this);
});

$("#lego_search-result").on("click", ".lego_search-result_i", function(e){
    e.preventDefault();

    var _this = $(this);
    acceptsHTML = _this.data('accepts');

    chosenNavigation = _this;

    var rawUrl = chosenNavigation.attr('href');
    var url = rawUrl.substring(1);
    var single = $(this).data('single');
    var exists = false;
    var specsMaster = globalOptions.specsMaster.current;

    var dataToSend = {
        id: url
    };

    $.ajax({
        url: specsMaster+'/api/specs/html',
        method: 'GET',
        crossDomain: true,
        data: dataToSend,
        contentType: 'application/json',
        success: function (data) {
            // Take first html element from data obj
            if (data['contents'][0]['html'].length > 0) {
                tempHTML = data['contents'][0]['html'][0];

            // Or take first nested
            } else if (data['contents'][0]['nested'].length > 0) {
                tempHTML = data['contents'][0]['nested'][0]['html'][0];
            } else {
                $('.editable').removeClass('editable');
                console.log('No html data there!');
            }

            if (single) {
                if (addedElements[url] != undefined) {
                    for (k in addedElements[url]) {
                        if (addedElements[url][k] != null) {
                            exists = true;
                            break;
                        }
                    }
                }
            }

            //element always has at least one target

            if (activeTargets.length < 3 && !exists) {
                for(var i=0; i < activeTargets.length; i++){
                    if (activeTargets[i].is(':visible')) {
                        insertChosen(activeTargets[i]);
                    }
                }
            } else if ($('[data-target="overlay"]:visible').length !== 0 || $('[data-target="container"]:visible').length !== 0) {
                for(var i=0; i < activeTargets.length; i++){
                    if (activeTargets[i].selector === '[data-target="overlay"]') {
                        insertChosen(activeTargets[i]);
                    }
                }
            }
        }
    });

    if (!exists) {
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

        $('[data-container="true"]').each(function() {
            activeTargets.push($(this));
            $(this).addClass('editable');
            $(this).find('div, span').each(function() {
                activeTargets.push($(this));
                $(this).addClass('editable');
            })
        })
    }
});

$('.js-layouts-list').on('click', '.lego_search-result_i', function(e){
    e.preventDefault();

    var layerMode = $(this).find('.lego_search-result_n').data('layout');

    $('.lego_layer')
        .removeClass('__default __one-column __two-column __three-column __hide-bg')
        .addClass('__' + layerMode);
});

$('.lego_layer').on('click', '[data-target]', function( e ) {
    $('[contenteditable]').attr('contenteditable', 'false');

    var clickedEl = getTextNodesIn( e.target).parent();
    clickedEl.attr('contenteditable', 'true');
});

