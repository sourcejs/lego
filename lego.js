var express = require('express');
var fs = require('fs');
var path = require('path');
var mustache = require('mustache');
var gzippo = require('gzippo');
var sh = require('shorthash');
var colors = require('colors');
var cssMod = require('./core/css-mod');
var q = require('q');
var bodyParser = require('body-parser');



/* Globals */
var app = global.app = express();
var opts = global.opts = require('./options.json');

var MODE = global.MODE = process.env.NODE_ENV || 'development';

// Preparing environment
opts.specsMaster.current = global.MODE === 'production' ? global.opts.specsMaster.prod : global.opts.specsMaster.dev;
/* /Globals */



/* Express settings */
app.set('public', path.join(__dirname, opts.common.pathToSpecs));

app.use(gzippo.staticGzip(app.get('public')));
app.use(gzippo.compress());
app.use(bodyParser.json());
app.use(logErrors);
app.use(clientErrorHandler);
app.use(errorHandler);
/* /Express settings */



/* Route for static files */
//redirecting resource calls to master
var staticDirs = ['/res/*','/data/res/*'];
staticDirs.map(function(item) {
    app.get(item, function(req, res) {
       res.redirect(301, opts.specsMaster.current + req.url);
    });
});

// Main page
var arr = ['/','/index','/index.html','/home'];
arr.map(function(item) {
    app.get(item, function(req, res) {
        var indexPage = fs.readFileSync(__dirname+'/public/views/index.html', "utf8");
        var legoLayer = fs.readFileSync(__dirname+'/public/views/lego-layer.html', "utf8");

        var htmlToSend = mustache.to_html(indexPage, {
            legoLayer: legoLayer,
            globalOptions: JSON.stringify(opts)
        });

        res.send(htmlToSend);
    });
});
/* /Route for static files */



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


/* API */
// Get Css modifiers
app.post('/cssmod', function (req, res) {
	// Переопределим конфигурацию с учетом пришедших с клиента настроек
	var config = JSON.parse(JSON.stringify(opts.cssMod));
	config.files = req.body.files;

	q.when(cssMod.getCssMod(config), function(parsedCss) {
		res.send(parsedCss)
	});
});

// Save working html
app.get('/save', function (req, res) {
    var data = req.query.html;

    var outputDir = './public/saved';

    var name = sh.unique(data);

    var go = function() {
        fs.writeFile(outputDir+"/"+name+".html", data, function(err) {
            if(err){
                console.log(err);
                res.send({
                    success: false
                });
            }

            res.send({
                success: true,
                name: name
            });
        });
    };

    fs.readdir(outputDir,function(e){
        if(!e || (e && e.code === 'EEXIST')){
            go();
        } else if (e.code === 'ENOENT') {
            fs.mkdir(outputDir);
            go();
        } else {
            console.log(e);
        }
    });
});

// Share link
app.get('/s/:page', function (req, res) {
    var data = req.params.page;

    var indexPage = fs.readFileSync(__dirname+'/public/views/index.html', "utf8");
    var savedHTML = fs.readFileSync(__dirname+'/public/saved/'+data+'.html', "utf8");

    var htmlToSend = mustache.to_html(indexPage, {
        legoLayer: savedHTML,
        globalOptions: JSON.stringify(opts)
    });

    res.send(htmlToSend);
});

// Clean html link
app.get('/clean/:page', function (req, res) {
    var data = req.params.page;

    var indexPage = fs.readFileSync(__dirname+'/public/views/clean.html', "utf8");
    var savedHTML = fs.readFileSync(__dirname+'/public/saved/'+data+'.html', "utf8");

    var htmlToSend = mustache.to_html(indexPage, {
        legoLayer: savedHTML,
        globalOptions: JSON.stringify(opts)
    });

    res.send(htmlToSend);
});
/* /API */



// Starting server
if (!module.parent) {
    var port = opts.common.port;

    app.listen(port);

    var portString = opts.common.port.toString();

    var d = new Date();
    var dateArr = [d.getHours(), d.getMinutes(), d.getSeconds()];
    dateArr = dateArr.map(function (el) { return (el > 9)? el : '0'+ el; });

    var dateString = dateArr.join(':').red;

    console.log('[LEGO] '.blue + dateString +' Server started on http://localhost:'.blue + portString.red + ' in '.blue + MODE.blue + ' mode...'.blue);
}