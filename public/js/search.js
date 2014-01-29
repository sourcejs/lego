/**
 * Created by denis.przendzinskis on 29/01/14.
 */

// GLOBAL
var parsedTree = {}
    , parsed = false
    , template = Handlebars.compile($("#search-result-list").html());
// /GLOBAL

var filterValidSpecs = function(pagesTree) {

    var cat
        , base = pagesTree["base"]
        , project = pagesTree["project"]
    ;

    for (spec in base) {

        if ((base[spec]["specFile"] != undefined)
            && (base[spec]["specFile"]["category"] != undefined)) {
            cat = base[spec]["specFile"]["category"];
            if (!parsedTree[cat]) parsedTree[cat] = {};
            parsedTree[cat][spec] = base[spec]["specFile"];
            delete parsedTree[cat][spec]["category"];
        }
    }

    for (spec in project) {
        if ((project[spec]["specFile"] != undefined)
            && (project[spec]["specFile"]["category"] != undefined)) {
            cat = project[spec]["specFile"]["category"];
            if (!parsedTree[cat]) parsedTree[cat] = {};
            parsedTree[cat][spec] = project[spec]["specFile"];
            delete parsedTree[cat][spec]["category"];
        }
    }
    parsed = true;
    $("#lego_search-result").html(template(parsedTree));
}

$.ajax({
    url: 'http://okp.me/data/pages_tree.json',
    success: function(data) {
        filterValidSpecs(data);
    }
});

var fuzzySearch = function(q, allData) {
    var result = {}
        , query = q.toLowerCase().trim()
        , qRegExp = new RegExp(query)
        , lowerCat
    ;

    for (cat in allData) {
        lowerCat = cat.toLowerCase();

         // if query matches current category, all category's articles are considered a match
        if (qRegExp.test(lowerCat.match(query))) {
            result[cat] = allData[cat];
            continue;
        }

        // otherwise, continue parsing
        for (spec in allData[cat]) {

            var info = (allData[cat][spec]["info"] != undefined) ? allData[cat][spec]["info"].toLocaleLowerCase() : '';
            var keywords = (allData[cat][spec]["keywords"] != undefined) ? allData[cat][spec]["keywords"].toLocaleLowerCase() : '';
            var title = (allData[cat][spec]["title"] != undefined) ? allData[cat][spec]["title"].toLocaleLowerCase() : '';

            if (qRegExp.test(info.match(query)) ||
                qRegExp.test(keywords.match(query)) ||
                qRegExp.test(title.match(query))) {

                if (!result[cat]) result[cat] = {};
                result[cat][spec] = allData[cat][spec];
            }
        }
    }
    return result;
}

$('#search').on("keyup", function(){

    var value = $(this).val();

    if (parsed) {
        var result = fuzzySearch(value, parsedTree);
        if ($.isEmptyObject(result)) {
            $("#lego_search-result").html("Ничего не найдено");
        } else {
            $("#lego_search-result").html(template(result));
        }
    } else {
        $("#lego_search-result").html("Байты не готовы!!!");
    }
});







