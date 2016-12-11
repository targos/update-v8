'use strict';

const co = require('co');
const execa = require('execa');
const fs = require('fs-promise');
const Listr = require('listr');
const path = require('path');

const common = require('./common');
const util = require('./util');

const {
    v8CloneDir
} = require('./constants');

module.exports = function () {
    return {
        title: 'Minor V8 update',
        task: () => {
            return new Listr([
                common.checkCwd(),
                common.getCurrentV8Version(),
                getLatestV8Version(),
                minorUpdate()
            ]);
        }
    };
};

function getLatestV8Version() {
    return {
        title: 'Get latest V8 version',
        task: (ctx) => {
            const currentV8Tag = ctx.currentVersion.slice(0, 3).join('.');
            return execa.stdout('git', ['tag', '-l', `${currentV8Tag}.*`], {cwd: v8CloneDir})
                .then(tags => {
                    tags = toSortedArray(tags);
                    ctx.latestVersion = tags[0];
                });
        }
    };
}

function minorUpdate() {
    return {
        title: 'Do minor update',
        task: (ctx, task) => {
            const latestStr = ctx.latestVersion.join('.');
            task.title = `Do minor update to ${latestStr}`;
            return co(doMinorUpdate, ctx, latestStr);
        },
        skip: (ctx) => {
            if (ctx.currentVersion >= ctx.latestVersion) {
                ctx.skipped = true;
                return true;
            }
        }
    };
}

function* doMinorUpdate(ctx, latestStr) {
    const currentStr = ctx.currentVersion.join('.');
    const diff = yield execa.stdout('git', ['diff', currentStr, latestStr], {cwd: v8CloneDir});
    try {
        yield execa('git', ['apply', '--director', 'deps/v8'], {
            cwd: ctx.nodeDir,
            input: diff
        });
    } catch (e) {
        const file = path.join(ctx.nodeDir, `${latestStr}.diff`);
        yield fs.writeFile(file, diff);
        throw new Error(`Could not apply patch.\n${e}\nDiff was stored in ${file}`);
    }
}

function toSortedArray(tags) {
    return tags.split(/[\r\n]+/)
        .filter(tag => tag !== '')
        .map(tag => tag.split('.'))
        .sort(sortVersions);
}

function sortVersions(v1, v2) {
    return v2[3] - v1[3];
}
