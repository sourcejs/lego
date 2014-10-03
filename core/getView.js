'use strict';

var path = require('path');
var pathToApp = path.dirname(require.main.filename);
var fs = require('fs');

module.exports = function(requestedView){
    var output;

    // Working Sync, waiting for async refactoring
    try {
        // Try reading user view
        output = fs.readFileSync(path.join(pathToApp, global.opts.common.pathToUser, 'views', requestedView), 'utf8');
    } catch (e) {
        // If no user view, get regular view
        output = fs.readFileSync(path.join(pathToApp, 'views', requestedView), 'utf8');
    }

    return output;
};