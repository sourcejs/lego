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

		for (var currentSelector = 0; currentSelector < allSelectors.length; currentSelector++) {
			var currentSelectorClassList = allSelectors[ currentSelector ].classList;
			usedModifiers = [];

			for (var curClassList = 0; curClassList < currentSelectorClassList.length; curClassList++) {

				if ( currentSelectorClassList[curClassList].indexOf(activeElement.baseClass) !== -1) {

					if (usedElements.indexOf(currentSelectorClassList[curClassList]) !== -1  ) continue;

					usedElements.push( currentSelectorClassList[curClassList] )

					if ((allModifiers[currentSelectorClassList[curClassList]])) {

						for (var currentModifier = 0; currentModifier < allModifiers[currentSelectorClassList[curClassList]].length; currentModifier++) {
							var $template = $(template);
							$template.find('input')
								.attr('data-elem', currentSelectorClassList[curClassList])
								.attr('data-mod', allModifiers[currentSelectorClassList[curClassList]][currentModifier]);

							$template.find('label').append(allModifiers[currentSelectorClassList[curClassList]][currentModifier]);
							$wrap.append( $template )

						}
					} else {
						if ( currentSelectorClassList[curClassList].indexOf('__') !== -1 ) {
							usedModifiers.push( currentSelectorClassList[curClassList] );
						}
					}
				}
			}

			for (var currentModifier = 0; currentModifier < usedModifiers.length; currentModifier++) {
				$('[data-mod=' + usedModifiers[currentModifier] + ']').first().prop('checked', true);
			}
		}


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
				//console.log('mod tpl ' + sectionName);

				var $template = $(template);
				$template.find('input')
					.attr('data-elem', data.url)
					.attr('data-mod', data.sections[sectionIndex][sectionName]);

				if (sectionIndex == 0) {
					$template.find('input').prop('checked', true);

					activeElement.node.innerHTML = data.sections[sectionIndex][sectionName];

					//activeElement.node.appendChild( data.sections[sectionIndex][sectionName] );
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

			activeElement.node = document.querySelector('.active-editable');
            if (activeElement.node) {
                activeElement.specFileUrl = activeElement.node.getAttribute('data-url');

                getHTMLpart(activeElement, function(data) {
                    searchVariations(data);

                    // Project className
                    activeElement.baseClass = data.className;

                    searchInBlock( activeElement );
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
			$('.js-modifications .lego_form-i').empty();

			activeElement = false;
		}
	}

})()

$(function() {

	$('body').on('click', '.lego_checkbox', function() {

		var $activeNode = $('.active-editable');

		if ( $(this).attr('name') == 'variations' ) {

			var $parentSelector = $activeNode.parent(),
				$insertedElem = $($(this).attr('data-mod')),
				activeId = $activeNode.attr('data-id'),
				activeUrl = $activeNode.attr('data-url')

			//$('.active-editable').remove();
			killElement(activeUrl, activeId)

			$parentSelector.append( $insertedElem );
			$insertedElem.addClass('active-editable');

		} else {
			var modClass = $(this).attr('data-mod');

			if ( $(this).is(':checked') ) {
				$activeNode.find('[' + modClass + ']').each(function() {
					$(this).prop('checked', false);
				})
			} else {
				$activeNode.find('[' + modClass + ']').each(function() {
					$(this).prop('checked', true);
				})
			}
		}
	})
})
