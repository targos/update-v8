'use strict';

const co = require('co');
const execa = require('execa');
const fs = require('fs-promise');
const Listr = require('listr');
const mkdirp = require('mkdirp');
const path = require('path');
const rimraf = require('rimraf-then');

const common = require('./common');
const util = require('./util');

const {
    chromiumGit,
    v8CloneDir
} = require('./constants');

const v8ExecOptions = {cwd: v8CloneDir};
const noop = () => {};

module.exports = function () {
    return {
        title: `Major V8 update`,
        task: () => {
            return new Listr([
                common.checkCwd(),
                common.getCurrentV8Version(),
                checkoutBranch(),
                removeDepsV8(),
                cloneLocalV8(),
                removeDepsV8Git(),
                updateV8Deps()
            ]);
        }
    };
};

function checkoutBranch() {
    return {
        title: 'Checkout V8 branch',
        task: (ctx) => {
            const branch = ctx.branch;
            return execGitV8('checkout', 'origin/master')
                .then(() => execGitV8('branch', '-D', branch).catch(noop))
                .then(() => execGitV8('branch', branch, `origin/${branch}`));
        }
    };
}

function removeDepsV8() {
    return {
        title: 'Remove deps/v8',
        task: (ctx) => rimraf(path.join(ctx.nodeDir, 'deps/v8'))
    };
}

function cloneLocalV8() {
    return {
        title: 'Clone branch to deps/v8',
        task: (ctx) => execa('git', ['clone', '-b', ctx.branch, v8CloneDir, 'deps/v8'], {cwd: ctx.nodeDir})
    };
}

function removeDepsV8Git() {
    return {
        title: 'Remove deps/v8/.git',
        task: (ctx) => rimraf(path.join(ctx.nodeDir, 'deps/v8/.git'))
    };
}

function updateV8Deps() {
    return {
        title: 'Update V8 DEPS',
        task: (ctx) => {
            return co(function*() {
                const newV8Version = util.getNodeV8Version(ctx.nodeDir);
                const deps = util.getV8Deps(newV8Version);
                if (deps.length === 0) return;
                for (const dep of deps) {
                    if (dep.gitignore) {
                        if (typeof dep.gitignore === 'string') {
                            yield addToGitignore(ctx.nodeDir, dep.gitignore);
                        } else {
                            yield replaceGitignore(ctx.nodeDir, dep.gitignore);
                        }
                    }
                    const [repo, commit] = yield readDeps(ctx.nodeDir, dep.repo);
                    const thePath = path.join(ctx.nodeDir, 'deps/v8', dep.path);
                    yield fetchFromGit(thePath, repo, commit);
                }
            });
        }
    };
}

function execGitV8(...options) {
    return execa('git', options, v8ExecOptions);
}

function* addToGitignore(nodeDir, value) {
    const gitignorePath = path.join(nodeDir, 'deps/v8/.gitignore');
    yield fs.appendFile(gitignorePath, value + '\n');
}

function* replaceGitignore(nodeDir, options) {
    const gitignorePath = path.join(nodeDir, 'deps/v8/.gitignore');
    let gitignore = yield fs.readFile(gitignorePath, 'utf8');
    gitignore = gitignore.replace(options.match, options.replace);
    yield fs.writeFile(gitignorePath, gitignore);
}

function* readDeps(nodeDir, depName) {
    const depsStr = fs.readFileSync(path.join(nodeDir, 'deps/v8/DEPS'), 'utf8');
    const start = depsStr.indexOf('deps');
    const end = depsStr.indexOf('}', start) + 1;
    const Var = () => chromiumGit;
    let deps;
    eval(depsStr.substring(start, end));
    const dep = deps[depName];
    return dep.split('@');
}

function* fetchFromGit(cwd, repo, commit) {
    mkdirp.sync(cwd);
    yield exec('init');
    yield exec('remote', 'add', 'origin', repo);
    yield exec('fetch', 'origin', commit);
    yield exec('reset', '--hard', 'FETCH_HEAD');
    yield rimraf(path.join(cwd, '.git'));

    function exec(...options) {
        return execa('git', options, {cwd});
    }
}
