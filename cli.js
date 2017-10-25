#!/usr/bin/env node

'use strict';

const execa = require('execa');
const logSymbols = require('log-symbols');
const meow = require('meow');
const path = require('path');
const updateNotifier = require('update-notifier');

const constants = require('./src/constants');
const common = require('./src/common');
const updateV8 = require('.');

const cli = meow(`
Usage
  $ update-v8 <type> [options]
  
  Type can be: major | minor | backport

Options
  --node-dir Specify the directory of a Node.js clone. Default is cwd.
  --verbose Enable verbose output.
  --branch Specify a branch for major update.
  --sha Specify the SHA of the commit to backport.
  --no-bump Do not bump V8 version or embedder version (only applies to backport command)
  --base-dir Specify the directory where V8 should be cloned. Default is '~/.update-v8'
`);

updateNotifier({pkg: cli.pkg}).notify();

const defaultOptions = {
    nodeDir: process.cwd(),
    branch: 'lkgr',
    verbose: false
};

const options = Object.assign({}, defaultOptions, cli.flags);
options.nodeDir = path.resolve(options.nodeDir);
options.baseDir = path.resolve(options.baseDir || constants.defaultBaseDir);
options.v8CloneDir = path.join(options.baseDir, 'v8');

options.execGitNode = function execGitNode(...args) {
    return execa('git', args, {cwd: options.nodeDir});
};
options.execGitV8 = function execGitV8(...args) {
    return execa('git', args, {cwd: options.v8CloneDir});
};

return Promise
    .resolve()
    .then(async () => {
        if (cli.input.length !== 1) {
            cli.showHelp();
        } else {
            await common.checkCwd(options);

            const kind = cli.input[0].toLowerCase();
            options[kind] = true;
            switch (kind) {
                case 'minor':
                    return updateV8.minor(options);
                case 'major':
                    return updateV8.major(options);
                case 'backport':
                    return updateV8.backport(options);
                default:
                    cli.showHelp();
            }
        }
    })
    .catch(err => {
        console.error(logSymbols.error, options.verbose ? err.stack : err.message);
        process.exitCode = 1;
    });
