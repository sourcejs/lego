var express = require('express');
var fs = require('fs-extra');
var path = require('path');
var mustache = require('mustache');
var gzippo = require('gzippo');
var sh = require('shorthash');
var colors = require('colors');
var commander = require('commander');
var cssMod = require('./core/css-mod');
var bodyParser = require('body-parser');
var getView = require('./core/getView');
var defOpts = require('./options');


/* Globals */

// Parameters
commander
    .option('-u, --user [string]', 'Path to user folder (default: ' + defOpts.common.pathToUser + ')', defOpts.common.pathToUser)
    .option('-p, --port [number]', 'Server port (default: ' + defOpts.common.port + ')', defOpts.common.port)
    .parse(process.argv);

global.commander = commander;

var app = global.app = express();
var opts = global.opts = require('./core/loadOptions')();

var MODE = global.MODE = process.env.NODE_ENV || 'development';

// Preparing environment
if (global.opts.specsMaster.prod && global.opts.specsMaster.dev) {
    opts.specsMaster.current = global.MODE === 'production' ? global.opts.specsMaster.prod : global.opts.specsMaster.dev;
}

// Overriding options from specified arguments
if (commander.port) global.opts.common.port = commander.port;
if (commander.user) global.opts.common.pathToUser = commander.user;
/* /Globals */


/* Express settings */
app.set('user', path.join(__dirname, opts.common.pathToUser));

app.use(bodyParser.json());
app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);
/* /Express settings */



/* Includes */

// Routes
require('./core/routes');

/* /Includes */



/* Route for static files */
app.use(gzippo.staticGzip(app.get('user')));
app.use(gzippo.compress());

// Main page
var arr = ['/','/index','/index.html','/home'];
arr.map(function(item) {
    app.get(item, function(req, res) {
        var legoContainer = mustache.to_html(getView('lego-сontainer.html'), {
            legoLayer: getView('lego-layer.html'),
            legoLayouts: getView('lego-layouts.html'),
            globalOptions: JSON.stringify(opts)
        });

        var htmlToSend = mustache.to_html(getView('index.html'), {
            legoContainer: legoContainer
        });

        res.send(htmlToSend);
    });
});

// Share link
app.get('/s/:page', function (req, res) {
    var page = req.params.page;

    fs.readFile(path.join(app.get('user'), 'saved', page + '.html'), "utf8", function(err, data){
        if(err) {
            console.log(err);
            res.send('No saved data with this id.');
            return;
        }

        var legoContainer = mustache.to_html(getView('lego-сontainer.html'), {
            legoLayer: data,
            legoLayouts: getView('lego-layouts.html'),
            globalOptions: JSON.stringify(opts)
        });

        var htmlToSend = mustache.to_html(getView('index.html'), {
            legoContainer: legoContainer
        });

        res.send(htmlToSend);
    });
});

// Clean html link
app.get('/clean/:page', function (req, res) {
    var page = req.params.page;
    var view = getView('clean.html');

    fs.readFile(path.join(app.get('user'), 'saved', page + '.html'), "utf8", function(err, data){
        if(err) {
            console.log(err);
            res.send('No saved data with this id.');
            return;
        }

        var htmlToSend = mustache.to_html(view, {
            legoLayer: data,
            globalOptions: JSON.stringify(opts)
        });

        res.send(htmlToSend);
    });
});
/* /Route for static files */



/* API */
// Get Css modifiers
app.post('/cssmod', function (req, res) {
	// Переопределим конфигурацию с учетом пришедших с клиента настроек
	var config = JSON.parse(JSON.stringify(opts.cssMod));
	config.files = req.body.files;

    cssMod.getCssMod(config, function(err, parsedCss) {
        if (err) {
            res.satus(500).send('Error getting specified CSS files for modifier analysis, check options.js.')
            return;
        }

		res.send(parsedCss)
	});
});

// Save working html
app.get('/save', function (req, res) {
    var html = req.query.html;

    var outputDir = path.join(app.get('user'), 'saved');

    var name = sh.unique(html);

    fs.mkdirp(outputDir, function (err) {
        if (err) return console.error(err);

        fs.writeFile(path.join(outputDir, name + ".html"), html, function(err) {
            if(err){
                console.log(err);
                res.send({
                    success: false
                });
                return;
            }

            res.send({
                success: true,
                name: name
            });
        });
    });
});
/* /API */



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
/* /Error handling */


// Starting server
if (!module.parent) {
    var port = opts.common.port;
    var portString = port.toString();

    app.listen(port);

    var d = new Date();
    var dateArr = [d.getHours(), d.getMinutes(), d.getSeconds()];
    dateArr = dateArr.map(function (el) { return (el > 9)? el : '0'+ el; });

    var dateString = dateArr.join(':').red;

    console.log('[LEGO] '.blue + dateString +' Server started on http://localhost:'.blue + portString.red + ', from '.blue + global.opts.common.pathToUser.red + ' folder in '.blue + MODE.blue + ' mode...'.blue);
}