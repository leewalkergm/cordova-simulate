// Copyright (c) Microsoft Corporation. All rights reserved.

var Q = require('q'),
    fs = require('fs'),
    cordovaServe = require('cordova-serve'),
    path = require('path'),
    config = require('./server/config'),
    log = require('./server/log'),
    simServer = require('./server/server'),
    simSocket = require('./server/socket'),
    dirs = require('./server/dirs');

var server = cordovaServe();

var launchServer = function (opts) {
    opts = opts || {};

    var platform = opts.platform || 'browser';
    var appUrl, simHostUrl, simHostOpts;

    if (opts.simhostui && fs.existsSync(opts.simhostui)) {
        simHostOpts = { simHostRoot: opts.simhostui };
    } else {
        /* use the default simulation UI */
        simHostOpts = { simHostRoot: path.join(__dirname, 'sim-host', 'ui') };
    }

    config.platform = platform;
    config.simHostOptions = simHostOpts;
    config.telemetry = opts.telemetry;
    config.liveReload = opts.hasOwnProperty('livereload') ? !!opts.livereload : true;
    config.forcePrepare = !!opts.forceprepare;
    config.xhrProxy = !!opts.corsproxy;

    /* attach simulation host middleware */
    var middlewarePath = path.join(simHostOpts.simHostRoot, 'server', 'server');
    if (fs.existsSync(middlewarePath + '.js')) {
        require(middlewarePath).attach(server.app, dirs);
    }

    /* attach CORS proxy middleware */
    if (!!opts.corsproxy) {
        require('./server/xhr-proxy').attach(server.app);
    }

    simServer.attach(server.app);

    return server.servePlatform(platform, {
        port: opts.port,
        root: opts.dir,
        noServerInfo: true
    }).then(function () {
        simSocket.init(server.server);
        config.server = server.server;
        var projectRoot = server.projectRoot;
        config.projectRoot = projectRoot;
        config.platformRoot = server.root;
        var urlRoot = 'http://localhost:' + server.port + '/';
        appUrl = urlRoot + parseStartPage(projectRoot);
        simHostUrl = urlRoot + 'simulator/index.html';
        log.log('Server started:\n- App running at: ' + appUrl + '\n- Sim host running at: ' + simHostUrl);
        return { appUrl: appUrl, simHostUrl: simHostUrl };
    });
};

var closeServer = function () {
    return server.server && server.server.close();
};

var launchBrowser = function (target, url) {
    return cordovaServe.launchBrowser({ target: target, url: url });
};

var simulate = function (opts) {
    var target = opts.target || 'chrome';
    var shouldLaunch = opts.launch || true;
    var simHostUrl;
    // Fallback to true if not defined
    if(shouldLaunch !== true && shouldLaunch !== false) {
        shouldLaunch = true;
    }

    return launchServer(opts)
        .then(function (urls) {
            if(shouldLaunch !== true) {
                return;
            }
            simHostUrl = urls.simHostUrl;
            return launchBrowser(target, urls.appUrl);
        }).then(function () {
            if(shouldLaunch !== true) {
                return;
            }
            return launchBrowser(target, simHostUrl);
        }).catch(function (error) {
            // Ensure server is closed, then rethrow so it can be handled by downstream consumers.
            closeServer();
            if (error instanceof Error) {
                throw error;
            } else {
                throw new Error(error);
            }
        });
};

var parseStartPage = function (projectRoot) {
    // Start Page is defined as <content src="some_uri" /> in config.xml
    var configFile = path.join(projectRoot, 'config.xml');
    if (!fs.existsSync(configFile)) {
        throw new Error('Cannot find project config file: ' + configFile);
    }

    var startPageRegexp = /<content\s+src\s*=\s*"(.+)"\s*\/>/ig,
        configFileContent = fs.readFileSync(configFile);

    var match = startPageRegexp.exec(configFileContent);
    if (match) {
        return match[1];
    }

    return 'index.html'; // default uri
};

module.exports = simulate;
module.exports.launchBrowser = launchBrowser;
module.exports.launchServer = launchServer;
module.exports.closeServer = closeServer;
module.exports.dirs = dirs;
module.exports.app = server.app;
module.exports.log = log;
