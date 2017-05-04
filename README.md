# update-v8

CLI to simplify updates of V8 in the Node.js project

## Installation

```bash
$ npm install -g update-v8
```

Please note that this tool uses `async/await` syntax and therefore requires Node.js
7.6.0 or higher.

## Usage

This tool will maintain a clone of the V8 repository in `~/.update-v8/v8`

### `update-v8 minor`

Compare current V8 version with latest upstream of the same major. Applies a patch if necessary.  
If the `git apply` command fails, a patch file will be written in the current directory.

### `update-v8 major --branch=branchName`

Replaces `deps/v8` with the `lkgr` branch or with `branchName` if it is specified.

### `update-v8 backport --sha=SHA`

Fetches and applies the patch corresponding to SHA. Increments the V8 patch version
and commits the changes.  
If the `git apply` command fails, a patch file will be written in the current directory.

### Options

#### `--node-dir=/path/to/node`

Specify path to the Node.js git repository. Defaults to current working directory.

#### `--verbose`

#### `--base-dir=/path/to/base/dir`

Specify path where V8 clone will be maintained. Defaults to `~/.update-v8`.

## License

[MIT](./LICENSE)
