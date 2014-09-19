module.exports = function(grunt) {

  // Load the plugin that provides the "uglify" task.
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
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= buildversion %> - ' +
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
      '*\n'
//       +
//       '* Crocodile MSRP (https://github.com/crocodilertc/crocodile-msrp)\n' +
//       '*  Copyright (c) 2012-2013 Crocodile RCS Ltd\n' +
//       '*  License: MIT\n' +
//       '*/\n'
      ,

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
          'temp/libs/jssip/jssip.js',
//          'temp/libs/crocodile-msrp/crocodile-msrp.js',
          'temp/libs/jsjac/jsjac.js',

          'temp/src/osdk.namespace.js',
          'temp/src/osdk.utils.js',

          'temp/src/osdk.module.errors.js',
          'temp/src/osdk.module.auth.js',
          'temp/src/osdk.module.user.js',
          'temp/src/osdk.module.sip.js',
          'temp/src/osdk.module.xmpp.js',

          'temp/src/osdk.module.client.js',

          'temp/src/osdk.module.test.js'
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
        src: ['temp/src/*.js', 'temp/jsdoc/index.md'],
        options: {
          destination: 'build/doc',
          private: false,
          template: 'temp/jsdoc/templates/teligent',
          tutorials: 'temp/jsdoc/tutorials',
        }
      }
    },
    copy: {
      main: {
        files: [
          {
            expand: true,
            cwd: 'temp/jsdoc/static/',
            src: ['**'],
            dest: 'build/doc/'
          }
        ]
      }
    },
    jshint: {
      all: [
        'temp/src/*.js'
      ]
    }
  });

  // Our custom tasks.
  grunt.registerTask('releasetag', 'Copies tree by specified tag or from master to ./temp', function(ugly, gendoc) {

    var done = this.async();

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

    // Version to build by tag or by last commit from last tag.
    var tagversion = grunt.option('tagversion')?grunt.option('tagversion'):false;

    if (!tagversion) {
      // Grabbing last tag and last commit.
      tagversion = exec('git describe');
    }

    exec('rm -rf temp && mkdir temp && git archive ' + tagversion + ' | tar -x -C temp');

    console.log('Build version:', tagversion);
    grunt.config('buildversion', tagversion);

    done();
  });

//  grunt.registerTask('build', ['gettagversion', 'savedefault', 'checkouttag', 'buildcurrenttree', 'checkoutdefault']);


  // Tasks.
  grunt.registerTask('check', ['releasetag', 'jshint']);

  grunt.registerTask('gendoc', ['releasetag', 'jsdoc', 'copy']);
  grunt.registerTask('buildugly', ['build', 'uglify']);

  grunt.registerTask('build', ['releasetag', 'check', 'clean', 'concat', 'replace']);

  grunt.registerTask('default', ['build']);

};
