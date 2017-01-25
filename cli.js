#!/usr/bin/env node

'use strict';

const logSymbols = require('log-symbols');
const meow = require('meow');
const path = require('path');
const updateNotifier = require('update-notifier');

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
`);

updateNotifier({pkg: cli.pkg}).notify();

const defaultOptions = {
    nodeDir: process.cwd(),
    branch: 'lkgr',
    verbose: false
};

return Promise
    .resolve()
    .then(() => {
        if (cli.input.length !== 1) {
            cli.showHelp();
        } else {
            const options = Object.assign({}, defaultOptions, cli.flags);
            options.nodeDir = path.resolve(options.nodeDir);
            switch (cli.input[0].toLowerCase()) {
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
        console.error(logSymbols.error, err.message);
        process.exitCode = 1;
    });
