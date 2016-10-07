'use strict';

const child_process = require('child_process');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');
const rimraf = require('rimraf');

const homedir = require('os').homedir();
const basedir = path.join(homedir, '.update-v8');
const clonedir = path.join(basedir, 'v8');

const chromiumGit = 'https://chromium.googlesource.com';
const v8Git = chromiumGit + '/v8/v8.git';

exports.updateMinor = function (options = {}) {
    console.log('Starting minor update');
    const {cwd = process.cwd()} = options;
    checkCwd(cwd);
    const nodeV8Version = getNodeV8Version(cwd);
    const latestV8Version = getLatestV8Version(nodeV8Version);
    if (nodeV8Version[3] < latestV8Version[3]) {
        doMinorUpdate(nodeV8Version, latestV8Version, cwd);
    } else if (nodeV8Version[3] === latestV8Version[3]) {
        end(`Already has latest version (${nodeV8Version.join('.')})`);
    } else {
        end(`Node's version (${nodeV8Version.join('.')}) is higher than latest from V8 (${latestV8Version.join('.')})`);
    }
};

exports.updateMajor = function (options = {}) {
    console.log('Starting major update');
    const {cwd = process.cwd(), args} = options;
    checkCwd(cwd);
    const nodeV8Version = getNodeV8Version(cwd);
    let v8Branch;
    if (args[0]) {
        v8Branch = args[0];
        console.log('Forcing update to ' + v8Branch);
    } else {
        v8Branch = getV8LkgrBranch(nodeV8Version);
    }
    checkoutV8Branch(v8Branch);
    rimraf.sync(path.join(cwd, 'deps/v8'));
    cloneLocalV8(cwd, v8Branch);
    child_process.execFileSync('git', ['add', 'deps/v8'], {cwd});
    child_process.execFileSync('git', ['commit', '-m', `deps: update V8 to ${v8Branch}`], {cwd});
    copyTraceEvent(cwd);
    copyGtest(cwd);
    console.log(`Updated to ${v8Branch}`);
};

function doMinorUpdate(nodeV8Version, latestV8Version, cwd) {
    const latestStr = latestV8Version.join('.');
    const diff = child_process.execFileSync('git', ['diff', nodeV8Version.join('.'), latestStr], {cwd: clonedir});
    try {
        child_process.execFileSync('git', ['apply', '--directory', 'deps/v8'], {
            cwd,
            input: diff
        });
    } catch (e) {
        const file = path.join(cwd, latestStr + '.diff');
        fs.writeFileSync(file, diff);
        die(`Could not apply patch.\n${e}\nDiff was stored in ${file}`);
    }
    child_process.execFileSync('git', ['add', 'deps/v8'], {cwd});
    child_process.execFileSync('git', ['commit', '-m', `deps: update V8 to ${latestStr}`], {cwd});
    console.log(`Updated to ${latestStr}`);
}

function checkCwd(cwd) {
    let isNode = false;
    try {
        const license = fs.readFileSync(cwd + '/LICENSE');
        isNode = license.indexOf('Node.js is licensed for use as follows') === 0;
    } catch (e) {}
    if (!isNode) {
        die('This does not seem to be the Node.js repository.\ncwd: ' + cwd);
    }
}

function getNodeV8Version(cwd) {
    try {
        const v8VersionH = fs.readFileSync(cwd + '/deps/v8/include/v8-version.h', 'utf8');
        const major = /V8_MAJOR_VERSION (\d+)/.exec(v8VersionH)[1];
        const minor = /V8_MINOR_VERSION (\d+)/.exec(v8VersionH)[1];
        const build = /V8_BUILD_NUMBER (\d+)/.exec(v8VersionH)[1];
        const patch = /V8_PATCH_LEVEL (\d+)/.exec(v8VersionH)[1];
        const version = [major, minor, build, patch];
        console.log(`Current V8 version: ${version.join('.')}`);
        return version;
    } catch (e) {
        die('Could not find V8 version');
    }
}

function cloneLocalV8(cwd, branch) {
    try {
        child_process.execFileSync('git', ['clone', '-b', branch, clonedir, 'deps/v8'], {cwd});
    } catch (e) {
        die(e.message);
    }
}

function getLatestV8Version(nodeV8Version) {
    updateClone();
    const nodeV8Tag = nodeV8Version.slice(0, 3).join('.');
    let tags = child_process.execFileSync('git', ['tag', '-l', nodeV8Tag + '.*'], {cwd: clonedir}).toString();
    tags = toSortedArray(tags);
    return tags[0];
}

function getV8LkgrBranch(nodeV8Version) {
    updateClone();
    const currentMajor = nodeV8Version[0] + '.' + nodeV8Version[1];
    let tags = child_process.execFileSync('git', ['branch', '-r', '--list', 'origin/*lkgr'], {cwd: clonedir}).toString()
        .split(/[\r\n]+/)
        .map(s => s.trim().slice(7))
        .filter(tag => tag !== '');
    const first = tags.findIndex(tag => tag.startsWith(currentMajor));
    tags = tags.slice(first + 1);
    let tag;
    if (tags.length === 0) {
        die('Could not find any relevant V8 version.');
    } else if (tags.length === 1) {
        tag = tags[0];
        console.log('No more recent branch. Updating to lkgr');
    } else {
        tag = tags[tags.length - 2];
        console.log('Updating to ' + tag);
    }
    return tag;
}

