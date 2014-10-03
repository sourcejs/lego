var modifiers = (function() {

	var allModifiers = false;
	var activeElement = false;
    var elementList = {};

    // Получает все доступные модификаторы для всех блоков и эдементов
	function getCSSMod(callback) {
		if (allModifiers) return this;

		var callback = callback || function() {};

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
				allModifiers = $.extend({}, data, true);         console.log(allModifiers);
				callback();
			}
		})
	}

    // Получает HTML-шаблон блока
	function getHTMLpart(activeElement, callback) {
		var callback = callback || function() {};

		$.ajax(specsMaster+'/api/specs/html', {
			contentType: "application/json",
			data: {
                id: activeElement.specFileUrl
            },
			dataType: "json",
			type: 'GET',
			success: function(data) {
				callback(data);
			}
		});

	}

    function applyAttributes(activeElement) {       console.log('apply');
        var dataId = activeElement.node.getAttribute('data-id');
        var blockModifiers = elementList[dataId].modifiers;

        for (var currentBlock in blockModifiers) {
            var allMatchBlocks = document.querySelectorAll('.' + currentBlock);
            var allBlocksModifiers =  allModifiers[currentBlock]
            var usedModifiers =  blockModifiers[currentBlock];
            for (var matchBlockNodeId = 0; matchBlockNodeId < allMatchBlocks.length; matchBlockNodeId++) {
                for (var currentModifier = 0; currentModifier < allBlocksModifiers.length; currentModifier++) {
                    allMatchBlocks[matchBlockNodeId].classList.remove(allBlocksModifiers[currentModifier]);
                }
                for (var currentModifier = 0; currentModifier < usedModifiers.length; currentModifier++) {
                    allMatchBlocks[matchBlockNodeId].classList.add(usedModifiers[currentModifier]);
                }
            }
        }
    }

	// Проверяет на наличие включенных и выключенных модификаторов
	// и отражение этого факта в сайдбаре
	function checkUsedAttributes(activeElement) {
		$('input[name="modificators"]').each(function() {

			var modValue = $(this).attr('data-mod');
			var elemValue = $(this).attr('data-elem');
			var affectedNodes = activeElement.node.parentNode.querySelectorAll('[data-active].' + elemValue + '.'+modValue + ', [data-active] .' + elemValue + '.' + modValue);

			$(this).prop('checked', false);

			if ( affectedNodes.length ) {
				$(this).prop('checked', true);
			}
		})
	}

	// Определение проектного класса на основе сопоставления иерархии разметки и присутствия
	// классов в дереве модификаторов (рассматриваются все классы в блоке)
	function detectBlockClassName(allSelectors) {
		var blockDetect = new RegExp(globalOptions.cssMod.rules.blockRule);

		// По всем селекторам, содержащим класс
		for (var currentSelector = 0; currentSelector < allSelectors.length; currentSelector++) {
			var currentSelectorClassList = allSelectors[ currentSelector ].classList;

			// По всем классам в полученных селекторах
			for (var curClassList = 0; curClassList < currentSelectorClassList.length; curClassList++) {
				var currElem = currentSelectorClassList[curClassList];

				if (blockDetect.test(currElem)) {
					return currElem;
				}
			}
		}

		// Если блок не найден, возвратим пустоту
		return '';
	}

	// Поиск доступных для блока+элементов модификаторов и рендер правого сайдбара
	function searchInBlock(activeElement) {

		var $wrap = $('.js-modificators .lego_form-i'),
			usedModifiers = [],
			linksBlockToExpand = {},
			template = '<div class="lego_form-i_w"> \
						<label class="lego_form-i_txt"> \
							<input class="lego_checkbox" type="checkbox" name="modificators"/> \
						</label> \
					</div>';

		$wrap.empty;

		var allSelectors = activeElement.node.parentNode.querySelectorAll('[class]');

		// Если работа со вложенными блоками выключена,
		// попробуем определить проектный класс
		activeElement.baseClass = !globalOptions.modifyInnerBlocks
			? detectBlockClassName(allSelectors)
			: '';
        console.log(allModifiers);
		// По всем селекторам, содержащим класс
		for (var currentSelector = 0; currentSelector < allSelectors.length; currentSelector++) {
			var currentSelectorClassList = allSelectors[ currentSelector ].classList;
			//usedModifiers = [];

			// перебор классов в класслисте
			for (var curClassList = 0; curClassList < currentSelectorClassList.length; curClassList++) {

				// Выбираются только те, которые принадлежат подмножеству проектного класса
				if ( currentSelectorClassList[curClassList].indexOf(activeElement.baseClass) !== -1) {

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

							/*if ( activeElement.node.querySelector('.' + currElem + '.' + allModifiers[currElem][currentModifier]) !== null ) {
								usedModifiers.push( allModifiers[currElem][currentModifier] );
							}*/

							var $template = $(template);
							$template.find('input')
								.attr('data-elem', currElem )
								.attr('data-mod', allModifiers[currentSelectorClassList[curClassList]][currentModifier]);

							$template.find('label').append(currElem + ' ' + allModifiers[currElem][currentModifier]);

							component.expand.append(linksBlockToExpand[currElem], $template);
						}
					}
				}
			}
		}

        applyAttributes(activeElement);
		checkUsedAttributes(activeElement);
        saveBlockSettings(activeElement);
	}

	// Просматриваем структуру на предмет вариаций, и на основе полученного
	// генерируем список вариаций в правом сайдбаре
	function searchVariations(data) {
		var flatSections = [],
			$wrap = $('.js-variations .lego_form-i'),
			template = '<div class="lego_form-i_w"> \
						<label class="lego_form-i_txt"> \
							<input class="lego_checkbox" type="radio" name="variations"/> \
						</label> \
					</div>';

		$wrap.empty;

		// Нам нужно развернуть древовидную структуру «секция[]»-«подсекция[]»—...—«примеры[]» в плоский массив
		(function flatten(target) {

			for (var i=0; i<target.length; i++) {
				flatSections.push(target[i]);

				if (target[i].nested && target[i].nested.length) {
					flatten(target[i].nested);
				}
			}
		})(data.contents);
console.log('var', flatSections);
		// Проходим по плоскому массиву и забиваем пункты меню данными
		for (var sectionIndex = 0; sectionIndex < flatSections.length; sectionIndex++) {

			var $template = $(template);
			$template.find('input')
				.attr('data-elem', data.url)
				.attr('data-mod', flatSections[sectionIndex].html[0]); // Названиями обладают только секции и подсекции, так что берем только первый экземпляр примеров

			// Первый пункт автоматически выбирается
			if (sectionIndex == 0) {
				$template.find('input').prop('checked', true);
			}

			// Сендер секции в сайдбаре
			$template.find('label').append(flatSections[sectionIndex].header);
			$wrap.append($template);

		}
	}

	function saveBlockSettings(activeElement) {
		var variation = $('input[name="variations"]:checked').closest('.lego_form-i_w').index();
console.log('Block added');

        /* ----- */
        var modifiers = {};
        $('input[name="modificators"]:checked').each(function () {
            var blockClassName = $(this).attr('data-elem');
            if (!modifiers[blockClassName]) {
                modifiers[blockClassName] = [];
            }
            modifiers[blockClassName].push($(this).attr('data-mod'));
        });

        var nodeId = activeElement.node.getAttribute('data-id');
        if (!nodeId) {
            nodeId = 'block-' + Math.round(Math.random()*10000);
            activeElement.node.setAttribute('data-id', nodeId);
            elementList[nodeId] = {};
        }

        elementList[nodeId].element = activeElement;
        elementList[nodeId].modifiers = modifiers;
        elementList[nodeId].variation = variation;
	}

	function loadBlockSettings(activeElement) {    console.log('LOAD SETTING');
		var getSectionIndex = activeElement.node.getAttribute('data-section') || 0;

		$('.js-variations .lego_form-i_w').eq(getSectionIndex).find('input').prop('checked', true);
	}

	return {

		init: function (callback) {
			getCSSMod( callback );
			return this;
		},

		lookForHTMLMod: function (node) {
			if ( !allModifiers ) {
				setTimeout(function() {
					getCSSMod( function() {
						modifiers.lookForHTMLMod( node );
					} )
				}, 1000)
				return this;
			}

			if (node === undefined) {
				activeElement = {};

				activeElement.node = document.querySelector('[data-active="true"]');

				if (activeElement.node === null) {
					console.log('There\'s no html here');
					activeElement = false;
					return;
				}

				activeElement.specFileUrl = activeElement.node.getAttribute('data-url');

				getHTMLpart(activeElement, function(data) {

					var innerActiveElement = activeElement;
					modifiers.cleanModificationData();
					activeElement = innerActiveElement;
					data.url = activeElement.specFileUrl;

					searchVariations(data);
					searchInBlock(activeElement);
					saveBlockSettings(activeElement);
				})

			} else {
            	modifiers.updateDOMElem();
				getHTMLpart(activeElement, function(data) {

					var innerActiveElement = activeElement;
					modifiers.cleanModificationData();
					activeElement = innerActiveElement;


					searchVariations(data);         console.log('1');
					searchInBlock(activeElement);    console.log('2');
					loadBlockSettings(activeElement); console.log('3');
				})
			}


			return this;
		},

		lookForCSSMod: function () {
			if ( !allModifiers ) {
				setTimeout(function() {
					getCSSMod( function() {
						modifiers.lookForCSSMod();
					} )
				}, 1000)
				return this;
			}

			console.log(allModifiers);

			return this;
		},

		cleanModificationData: function () {
			$('.js-variations .lego_form-i').empty();
			$('.js-modificators .lego_form-i').empty();

			activeElement = false;

			return this;
		},

		checkUsedAttributes: function () {
			checkUsedAttributes( activeElement );

			return this;
		},

		updateDOMElem: function () {
			activeElement = {};

			activeElement.node = document.querySelector('[data-active="true"]');
			activeElement.specFileUrl = activeElement.node.getAttribute('data-url');

			return this;
		},

		saveCurrentBlockSettings: function () {
			saveBlockSettings( activeElement );

			return this;
		},

        getElements: function () {
            return elementList;
        }
	}

})()


$(function() {
	// Инициализация загрузки модификаторов
	modifiers.init();

	// Обработка кликов по вариациям и модификаторам в сайдбаре
	$('body').on('click', '.lego_checkbox', function() {

		var $activeNode = $('[data-active="true"]');

		if ( $(this).attr('name') == 'variations' ) {

			var activeId = $activeNode.attr('data-id'),
				activeUrl = $activeNode.attr('data-url');

            modifyElement(activeUrl, activeId, $(this).attr('data-mod'));
            modifiers
            	.updateDOMElem()
            	.checkUsedAttributes()
            	.saveCurrentBlockSettings();

		} else {
			var modClass = $(this).attr('data-mod');
			var blockClass = $(this).attr('data-elem');

			if ( $(this).is(':checked') ) {
				$activeNode.parent().find('[data-active].' + blockClass).addClass(modClass);
			} else {
				$activeNode.parent().find('[data-active].' + blockClass).removeClass(modClass);
			}

            modifiers.saveCurrentBlockSettings();
		}
	})
})
