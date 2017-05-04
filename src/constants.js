'use strict';

const homedir = require('os').homedir();
const path = require('path');

const chromiumGit = 'https://chromium.googlesource.com';

exports.defaultBaseDir = path.join(homedir, '.update-v8');
exports.chromiumGit = chromiumGit;

exports.v8Git = chromiumGit + '/v8/v8.git';
exports.v8Deps = [
    {
        name: 'trace_event',
        repo: 'v8/base/trace_event/common',
        path: 'base/trace_event/common',
        gitignore: {
            match: '/base\n',
            replace: ''
        },
        since: 55
    },
    {
        name: 'gtest',
        repo: 'v8/testing/gtest',
        path: 'testing/gtest',
        gitignore: {
            match: '/testing/gtest',
            replace: '/testing/gtest/*\n!/testing/gtest/include\n/testing/gtest/include/*\n!/testing/gtest/include/gtest\n/testing/gtest/include/gtest/*\n!/testing/gtest/include/gtest/gtest_prod.h'
        },
        since: 55
    },
    {
        name: 'jinja2',
        repo: 'v8/third_party/jinja2',
        path: 'third_party/jinja2',
        gitignore: '!/third_party/jinja2',
        since: 56
    },
    {
        name: 'markupsafe',
        repo: 'v8/third_party/markupsafe',
        path: 'third_party/markupsafe',
        gitignore: '!/third_party/markupsafe',
        since: 56
    }
];
