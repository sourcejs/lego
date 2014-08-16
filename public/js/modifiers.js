var modifiers = (function() {

	var allModifiers = false;
	var activeElement = false;

    // Получает все доступные модификаторы для всех блоков и эдементов
	function getCSSMod( callback ) {
		if (allModifiers) return this;

		var callback = callback || function() {};

		$.ajax({
			url: "/cssmod",
			type: 'POST',
			data: JSON.stringify({
				// Массив в перечислением css-файлов для анализа
				// Может быть импортирован из глобальных настроек или задан вручную
				files: globalOptions.cssModFiles
			}),
			dataType: 'json',
			contentType: "application/json", // нужен для обработки параметров POST-запроса в express
			success: function(data) {
				allModifiers = $.extend({}, data, true);
				callback();
			}
		})
	}

    // Получает HTML-шаблон блока
	function getHTMLpart( activeElement, callback ) {
		var callback = callback || function() {};

		$.ajax(specsMaster+'/api/specs/html', {
			contentType: "application/json",
			data: JSON.stringify({id: activeElement.specFileUrl}),
			dataType: "json",
			method: 'POST',
			success: function(data) {
				callback(data);
			}
		});

	}

	function checkUsedAttributes( activeElement ) {

		$('input[name="modificators"]').each(function() {

			var modValue = $(this).attr('data-mod'),
				elemValue = $(this).attr('data-elem'),
				affectedNodes = activeElement.node.querySelectorAll('.'+elemValue+'.'+modValue);

			$(this).prop('checked', false);

			if ( affectedNodes.length ) {
				$(this).prop('checked', true);

				for (var i = 0; i < affectedNodes.length; i++) {
					var oldData = affectedNodes[i].getAttribute('data-old-mod') || '';

					affectedNodes[i].setAttribute('data-old-mod', oldData += ' ' + modValue);
				}
			}
		})
	}

	function searchInBlock( activeElement ) {

		var $wrap = $('.js-modificators .lego_form-i'),
			usedElements = [],
			usedModifiers = [],
			template = '<div class="lego_form-i_w"> \
						<label class="lego_form-i_txt"> \
							<input class="lego_checkbox" type="checkbox" name="modificators"/> \
						</label> \
					</div>';

		$wrap.empty;

		var allSelectors = activeElement.node.querySelectorAll('[class]');

		// По всем селекторам, содержащим класс
		for (var currentSelector = 0; currentSelector < allSelectors.length; currentSelector++) {
			var currentSelectorClassList = allSelectors[ currentSelector ].classList;
			usedModifiers = [];

			// перебор классов в класслисте
			for (var curClassList = 0; curClassList < currentSelectorClassList.length; curClassList++) {

				// Выбираются только те, которые принадлежат подмножеству проектного класса
				if ( currentSelectorClassList[curClassList].indexOf(activeElement.baseClass) !== -1) {

					var currElem = currentSelectorClassList[curClassList];

					if ((allModifiers[ currElem ])) {

						for (var currentModifier = 0; currentModifier < allModifiers[ currElem ].length; currentModifier++) {

							// если такой элемент уже использовался, выйти
							if (usedElements.indexOf( currElem + allModifiers[currElem][currentModifier] ) !== -1  ) continue;
							usedElements.push( currElem + allModifiers[currElem][currentModifier] )

							/*if ( activeElement.node.querySelector('.' + currElem + '.' + allModifiers[currElem][currentModifier]) !== null ) {
								usedModifiers.push( allModifiers[currElem][currentModifier] );
							}*/

							var $template = $(template);
							$template.find('input')
								.attr('data-elem', currElem )
								.attr('data-mod', allModifiers[currentSelectorClassList[curClassList]][currentModifier]);

							$template.find('label').append(currElem + ' ' + allModifiers[currElem][currentModifier]);
							$wrap.append( $template )

						}
					}
				}
			}
		}

		checkUsedAttributes(activeElement);
	}

	// Просматриваем структуру на предмет вариаций, и на основе полученного
	// генерируем список вариаций в правом сайдбаре
	function searchVariations( data ) {
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
			$template.find('label').append(flatSections[sectionIndex].title);
			$wrap.append($template);

		}
	}

	function saveBlockSettings( activeElement ) {
		var userSection = $('input[name="variations"]:checked').closest('.lego_form-i_w').index();

		activeElement.node.setAttribute('data-section', userSection);
	}

	function loadBlockSettings( activeElement ) {
		var getSectionIndex = activeElement.node.getAttribute('data-section') || 0;

		$('.js-variations .lego_form-i_w').eq(getSectionIndex).find('input').prop('checked', true);
	}

	return {

		init: function( callback ) {
			getCSSMod( callback );
			return this;
		},

		lookForHTMLMod: function( node ) {
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

					// Project className -- что это??
					activeElement.baseClass = data.className;

					searchInBlock( activeElement );

					saveBlockSettings( activeElement );
				})

			} else {
            	modifiers.updateDOMElem();
				getHTMLpart(activeElement, function(data) {

					var innerActiveElement = activeElement;
					modifiers.cleanModificationData();
					activeElement = innerActiveElement;

					searchVariations(data);

					// Project className
					activeElement.baseClass = data.className;

					searchInBlock( activeElement );

					loadBlockSettings( activeElement );
				})
			}


			return this;
		},

		lookForCSSMod: function() {
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

		cleanModificationData: function() {
			$('.js-variations .lego_form-i').empty();
			$('.js-modificators .lego_form-i').empty();

			activeElement = false;

			return this;
		},

		checkUsedAttributes: function() {
			checkUsedAttributes( activeElement );

			return this;
		},

		updateDOMElem: function() {
			activeElement = {};

			activeElement.node = document.querySelector('[data-active="true"]');
			activeElement.specFileUrl = activeElement.node.getAttribute('data-url');

			return this;
		},

		saveCurrentBlockSettings: function() {
			saveBlockSettings( activeElement );

			return this;
		}
	}

})()


$(function() {

	$('body').on('click', '.lego_checkbox', function() {

		var $activeNode = $('[data-active="true"]');

		if ( $(this).attr('name') == 'variations' ) {

			var activeId = $activeNode.attr('data-num'),
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
				if ( $activeNode.find('[data-old-mod*=' + modClass + ']').length ) {
					$activeNode.find('.' + blockClass + '[data-old-mod*=' + modClass + ']').addClass(modClass);
				} else {
					$activeNode.find('.' + blockClass).addClass(modClass)
				}
			} else {
				$activeNode.find('.' + blockClass).removeClass(modClass).attr('data-mod')
			}
		}
	})
})
