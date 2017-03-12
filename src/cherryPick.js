'use strict';

const execa = require('execa');

module.exports = function () {
    return {
        title: 'Cherry-pick floating patches',
        task: async (ctx) => {
            await execGitNode('cherry-pick', '3c53ad0df900566324ebcb64c8df060b8c40c562'); // deps: limit regress/regress-crbug-514081 v8 test

            function execGitNode(...options) {
                return execa('git', options, {cwd: ctx.nodeDir});
            }
        }
    };
};
