/*global window */

(function (global) {
    "use strict";

    var $ = global.jQuery;
    var Handlebars = global.Handlebars;
    var globalOptions = global.lego.globalOptions;
    var component = global.lego.component;
    var clientTemplates = global.lego.clientTemplates;

    var parsed = false;

    var processSpecsData = function (specsTree, callback) {
        var resultTree = {
            root: []
        };
        var closedSection = false;
        var cb = callback || function () {};
        var specsPath;
        var specsSection;

        // Separating spec cats
        for (specsPath in specsTree) {
            if (specsTree.hasOwnProperty(specsPath)) {
                var specPathParts =  specsPath.split('/');

                if (specPathParts.length === 1) {
                    resultTree.root.push(specsTree[specsPath]);
                } else {
                    if (!resultTree[specPathParts[0]]) {
                        resultTree[specPathParts[0]] = [];
                    }
                    resultTree[specPathParts[0]].push(specsTree[specsPath]);
                }
            }
        }

        if (resultTree.root.length === 0) {
            delete resultTree.root;
        }

        for (specsSection in resultTree) {
            if (resultTree.hasOwnProperty(specsSection)) {
                resultTree[specsSection].sort(function (a, b) {
                    if (a.title > b.title) {
                        return 1;
                    }
                    if (a.title < b.title) {
                        return -1;
                    }
                    return 0;
                });

                var newNode = component.expand.create($('#lego_search-result'), specsSection, closedSection);
                component.expand.append(newNode, clientTemplates['search-item'](resultTree[specsSection]));

                closedSection = true;
            }
        }

        cb();
    };

    var prepareSpecsData = function (callback) {
        var specsMaster = globalOptions.specsMaster.current;
        var customDataUrl = globalOptions.specsMaster.customDataUrl;

        var drawNavigation = function (data) {
            global.lego.parsedTree = data;

            clientTemplates.get().then(function () {
                parsed = true;
                processSpecsData(global.lego.parsedTree, callback);
            });
        };

        if (customDataUrl) {
            $.ajax(customDataUrl, {
                method: 'GET',
                contentType: 'application/json',

                success: drawNavigation
            });
        } else {
            $.ajax(specsMaster + '/api/specs', {
                method: 'GET',
                crossDomain: true,
                data: {
                    filter: {
                        cats: ['base'],
                        forceTags: ['lego']
                    },
                    filterOut: {
                        tags: ['html', 'lego-hide', 'hidden', 'deprecated']
                    }
                },
                contentType: 'application/json',

                success: drawNavigation
            });
        }

        Handlebars.registerHelper("imageUrl", function (url) {
            url = url.toString();

            return specsMaster + url + "/thumbnail.png";
        });

        Handlebars.registerHelper("fullUrl", function (url) {
            url = url.toString();

            return specsMaster ? specsMaster + url : url;
        });
    };

    var fuzzySearch = function (q, allData) {
        var result = {};
        var query = q.toLowerCase().trim();
        var qRegExp = new RegExp(query);
        var cat;

        for (cat in allData) {
            if (allData.hasOwnProperty(cat)) {
                var lowerCat = cat.toLowerCase();
                var title = allData[cat].title || '';
                var info = allData[cat].info || '';
                var keywords = allData[cat].keywords || '';

                title = title.toString().toLowerCase(); // Защита от массивов
                info = info.toString().toLowerCase();
                keywords = keywords.toString().toLowerCase();

                // if query matches current category, all category's articles are considered a match

                if (qRegExp.test(lowerCat.match(query)) ||
                        qRegExp.test(info.match(query)) ||
                        qRegExp.test(keywords.match(query)) ||
                        qRegExp.test(title.match(query))) {

                    if (!result[cat]) {
                        result[cat] = {};
                    }
                    result[cat] = allData[cat];
                }
            }
        }
        return result;
    };

    var renderLiveSearchResults = function (value) {
        var $searchResult = $("#lego_search-result");

        $searchResult.empty();

        if (parsed) {
            var result = fuzzySearch(value, global.lego.parsedTree);
            if ($.isEmptyObject(result)) {
                $searchResult.html("No search results");
            } else {
                processSpecsData(result);
            }
        } else {
            $searchResult.html("Loading components...");

            global.setTimeout(function () {
                renderLiveSearchResults(value);
            }, 500);
        }
    };

    $(function () {
        var $searchInput = $('#search');

        // Загрузить дерево спецификаций и шаблон поисковой выдачи
        // После завершения обработки отрендерить значение фильтра
        prepareSpecsData(function () {
            renderLiveSearchResults($searchInput.val());
        });

        $searchInput.on("keyup search", function () {

            // Нет смысла дергать поиск, если нет данных и шаблона
            if (parsed) {
                renderLiveSearchResults($searchInput.val());
            }
        });
    });
}(window));