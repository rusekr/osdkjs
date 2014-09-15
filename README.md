### Where it is:

`./src` - source files.
`./build` - built files.

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

Build:

    grunt

Build:

    grunt build

Build without git (you must specify version by last git tag manually):

    grunt --showversion=<version_to_show_to_client>

Build with uglification:

    grunt builduglify

Build with custom configuration:

1) Create file (for example see `./teligent-osdk-config-default.json`):

    ./teligent-osdk-config-<configname>.json

2) Run:

    grunt --profile=<configname>

Build documentation (index will be in `./build/doc`):

    grunt gendoc

You can group `--profile` and `--showversion` parameters and other options.
