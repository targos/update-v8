'use strict';

const execa = require('execa');
const fs = require('fs-extra');
const Listr = require('listr');
const path = require('path');

const common = require('./common');

exports.doBackport = function doBackport(options) {
    const todo = [
        common.checkCwd(),
        common.getCurrentV8Version(),
        generatePatch(),
        applyPatch()
    ];
    if (options.bump !== false) {
        todo.push(incrementV8Version());
    }
    return {
        title: 'V8 commit backport',
        task: () => {
            return new Listr(todo);
        }
    };
};

exports.commitBackport = function commitBackport() {
    return {
        title: 'Commit patch',
        task: (ctx) => {
            const messageTitle = `deps: cherry-pick ${ctx.sha.substring(0, 7)} from upstream V8`;
            const messageBody = `Original commit message:\n\n    ` +
                ctx.message.replace(/\n/g, '\n    ') +
                `\n\nRefs: https://github.com/v8/v8/commit/${ctx.sha}`;

            return execGitNode('add', 'deps/v8')
                .then(() => execGitNode('commit', '-m', messageTitle, '-m', messageBody));

            function execGitNode(...options) {
                return execa('git', options, {cwd: ctx.nodeDir});
            }
        }
    }
};

function generatePatch() {
    return {
        title: 'Generate patch',
        task: (ctx) => {
            const sha = ctx.sha;
            if (!sha || sha.length !== 40) {
                throw new Error('--sha option is required and must be 40 characters long');
            }
            return Promise.all([
                execGitV8('format-patch', '--stdout', `${sha}^..${sha}`),
                execGitV8('log', '--format=%B', '-n', '1', sha),
            ]).then(([patch, message]) => {
                ctx.patch = patch.stdout;
                ctx.message = message.stdout;
            }).catch(function (e) {
                throw new Error(e.stderr);
            });

            function execGitV8(...options) {
                return execa('git', options, {cwd: ctx.v8CloneDir});
            }
        }
    };
}

function applyPatch() {
    return {
        title: 'Apply patch to deps/v8',
        task: (ctx) => {
            const patch = ctx.patch;
            return execa('git', ['apply', '-3', '--directory=deps/v8'], {
                cwd: ctx.nodeDir,
                input: patch
            }).catch(function (e) {
                const file = path.join(ctx.nodeDir, `${ctx.sha}.diff`);
                return fs.writeFile(file, ctx.patch)
                    .then(function () {
                        throw new Error(`Could not apply patch.\n${e}\nDiff was stored in ${file}`);
                    });
            });
        }
    }
}

function incrementV8Version() {
    return {
        title: 'Increment V8 version',
        task: (ctx) => {
            const incremented = ctx.currentVersion[3] + 1;
            const versionHPath = ctx.nodeDir + '/deps/v8/include/v8-version.h';
            return fs.readFile(versionHPath, 'utf8')
                .then(versionH => {
                    versionH = versionH.replace(/V8_PATCH_LEVEL (\d+)/, `V8_PATCH_LEVEL ${incremented}`);
                    return fs.writeFile(versionHPath, versionH);
                });
        }
    };
}
