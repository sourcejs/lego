/* Globals */
var parsedTree = {}
    , parsed = false
    , template = ''
    , specsMaster = globalOptions.specsMaster.current
;
/* /Globals */

//$.ajax('/bootstrap/bootstrap-tree.json', {
$.ajax(specsMaster+'/api/specs', {
    contentType: "application/json",
    method: 'POST',
    success: function (data) {

        parsedTree = data;
        parsed = true;

        $.ajax({
            url: '/views/search-result-list.html',
            success: function(d) {
                template = Handlebars.compile(d);
                $("#lego_search-result").html(template(parsedTree));
            }
        });
    }
});

Handlebars.registerHelper("imageUrl", function(url) {
    url = url.toString();

    return specsMaster + url + "/thumbnail.png";
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

            var info = (allData[cat][spec]["info"] != undefined) ? allData[cat][spec]["info"].toLowerCase() : '';
            var keywords = (allData[cat][spec]["keywords"] != undefined) ? allData[cat][spec]["keywords"].toLowerCase() : '';
            var title = spec.toLowerCase();

            if (qRegExp.test(info.match(query)) ||
                qRegExp.test(keywords.match(query)) ||
                qRegExp.test(title.match(query))) {

                if (!result[cat]) result[cat] = {};
                result[cat][spec] = allData[cat][spec];
            }
        }
    }
    return result;
};

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