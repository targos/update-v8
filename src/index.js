'use strict';

const execa = require('execa');
const Listr = require('listr');

const backport = require('./backport');
const updateVersionNumbers = require('./updateVersionNumbers');
const commitUpdate = require('./commitUpdate');
const majorUpdate = require('./majorUpdate');
const minorUpdate = require('./minorUpdate');
const updateV8Clone = require('./updateV8Clone');

exports.major = function (options) {
    const tasks = new Listr([
        updateV8Clone(),
        majorUpdate(),
        commitUpdate(),
        updateVersionNumbers()
    ], getOptions(options));
    return tasks.run(options);
};

exports.minor = function (options) {
    const tasks = new Listr([
        updateV8Clone(),
        minorUpdate(),
        commitUpdate()
    ], getOptions(options));
    return tasks.run(options);
};

exports.backport = function (options) {
    const tasks = new Listr([
        updateV8Clone(),
        backport.doBackport(options),
        backport.commitBackport()
    ], getOptions(options));
    return tasks.run(options);
};

function getOptions(opts) {
    return {
        renderer: opts.verbose ? 'verbose' : 'default',
        execGitNode(...options) {
            return execa('git', options, {cwd: opts.nodeDir});
        },
        execGitV8(...options) {
            return execa('git', options, {cwd: opts.v8CloneDir});
        }
    };
}
