var jsdom = require('jsdom');
var fs = require('fs-extra');
var path = require('path');
var jquery = fs.readFileSync("./lib/jquery.js", "utf-8");

var generateJSON = function(window){
    var $ = window.$;
    var output = {};

    $('.bs-docs-section').each(function(){
        var $t = $(this);
        var $header = $t.find('.page-header');
        var id = $header.attr('id');
        var title = $header.text();

        var contents = [];
        var exampleID = 1;

        $t.find('.bs-example').each(function(){
            var html = [];
            html.push($(this).children()[0].outerHTML);

            var header = $(this).prevAll('h4').html();

            if (!header) header = $(this).prevAll('h3').html();
            if (!header) header = $(this).prevAll('h2').html();
            if (!header) header = $(this).prevAll('h1').html();

            contents.push({
                header: header,
                id: exampleID,
                html: html
            });

            exampleID++;
        });

        output[id] = {
            id: id,
            url: 'http://getbootstrap.com/components#' + id,
            title: title,
            contents: contents
        };
    });

    return output;
};

jsdom.env({
    file: 'raw/bootstrap.html',
//    url: "http://getbootstrap.com/components",
    src: [jquery],
    done: function (errors, window) {
        var dataPath = '../user-bootstrap/data/bootstrap';
        var fileName = 'bootstrap.json';
        var fullPath = path.join(dataPath, fileName);

        var data = generateJSON(window);

        // Preparing path for data write
        fs.mkdirp(dataPath, function (err) {
            if (err) return console.error(err);

            fs.writeFile(fullPath, JSON.stringify(data, null, 4), function(err) {
                if (err) return console.error(err);

                console.log('JSON saved to: ' + fullPath);
            });
        });
    }
});