'use strict';

const execa = require('execa');
const fs = require('fs-promise');

const util = require('./util');

module.exports = function () {
    return {
        title: 'Bump NODE_MODULE_VERSION',
        task: async (ctx, task) => {
            const v8Version = util.getNodeV8Version(ctx.nodeDir);
            const currentModuleVersion = getModuleVersion(ctx.nodeDir);
            const newModuleVersion = translateV8ToModuleVersion(v8Version);
            if (currentModuleVersion === newModuleVersion) {
                task.skip('version is the same');
                return;
            }
            updateModuleVersion(ctx.nodeDir, newModuleVersion);
            await execGitNode('add', 'src/node_version.h');
            await execGitNode('commit', '-m', getCommitTitle(newModuleVersion), '-m', getCommitBody(v8Version));

            function execGitNode(...options) {
                return execa('git', options, {cwd: ctx.nodeDir});
            }
        }
    };
};

function getModuleVersion(nodeDir) {
    const nodeVersionH = fs.readFileSync(nodeDir + '/src/node_version.h', 'utf8');
    const version = /NODE_MODULE_VERSION (\d+)/.exec(nodeVersionH)[1];
    return parseInt(version);
}

function updateModuleVersion(nodeDir, newVersion) {
    const path = nodeDir + '/src/node_version.h';
    let nodeVersionH = fs.readFileSync(path, 'utf8');
    nodeVersionH = nodeVersionH.replace(/NODE_MODULE_VERSION \d+/, `NODE_MODULE_VERSION ${newVersion}`);
    fs.writeFileSync(path, nodeVersionH);
}

function translateV8ToModuleVersion(v8Version) {
    return parseInt(String(v8Version[0]) + String(v8Version[1])) - 3;
}

function getCommitTitle(moduleVersion) {
    return `src: update NODE_MODULE_VERSION to ${moduleVersion}`;
}

function getCommitBody(v8Version) {
  return `Major V8 updates are usually API/ABI incompatible with previous
versions. This commit adapts NODE_MODULE_VERSION for V8 ${v8Version[0]}.${v8Version[1]}.

Refs: https://github.com/nodejs/CTC/blob/master/meetings/2016-09-28.md`;
}
