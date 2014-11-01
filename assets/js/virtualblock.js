/*global window */

(function (global) {
    "use strict";
    /**
     * конструктор виртуального блока
     *
     * @param specId String
     * @returns {VirtualBlock}
     * @constructor
     */
    var VirtualBlock = global.lego.VirtualBlock = function (specId) {
        this.id = 'block-' + Math.round(Math.random() * 10000);
        this.element = {};
        this.element.specId = specId;
        this.modifiers = {};
        this.variation = 0;

        global.lego.elementList[this.id] = this;

        return this;
    };

    /**
     * Сохранить данные о виртуальном блоке
     *
     * @param p Object
     * @param p.variation Number
     * @param p.modifiers Object { block: [mod, mod, mod] }
     */
    VirtualBlock.prototype.save = function (p) {
        if (p.variation) {
            this.variation = p.variation;
        }

        if (p.modifiers) {
            this.modifiers = JSON.parse(JSON.stringify(p.modifiers));
        }
    };
}(window));