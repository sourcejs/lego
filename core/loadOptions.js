'use strict';
var path = require('path');
var pathToApp = path.dirname(require.main.filename);
var deepExtend = require('deep-extend');
var fs = require('fs');

module.exports = function(){

    var requireUncached = function (module) {
        delete require.cache[require.resolve(module)];
        return require(module);
    };
    var coreSettings = requireUncached(path.join(pathToApp,'options'));

    var pathToUser = global.commander.user ? global.commander.user : coreSettings.common.pathToUser;
    var userSettingsFile = path.join(pathToApp, pathToUser, 'options.js');

    // If user settings file is present, override core settings
    if(fs.existsSync(userSettingsFile)) {
        deepExtend(coreSettings, requireUncached(userSettingsFile));
    }

    return coreSettings;
};