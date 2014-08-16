/* Module dependencies */
var express = require('express')
    , fs = require('fs')
    , mustache = require('mustache')
    , gzippo = require('gzippo')
    , sh = require('shorthash')
    , colors = require('colors')
    , cssMods = require('./core/css-mod')
	, q = require('q')
	, bodyParser = require('body-parser');

/* Globals */
global.app = express();
global.opts = require('./core/options.json');

global.app.set('public', __dirname + '/' + global.opts.common.pathToSpecs);

global.MODE = process.env.NODE_ENV || 'development';
/* /Globals */

global.app.use(bodyParser.json());
global.app.use(logErrors);
global.app.use(clientErrorHandler);
global.app.use(errorHandler);

/* Preparing enviroment */
global.opts.specsMaster.current = global.MODE === 'production' ? global.opts.specsMaster.prod : global.opts.specsMaster.dev;


/* Route for static files */

//redirecting resource calls to master
var staticDirs = ['/res/*','/data/res/*'];
staticDirs.map(function(item) {
    app.get(item, function(req, res) {
       res.redirect(global.opts.specsMaster.current + req.url, 301);
    });
});

app.set('route', __dirname + '/public');
app
	.use(gzippo.staticGzip(app.get('route')))
	.use(gzippo.compress());

/* Main page */
var arr = ['/','/index','/index.html','/home'];
arr.map(function(item) {
    app.get(item, function(req, res) {
        var indexPage = fs.readFileSync(__dirname+'/public/views/index.html', "utf8");
        var legoLayer = fs.readFileSync(__dirname+'/public/views/lego-layer.html', "utf8");

        var htmlToSend = mustache.to_html(indexPage, {
            legoLayer: legoLayer,
            globalOptions: JSON.stringify(global.opts)
        });

        res.send(htmlToSend);
    });
});


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


/* Get Css modifiers */
app.post('/cssmod', function (req, res) {
	var modifierRule = global.opts.cssModRules.modifierRule;
	var startModifierRule = global.opts.cssModRules.startModifierRule;

	q.when(cssMods.getCssMod(req.body.files, modifierRule, startModifierRule), function(parsedCss) {
		res.send(parsedCss)
	});
})


/* Save working html */
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


/* Share link */
app.get('/s/:page', function (req, res) {
    var data = req.params.page;

    var indexPage = fs.readFileSync(__dirname+'/public/views/index.html', "utf8");
    var savedHTML = fs.readFileSync(__dirname+'/public/saved/'+data+'.html', "utf8");

    var htmlToSend = mustache.to_html(indexPage, {
        legoLayer: savedHTML,
        globalOptions: JSON.stringify(global.opts)
    });

    res.send(htmlToSend);
});

/* Clean html link */
app.get('/clean/:page', function (req, res) {
    var data = req.params.page;

    var indexPage = fs.readFileSync(__dirname+'/public/views/clean.html', "utf8");
    var savedHTML = fs.readFileSync(__dirname+'/public/saved/'+data+'.html', "utf8");

    var htmlToSend = mustache.to_html(indexPage, {
        legoLayer: savedHTML,
        globalOptions: JSON.stringify(global.opts)
    });

    res.send(htmlToSend);
});

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