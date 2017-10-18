'use strict';

const fs = require('fs-extra');
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
        task: async (ctx) => {
            let isNode = false;
            try {
                const nodeVersion = await fs.readFile(path.join(ctx.nodeDir, 'src/node_version.h'));
                const match = /#define NODE_MAJOR_VERSION (\d+)/.exec(nodeVersion);
                if (match) {
                    isNode = true;
                    ctx.nodeMajorVersion = parseInt(match[1]);
                }
            } catch (e) {}
            if (!isNode) {
                throw new Error('This does not seem to be the Node.js repository.\ncwd: ' + ctx.nodeDir);
            }
        }
    }
};
