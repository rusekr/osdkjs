module.exports = function(grunt) {

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-path-check');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-text-replace');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-jsdoc');

  var profile = grunt.option('profile')?grunt.option('profile'):'default';

  // Project configuration.
  grunt.config.init({
    pkg: grunt.file.readJSON('teligent-osdk.json'),
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= build.version %> - ' +
      '<%= pkg.homepage ? "* " + pkg.homepage + "\\n" : "" %>' +
      '* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
      ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>\n' +
      '*\n' +
      '* Incorporates the following third-party open source software:\n' +
      '*\n' +
      '* JsSIP (http://www.jssip.net/)\n' +
      '*  Copyright (c) 2012-2013 José Luis Millán - Versatica\n' +
      '*  License: MIT\n' +
      '*\n' +
      '* JSJaC (https://github.com/sstrigler/JSJaC)\n' +
      '*  Copyright (c) 2004-2008 Stefan Strigler\n' +
      '*  License: MPL-1.1/GPL-2.0+/LGPL-2.1+\n' +
      '*\n' +
      '* Crocodile MSRP (https://github.com/crocodilertc/crocodile-msrp)\n' +
      '*  Copyright (c) 2012-2013 Crocodile RCS Ltd\n' +
      '*  License: MIT\n' +
      '*/\n',

    clean: {
      files: ['build']
    },
    concat: {
      options: {
        banner: '<%= banner %>',
        stripBanners: true,
        process: true
      },
      dist: {
        src: [
          'libs/jssip/jssip.js',
          'libs/crocodile-msrp/crocodile-msrp.js',
          'libs/jsjac/jsjac.js',

          'src/osdk.namespace.js',
          'src/osdk.utils.js',

          'src/osdk.module.errors.js',
          'src/osdk.module.auth.js',
          'src/osdk.module.user.js',
          'src/osdk.module.sip.js',
          'src/osdk.module.xmpp.js',

          'src/osdk.module.client.js',

          'src/osdk.module.test.js'
        ],
        dest: 'build/<%= pkg.name %>.js'
      }
    },

    replace: {
      milestone: {
        src: ['build/**/*.js'],             // source files array (supports minimatch)
        overwrite: true,
        replacements: grunt.file.readJSON('teligent-osdk-config-' + profile + '.json').replacements
      }
    },
    uglify: {
      options: {
        banner: '<%= banner %>'
      },
      dist: {
        src: '<%= concat.dist.dest %>',
        dest: 'build/<%= pkg.name %>.js'
      }
    },
    jsdoc: {
      dist: {
        src: ['src/*.js', 'jsdoc/index.md'],
        options: {
          destination: 'build/doc',
          private: false,
          template: 'jsdoc/templates/teligent',
          tutorials: 'jsdoc/tutorials',
        }
      }
    },
    copy: {
      main: {
        files: [
          {
            expand: true,
            cwd: 'jsdoc/static/',
            src: ['**'],
            dest: 'build/doc/'
          }
        ]
      }
    },
    jshint: {
      all: [
        'src/*.js'
      ]
    }
  });

  // Tasks.
  grunt.registerTask('check', ['jshint']);

  // Our custom tasks.
  grunt.registerTask('build', 'Builds oSDK by specified git tag', function(ugly, gendoc) {
    // Wrapper to exec.
    var exec = function () {
      var realOutput = require('shelljs').exec.apply(this, Array.prototype.slice.call(arguments, 0));
      if (realOutput.code === 0) {
        return realOutput.output.replace(/(\r\n|\n|\r)/gm,"");
      } else {
        console.error('Something wrong with command', arguments[0]);
        return false;
      }
    };

    // Building current tree
    var build = function () {
      grunt.config('build', { version: tagversion });
      console.log('Building oSDK version:', tagversion);
      grunt.task.run(['check', 'clean', 'concat', 'replace']);
    };

    // System has git and we are in a git repo.
    var hasGitRepo = exec('which git 2>&1 >/dev/null && [ -d .git ] || git rev-parse --git-dir > /dev/null 2>&1 && echo 1');
    // Version to build by tag or by last commit from last tag.
    var tagversion = grunt.option('tagversion')?grunt.option('tagversion'):false;

    if (hasGitRepo) {
      if (!tagversion) {
        // Grabbing last tag and last commit.
        tagversion = exec('git describe --long', {silent:true});
        // Building
        build();
      } else {
        // Remember current branch.
        var currentBranch = exec('git symbolic-ref --short HEAD');
        // Checking out specified tag.
        exec('git checkout ' + tagversion);
        // Building.
        build();
        // Returning to saved branch.
        exec('git checkout ' + currentBranch);
      }

    } else {
      if (!tagversion) {
        // No git and no tagversion - aborting.
        console.error('No tagversion found. Use --tagversion or build from repository.');
        return false;
      } else {
        // Building with specified tagversion.
        build();
      }
    }

  });

  grunt.registerTask('gendoc', ['jsdoc', 'copy']);
  grunt.registerTask('buildugly', ['build', 'uglify']);

  grunt.registerTask('default', ['build']);

};
