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
  
  Type can be: major | minor

Options
  --branch Specify a branch for major update.
  --node-dir Specify the directory of a Node.js clone. Default is cwd.
  --verbose Enable verbose output.
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
                default:
                    cli.showHelp();
            }
        }
    })
    .catch(err => {
        console.error(logSymbols.error, err);
        process.exitCode = 1;
    });
