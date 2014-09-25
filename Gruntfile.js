module.exports = function(grunt) {

  // Source files of oSDK to build.
  var srcfiles = [
    'libs/jssip/jssip.js',
//  'temp/libs/crocodile-msrp/crocodile-msrp.js',
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
  ];
  // Banner for built file.
  var banner = '/*! <%= pkg.title || pkg.name %> - v<%= buildversion %> - ' +
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
      '*/\n';
//       +
//       '/* Crocodile MSRP (https://github.com/crocodilertc/crocodile-msrp)\n' +
//       '*  Copyright (c) 2012-2013 Crocodile RCS Ltd\n' +
//       '*  License: MIT\n' +
//       '*/\n'

  // Profile of oSDK config to build.
  var profile = grunt.option('profile')?grunt.option('profile'):'default';
  // Git tag to build.
  var tagversion = grunt.option('osdktag')?grunt.option('osdktag'):false;

  // Wrapper to exec function.
  var exec = function () {
    var shjs = require('shelljs');
    shjs.config.silent = true;
    var realOutput = shjs.exec.apply(this, Array.prototype.slice.call(arguments, 0));
    if (realOutput.code === 0) {
      return realOutput.output.replace(/(\r\n|\n|\r)/gm,"");
    } else {
      console.error('Something wrong with command', arguments[0]);
      return false;
    }
  };

  // Replacements strings by oSDK building profile.
  var replacements = grunt.file.readJSON('teligent-osdk-config-' + profile + '.json').replacements;
  // Last tag version (plus commits if exists) from git repository.
  var tagversionfromgit = exec('git describe');
  // Using git tag if not specified.
  if (!tagversion) {
    tagversion = tagversionfromgit;
  }

  // Project configuration.
  grunt.config.init({
    pkg: grunt.file.readJSON('teligent-osdk.json'),
    clean: {
      milestone: ['built'],
      developer: ['<%= clean.milestone %>'],
      docsmilestone: ['builtdocs'],
      docsdeveloper: ['<%= clean.docsmilestone %>']
    },
    concat: {
      options: {
        banner: banner,
        stripBanners: true,
        process: function(src, filepath) {
          for (var val in replacements) {
            src = src.replace(replacements[val].from, replacements[val].to);
          }
          return grunt.template.process(src);
        }
      },
      milestone: {
        src: srcfiles.map(function (value) { return 'temp/' + value; }),
        dest: 'built/<%= pkg.name %>.js'
      },
      developer: {
        src: srcfiles,
        dest: '<%= concat.milestone.dest %>'
      }
    },
    uglify: {
      options: {
        banner: banner
      },
      milestone: {
        src: '<%= concat.milestone.dest %>',
        dest: '<%= concat.milestone.dest %>'
      }
    },
    jsdoc: {
      milestone: {
        src: ['temp/src/*.js', 'temp/jsdoc/index.md'],
        options: {
          destination: 'builtdocs',
          private: false,
          template: 'temp/jsdoc/templates/teligent',
          tutorials: 'temp/jsdoc/tutorials',
        }
      },
      developer: {
        src: ['src/*.js', 'jsdoc/index.md'],
        options: {
          destination: 'builtdocs',
          private: false,
          template: 'jsdoc/templates/teligent',
          tutorials: 'jsdoc/tutorials',
        }
      }
    },
    copy: {
      milestone: {
        files: [
          {
            expand: true,
            cwd: 'temp/jsdoc/static/',
            src: ['**'],
            dest: 'builtdocs/'
          }
        ]
      },
      developer: {
        files: [
          {
            expand: true,
            cwd: 'jsdoc/static/',
            src: ['**'],
            dest: 'builtdocs/'
          }
        ]
      }
    },
    jshint: {
      developer: [
        'src/*.js'
      ]
    }
  });

  // Loading plugins.
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-jsdoc');

  // Our custom tasks.
  grunt.registerTask('releasedevel', 'Manages building developer version', function () {
    var done = this.async();
    tagversion = tagversionfromgit + '-devel';
    grunt.config('buildversion', tagversion);
    console.log('Building developer version:', tagversion);
    done();
  });
  grunt.registerTask('releasetag', 'Copies tree by specified as "--osdktag" option tag or from last commit to ./temp', function() {
    var done = this.async();
    grunt.config('buildversion', tagversion);
    console.log('Building release version:', tagversion);
    exec('rm -rf temp && mkdir temp && git archive ' + tagversion + ' | tar -x -C temp');
    done();
  });


  // Other tasks.

  // Check code (only developer version in src)
  grunt.registerTask('check', ['jshint:developer']);
  grunt.registerTask('builddev', ['releasedevel', 'check', 'clean:developer', 'concat:developer']);
  grunt.registerTask('builddocsdev', ['releasedevel', 'clean:docsdeveloper', 'jsdoc:developer', 'copy:developer']);

  grunt.registerTask('build', ['releasetag', 'clean:milestone', 'concat:milestone', 'uglify:milestone']);
  grunt.registerTask('buildclean', ['releasetag', 'clean:milestone', 'concat:milestone']);
  grunt.registerTask('builddocs', ['releasetag', 'clean:docsmilestone', 'jsdoc:milestone', 'copy:milestone']);

  grunt.registerTask('default', ['build', 'builddocs']);

};
