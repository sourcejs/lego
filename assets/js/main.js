var possibleTargets = ['other', 'navbar', 'tertiary', 'secondary', 'primary'];
var activeTargets = [];
var acceptsHTML = false;

// State variables
var chosenNavigation;

/* --- Служебные функции --- */

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

        // Добавить ссылку на элемент в правое меню
        menuItem = "<li class='lego_widget_ul-i' data-id=" + virtualBlock.id + ">" +
            "<a class='lego_lk' href = '" + globalOptions.specsMaster.current + '/' +  url + "'>" + name + "</a>" +
            "<span class='lego_ic lego_ic_close'></span>" +
            "</li>";
        $("#current-elements").append(menuItem);

        // Работа с виртуальным блоком и рендер
        modifiers.getSpecHTML(specId, function () {
            modifiers
                .generateVariationsList(specId)
                .generateModificatorsList(virtualBlock.id)
                .setupVariationsList(virtualBlock.id)
                .setupModificatorsList(virtualBlock.id)
                .render(virtualBlock.id);
        });

        // После добавления элемента скрыть сетку
        $(".lego_layer").addClass('__hide-bg');
    }

    // Сбросить информацию для добавления блока в контейнер
    clearChosen();
};

/* --- Инициализация загрузки модификаторов --- */
modifiers.init();

/* --- Обработчики кликов --- */

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

// Компонент тогглер-переключатель
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
    insertChosen($(this));
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

// Подсветить блоки по клику
$('body').on('click', '.lego_main [data-id]', function (e) {
    var virtualBlockId = $(this).attr('data-id') || $(this).closest('.lego_main [data-id]').attr('data-id');

    modifiers
        .generateVariationsList(elementList[virtualBlockId].element.specId)
        .generateModificatorsList(virtualBlockId)
        .setupVariationsList(virtualBlockId)
        .setupModificatorsList(virtualBlockId)
        .render(virtualBlockId);

    return false;
})

// Обработка кликов по вариациям и модификаторам в сайдбаре
$('body').on('click', '.lego_checkbox', function() {

    var $activeNode = $('[data-active="true"]');
    var activeVirtualBlockId = $activeNode.attr('data-id');
    var activeVirtualBlock = elementList[activeVirtualBlockId];

    if ( $(this).attr('name') == 'variations' ) {

        // Получить номер выбранной вариации
        var variationValue = $(this).attr('data-variation');

        // Сохранить номер в модели блока
        activeVirtualBlock.save({
            variation: variationValue
        });

        // Перерендерить список модификаторов в соответствии с новой вариацией
        modifiers
            .generateModificatorsList(activeVirtualBlockId)
            .setupModificatorsList(activeVirtualBlockId);

    } else {
        var variationExport = {};

        // Собрать новый набор модификаторов
        $('.js-modificators .lego_expand').each(function () {
            var blockTitle = $(this).children('.lego_expand_h').text();

            variationExport[blockTitle] = [];

            $(this).find('.lego_checkbox').each(function () {
                if ($(this).is(':checked')) {
                    variationExport[blockTitle].push( $(this).attr('data-mod') );
                }
            })
        });

        // Сохранить новый набор модификаторов
        activeVirtualBlock.save({
            modifiers: variationExport
        });
    }

    // Перерендерить с учетом изменений
    modifiers.render();
})

// Обработка кликов переключения блоков
$('body').on('click', '#current-elements .lego_lk', function (e) {
    e.preventDefault();

    var virtualBlockId = $(this).parent().attr('data-id');

    if (virtualBlockId) {
        $("#current-elements .lego_lk").removeClass("__active");
        $(this).addClass('__active');

        modifiers
            .generateVariationsList(elementList[virtualBlockId].element.specId)
            .generateModificatorsList(virtualBlockId)
            .setupVariationsList(virtualBlockId)
            .setupModificatorsList(virtualBlockId)
            .render(virtualBlockId);
    }
});

// Обработка кликов по иконке удаления блока
$('body').on('click', '.lego_ic_close', function () {

    var activeBlockId = $('[data-active]').attr('data-id');
    var $listItem = $(this).parent('.lego_widget_ul-i');
    var virtualBlockId = $listItem.attr('data-id');
    var $blockNode = $('.lego_main [data-id="' + virtualBlockId + '"]');
    var $candidatListItem = $listItem.prev();
    var candidatVirtualBlockId = false;

    // По умолчанию при удалении переключаемся на предыдущий элемент,
    // Но если его нет, то пытаемся на следующий
    if (!$candidatListItem.length) {
        var $candidatListItem = $listItem.next();
    }

    if (delete elementList[virtualBlockId]) {

        $blockNode.remove(); // удалить блок с холста
        $listItem.remove(); // удалить элемент в списке

        // Переключиться на новый блок и отрендерить его в том случае,
        // если на холсте вообще остаются какие-либо элементы
        // и при этом удаляемый элемент является активным
        if ($candidatListItem.length && activeBlockId === virtualBlockId) {
            candidatVirtualBlockId = $candidatListItem.attr('data-id');

            modifiers
                .generateVariationsList(elementList[candidatVirtualBlockId].element.specId)
                .generateModificatorsList(candidatVirtualBlockId)
                .setupVariationsList(candidatVirtualBlockId)
                .setupModificatorsList(candidatVirtualBlockId)
                .render(candidatVirtualBlockId);
        } else {

            // Если элементов нет, очистить сайдбар
            if (!Object.keys(elementList).length) {
                modifiers
                    .generateVariationsList()
                    .generateModificatorsList();
            }
        }
    }
});