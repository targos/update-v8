'use strict';

const child_process = require('child_process');
const fs = require('fs');
const mkdirp = require('mkdirp');
const path = require('path');

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

function doMinorUpdate(nodeV8Version, latestV8Version, cwd) {
    const latestStr = latestV8Version.join('.');
    const diff = child_process.execFileSync('git', ['diff', nodeV8Version.join('.'), latestStr], {
        cwd: clonedir
    });
    try {
        child_process.execFileSync('git', ['apply', '--directory', 'deps/v8'], {
            cwd: cwd,
            input: diff
        });
    } catch (e) {
        const file = path.join(cwd, latestStr + '.diff');
        fs.writeFileSync(file, diff);
        die(`Could not apply patch.\n${e}\nDiff was stored in ${file}`);
    }
    child_process.execFileSync('git', ['add', 'deps/v8'], {cwd});
    child_process.execFileSync('git', ['commit', '-m', `deps: update V8 to ${latestStr}`]);
    console.log('Updated to' + latestStr);
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
        return [major, minor, build, patch];
    } catch (e) {
        die('Could not find V8 version');
    }
}

function getLatestV8Version(nodeV8Version) {
    updateClone();
    const nodeV8Tag = nodeV8Version.slice(0, 3).join('.');
    let tags = child_process.execFileSync('git', ['tag', '-l', nodeV8Tag + '.*'], {
        cwd: clonedir
    }).toString();
    tags = toSortedArray(tags);
    return tags[0];
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