### Where it is:

`./src` - source files.
`./build` - built files.

### Prepare to use:

You need `nodejs`.

Install `grunt-cli` system-wide:

    npm install -g grunt-cli

Install node modules by command:

    npm install

### Usage:

Build:

    grunt

Build with uglification:

    grunt builduglify

Build with custom configuration:

1) Create file (for example see `./teligent-osdk-config-default.json`):

    ./teligent-osdk-config-<configname>.json

2) Run:

    grunt --profile=<configname>

Build documentation (index will be in `./build/doc`):

    grunt gendoc

You can group `--profile` parameter and other options.
