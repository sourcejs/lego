/**
* CSS modifiers analyzer
*/

var fs = require('fs');
var css = require('css');
var request = require('request');

module.exports = function cssMod() {
	var debug = false;
	var modifierDetect = /__/;
	var startModifierDetect = /^__/;
    var lastProcessedObj = {};
    var lastEtags = {};
    var cssFilesCache = {};

    // CSS Files collection
	var cssFiles = [];

    // Output tree with block, element, modifier structure
	var outputTree = {};


    // Download all styles and parse CSS modifiers
	function parseCSS(callback) {
        var _callback = callback || function () {};

        // String with all concatenated CSS files
		var importCss = '';

		for (var i = 0, allReqComplete = 0, chachedCount = 0, reqErrors = 0; i < cssFiles.length; i++) {
            var currentFile = cssFiles[i];
            var requrestOptions = {
                url: cssFiles[i],
                headers: {
                    // Setting etag for cache
                    'If-None-Match' : lastEtags[currentFile]
                }
            };

			request(requrestOptions, function(err, response, body) {
                if (err) {
					console.log('Error loading stylesheet for modifiers parsing:', requrestOptions.url);

					reqErrors++;
                } else {
					var currentFile = response.request.uri.href;

					// Saving etag in memory
					lastEtags[currentFile] = response.headers.etag;

					// If file new
					if (response.statusCode == 200) {
						importCss += body;
						cssFilesCache[currentFile] = body;

					// If file is cached
					} else if (response.statusCode == 304) {
						importCss += cssFilesCache[currentFile];
						chachedCount++;
					}
				}

				allReqComplete++;

                // When loop is done
                if (allReqComplete === cssFiles.length) {

					// Check we have at lest some downloaded files
					if (reqErrors === cssFiles.length) {
						_callback('All CSS files for modifier parsing are unreachable.', null);
					} else if (chachedCount === cssFiles.length) {
						// If all files are cached, return last parsed CSS
                        _callback(null, lastProcessedObj);
                    } else {
						// Or parse it again
                        _callback(null, processCssList(css.parse(importCss).stylesheet.rules))
                    }
                }
			});
		}
	}

	// Добавление селектора в итоговый список
	function addToList(block, modifier) {
		if ( outputTree[block] === undefined ) {
			outputTree[block] = [];
		}

		if (outputTree[block].indexOf(modifier) === -1) {
			outputTree[block].push(modifier);
		}
	}

	// Диагностика селекторов
	function dropException(context, selector, cause) {
		if (debug) {
			console.log('Ignored selector: ' + selector);
			console.log('Context: ' + context);
			console.log('Cause: ' + cause)
			console.log('');
		}
	}

	// Разбор правил
	function processCssList(parsedCss) {

		function parseOldModifier(rule) {
			var separatorPos = stringList[sel].search(modifierDetect);

			return {
				block: rule.substring(0, separatorPos),
				modifier: rule
			}
		}

		for (var rule = 0; rule < parsedCss.length; rule++) {
			var selectors = parsedCss[rule].selectors;

			if (selectors !== undefined) {
				for (var selector = 0; selector < selectors.length; selectors++) {

					if (modifierDetect.test( selectors[selector] )) {

						var words = selectors[selector]

							// зачищаем псевдоэлементы и псевдоклассы
							.replace(/::before/g, '')
							.replace(/::after/g, '')
							.replace(/::disabled/g, '')

							.replace(/:before/g, '')
							.replace(/:after/g, '')
							.replace(/:hover/g, '')
							.replace(/:focus/g, '')
							.replace(/:target/g, '')
							.replace(/:active/g, '')
							.replace(/:disabled/g, '')
							.replace(/:first-child/g, '')
							.replace(/:last-child/g, '')
							.replace(/:empty/g, '')

							.replace(/::-moz-placeholder/g, '')
							.replace(/:-ms-input-placeholder/g, '')
							.replace(/::-webkit-input-placeholder/g, '')

							// из :not(.__class) можно извлечь пользу
							.replace(/:not\(/g, '')
							.replace(/\)/g, '')

							// удаляем атрибуты
							.replace(/\[.*?\]/ig, '')

							// сложные правила конвертируем в каскад
							.replace(/\+/g, ' ')
							.replace(/~/g, ' ')
							.replace(/>/g, ' ')
							.replace(/\*/, ' ')
							.split(' ');

						for (var word = 0; word < words.length; word++) {
							if ( modifierDetect.test(words[word]) ) {

								// Разбиваем селектор, содержащий class и id, и удаляем первый пустой элемент
								var stringList = words[word].split(/\.|#/g);
								stringList.shift();

								var block = 0, // флаг неопределенности блока
									modifier = []; // массив для модификаторов в новом стиле

								for (var sel = 0; sel < stringList.length; sel++) {
									var currentClass = stringList[sel];

									if (!modifierDetect.test(currentClass)) {
										// Это блок (элемент)
										if (block !== false && block !== currentClass) {
											if (block === 0) {
												block = currentClass
											} else {
												block = false;
											}
										}
									} else if (startModifierDetect.test(currentClass)) {
										// Это модификатор в новом стиле
										modifier.push(currentClass);
									} else {
										// Это модификатор в старом стиле
										var result = parseOldModifier(currentClass);

										if (block !== false && block !== result.block) {
											if (block === 0) {
												block = result.block
											} else {
												block = false;
											}
										}

										addToList(result.block, result.modifier);
									}
								}

								// Если строго один блок (элемент) и модификаторы в новом стиле, нет неопределенности
								if (block && modifier.length) {
									for (var i = 0; i < modifier.length; i++) {
										addToList(block, modifier[i]);
									}
								} else if (!block && modifier.length) {
									dropException(selectors[selector], words[word], 'Принадлежность модификатора не определена');
								}
							}
						}
					}
				}
			}
		}

        // Caching parse output
        lastProcessedObj = outputTree;
		return outputTree;
	}

	return {
		getCssMod: function (config, callback) {
            var _callback = callback || function () {};

			// TODO: Add automatic style parsing, based on page-content
			cssFiles = config.files;
			modifierDetect = new RegExp(config.rules.modifierRule) || modifierDetect;
			startModifierDetect = new RegExp(config.rules.startModifierRule) || startModifierDetect;
			debug = config.debug || debug;

            parseCSS(_callback);
		}
	}
}();