var modifiers = (function() {

	var allModifiers = false;
	var activeElement = false;

	function getCSSMod( callback ) {
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
				specID: activeElement.specFileUrl.substr(1)
			},
			type: 'POST',
			dataType: 'json',
			success: function(data) {
				callback(data);
			}
		});

	}

	function searchInBlock( activeElement ) {
console.log('search');
		var $wrap = $('.js-modificators .lego_form-i'),
			template = '<div class="lego_form-i_w"> \
						<label class="lego_form-i_txt"> \
							<input class="lego_checkbox" type="checkbox" name="modificators"/> \
						</label> \
					</div>';

		$wrap.empty;

		var allSelectors = activeElement.node.querySelectorAll('[class]');
		for (var currentSelector = 0; currentSelector < allSelectors; currentSelector++) {
			var currentSelectorClassList = allSelectors[ currentSelector ].classList;

			for (var curClassList = 0; curClassList < currentSelectorClassList.length; curClassList++) {

				if ( currentSelectorClassList[curClassList].indexOf(activeElement.baseClass) ) {
					//console.log('mod css ' + activeElement.baseClass + ' ' + currentSelectorClassList[curClassList]);

					if ((allModifiers[currentSelectorClassList[curClassList]]) && (allModifiers[currentSelectorClassList[curClassList]].length)) {

						for (var currentModifier = 0; currentModifier < allModifiers[currentSelectorClassList[curClassList]].length; currentModifier++) {
							var $template = $(template);
							$template.find('input')
								.attr('data-elem', currentSelectorClassList[curClassList])
								.attr('data-mod', allModifiers[currentSelectorClassList[curClassList]][currentModifier]);

							$template.find('label').append(allModifiers[currentSelectorClassList[curClassList]][currentModifier]);

						}
					}


				}
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

		lookForHTMLMod: function( selector ) {
			activeElement = {};

			activeElement.node = selector;
			activeElement.specFileUrl = activeElement.node.getAttribute('data-url');

			getHTMLpart(activeElement, function(data) {

				searchVariations(data);

				// Project className
				activeElement.baseClass = data.className;

				//searchInBlock( activeElement );
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
		}
	}

})()

var r = document.createElement('div');
r.setAttribute('data-current', 'true');
r.setAttribute('data-url', '/base/footer');
document.body.appendChild(r);

modifiers.lookForHTMLMod(  document.querySelector('[data-url]') );