/*global window */

(function (global) {
    "use strict";
    var $ = global.jQuery;
    var component = global.lego.component = {};

    component.expand = (function () {

        var expandContainerClassName = 'lego_expand';
        var expandTitleClassName = 'lego_expand_h';
        var expandBodyClassName = 'lego_expand_cnt';
        var expandIsClosed = '__closed';


        $('body').on('click', '.' + expandTitleClassName, function () {
            $(this).closest('.' + expandContainerClassName).toggleClass(expandIsClosed);
        });

        return {

            create: function ($parentContainer, title, isClosed) {
                var template = '<div class="' + expandContainerClassName + '"> \
				<div class="' + expandTitleClassName + '">' + title + '</div> \
				<div class="' + expandBodyClassName + '"></div> \
			</div>';
                var $template = $(template);

                if (isClosed) {
                    $template.addClass(expandIsClosed);
                }

                $parentContainer.append($template);

                return $template;
            },

            append: function ($expandContainer, html) {
                var $addedElem = $(html);
                $expandContainer.find('.' + expandBodyClassName).append($addedElem);
                return $addedElem;
            },

            remove: function ($expandContainer) {
                $expandContainer.remove();
            }
        };
    }());
}(window));