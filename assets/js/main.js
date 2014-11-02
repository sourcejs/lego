/*global window */

(function (global) {
    "use strict";

    var $ = global.jQuery;
    var console = global.console;
    var modifiers = global.lego.modifiers;
    var clientTemplates = global.lego.clientTemplates;

    var $body = $('body');

    var possibleTargets = ['other', 'navbar', 'tertiary', 'secondary', 'primary'];
    var activeTargets = [];
    var acceptsHTML = false;

    // State variables
    var chosenNavigation;
    var $dragged = false;

    /* --- Служебные функции --- */

    //  0 или пусто - overlay (добавляется автоматически)
    //  1 - primary
    //  2 - secondary
    //  4 - tertiary
    //  8 - navbar
    //  16 - other
    var parseTargets = function (targets) {
        var result = [];
        var mask, i;
        for (mask = 16, i = 0; mask > 0; mask >>= 1, i++) {
            if (mask && targets) {
                result.push(possibleTargets[i]);
            }
        }

        // Предполагаем, что если цель явно не задана, элемент может упасть в произвольный контейнер
        if (!result.length) {
            result = possibleTargets.slice(0);
        }

        result.push('overlay');
        return result;
    };

    //Clearing chosen
    var clearChosen = function () {
        chosenNavigation = false;
        $('.lego_layer *').removeClass('editable');
    };

    // Вставка нового блока
    var insertChosen = function ($targetContainer) {

        if (chosenNavigation) {
            var name = chosenNavigation.text();
            var shortUrl = chosenNavigation.attr('data-spec-id');
            var fullUrl = global.lego.parsedTree[shortUrl].url;

            var currentHTML = $('<div data-active="true" draggable="true"></div>').attr('data-container', acceptsHTML);
            var menuItem;

            // Создадим новый виртуальный блок
            var virtualBlock = new global.lego.VirtualBlock(shortUrl);
            var specId = virtualBlock.specId;

            // Добавляем новый элемент, сбросим признак активности
            modifiers.clearActiveNode();

            $targetContainer.append(currentHTML);

            // Добавить ссылку на элемент в правое меню
            menuItem = clientTemplates['element-item']({
                blockId: virtualBlock.id,
                specLink: fullUrl,
                specName: name
            });
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

    $('#export-img').on('click', function (e) {
        e.preventDefault();

        console.log('In development...');
    });

    $('#save-html').on('click', function (e) {
        e.preventDefault();

        var html = $('#working-space')[0].outerHTML;
        var $saveHtmlLk = $('#save-html-lk');

        var data = {
            html: html
        };

        var hostUrl = global.location.host;

        $.ajax({
            url: '/save',
            cache: false,
            data: data,
            success: function (data) {
                if (data.success) {
                    if ($saveHtmlLk.length === 0) {
                        $('#save-html').after('<input type="text" id="save-html-lk" class="lego_lt" value="' + hostUrl + '/clean/' + data.name + '">');
                    } else {
                        $saveHtmlLk.val(hostUrl + '/clean/' + data.name);
                    }

                    $saveHtmlLk.trigger('select');
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
    $body.on("click", ".editable", function (e) {
        e.stopPropagation(); // Не нужно сбрасывать фокус, это происходит при всплытии клика на контейнер
        insertChosen($(this));
    });

    // Клик по результатам поиска — выбор блока для вставки
    $("#lego_search-result").on("click", ".lego_search-result_i", function (e) {
        if (e.metaKey || e.ctrlKey) {
            return;
        }

        e.preventDefault();

        chosenNavigation = $(this);
        acceptsHTML = chosenNavigation.data('accepts');

        var i, j;

        // Инициализация областей, принимающих контент
        if (activeTargets.length) {
            for (i = 0; i < activeTargets.length; i++) {
                activeTargets[i].removeClass('editable');
            }
            activeTargets = [];
        }

        var targets = $(this)[0].dataset.target;
        var results = parseTargets(targets);

        for (j = 0; j < results.length; j++) {
            var elem = $('[data-target="' + results[j] + '"]');
            activeTargets.push(elem);
            elem.addClass('editable');
        }

        // Обходим все блоки, способные принимать в себя контент
        $('[data-container="true"]').each(function () {
            activeTargets.push($(this));
            $(this).addClass('editable');
            $(this).find('div, span').each(function () {
                activeTargets.push($(this));
                $(this).addClass('editable');
            });
        });

        // Вставка выбранного блока
        if (activeTargets.length < 3) {
            for (i = 0; i < activeTargets.length; i++) {
                if (activeTargets[i].is(':visible')) {
                    insertChosen(activeTargets[i]);
                }
            }
        } else if ($('[data-target="overlay"]:visible').length !== 0 || $('[data-target="container"]:visible').length !== 0) {
            for (i = 0; i < activeTargets.length; i++) {
                if (activeTargets[i].selector === '[data-target="overlay"]') {
                    insertChosen(activeTargets[i]);
                }
            }
        }
    });

    // Переключение режимов сетки
    $body.on('click', '.js-layouts-list .lego_search-result_i', function (e) {
        e.preventDefault();

        var layerMode = $(this).find('.lego_search-result_n').data('layout');

        $('.lego_layer')
            .removeClass('__default __one-column __two-column __three-column __hide-bg')
            .addClass('__' + layerMode);
    });

    // Подсветить блоки по клику
    $body.on('click', '.lego_main [data-id]', function (e) {
        if (e.metaKey || e.ctrlKey) {
            return;
        }

        var virtualBlockId = $(this).attr('data-id') || $(this).closest('.lego_main [data-id]').attr('data-id');

        modifiers
            .generateVariationsList(global.lego.elementList[virtualBlockId].specId)
            .generateModificatorsList(virtualBlockId)
            .setupVariationsList(virtualBlockId)
            .setupModificatorsList(virtualBlockId)
            .setActiveNode(virtualBlockId); // Перерендер по клику не нужен

        return false;
    });

    // Обработка кликов по вариациям и модификаторам в сайдбаре
    $body.on('click', '.lego_checkbox', function () {

        var $activeNode = modifiers.getActiveNode();
        var activeVirtualBlockId = $activeNode.attr('data-id');
        var activeVirtualBlock = global.lego.elementList[activeVirtualBlockId];

        if ($(this).attr('name') === 'variations') {

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
                        variationExport[blockTitle].push($(this).attr('data-mod'));
                    }
                });
            });

            // Сохранить новый набор модификаторов
            activeVirtualBlock.save({
                modifiers: variationExport,
                changed: true
            });
        }

        // Перерендерить с учетом изменений
        modifiers.render();
    });

    // Обработка кликов переключения блоков
    $body.on('click', '#current-elements .lego_lk', function (e) {
        if (e.metaKey || e.ctrlKey) {
            return;
        }

        e.preventDefault();

        var virtualBlockId = $(this).parent().attr('data-id');
        var $allLegoLk = $("#current-elements").find(".lego_lk");

        if (virtualBlockId) {
            $allLegoLk.removeClass("__active");
            $(this).addClass('__active');

            modifiers
                .generateVariationsList(global.lego.elementList[virtualBlockId].specId)
                .generateModificatorsList(virtualBlockId)
                .setupVariationsList(virtualBlockId)
                .setupModificatorsList(virtualBlockId)
                .render(virtualBlockId);
        }
    });

    // Обработка кликов по иконке удаления блока
    $body.on('click', '.lego_ic_close', function () {

        var activeBlockId = modifiers.getActiveNode().attr('data-id');
        var $listItem = $(this).parent('.lego_widget_ul-i');
        var virtualBlockId = $listItem.attr('data-id');
        var $blockNode = $('.lego_main [data-id="' + virtualBlockId + '"]');
        var $candidatListItem = $listItem.prev();
        var candidatVirtualBlockId = false;

        // По умолчанию при удалении переключаемся на предыдущий элемент,
        // Но если его нет, то пытаемся на следующий
        if (!$candidatListItem.length) {
            $candidatListItem = $listItem.next();
        }

        if (delete global.lego.elementList[virtualBlockId]) {

            $blockNode.remove(); // удалить блок с холста
            $listItem.remove(); // удалить элемент в списке

            // Переключиться на новый блок и отрендерить его в том случае,
            // если на холсте вообще остаются какие-либо элементы
            // и при этом удаляемый элемент является активным
            if ($candidatListItem.length && activeBlockId === virtualBlockId) {
                candidatVirtualBlockId = $candidatListItem.attr('data-id');

                modifiers
                    .generateVariationsList(global.lego.elementList[candidatVirtualBlockId].specId)
                    .generateModificatorsList(candidatVirtualBlockId)
                    .setupVariationsList(candidatVirtualBlockId)
                    .setupModificatorsList(candidatVirtualBlockId)
                    .render(candidatVirtualBlockId);
            } else {

                // Если элементов нет, очистить сайдбар
                if (!Object.keys(global.lego.elementList).length) {
                    modifiers
                        .generateVariationsList()
                        .generateModificatorsList();
                }
            }
        }
    });

    $body.on('click', '.lego_main', function () {
        // Очищать выделение только при наличии сетки
        if (!$('.lego_layer.__default').length) {
            $('.lego_layer').addClass('__hide-bg');
            modifiers.clearActiveNode();
        }
    });

    /* Drag and drop */
    $body.on('dragstart', function (e) {
        $dragged = $(e.target);

        // Не запускать в режиме по умолчанию
        if ($('.lego_layer.__default').length) {
            return false;
        }

        // Перетаскивание блока на холсте
        if ($dragged.attr('data-id') !== undefined) {
            $('.lego_layer').removeClass('__hide-bg');
            e.target.style.opacity = 0.5;
        } else {
            // Перетаскивание блока из нав.меню
            if ($dragged.attr('data-spec-id') !== undefined) {
                $('.lego_layer').removeClass('__hide-bg');
                chosenNavigation = $dragged;
            } else {
                $dragged = false;
                e.preventDefault();
            }
        }
    });

    $body.on('dragend', function (e) {
        if ($dragged) {
            $('.lego_layer').addClass('__hide-bg');
            e.target.style.opacity = "";
        }
    });

    $body.on('dragover', function (e) {
        // prevent default to allow drop
        e.preventDefault();
    });

    $body.on('dragenter', function (e) {
        e.preventDefault();

        if ($dragged) {
            var $closestDataTarget = $(e.target).closest('[data-target]');

            if ($closestDataTarget.length) {
                $closestDataTarget.addClass('editable');
            }
        }
    });

    $body.on('dragleave', function (e) {
        if ($dragged) {
            var $closestDataTarget = $(e.target).closest('[data-target]');

            if ($closestDataTarget.length) {
                $closestDataTarget.removeClass('editable');
            }
        }
    });

    $body.on('drop', function (e) {
        e.preventDefault();
        if ($dragged) {
            var $closestDataTarget = $(e.target).closest('[data-target]');
            if ($closestDataTarget.length) {
                if ($dragged.attr('data-id') !== undefined) {
                    $closestDataTarget
                        .append($dragged)
                        .removeClass('editable');
                } else if ($dragged.attr('data-spec-id')) {
                    insertChosen($closestDataTarget);
                    $closestDataTarget
                        .removeClass('editable');
                }
            }
        }
    });

}(window));