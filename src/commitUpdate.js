'use strict';

const execa = require('execa');

const util = require('./util');

module.exports = function () {
    return {
        title: 'Commit V8 update',
        task: (ctx) => {
            const newV8Version = util.getNodeV8Version(ctx.nodeDir).join('.');
            return execGitNode('add', 'deps/v8')
                .then(() => execGitNode('commit', '-m', `deps: update V8 to ${newV8Version}`));

            function execGitNode(...options) {
                return execa('git', options, {cwd: ctx.nodeDir});
            }
        },
        skip: (ctx) => ctx.skipped
    };
};
