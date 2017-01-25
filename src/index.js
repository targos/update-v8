'use strict';

const Listr = require('listr');

const backport = require('./backport');
const commitUpdate = require('./commitUpdate');
const majorUpdate = require('./majorUpdate');
const minorUpdate = require('./minorUpdate');
const updateV8Clone = require('./updateV8Clone');

exports.major = function (options) {
    const tasks = new Listr([
        updateV8Clone(),
        majorUpdate(),
        commitUpdate()
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
        backport.doBackport(),
        backport.commitBackport()
    ], getOptions(options));
    return tasks.run(options);
};

function getOptions(opts) {
    return {
        renderer: opts.verbose ? 'verbose' : 'default'
    };
}
