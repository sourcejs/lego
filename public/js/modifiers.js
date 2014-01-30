var modifiers = (function() {

	var allModifiers = false;
	var activeElement = false;

	function getCSSMod( callback ) {
		var callback = callback || function() {};

		$.ajax({
			url: "http://127.0.0.1:8080/api",
			type: 'POST',
			dataType: 'json',
			success: function(data) {
				allModifiers = $.extend({}, data, true);
				callback();
			}
		})
	}

	function getHTMLpart( activeElement, callback ) {
		// Передаю url спеки, получаю объект спеки
		$.ajax({
			url: "http://127.0.0.1:8080/api",
			data: {

			},
			type: 'POST',
			dataType: 'json',
			success: function(data) {

				// Sections
				for (var sectionName in data.sections) {
					console.log('mod tpl ' + sectionName);
				}

				// Project className
				activeElement.baseClass = data.className;
			}

		})
	}

	function searchInBlock( activeElement ) {

		var allSelectors = activeElement.node.querySelectorAll('[class]');
		for (var currentSelector = 0; currentSelector < allSelectors; currentSelector++) {
			var currentSelectorClassList = allSelectors[ currentSelector ].classList;

			for (var curClassList = 0; curClassList < currentSelectorClassList.length; curClassList++) {

				if ( currentSelectorClassList[curClassList].indexOf(activeElement.baseClass) ) {
					console.log('mod css ' + activeElement.baseClass + ' ' + currentSelectorClassList[curClassList]);
				}
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

			activeElement.node = document.querySelector();
			activeElement.specFileUrl = activeElement.node.getAttribute('');

			getHTMLpart(activeElement, function() {
				searchInBlock( activeElement );
			})

			return this;
		},

		lookForCSSMod: function() {
			if ( !allModifiers ) {
				setTimeout(function() {
					getCSSMod( modifiers.lookForCSSMod() )
				}, 1000)
			}

			return this;
		}
	}

})()