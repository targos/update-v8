# update-v8

CLI to simplify updates of V8 in the Node.js project

## Installation

```bash
$ npm install -g update-v8
```

## Usage

Assuming current working directory is the root of a Node git clone.  
This tool will maintain a clone of the V8 repository in `~/.update-v8/v8`

### `update-v8 minor`

Compare current V8 version with latest upstream of the same major. Applies applies a patch if necessary.  
If the `git apply` command fails, a patch file will be written in the current directory.

### `update-v8 major [branchName]`

Compare current V8 version with upstream's `*lkgr` branches. Replaces `deps/v8` with the most recent
release branch or with `branchName` if it is specified.  
If no new release branch is found, `lkgr` will be used.

## License

[MIT](./LICENSE)
