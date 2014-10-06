var jsdom = require('jsdom');
var fs = require('fs-extra');
var path = require('path');

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

            html.push($(this).find('*').first().parent().html());

            contents.push({
                id: exampleID,
                html: html
            });

            exampleID++;
        });

        output[id] = {};
        output[id].specFile = {
            id: id,
            title: title,
            contents: contents
        };

//        "base-test": {
//        "button": {
//            "specFile": {
//                "id": "base-test/button",
//                "css": "",
//                "js": "",
//                "contents": [
//                    {
//                        "id": "1",
//                        "class": "",
//                        "title": "",
//                        "html": [
//                            "<button type='button' class='btn btn-default'><span class='glyphicon glyphicon-align-right'></span></button>"
//                        ],
//                        "nested": [
//                            {
//                                "id": "1_1",
//                                "class": "",
//                                "title": "",
//                                "html": [
//                                    "<button type='button' class='btn btn-default btn-lg'><span class='glyphicon glyphicon-star'></span> Star</button>"
//                                ],
//                                "nested": []
//                            }
//                        ]
//                    }
//                ]
//            }
//        },
    });

    return output;
};

jsdom.env({
    file: 'raw/bootstrap.html',
//    url: "http://getbootstrap.com/components",
    scripts: ["http://code.jquery.com/jquery.js"],
    done: function (errors, window) {
        var dataPath = '../user/data';
        var fileName = 'bootstrap.json';
        var fullPath = path.join(dataPath, fileName);

        console.log('go');


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