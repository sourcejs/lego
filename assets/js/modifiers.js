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
            var specsMaster = globalOptions.specsMaster.current;
            var customDataUrl = globalOptions.specsMaster.customDataUrl;

            var processData = function(data){
                console.log('processData',data);

                var flatSections = [];
                var tempNode;

                // Нам нужно развернуть древовидную структуру «секция[]»-«подсекция[]»—...—«примеры[]» в плоский массив
                // Все html хранятся в глобальном объекте спецификаций, индекс — из параметра
                (function flatten(target) {

                    for (var i=0; i<target.length; i++) {

                        // Выбросим блоки, в которых нет html-кода
                        if (target[i].html.length) {

                            // Для хорошей вставки шаблона нужно, чтобы был только один корневой узел
                            tempNode = '<div>' + target[i].html + '</div>';
                            if ($(tempNode).children().length > 1) {
                                target[i].html = [tempNode];
                            }

                            flatSections.push(target[i]);
                        }

                        if (target[i].nested && target[i].nested.length) {
                            flatten(target[i].nested);
                        }
                    }
                })(data.contents);

                specList[specId] = flatSections;
                callback(specList[specId]);
            };

            if (customDataUrl) {
                console.log('parsedTree',parsedTree);
                console.log('specId',specId);

                processData(parsedTree[specId]);
            } else {
                $.ajax(specsMaster+'/api/specs/html', {
                    contentType: "application/json",
                    data: {
                        id: specId
                    },
                    dataType: "json",
                    type: 'GET',
                    success: processData
                });
            }
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

    // Перещелкнуть пункт в меню
    function setupBlockList (virtualBlockId) {
        // Перещелкнуть активную ссылку на блок в меню
        $('#current-elements .lego_lk').removeClass('__active');

        if (virtualBlockId) {
            $('#current-elements .lego_widget_ul-i[data-id="' + virtualBlockId + '"] .lego_lk').addClass('__active');
        }
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
            var $affectedNodes = $virtualBlockHTML.find('.' + elemValue + '.'+modValue);

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
            for (var block in virtualBlock.modifiers) {
                $('input[name="modificators"][data-elem="' + block + '"]').prop('checked', false);

                for (var modifier = 0; modifier < virtualBlock.modifiers[block].length; modifier++) {
                    $('input[name="modificators"][data-elem="' + block + '"][data-mod="' + virtualBlock.modifiers[block][modifier] + '"]').prop('checked', true);
                }
            }

            modifiersData = virtualBlock.modifiers;
        }

        // Сохраним полученные в результате анализа вариации модификаторы в модели
        virtualBlock.save({
            modifiers: modifiersData
        })
    }

    // Отрисовывает блок с учетом диффа
    function render(virtualBlockId, applyVirtualProperties) {
        var $activeElement = '';
        var applyVirtualProperties = applyVirtualProperties === false
            ? false
            : true;

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

        var virtualBlockSpecId = elementList[virtualBlockId].element.specId;
        var virtualBlockVariation = elementList[virtualBlockId].variation;
        var virtualBlockOriginHTML = specList[virtualBlockSpecId][virtualBlockVariation].html[0]; // Только первый source_example

        // Создадим временный блок и применим к нему дифф из виртуального блока
        var $tempHTML =  $('<div class="temp-node">' + virtualBlockOriginHTML + '</div>');
        if (applyVirtualProperties) {
            applyAttributes(virtualBlockId, $tempHTML);
        }

        // На самом деле нам интересно только содержимое временного блока
        $tempHTML = $tempHTML.children();

        $tempHTML
            .attr('data-active', true)
            .attr('data-url', virtualBlockSpecId)
            .attr('data-id', virtualBlockId);

        $activeElement.replaceWith($tempHTML);

        // Перещелкнуть список блоков
        setupBlockList(virtualBlockId);
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

        render: function (virtualBlockId, applyVirtualProperties) {
            render(virtualBlockId, applyVirtualProperties);

            return this;
        }
    }
})();