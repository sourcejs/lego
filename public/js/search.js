var parsedTree = {};
var parsed = false;
var template = '';
var specsMaster = globalOptions.specsMaster.current;

var prepareSpecsData = function () {

    //$.ajax('/bootstrap/bootstrap-tree.json', {
    $.ajax(specsMaster+'/api/specs', {
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

        success: function (data) {     console.log(data);
            parsedTree = data;
            parsed = true;

            $.ajax({
                url: '/views/search-result-list.html',
                success: function(d) {
                    template = Handlebars.compile(d);
                    //$("#lego_search-result").html(template(parsedTree));
                    processSpecsData(parsedTree);
                }
            });
        }
    });

    Handlebars.registerHelper("imageUrl", function(url) {
        url = url.toString();

        return specsMaster + url + "/thumbnail.png";
    });
}

var processSpecsData = function (specsTree) {
    var resultTree = {};
    var closedSection = false;

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
        $("#lego_search-result").html("Байты не готовы!!!");

        setTimeout(function () {
            renderLiveSearchResults(value);
        }, 500);
    }
};

$(function () {
    // Загрузить дерево спецификаций и шаблон поисковой выдачи
    prepareSpecsData();

    $('#search').on("keyup", function(){
        var value = $(this).val();
        renderLiveSearchResults(value);
    });
});