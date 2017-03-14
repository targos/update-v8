'use strict';

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
        task: async (ctx) => {
            let currentV8Tag;
            if (ctx.currentVersion[3] === '0') {
                // prerelease
                currentV8Tag = ctx.currentVersion.slice(0, 2).join('.');
                ctx.currentVersion = ctx.currentVersion.slice(0, 3);
            } else {
                currentV8Tag = ctx.currentVersion.slice(0, 3).join('.');
            }
            let tags = await execa.stdout('git', ['tag', '-l', `${currentV8Tag}.*`, '--sort=version:refname'], {cwd: v8CloneDir});
            tags = tags.split(/[\r\n]+/);
            ctx.latestVersion = tags[tags.length - 1].split('.');
        }
    };
}

function minorUpdate() {
    return {
        title: 'Do minor update',
        task: (ctx, task) => {
            const latestStr = ctx.latestVersion.join('.');
            task.title = `Do minor update to ${latestStr}`;
            return doMinorUpdate(ctx, latestStr);
        },
        skip: (ctx) => {
            if (isHigherOrEqual(ctx.currentVersion, ctx.latestVersion)) {
                ctx.skipped = true;
                return true;
            }
        }
    };
}

async function doMinorUpdate(ctx, latestStr) {
    const currentStr = ctx.currentVersion.join('.');
    const diff = await execa.stdout('git', ['format-patch', '--stdout', `${currentStr}...${latestStr}`], {cwd: v8CloneDir});
    try {
        await execa('git', ['apply', '--directory', 'deps/v8'], {
            cwd: ctx.nodeDir,
            input: diff
        });
    } catch (e) {
        const file = path.join(ctx.nodeDir, `${latestStr}.diff`);
        await fs.writeFile(file, diff);
        throw new Error(`Could not apply patch.\n${e}\nDiff was stored in ${file}`);
    }
}

function isHigherOrEqual(version1, version2) {
    for (let i = 0; i < version1.length; i++) {
        if (Number(version1[i] < Number(version2[i]))) return false;
    }
    return true;
}
