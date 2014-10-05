var possibleTargets = ['other', 'navbar', 'tertiary', 'secondary', 'primary'];
var activeTargets = [];
var acceptsHTML = false;

// State variables
var chosenNavigation;

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


//Clearing chosen
var clearChosen = function() {
    chosenNavigation = false;
    $('.lego_layer *').removeClass('editable');
};

// Вставка нового блока
var insertChosen = function($targetContainer) {

    if (chosenNavigation) {
        var name = chosenNavigation.text();
        var url = chosenNavigation.attr('data-spec-id').slice(1);

        var currentHTML = $('<div data-active="true"></div>').attr('data-container', acceptsHTML);
        var menuItem;

        // Создадим новый виртуальный блок
        var virtualBlock = new VirtualBlock(url);
        var specId = virtualBlock.element.specId;

        // Добавляем новый элемент, сбросим признак активности
        $('[data-active="true"]').removeAttr('data-active');

        $targetContainer.append(currentHTML);

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
        menuItem = "<li class='lego_widget_ul-i' data-id=" + virtualBlock.id + ">" +
                "<a class='lego_lk' href = '" + globalOptions.specsMaster.current + '/' +  url + "'>" + name + "</a>" +
                "<span class='lego_ic lego_ic_close'></span>" +
            "</li>";
        $("#current-elements").append(menuItem);

        // После добавления элемента скрыть сетку
        $(".lego_layer").addClass('__hide-bg');
    }

    // Перещелкнуть активную ссылку на блок в меню
    $("#current-elements .lego_lk").removeClass("__active");
    $("#current-elements .lego_widget_ul-i:last-child .lego_lk").addClass('__active');

    // Сбросить информацию для добавления блока в контейнер
    clearChosen();
};

// Компонент-переключатель
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

// Вставить элемент в подсвеченную область, доступную для работы
$(".lego_layer").on("click", ".editable", function(){
    insertChosen(this);
});

// Клик по результатам поиска — выбор блока для вставки
$("#lego_search-result").on("click", ".lego_search-result_i", function(e){
    e.preventDefault();

    var _this = $(this);
    acceptsHTML = _this.data('accepts');

    chosenNavigation = _this;

    // Инициализация областей, принимающих контент
    if (activeTargets.length) {
        for (var i = 0; i < activeTargets.length; i++) {
            activeTargets[i].removeClass('editable');
        }
        activeTargets = [];
    }

    var targets = $(this)[0].dataset.target;
    var results = parseTargets(targets);

    for (var j = 0; j < results.length; j++) {
        var elem = $('[data-target="' + results[j] + '"]');
        activeTargets.push(elem);
        elem.addClass('editable');
    }

    // Обходим все блоки, способные принимать в себя контент
    $('[data-container="true"]').each(function() {
        activeTargets.push($(this));
        $(this).addClass('editable');
        $(this).find('div, span').each(function() {
            activeTargets.push($(this));
            $(this).addClass('editable');
        })
    })

    // Вставка выбранного блока
    if (activeTargets.length < 3) {
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
});

// Переключение режимов сетки
$('body').on('click', '.js-layouts-list .lego_search-result_i', function(e) {
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

