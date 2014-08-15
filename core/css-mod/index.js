var fs = require('fs'),
	css = require('css'),
	request = require('request'),
	q = require('q');

module.exports = function cssMod() {

	var modifierRegExpDetect = /__/,
		modifierClean = /\..*/;

	var cssFiles = [];
	var outputTree = {};

	function prepareCssList() {

		var deferred = q.defer();
		var importCss = '';

		for (var i = 0, complete = 0; i < cssFiles.length; i++) {
			request(cssFiles[i], function (error, response, body) {
				if (!error && response.statusCode == 200) {
					importCss += body;
					complete++;

					if (complete == cssFiles.length) {
						deferred.resolve(css.parse(importCss).stylesheet.rules);
					}
				}
			})
		}

		return deferred.promise;
	}

	function addToList(block, modifier, selector) {

		if ( outputTree[block] === undefined ) {
			outputTree[block] = [];
		}

		if (outputTree[block].indexOf(modifier) === -1) {
			outputTree[block].push(modifier);
		}
	}

	function dropException(selector, cause) {
		//console.log('Ignored: ' + selector + '; caused ' + cause);
	}

	function processCssList(parsedCss) {

		for (var rule = 0; rule < parsedCss.length; rule++) {
			var selectors = parsedCss[rule].selectors;

			if (selectors !== undefined) {
				for (var selector = 0; selector < selectors.length; selectors++) {

					if (modifierRegExpDetect.test( selectors[selector] )) {

						var words = selectors[selector]
							.replace('::before', '')
							.replace('::after', '')
							.replace(':before', '')
							.replace(':after', '')
							.replace(':hover', '')
							.replace(':focus', '')
							.replace(':target', '')
							.replace(':active', '')
							.replace('+', '')
							.replace('~', '')
							.replace('*', '')
							.split(' ');

						for (var word = 0; word < words.length; word++) {
							if ( (modifierRegExpDetect.test( words[word] )) && (words[word].indexOf(':not(') === -1) ) {

								var delimPos = words[word].indexOf('__');
								if (words[word].charAt( delimPos - 1 ) == '.') {
									var block = words[word].substring(0, delimPos-1),
										modifier = words[word].substring(delimPos).replace(modifierClean, '');

									if (block && modifier && (block.indexOf('.', 1) === -1)) {
										addToList(block.substring(1), modifier, words[word]);
									} else {
										dropException(words[word], 'not full, dirty block');
									}

								} else {
									var stringList = words[word].split('.');

									for (var sel = 0; sel < stringList.length; sel++) {
										var block = stringList[sel].substring(0, stringList[sel].indexOf('__') );

										if (block) {
											addToList(block, stringList[sel], stringList[sel]);
										} else {
											dropException(stringList[sel], 'not full');
										}
									}
								}
							} else {
								dropException(words[word], '__, :not');
							}
						}
					}
				}
			}

		}

		return outputTree;
	}

	return {
		getCssMod: function (cssFilesPath) {
			//cssFiles = cssFilesPath;
			return q.fcall(prepareCssList).then(processCssList);
		}
	}
}();