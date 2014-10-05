// Переменные глобальные только для отладки
// Впоследствии убрать в scope

var elementList = {}; // Будет хранить список всех виртуальных элементов
var specList = {}; // Будет кешировать данные о спеках по мере их подгрузки

/**
 * конструктор виртуального блока
 *
 * @param specId String
 * @returns {VirtualBlock}
 * @constructor
 */
function VirtualBlock(specId) {

    this.id = 'block-' + Math.round(Math.random()*10000);
    this.element = {};
    this.element.specId = specId;
    this.modifiers = {};
    this.variation = 0;

    elementList[this.id] = this;

    return this;
}

/**
 * Сохранить данные о виртуальном блоке
 *
 * @param p Object
 * @param p.variation Number
 * @param p.modifiers Object { block: [mod, mod, mod] }
 */
VirtualBlock.prototype.save = function (p) {
    if (p.variation) {
        this.variation = p.variation;
    }

    if (p.modifiers) {
        this.modifiers = JSON.parse( JSON.stringify(p.modifiers) );
    }
};



var modifiers = (function () {

    var allModifiers = false; // Хранит объект всех блоков, элементов и модификаторов

    // Получает все доступные модификаторы для всех блоков и эдементов
    function getCSSMod(callback) {
        var callback = callback || function() {};

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
                success: function(data) {
                    allModifiers = $.extend({}, data, true);
                    callback();
                }
            })
        } else {
            callback();
        }
    }

    // Получает HTML-шаблон блока
    function getHTMLpart(specId, callback) {
        var callback = callback || function() {};

        // Если в глобальном объекте спек нет экземпляра с этим id, выкачать и сохранить, иначе отдать готовый
        if (!specList[specId]) {
            $.ajax(specsMaster+'/api/specs/html', {
                contentType: "application/json",
                data: {
                    id: specId
                },
                dataType: "json",
                type: 'GET',
                success: function(data) {

                    var flatSections = [];

                    // Нам нужно развернуть древовидную структуру «секция[]»-«подсекция[]»—...—«примеры[]» в плоский массив
                    // Все html хранятся в глобальном объекте спецификаций, индекс — из параметра
                    (function flatten(target) {

                        for (var i=0; i<target.length; i++) {

                            // Выбросим блоки, в которых нет html-кода
                            if (target[i].html.length) {
                                flatSections.push(target[i]);
                            }

                            if (target[i].nested && target[i].nested.length) {
                                flatten(target[i].nested);
                            }
                        }
                    })(data.contents);

                    specList[specId] = flatSections;
                    callback(specList[specId]);
                }
            });
        } else {
            callback(specList[specId]);
        }
    }


    // Применяет атрибуты виртуального блока к DOM-узлу
    function applyAttributes(virtualBlockId, $node) {
        var blockModifiers = elementList[virtualBlockId].modifiers;

        for (var currentBlock in blockModifiers) {
            var childBlocks = $node.find('.' + currentBlock);

            var allBlocksModifiers = allModifiers[currentBlock];
            var usedModifiers =  blockModifiers[currentBlock];

            // Применяем к детям в неограниченном количестве
            // Эксперимент: сбросим исходные модификаторы
            childBlocks.each(function () {

                for (var currentModifier = 0; currentModifier < allBlocksModifiers.length; currentModifier++) {
                    $(this).removeClass(allBlocksModifiers[currentModifier]);
                }
            });

            // Эксперимент: применять модификатор не ко всем подходящим элементам, а только к одному — первому
            for (var currentModifier = 0; currentModifier < usedModifiers.length; currentModifier++) {
                childBlocks.eq(0).addClass(usedModifiers[currentModifier]);
            }
        }
    }


    // Просматриваем структуру на предмет вариаций, и на основе полученного
    // генерируем список вариаций в правом сайдбаре
    function generateVariationList(specId) {

        var $wrap = $('.js-variations .lego_form-i');
        var template = '<div class="lego_form-i_w"> \
                    <label class="lego_form-i_txt"> \
                        <input class="lego_checkbox" type="radio" name="variations"/> \
                    </label> \
                </div>';

        $wrap.empty();

        if (specId === undefined) {
            return;
        }

        // Проходим по плоскому массиву и забиваем пункты меню данными
        for (var sectionIndex = 0; sectionIndex < specList[specId].length; sectionIndex++) {
            var $template = $(template);

            // Сендер секции в сайдбаре
            $template.find('label').append(specList[specId][sectionIndex].header);
            $template.find('input').attr('data-variation', sectionIndex);
            $wrap.append($template);
        }
    }


    // Определение проектного класса на основе сопоставления иерархии разметки и присутствия
    // классов в дереве модификаторов (рассматриваются все классы в блоке)
    function detectBlockClassName(allSelectors) {
        var blockDetect = new RegExp(globalOptions.cssMod.rules.blockRule);
        var result = '';

        // По всем селекторам, содержащим класс
        for (var currentSelector = 0; currentSelector < allSelectors.length; currentSelector++) {
            var currentSelectorClassList = allSelectors[ currentSelector ].classList;

            if (result) {
                break;
            }

            // По всем классам в полученных селекторах
            for (var curClassList = 0; curClassList < currentSelectorClassList.length; curClassList++) {
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

        var template = '<div class="lego_form-i_w"> \
                            <label class="lego_form-i_txt"> \
                                <input class="lego_checkbox" type="checkbox" name="modificators"/> \
                            </label> \
                        </div>';

        $wrap.empty();

        if (virtualBlockId === undefined) {
            return;
        }

        var virtualBlockSpecId = elementList[virtualBlockId].element.specId;
        var virtualBlockVariation = elementList[virtualBlockId].variation;
        var virtualBlockHTML = specList[virtualBlockSpecId][virtualBlockVariation].html[0]; // только первый source_example

        // Создадим временный узел для работы с классами через DOM
        $('body').append( '<div class="temp-node" style="position: absolute; left: -9999px;">' + virtualBlockHTML + '</div>' );

        // Дальше будет удобно работать с массивом классов, переходим на DOM ClassList
        var allSelectors = document.querySelectorAll('.temp-node [class]');

        // Если работа со вложенными блоками выключена,
        // попробуем определить проектный класс
        var projectClass = detectBlockClassName(allSelectors);
        var baseClass = !globalOptions.modifyInnerBlocks
            ? projectClass
            : '';

        // По всем селекторам, содержащим класс
        for (var currentSelector = 0; currentSelector < allSelectors.length; currentSelector++) {
            var currentSelectorClassList = allSelectors[ currentSelector ].classList;

            // перебор классов в класслисте
            for (var curClassList = 0; curClassList < currentSelectorClassList.length; curClassList++) {

                // Выбираются только те, которые принадлежат подмножеству проектного класса
                if ( currentSelectorClassList[curClassList].indexOf(baseClass) !== -1) {

                    var currElem = currentSelectorClassList[curClassList];

                    // Если блок обладает модификаторами
                    if ((allModifiers[ currElem ])) {

                        for (var currentModifier = 0; currentModifier < allModifiers[ currElem ].length; currentModifier++) {

                            // если такой блок+модификатор уже использовался, выйти
                            if (usedModifiers.indexOf( currElem + allModifiers[currElem][currentModifier] ) !== -1  ) continue;
                            usedModifiers.push( currElem + allModifiers[currElem][currentModifier] );

                            if (!linksBlockToExpand[ currElem ]) {
                                var isClosed = false;
                                if (Object.keys(linksBlockToExpand).length) {
                                    isClosed = true;
                                }
                                linksBlockToExpand[ currElem ] = component.expand.create($wrap, currElem, isClosed);
                            }

                            var $template = $(template);
                            $template.find('input')
                                .attr('data-elem', currElem )
                                .attr('data-mod', allModifiers[currentSelectorClassList[curClassList]][currentModifier]);

                            $template.find('label').append(allModifiers[currElem][currentModifier]);

                            component.expand.append(linksBlockToExpand[currElem], $template);
                        }
                    }
                }
            }
        }

        // Удаляем временный блок
        $('.temp-node').remove();
    }

    // Проставляет активную вариацию в сайдбаре
    function setupVariationsList(virtualBlockId) {

        if (virtualBlockId === undefined) {
            return;
        }

        $('.js-variations .lego_form-i_w')
            .eq(elementList[virtualBlockId].variation)
            .find('input')
            .prop('checked', true);

    }

    // Проставляет галочки модификаторов для хтмл из вариации
    function setupModificatorsList(virtualBlockId) {
        var modifiersData = {};

        if (virtualBlockId === undefined) {
            return;
        }

        var virtualBlock = elementList[virtualBlockId];
        var virtualBlockSpecId = virtualBlock.element.specId;
        var virtualBlockVariation = virtualBlock.variation;
        var virtualBlockHTML = '<div>' + specList[virtualBlockSpecId][virtualBlockVariation].html[0] + '</div>'; // только первый source_example
        var $virtualBlockHTML = $(virtualBlockHTML);

        $('input[name="modificators"]').each(function() {

            var modValue = $(this).attr('data-mod');
            var elemValue = $(this).attr('data-elem');
            var affectedNodes = $virtualBlockHTML.find('.' + elemValue + '.'+modValue);

            $(this).prop('checked', false);

            if (affectedNodes.length) {
                $(this).prop('checked', true);

                if (!modifiersData[elemValue]) {
                    modifiersData[elemValue] = [];
                }

                modifiersData[elemValue].push(modValue);
            }
        });

        // Сохраним полученные в результате анализа вариации модификаторы в модели
        virtualBlock.save({
            modifiers: modifiersData
        })
    }

    // Отрисовывает блок с учетом диффа
    function render(virtualBlockId) {

        var $activeElement = '';

        // Если блок для отрисовки не указан явно, накатываем изменения на текущий активный блок
        if (!virtualBlockId) {
            $activeElement = $('[data-active]');
            virtualBlockId = $activeElement.attr('data-id');
        } else {
            // Приоритет узла за блоком с заданным id, однако при инициализации такого атрибута может еще не быть
            $activeElement = $('.lego_main [data-id="' + virtualBlockId + '"]');

            if (!$activeElement.length) {
                $activeElement = $('[data-active]');
            }
        }

        // Может оказаться, что рендерить нечего
        if (!$activeElement.length) {
            return;
        }

        // Мы знаем, с каким элементом мы работаем, можно удалить признак активности
        $('[data-active="true"]').removeAttr('data-active');

        var virtualBlockSpecId = elementList[virtualBlockId].element.specId;
        var virtualBlockVariation = elementList[virtualBlockId].variation;
        var virtualBlockOriginHTML = specList[virtualBlockSpecId][virtualBlockVariation].html[0]; // Только первый source_example

        // Создадим временный блок и применим к нему дифф из виртуального блока
        var $tempHTML =  $('<div class="temp-node">' + virtualBlockOriginHTML + '</div>');
        applyAttributes(virtualBlockId, $tempHTML);

        // На самом деле нам интересно только содержимое временного блока
        $tempHTML = $tempHTML.children();

        $tempHTML
            .attr('data-active', true)
            .attr('data-url', virtualBlockSpecId)
            .attr('data-id', virtualBlockId);

        $activeElement.replaceWith($tempHTML);
    }


    return {
        init: function (callback) {
            getCSSMod(callback);
            return this;
        },

        getSpecHTML: function (specId, callback) {
            var callback = callback || function () {};

            // Если модификаторы не загружены, загрузить и работать дальше
            getCSSMod(function () {
                // Получить вариации спецификации
                getHTMLpart(specId, function () {
                    callback();
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

        render: function (virtualBlockId) {
            render(virtualBlockId);

            return this;
        }
    }
})();


$(function() {
    // Инициализация загрузки модификаторов
    modifiers.init();

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
                $candidatListItem.children('.lego_lk').addClass('__active');
            }

            modifiers
                .generateVariationsList(elementList[candidatVirtualBlockId].element.specId)
                .generateModificatorsList(candidatVirtualBlockId)
                .setupVariationsList(candidatVirtualBlockId)
                .setupModificatorsList(candidatVirtualBlockId)
                .render(candidatVirtualBlockId);
        }
    });

});