/*global window */

(function (global) {
    "use strict";

    var $ = global.jQuery;
    var Handlebars = global.Handlebars;

    var clientTemplates = global.lego.clientTemplates = {
        get: function () {
            var that = this;

            return new Promise(function (resolve, reject) {
                $.ajax({
                    url: '/lego/views/client-templates.html',
                    dataType: 'html',
                    success: function (rawTemplates) {
                        var $rawTemplates = $(rawTemplates);

                        $rawTemplates.each(function () {
                            var templateId = $(this).attr('id');
                            if (templateId) {
                                that[templateId] = Handlebars.compile($(this).html());
                            }
                        });

                        resolve();
                    },
                    error: function () {
                        reject();
                    }
                });
            });
        }
    };
}(window));