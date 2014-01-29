/* Module dependencies */
var express = require('express')
    , colors = require('colors');

/* Globals */
global.app = express();
global.opts = require('./core/options.json');

global.app.set('public', __dirname + '/' + global.opts.common.pathToSpecs);

global.MODE = process.env.NODE_ENV || 'development';
/* /Globals */

/* Serve static content */
global.app.use(express.compress()); //gzip

global.app.use(express.static(global.app.get('public')));

/* Error handling */
function logErrors(err, req, res, next) {
    console.error(("Error: " + err.stack).red);
    next(err);
}

function clientErrorHandler(err, req, res, next) {
    if (req.xhr) {
        res.send(500, { error: 'Something blew up!' });
    } else {
        next(err);
    }
}

function errorHandler(err, req, res, next) {
    res.status(500);
    res.render('error', { error: err });
}

global.app.use(logErrors);
global.app.use(clientErrorHandler);
global.app.use(errorHandler);
/* /Error handling */


if (!module.parent) {
    var port = global.opts.common.port;

    global.app.listen(port);

    var portString = global.opts.common.port.toString();

    var d = new Date(),
        dateArr = [d.getHours(), d.getMinutes(), d.getSeconds()],
        dateArr = dateArr.map(function (el) { return (el > 9)? el : '0'+ el; }),
        dateString = (MODE == 'development')? ' startup in '.blue + dateArr.join(':').red : '';

    console.log('[LEGO]'.blue + dateString +' and working on '.blue + portString.red + ' port in '.blue + MODE.blue + ' mode...'.blue);
}