function checkoutV8Branch(branch) {
    // Checkout another branch to allow deleting master
    child_process.execFileSync('git', ['checkout', 'origin/master'], {
        cwd: clonedir,
        stdio: 'ignore'
    });
    try {
        child_process.execFileSync('git', ['branch', '-D', branch], {
            cwd: clonedir,
            stdio: 'pipe'
        });
    } catch (e) {
      // ignore
    }
    try {
        child_process.execFileSync('git', ['branch', branch, 'origin/' + branch], {
            cwd: clonedir,
            stdio: 'pipe'
        });
    } catch (e) {
        die(e.message);
    }
}

function updateClone() {
    console.log('Updating V8 clone');
    try {
        child_process.execFileSync('git', ['fetch', 'origin'], {
            cwd: clonedir,
            stdio: 'inherit'
        });
    } catch (e) {
        if (e.code === 'ENOENT') {
            createClone();
        } else {
            die('Failed to update V8 clone.\n' + e);
        }
    }
}

function createClone() {
    console.log('Clone does not exist. Creating it...');
    try {
        mkdirp.sync(basedir);
        child_process.execFileSync('git', ['clone', v8Git], {
            cwd: basedir,
            stdio: 'inherit'
        });
    } catch (e) {
        die('Failed to create clone.\n' + e)
    }
}

function copyTraceEvent(cwd) {
    const v8Path = path.join(cwd, 'deps/v8');
    const gitignorePath = path.join(v8Path, '.gitignore');
    let gitignore = fs.readFileSync(gitignorePath, 'utf8');
    gitignore = gitignore.replace('/base\n', '');
    fs.writeFileSync(gitignorePath, gitignore);
    child_process.execFileSync('git', ['add', 'deps/v8/.gitignore'], {cwd});
    child_process.execFileSync('git', ['commit', '-m', 'deps: edit V8 gitignore to allow trace event copy'], {cwd});
    const [repo, commit] = readDeps(cwd, 'v8/base/trace_event/common');
    const thePath = path.join(v8Path, 'base/trace_event/common');
    fetchFromGit(thePath, repo, commit);
    child_process.execFileSync('git', ['add', thePath], {cwd});
    child_process.execFileSync('git', ['commit', '-m', 'deps: edit V8 trace event to ' + commit], {cwd});
}

function copyGtest(cwd) {
    const v8Path = path.join(cwd, 'deps/v8');
    const gitignorePath = path.join(v8Path, '.gitignore');
    let gitignore = fs.readFileSync(gitignorePath, 'utf8');
    gitignore = gitignore.replace('/testing/gtest', '/testing/gtest/*\n!/testing/gtest/include\n/testing/gtest/include/*\n!/testing/gtest/include/gtest\n/testing/gtest/include/gtest/*\n!/testing/gtest/include/gtest/gtest_prod.h');
    fs.writeFileSync(gitignorePath, gitignore);
    child_process.execFileSync('git', ['add', 'deps/v8/.gitignore'], {cwd});
    child_process.execFileSync('git', ['commit', '-m', 'deps: edit V8 gitignore to allow gtest_prod.h copy'], {cwd});
    const [repo, commit] = readDeps(cwd, 'v8/testing/gtest');
    const thePath = path.join(v8Path, 'testing/gtest');
    fetchFromGit(thePath, repo, commit);
    child_process.execFileSync('git', ['add', thePath], {cwd});
    child_process.execFileSync('git', ['commit', '-m', 'deps: edit V8 gtest to ' + commit], {cwd});
}

function readDeps(cwd, depName) {
    const depsStr = fs.readFileSync(path.join(cwd, 'deps/v8/DEPS'), 'utf8');
    const start = depsStr.indexOf('deps');
    const end = depsStr.indexOf('}', start) + 1;
    const Var = () => chromiumGit;
    let deps;
    eval(depsStr.substring(start, end));
    const dep = deps[depName];
    return dep.split('@');
}

function fetchFromGit(cwd, repo, commit) {
    mkdirp.sync(cwd);
    child_process.execFileSync('git', ['init'], {cwd});
    child_process.execFileSync('git', ['remote', 'add', 'origin', repo], {cwd});
    child_process.execFileSync('git', ['fetch', 'origin', commit], {cwd});
    child_process.execFileSync('git', ['reset', '--hard', 'FETCH_HEAD'], {cwd});
    rimraf.sync(path.join(cwd, '.git'));
}

function sortVersions(v1, v2) {
    return v2[3] - v1[3];
}

function toSortedArray(tags) {
    return tags.split(/[\r\n]+/)
        .filter(tag => tag !== '')
        .map(tag => tag.split('.'))
        .sort(sortVersions);
}

function die(message) {
    console.error(message);
    process.exit(1);
}

function end(message) {
    console.log(message);
    process.exit(0);
}
