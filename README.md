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

`builddev` - Check current source code for errors and build developer version.

`replacetest` - Replace strings for testing in built oSDK library according to configuration in file specified by `--profile` option.

`replacewip` - Replace strings for developing in built oSDK library according to configuration in file specified by `--profile` option.

`builddocsdev` - Build documentation from current source code.

`deploydocsdev` - Deploy prebuilt documentation to developers server.

`build` - Build production minified version.

`buildclean` - Build production unminified version.

`builddocs` - Build production version documentation.

## Options:

`--osdktag=<tag>` - Build code tagged with specified git tag `<tag>`.

`--profile=<configname>` - Build with custom configuration where `<configname>` is the part of file `./teligent-osdk-config-<configname>.json`. By defauld build script uses `./teligent-osdk-config-default.json`.

`--nosip` - Build oSDK without SIP module.

`--noxmpp` - Build oSDK without XMPP module.

## Defaults:

Running `grunt` is equivalent for running `grunt build builddocs`

## Notice:

Building some older versions may be inaccurate as the build script is always of current version. To build that versions use `git checkout` by tag manually and version's own build scripts and readme's.