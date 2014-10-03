/*
    This file contains default redirects, to add custom redirects user /user/core/routes/index.js
*/

var path = require('path');
var express = require('express');
var pathToApp = path.dirname(require.main.filename);

// Redirecting calls for master-app
global.app.get('/master-app/*', function (req, res) {
    var processUrl = req.url.replace('/master-app/', '');

    res.redirect(301, global.opts.specsMaster.current + '/' + processUrl);
});

// First, check if there's minified assets
global.app.use('/lego/assets', express.static(pathToApp + '/build/assets'));
global.app.use('/lego/views', express.static(pathToApp + '/build/views'));

// Redirecting core client-side file requests to app root paths
global.app.use('/lego/assets', express.static(pathToApp + '/assets'));
global.app.use('/lego/views', express.static(pathToApp + '/views'));