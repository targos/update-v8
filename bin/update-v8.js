#!/usr/bin/env node

'use strict';

const updateV8 = require('..');

const args = process.argv.slice(2);
switch (args[0]) {
    case 'minor':
        updateV8.updateMinor();
        break;
    case 'major':
        updateV8.updateMajor({args: args.slice(1)});
        break;
    default:
        console.error(`Unknown command: ${args[0]}`);
        break;
}
