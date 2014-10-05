/* Globals */
var parsedTree = {},
    parsed = false,
    template = '',
    specsMaster = globalOptions.specsMaster.current;

/* /Globals */

var prepareSpecsData = function (callback) {

    $.ajax(specsMaster+'/api/specs', {
        contentType: "application/json",
        method: 'GET',

        data: {
            filter: {
                cats: ['base'],
                forceTags: ['lego']
            },
            filterOut: {
                tags: ['html', 'lego-hide']
            }
        },

        success: function (data) {

            parsedTree = data;

            $.ajax({
                url: '/views/search-result-list.html',
                success: function(d) {
                    template = Handlebars.compile(d);
                    parsed = true;
                    processSpecsData(parsedTree, callback);
                }
            });
        }
    });

    Handlebars.registerHelper("imageUrl", function(url) {
        url = url.toString();

        return specsMaster + url + "/thumbnail.png";
    });

    Handlebars.registerHelper("fullUrl", function(url) {
        url = url.toString();

        return specsMaster + url;
    });
}

var processSpecsData = function (specsTree, callback) {
    var resultTree = {};
    var closedSection = false;
    var callback = callback || function () {};

    for (var specsPath in specsTree) {
        var specPathParts =  specsPath.split('/');

        if (!resultTree[specPathParts[0]]) {
            resultTree[specPathParts[0]] = [];
        }
        resultTree[specPathParts[0]].push(specsTree[specsPath]);
    }

    for (var specsSection in resultTree) {

        resultTree[specsSection].sort(function (a, b) {
            if (a.title > b.title)
                return 1;
            if (a.title < b.title)
                return -1;
            return 0;
        });
        var newNode = component.expand.create( $('#lego_search-result'), specsSection, closedSection );
        component.expand.append(newNode, template(resultTree[specsSection]));

        closedSection = true;
    }

    callback();
}

var fuzzySearch = function (q, allData) {
    var result = {};
    var query = q.toLowerCase().trim();
    var qRegExp = new RegExp(query);

    for (var cat in allData) {
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
    return result;
};

var renderLiveSearchResults = function (value) {
    $("#lego_search-result").empty();

    if (parsed) {
        var result = fuzzySearch(value, parsedTree);
        if ($.isEmptyObject(result)) {
            $("#lego_search-result").html("Ничего не найдено");
        } else {
            processSpecsData(result);
        }
    } else {
        $("#lego_search-result").html("Загрузка списка спецификаций...");

        setTimeout(function () {
            renderLiveSearchResults(value);
        }, 500);
    }
}

$(function () {
    var $searchInput = $('#search');

    // Загрузить дерево спецификаций и шаблон поисковой выдачи
    // После завершения обработки отрендерить значение фильтра
    prepareSpecsData(function () {
        renderLiveSearchResults($searchInput.val());
    });

    $searchInput.on("keyup", function() {

        // Нет смысла дергать поиск, если нет данных и шаблона
        if (parsed) {
            renderLiveSearchResults($searchInput.val());
        }
    });
})