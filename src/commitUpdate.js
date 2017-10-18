'use strict';

const execa = require('execa');

const util = require('./util');

module.exports = function () {
    return {
        title: 'Commit V8 update',
        task: async (ctx) => {
            const newV8Version = util.getNodeV8Version(ctx.nodeDir).join('.');
            await ctx.execGitNode('add', 'deps/v8');
            const moreArgs = [];
            if (ctx.minor) {
                const prev = ctx.currentVersion.join('.');
                const next = ctx.latestVersion.join('.');
                moreArgs.push('-m', `Refs: https://github.com/v8/v8/compare/${prev}...${next}`);
            }
            await ctx.execGitNode('commit', '-m', `deps: update V8 to ${newV8Version}`, ...moreArgs);
        },
        skip: (ctx) => ctx.skipped
    };
};
