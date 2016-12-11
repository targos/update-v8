'use strict';

const fs = require('fs-promise');
const path = require('path');

const util = require('./util');

exports.getCurrentV8Version = function getCurrentV8Version() {
    return {
        title: 'Get current V8 version',
        task: (ctx) => {
            ctx.currentVersion = util.getNodeV8Version(ctx.nodeDir);
        }
    };
};

exports.checkCwd = function checkCwd() {
    return {
        title: 'Check Node directory',
        task: (ctx) => {
            let isNode = false;
            return fs.readFile(path.join(ctx.nodeDir, 'LICENSE'))
                .then(function (license) {
                    if (license.indexOf('Node.js is licensed for use as follows') === 0) {
                        isNode = true
                    }
                })
                .catch(() => {})
                .then(function () {
                    if (!isNode) {
                        throw new Error('This does not seem to be the Node.js repository.\ncwd: ' + ctx.nodeDir);
                    }
                });
        }
    }
};
