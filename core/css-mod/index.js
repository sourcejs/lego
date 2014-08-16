/**
* Модуль анализа css для извлечения модификаторов
*/

var fs = require('fs'),
	css = require('css'),
	request = require('request'),
	q = require('q');

module.exports = function cssMod() {

	var modifierDetect = /__/;
	var startModifierDetect = /^__/;

	var cssFiles = []; // Будет содержать список css-файлов для анализа (передается в параметрах вызова)
	var outputTree = {}; // Будет содержать структуру «блок(элемент) -> модификаторы»

	// Импорт стилей, склейка и построение дерева
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
		if (global.MODE !== 'production') {
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
									//dropException(selectors[selector], words[word], 'Принадлежность модификатора неопределена');
								}
							}
						}
					}
				}
			}

		}

		return outputTree;
	}

	return {
		getCssMod: function (cssFilesPath, modifierRule, startModifierRule) {
			cssFiles = cssFilesPath;
			modifierDetect = new RegExp(modifierRule) || modifierDetect;
			startModifierDetect = new RegExp(startModifierRule) || startModifierDetect;

			return q.fcall(prepareCssList).then(processCssList);
		}
	}
}();