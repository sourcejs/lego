var modifiers = (function() {

	var allModifiers = false;
	var activeElement = false;

	function getCSSMod( callback ) {
		if (allModifiers) return this;

		var callback = callback || function() {};

        var specsMaster = globalOptions.specsMaster.current;
		$.ajax({
			url: specsMaster+"/api",
			type: 'POST',
			data: {
				task: 'parseModifiers'
			},
			dataType: 'json',
			success: function(data) {
				allModifiers = $.extend({}, data, true);
				callback();
			}
		})
	}

	function getHTMLpart( activeElement, callback ) {
		var callback = callback || function() {};

		var specsMaster = globalOptions.specsMaster.current;
		$.ajax({
			url: specsMaster+"/api",
			data: {
				specID: activeElement.specFileUrl
			},
			type: 'POST',
			dataType: 'json',
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

	function searchVariations( data ) {
		var $wrap = $('.js-variations .lego_form-i'),
			template = '<div class="lego_form-i_w"> \
						<label class="lego_form-i_txt"> \
							<input class="lego_checkbox" type="radio" name="variations"/> \
						</label> \
					</div>';

		$wrap.empty;

		// Sections
		for (var sectionIndex = 0; sectionIndex < data.sections.length; sectionIndex++) {
			for (var sectionName in data.sections[sectionIndex]) {

				var $template = $(template);
				$template.find('input')
					.attr('data-elem', data.url)
					.attr('data-mod', data.sections[sectionIndex][sectionName]);

				if (sectionIndex == 0) {
					$template.find('input').prop('checked', true);
				}

				$template.find('label').append(sectionName);
				$wrap.append($template);
			}


		}


	}

	return {

		init: function( callback ) {
			getCSSMod( callback );

			return this;
		},

		lookForHTMLMod: function() {
			if ( !allModifiers ) {
				setTimeout(function() {
					getCSSMod( function() {
						modifiers.lookForHTMLMod();
					} )
				}, 1000)
				return this;
			}

			activeElement = {};

			activeElement.node = document.querySelector('[data-active="true"]');
			activeElement.specFileUrl = activeElement.node.getAttribute('data-url');

			getHTMLpart(activeElement, function(data) {

				var innerActiveElement = activeElement;
				modifiers.cleanModificationData();
				activeElement = innerActiveElement;

				searchVariations(data);

				// Project className
				activeElement.baseClass = data.className;

				searchInBlock( activeElement );

				// save !!!
			})

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
		},

		checkUsedAttributes: function() {
			checkUsedAttributes( activeElement );
		},

		updateDOMElem: function() {
			activeElement = {};

			activeElement.node = document.querySelector('[data-active="true"]');
			activeElement.specFileUrl = activeElement.node.getAttribute('data-url');
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
            modifiers.updateDOMElem();
            modifiers.checkUsedAttributes();

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
