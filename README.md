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

### Usage:

## Command template:

    grunt [option]... [parameter]...

## Parameters:

`check` - Check current source code for errors.

`builddev` - Check current source code for errors and build developer version.

`builddocsdev` - Build documentation from current source code.

`build` - Build production minified version.

`buildclean` - Build production unminified version.

`builddocs` - Build production version documentation.

## Options:

`--tag=<tag>` - Build code tagged with specified git tag `<tag>`.

`--profile=<configname>` - Build with custom configuration where `<configname>` is the part of file `./teligent-osdk-config-<configname>.json`. By defauld build script uses `./teligent-osdk-config-default.json`.

## Defaults:

Running `grunt` is equivalent for running `grunt build builddocs`