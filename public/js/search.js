/* Globals */
var parsedTree = {}
    , parsed = false
    , template = ''
;
/* /Globals */

$.ajax('http://localhost:8080/api', {
    data: {
        task: 'getCats',
        specID: '',
        section: 2
    },
    method: 'POST',
    success: function (data) {
        parsedTree = data;
        parsed = true;
console.log(parsedTree);
        $.ajax({
            url: '/views/search-result-list.html',
            success: function(d) {
                template = Handlebars.compile(d);
                $("#lego_search-result").html(template(parsedTree));
            }
        });
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