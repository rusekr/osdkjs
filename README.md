### Where it is:

`./src` - Source files.
`./built` - Built files.
`./builtdocs` - Built documentation index.

### Prepare to use:

You need `nodejs`.

Install `grunt-cli` system-wide:

    npm install -g grunt-cli

Install node modules by command:

    npm install

NOTICE:
If you have problems with SSL while downloading node modules you can change download link to non-ssl with command:

    npm config set registry http://registry.npmjs.org/

### Building:

## Command template:

    grunt [option]... [parameter]...

## Parameters:

`check` - Check current source code for errors.

`preparedev` - Check current source code for errors, clear `built/clean` and `built/minified` directories and retreive current developer version from git.

`builddev` - Build prepared developer version.

`replacetest` - Replace strings for testing in built oSDK library according to configuration in file specified by `--profile` option.

`replacewip` - Replace strings for developing in built oSDK library according to configuration in file specified by `--profile` option.

`preparedocsdev` - Retreive developer version from git and clean `built/documentation` directory.

`builddocsdev` - Build prepared developer version documentation from current source code.

`deploydocsdev` - Deploy built documentation to developers server.

`prepare` - Clear `built/clean` and `built/minified` directories and retreive current developer version from `--osdktag` option or git last commit.

`build` - Build prepared production minified and clean versions.

`preparedocs` - Retreive version from git tag or last commit and clean `built/documentation` directory.

`builddocs` - Build prepared production version documentation.

## Options:

`--osdktag=<tag>` - Build code tagged with specified git tag `<tag>`.

`--profile=<configname>` - Build with custom configuration where `<configname>` is the part of file `./teligent-osdk-config-<configname>.json`. By defauld build script uses `./teligent-osdk-config-default.json`.

`--modules=<modulenames>` - Build oSDK with specified modules (see `teligent-osdk.json` for module names, source files maps and defaults).

## Defaults:

Running `grunt` is equivalent for running `grunt prepare build preparedocs builddocs`

## Notice:

Building some older versions may be inaccurate as the build script is always of current version. To build that versions use `git checkout` by tag manually and version's own build scripts and readme's.