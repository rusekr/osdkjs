module.exports = function(grunt) {

  var profile = grunt.option('profile')?grunt.option('profile'):'default';
  var showversion = grunt.option('showversion')?grunt.option('showversion'):false;
  if (!showversion) {
    var exec = require('shelljs').exec;
    showversion = exec('git describe --long', {silent:true});
    if (showversion.code === 0) {
      showversion = showversion.output.replace(/(\r\n|\n|\r)/gm,"");
    } else {
      console.error('No showversion found. Use --showversion or build from repository.');
      return;
    }
  }
  console.log(showversion);

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('teligent-osdk.json'),
    build: {
      version: showversion,
    },
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
      '* JSO (https://github.com/andreassolberg/jso)\n' +
      '*  Copyright (c) 2012 Andreas Åkre Solberg\n' +
      '*  License: Simplified BSD License\n' +
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

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-text-replace');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-jsdoc');

  // Tasks
  grunt.registerTask('check', ['jshint']);

  grunt.registerTask('build', ['check', 'clean', 'concat', 'replace']);
  grunt.registerTask('gendoc', ['jsdoc', 'copy']);
  grunt.registerTask('buildugly', ['build', 'uglify']);

  grunt.registerTask('default', ['build']);

};
