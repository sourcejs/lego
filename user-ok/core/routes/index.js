var staticDirs = ['/res/*','/data/res/*'];
staticDirs.map(function(item) {
    global.app.get(item, function(req, res) {
       res.redirect(301, opts.specsMaster.current + req.url);
    });
});