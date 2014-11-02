/*global window */

(function (global) {
    "use strict";

    var allModifiers = false; // Хранит объект всех блоков, элементов и модификаторов
    var $ = global.jQuery;
    var globalOptions = global.lego.globalOptions;
    var component = global.lego.component;
    var clientTemplates = global.lego.clientTemplates;

    // Получает все доступные модификаторы для всех блоков и эдементов
    function getCSSMod(callback) {
        var cb = callback || function () {};

        if (!allModifiers) {
            $.ajax({
                url: "/cssmod",
                type: 'POST',
                data: JSON.stringify({
                    // Массив в перечислением css-файлов для анализа
                    // Может быть импортирован из глобальных настроек или задан вручную
                    files: globalOptions.cssMod.files
                }),
                dataType: 'json',
                contentType: "application/json", // нужен для обработки параметров POST-запроса в express
                success: function (data) {
                    allModifiers = $.extend({}, data, true);
                    cb();
                }
            });
        } else {
            cb();
        }
    }

    // Получает HTML-шаблон блока
    function getHTMLpart(specId, callback) {
        var cb = callback || function () {};

        // Если в глобальном объекте спек нет экземпляра с этим id, выкачать и сохранить, иначе отдать готовый
        if (!global.lego.specList[specId]) {
            var specsMaster = globalOptions.specsMaster.current;
            var customDataUrl = globalOptions.specsMaster.customDataUrl;

            var processData = function (data) {
                var flatSections = [];
                var tempNode;
                var i;

                // Нам нужно развернуть древовидную структуру «секция[]»-«подсекция[]»—...—«примеры[]» в плоский массив
                // Все html хранятся в глобальном объекте спецификаций, индекс — из параметра
                (function flatten(target) {

                    for (i = 0; i < target.length; i++) {

                        // Выбросим блоки, в которых нет html-кода
                        if (target[i].html.length) {

                            // Для хорошей вставки шаблона нужно, чтобы был только один корневой узел
                            tempNode = '<div>' + target[i].html[0] + '</div>';
                            if ($(tempNode).children().length > 1) {
                                target[i].html = [tempNode];
                            }

                            flatSections.push(target[i]);
                        }

                        if (target[i].nested && target[i].nested.length) {
                            flatten(target[i].nested);
                        }
                    }
                }(data.contents));

                global.lego.specList[specId] = flatSections;
                cb(global.lego.specList[specId]);
            };

            if (customDataUrl) {
                processData(global.lego.parsedTree[specId]);
            } else {
                $.ajax(specsMaster + '/api/specs/html', {
                    data: {
                        id: specId
                    },
                    dataType: "json",
                    type: 'GET',
                    success: processData
                });
            }
        } else {
            cb(global.lego.specList[specId]);
        }
    }


    // Применяет атрибуты виртуального блока к DOM-узлу
    function applyAttributes(virtualBlockId, $node) {
        var blockModifiers = global.lego.elementList[virtualBlockId].modifiers;
        var currentBlock;
        var currentModifier;

        for (currentBlock in blockModifiers) {

            if (blockModifiers.hasOwnProperty(currentBlock)) {
                var childBlocks = $node.find('.' + currentBlock);

                var allBlocksModifiers = allModifiers[currentBlock];
                var usedModifiers =  blockModifiers[currentBlock];

                // Применяем к детям в неограниченном количестве
                // Эксперимент: сбросим исходные модификаторы
                childBlocks.each(function () {

                    // TODO: remove mods removal
                    for (currentModifier = 0; currentModifier < allBlocksModifiers.length; currentModifier++) {
                        $(this).removeClass(allBlocksModifiers[currentModifier]);
                    }
                });

                // Эксперимент: применять модификатор не ко всем подходящим элементам, а только к одному — первому
                for (currentModifier = 0; currentModifier < usedModifiers.length; currentModifier++) {
                    childBlocks.eq(0).addClass(usedModifiers[currentModifier]);
                }
            }
        }
    }


    // Просматриваем структуру на предмет вариаций, и на основе полученного
    // генерируем список вариаций в правом сайдбаре
    function generateVariationList(specId) {

        var $wrap = $('.js-variations .lego_form-i');
        var template;

        $wrap.empty();

        if (specId === undefined) {
            return;
        }

        // Рендер секции в сайдбаре
        template = clientTemplates['variation-item'](global.lego.specList[specId]);
        $wrap.append(template);
    }


    // Определение проектного класса на основе сопоставления иерархии разметки и присутствия
    // классов в дереве модификаторов (рассматриваются все классы в блоке)
    function detectBlockClassName(allSelectors) {
        var blockDetect = new RegExp(globalOptions.cssMod.rules.blockRule);
        var result = '';
        var currentSelector;
        var curClassList;

        // По всем селекторам, содержащим класс
        for (currentSelector = 0; currentSelector < allSelectors.length; currentSelector++) {
            var currentSelectorClassList = allSelectors[currentSelector].classList;

            if (result) {
                break;
            }

            // По всем классам в полученных селекторах
            for (curClassList = 0; curClassList < currentSelectorClassList.length; curClassList++) {
                var currElem = currentSelectorClassList[curClassList];

                if (blockDetect.test(currElem)) {
                    result = currElem;
                    break;
                }
            }
        }

        return result;
    }

    // Поиск доступных для блока+элементов модификаторов и рендер в правом сайдбаре
    function generateModificatorsList(virtualBlockId) {

        var $wrap = $('.js-modificators .lego_form-i');
        var usedModifiers = [];
        var linksBlockToExpand = {};
        var template;

        $wrap.empty();

        if (virtualBlockId === undefined) {
            return;
        }

        var virtualBlockSpecId = global.lego.elementList[virtualBlockId].specId;
        var virtualBlockVariation = global.lego.elementList[virtualBlockId].variation;
        var virtualBlockHTML = global.lego.specList[virtualBlockSpecId][virtualBlockVariation].html[0]; // только первый source_example

        // Создадим временный узел для работы с классами через DOM
        $('body').append('<div class="temp-node" style="position: absolute; left: -9999px;">' + virtualBlockHTML + '</div>');

        // Дальше будет удобно работать с массивом классов, переходим на DOM ClassList
        var allSelectors = global.document.querySelectorAll('.temp-node [class]');

        // Если работа со вложенными блоками выключена,
        // попробуем определить проектный класс
        var projectClass = detectBlockClassName(allSelectors);
        var baseClass = !globalOptions.modifyInnerBlocks
            ? projectClass
            : '';

        var currentSelector;

        // По всем селекторам, содержащим класс
        for (currentSelector = 0; currentSelector < allSelectors.length; currentSelector++) {
            var currentSelectorClassList = allSelectors[currentSelector].classList;
            var curClassList;

            // перебор классов в класслисте
            for (curClassList = 0; curClassList < currentSelectorClassList.length; curClassList++) {

                // Выбираются только те, которые принадлежат подмножеству проектного класса
                if (currentSelectorClassList[curClassList].indexOf(baseClass) !== -1) {

                    var currElem = currentSelectorClassList[curClassList];

                    // Если блок обладает модификаторами
                    if ((allModifiers[currElem])) {
                        var currentModifier;

                        for (currentModifier = 0; currentModifier < allModifiers[currElem].length; currentModifier++) {

                            // если такой блок+модификатор уже использовался, выйти
                            if (usedModifiers.indexOf(currElem + allModifiers[currElem][currentModifier]) !== -1) {
                                continue;
                            }
                            usedModifiers.push(currElem + allModifiers[currElem][currentModifier]);

                            if (!linksBlockToExpand[currElem]) {
                                var isClosed = false;
                                if (Object.keys(linksBlockToExpand).length) {
                                    isClosed = true;
                                }
                                linksBlockToExpand[currElem] = component.expand.create($wrap, currElem, isClosed);
                            }

                            template = clientTemplates['modifier-item']({
                                element: currElem,
                                modifier: allModifiers[currentSelectorClassList[curClassList]][currentModifier],
                                modifierName: allModifiers[currElem][currentModifier]
                            });
                            component.expand.append(linksBlockToExpand[currElem], template);
                        }
                    }
                }
            }
        }

        // Удаляем временный блок
        $('.temp-node').remove();
    }

    // Перещелкнуть пункт в меню
    function setupBlockList(virtualBlockId) {
        // Перещелкнуть активную ссылку на блок в меню
        var $currentElements = $('#current-elements');

        $currentElements.find('.lego_lk').removeClass('__active');

        if (virtualBlockId) {
            $currentElements.find('.lego_widget_ul-i[data-id="' + virtualBlockId + '"] .lego_lk').addClass('__active');
        }
    }

    // Проставляет активную вариацию в сайдбаре
    function setupVariationsList(virtualBlockId) {

        if (virtualBlockId === undefined) {
            return;
        }

        $('.js-variations .lego_form-i_w')
            .eq(global.lego.elementList[virtualBlockId].variation)
            .find('input')
            .prop('checked', true);

    }

    // Проставляет галочки модификаторов для хтмл из вариации
    function setupModificatorsList(virtualBlockId) {
        var modifiersData = {};

        if (virtualBlockId === undefined) {
            return;
        }

        var virtualBlock = global.lego.elementList[virtualBlockId];
        var virtualBlockSpecId = virtualBlock.specId;
        var virtualBlockVariation = virtualBlock.variation;
        var virtualBlockHTML = '<div>' + global.lego.specList[virtualBlockSpecId][virtualBlockVariation].html[0] + '</div>'; // только первый source_example
        var $virtualBlockHTML = $(virtualBlockHTML);
        var block;

        $('input[name="modificators"]').each(function () {

            var modValue = $(this).attr('data-mod');
            var elemValue = $(this).attr('data-elem');
            var $affectedNodes = $virtualBlockHTML.find('.' + elemValue + '.' + modValue);

            $(this).prop('checked', false);

            if ($affectedNodes.length) {
                $(this).prop('checked', true);

                if (!modifiersData[elemValue]) {
                    modifiersData[elemValue] = [];
                }

                modifiersData[elemValue].push(modValue);
            }
        });

        // Восстановим данные из виртуального блока, если они там существуют
        if (Object.keys(virtualBlock.modifiers).length) {
            for (block in virtualBlock.modifiers) {
                if (virtualBlock.modifiers.hasOwnProperty(block)) {
                    var modifier;
                    $('input[name="modificators"][data-elem="' + block + '"]').prop('checked', false);

                    for (modifier = 0; modifier < virtualBlock.modifiers[block].length; modifier++) {
                        $('input[name="modificators"][data-elem="' + block + '"][data-mod="' + virtualBlock.modifiers[block][modifier] + '"]').prop('checked', true);
                    }
                }
            }

            modifiersData = virtualBlock.modifiers;
        }

        // Сохраним полученные в результате анализа вариации модификаторы в модели
        virtualBlock.save({
            modifiers: modifiersData
        });
    }

    // Получить активную ноду
    function getActiveNode() {
        return $('.lego_main [data-active="true"]').eq(0);
    }

    // Сбросить фокус с активной ноды
    function clearActiveNode() {
        getActiveNode().removeAttr('data-active');
    }

    // Поставить фокус на узел
    function setActiveNode(virtualBlockId) {
        clearActiveNode();

        if (!virtualBlockId) {
            return;
        }

        $('.lego_main [data-id="' + virtualBlockId + '"]').attr('data-active', true);

        // Подсветить в списке блоков
        setupBlockList(virtualBlockId);
    }

    // Отрисовывает блок с учетом диффа
    function render(virtualBlockId) {
        var $activeElement = '';

        // Если блок для отрисовки не указан явно, накатываем изменения на текущий активный блок
        if (!virtualBlockId) {
            $activeElement = getActiveNode();
            virtualBlockId = $activeElement.attr('data-id');
        } else {
            // Приоритет узла за блоком с заданным id, однако при инициализации такого атрибута может еще не быть
            $activeElement = $('.lego_main [data-id="' + virtualBlockId + '"]');

            if (!$activeElement.length) {
                $activeElement = getActiveNode();
            }
        }

        // Может оказаться, что рендерить нечего
        if (!$activeElement.length) {
            return;
        }

        // Мы знаем, с каким элементом мы работаем, можно удалить признак активности
        clearActiveNode();

        var virtualBlock = global.lego.elementList[virtualBlockId];
        var virtualBlockSpecId = virtualBlock.specId;
        var virtualBlockVariation = virtualBlock.variation;
        var virtualBlockOriginHTML = global.lego.specList[virtualBlockSpecId][virtualBlockVariation].html[0]; // Только первый source_example

        // Создадим временный блок и применим к нему дифф из виртуального блока
        var $tempHTML =  $('<div class="temp-node">' + virtualBlockOriginHTML + '</div>');

        // Накладывать будем только на измененный блок
        if (virtualBlock.changed) {
            applyAttributes(virtualBlockId, $tempHTML);
        }

        // На самом деле нам интересно только содержимое временного блока
        $tempHTML = $tempHTML.children();

        $tempHTML
            .attr('draggable', true)
            .attr('data-active', true)
            .attr('data-url', virtualBlockSpecId)
            .attr('data-id', virtualBlockId);

        $activeElement.replaceWith($tempHTML);

        // Перещелкнуть список блоков
        setupBlockList(virtualBlockId);
    }

    var modifiers = global.lego.modifiers = {
        init: function (callback) {
            getCSSMod(callback);
            return this;
        },

        getSpecHTML: function (specId, callback) {
            var cb = callback || function () {};

            // Если модификаторы не загружены, загрузить и работать дальше
            getCSSMod(function () {
                // Получить вариации спецификации
                getHTMLpart(specId, function () {
                    cb();
                });
            });

            return this;
        },

        generateVariationsList: function (specId) {
            generateVariationList(specId);

            return this;
        },

        generateModificatorsList: function (virtualBlockId) {
            generateModificatorsList(virtualBlockId);

            return this;
        },

        setupVariationsList: function (virtualBlockId) {
            setupVariationsList(virtualBlockId);

            return this;
        },

        setupModificatorsList: function (virtualBlockId) {
            setupModificatorsList(virtualBlockId);

            return this;
        },


        getActiveNode: function () {

            return getActiveNode();
        },

        clearActiveNode: function () {
            // Для публичного метода делаем больше работы:
            // сбрасываем фокус, очищаем правый сайдбар и сбрасываем выделение в списке блоков

            clearActiveNode();
            generateVariationList();
            generateModificatorsList();
            setupBlockList();

            return this;
        },

        setActiveNode: function (virtualBlockId) {
            setActiveNode(virtualBlockId);

            return this;
        },

        render: function (virtualBlockId) {
            render(virtualBlockId);

            return this;
        }
    };
}(window));