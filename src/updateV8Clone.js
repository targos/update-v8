'use strict';

const execa = require('execa');
const Listr = require('listr');
const mkdirp = require('mkdirp');

const {
    baseDir,
    v8CloneDir,
    v8Git
} = require('./constants');

module.exports = function () {
    return {
        title: 'Update local V8 clone',
        task: () => {
            return new Listr([
                fetchOrigin(),
                createClone()
            ]);
        }
    }
};

function fetchOrigin() {
    return {
        title: 'Fetch V8',
        task: (ctx) => {
            return execa('git', ['fetch', 'origin'], {cwd: v8CloneDir})
                .catch(e => {
                    if (e.code === 'ENOENT') {
                        ctx.shouldClone = true;
                    } else {
                        throw e;
                    }
                });
        }
    };
}

function createClone() {
    return {
        title: 'Clone V8',
        task: () => {
            mkdirp.sync(baseDir);
            return execa('git', ['clone', v8Git], {cwd: baseDir});
        },
        skip: (ctx) => !ctx.shouldClone
    };
}
