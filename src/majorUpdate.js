'use strict';

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

const versionReg = /^\d+(\.\d+)+$/;
function checkoutBranch() {
    return {
        title: 'Checkout V8 branch',
        task: async (ctx) => {
            let version = ctx.branch;
            await execGitV8('checkout', 'origin/master');
            if (!versionReg.test(version)) {
                // try to get the latest tag
                const res = await execGitV8('tag', '--contains', version, '--sort', 'version:refname');
                const tags = res.stdout.split('\n');
                const lastTag = tags[tags.length - 1];
                if (lastTag) version = lastTag;
                if (version.split('.').length === 3) {
                    // Prerelease versions are branched and 'lkgr' does not include the version commit
                    ctx.branch = version;
                }
            }
            if (version === ctx.currentVersion.join('.')) {
                throw new Error('Current version is already ' + version);
            }
            try {
                await execGitV8('branch', '-D', ctx.branch);
            } catch (e) {}
            await execGitV8('branch', ctx.branch, `origin/${ctx.branch}`);
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
        task: async (ctx) => {
            const newV8Version = util.getNodeV8Version(ctx.nodeDir);
            const deps = util.getV8Deps(newV8Version);
            if (deps.length === 0) return;
            for (const dep of deps) {
                if (dep.gitignore) {
                    if (typeof dep.gitignore === 'string') {
                        await addToGitignore(ctx.nodeDir, dep.gitignore);
                    } else {
                        await replaceGitignore(ctx.nodeDir, dep.gitignore);
                    }
                }
                const [repo, commit] = await readDeps(ctx.nodeDir, dep.repo);
                const thePath = path.join(ctx.nodeDir, 'deps/v8', dep.path);
                await fetchFromGit(thePath, repo, commit);
            }
        }
    };
}

function execGitV8(...options) {
    return execa('git', options, v8ExecOptions);
}

async function addToGitignore(nodeDir, value) {
    const gitignorePath = path.join(nodeDir, 'deps/v8/.gitignore');
    await fs.appendFile(gitignorePath, value + '\n');
}

async function replaceGitignore(nodeDir, options) {
    const gitignorePath = path.join(nodeDir, 'deps/v8/.gitignore');
    let gitignore = await fs.readFile(gitignorePath, 'utf8');
    gitignore = gitignore.replace(options.match, options.replace);
    await fs.writeFile(gitignorePath, gitignore);
}

async function readDeps(nodeDir, depName) {
    const depsStr = await fs.readFile(path.join(nodeDir, 'deps/v8/DEPS'), 'utf8');
    const start = depsStr.indexOf('deps');
    const end = depsStr.indexOf('}', start) + 1;
    const Var = () => chromiumGit;
    let deps;
    eval(depsStr.substring(start, end));
    const dep = deps[depName];
    return dep.split('@');
}

async function fetchFromGit(cwd, repo, commit) {
    mkdirp.sync(cwd);
    await exec('init');
    await exec('remote', 'add', 'origin', repo);
    await exec('fetch', 'origin', commit);
    await exec('reset', '--hard', 'FETCH_HEAD');
    await rimraf(path.join(cwd, '.git'));

    function exec(...options) {
        return execa('git', options, {cwd});
    }
}
