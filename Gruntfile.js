module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('teligent-osdk.json'),
    banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
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
          'src/osdk.deps.js',
          'src/osdk.utils.js',
          'src/osdk.errors.js',
          'src/osdk.auth.js',
          'src/osdk.sip.js',
          'src/osdk.config.js',

          'src/osdk.loaded-signal.js'
        ],
        dest: 'build/jquery.<%= pkg.name %>.js'
      },
    },
    uglify: {
      options: {
        banner: '<%= banner %>'
      },
      dist: {
        src: '<%= concat.dist.dest %>',
        dest: 'build/jquery.<%= pkg.name %>.min.js'
      },
    },
    jsdoc: {
      dist: {
        src: ['src/*.js', 'jsdoc/index.md'],
        options: {
          destination: 'build/doc',
          private: false,
          template: 'jsdoc/templates/teligent',
        },
      },
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
        ],
      },
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
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-jsdoc');


  // Default task(s).
  grunt.registerTask('default', ['clean', 'concat', 'uglify', 'jsdoc', 'copy']);
  
  grunt.registerTask('check', ['jshint']);

};