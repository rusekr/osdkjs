module.exports = function(grunt) {

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

  // Module names to source files converter function.
  var srcToBuild = function (toBuild) {

    toBuild = (typeof toBuild === 'undefined' || !toBuild)?pkg.modulesDefault:toBuild;

    var srcToBuild = [];
    var resultModules = [];
    for(var moduleName in pkg.srcFiles) {
      if(toBuild.indexOf(moduleName) !== -1) {
        srcToBuild = srcToBuild.concat(pkg.srcFiles[moduleName]);
        resultModules.push(moduleName);
      }
    }

    grunt.config('modules', resultModules);
    // console.log('Set modules grunt to', resultModules);
    return srcToBuild;
  }

  var pkg = grunt.file.readJSON('teligent-osdk.json');

  var toBuild = grunt.option('modules') ? ['base'].concat(grunt.option('modules').split(',')) : pkg.modulesDefault;

  // Project configuration.
  grunt.config.init({
    pkg: pkg,
    // Configuration file according to profile.
    config: grunt.file.readJSON('teligent-osdk-config-' + (grunt.option('profile') ? grunt.option('profile') : 'default') + '.json'),
    clean: {
      milestone: ['built/clean', 'built/minified'],
      developer: ['<%= clean.milestone %>'],
      docsmilestone: ['built/documentation'],
      docsdeveloper: ['<%= clean.docsmilestone %>']
    },
    concat: {
      options: {
        banner: '<%= pkg.banner.join("\\n") %>',
        stripBanners: true,
        process: true
      },
      milestone: {
        dest: 'built/clean/<%= pkg.name %><%= namePostfix %>-devel/<%= pkg.name %>.js'
      },
      milestonebasesip: {
        src: srcToBuild(['base', 'sip']).map(function (value) { return 'temp/' + value; }),
        dest: 'built/clean/<%= pkg.name %>-base-sip-devel/<%= pkg.name %>.js'
      },
      milestonebasexmpp: {
        src: srcToBuild(['base', 'xmpp']).map(function (value) { return 'temp/' + value; }),
        dest: 'built/clean/<%= pkg.name %>-base-xmpp-devel/<%= pkg.name %>.js'
      },
      milestonebase: {
        src: srcToBuild(['base']).map(function (value) { return 'temp/' + value; }),
        dest: 'built/clean/<%= pkg.name %>-base-devel/<%= pkg.name %>.js'
      },
      developer: {
        dest: '<%= concat.milestone.dest %>'
      },
      developerbasesip: {
        src: srcToBuild(['base', 'sip']),
        dest: '<%= concat.milestonebasesip.dest %>'
      },
      developerbasexmpp: {
        src: srcToBuild(['base', 'xmpp']),
        dest: '<%= concat.milestonebasexmpp.dest %>'
      },
      developerbase: {
        src: srcToBuild(['base']),
        dest: '<%= concat.milestonebase.dest %>'
      }
    },
    replace: {
      test: {
        src: ['built/**/*.js','built/**/*.html'],
        overwrite: true,
        replacements: '<%= config.replacementsTEST %>'
      },
      wip: {
        src: ['built/**/*.js','built/**/*.html'],
        overwrite: true,
        replacements: '<%= config.replacementsWIP %>'
      }
    },
    uglify: {
      options: {
        banner: '<%= pkg.banner.join("\\n") %>'
      },
      milestone: {
        src: '<%= concat.milestone.dest %>',
        dest: 'built/minified/<%= pkg.name %><%= namePostfix %>/<%= pkg.name %>.js'
      },
      milestonebasesip: {
        src: '<%= concat.milestonebasesip.dest %>',
        dest: 'built/minified/<%= pkg.name %>-base-sip/<%= pkg.name %>.js'
      },
      milestonebasexmpp: {
        src: '<%= concat.milestonebasexmpp.dest %>',
        dest: 'built/minified/<%= pkg.name %>-base-xmpp/<%= pkg.name %>.js'
      },
      milestonebase: {
        src: '<%= concat.milestonebase.dest %>',
        dest: 'built/minified/<%= pkg.name %>-base/<%= pkg.name %>.js'
      }
    },
    symlink: {
      options: {
        overwrite: true
      },
      clean: {
        src: '<%= concat.milestone.dest %>',
        dest: 'built/clean/<%= pkg.name %>.js'
      },
      minified: {
        src: '<%= uglify.milestone.dest %>',
        dest: 'built/minified/<%= pkg.name %>.js'
      }
    },
    jsdoc: {
      milestone: {
        src: ['temp/src/*.js', 'temp/jsdoc/index.md'],
        options: {
          destination: 'built/documentation',
          private: false,
          template: 'temp/jsdoc/templates/teligent',
          tutorials: 'temp/jsdoc/tutorials'
        }
      },
      developer: {
        src: ['src/*.js', 'jsdoc/index.md'],
        options: {
          destination: 'built/documentation',
          private: false,
          template: 'jsdoc/templates/teligent',
          tutorials: 'jsdoc/tutorials'
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
            dest: 'built/documentation'
          }
        ]
      },
      developer: {
        files: [
          {
            expand: true,
            cwd: 'jsdoc/static/',
            src: ['**'],
            dest: 'built/documentation'
          }
        ]
      }
    },
    jshint: {
      developer: [
        'src/*.js'
      ]
    },
    rsync: {
      options: {
          args: ["--verbose -c --rsh='ssh -p22'"],
          exclude: [],
          recursive: true
      },
      docswip: {
          options: {
              src: "built/documentation/",
              dest: '<%= config.remotePathWIP %>/doc',
              host: '<%= config.remoteUserWIP %>@<%= config.remoteHostWIP %>',
              syncDestIgnoreExcl: true
          }
      }
    }
  });

  // Loading plugins.
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-symlink');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-rsync');
  grunt.loadNpmTasks('grunt-text-replace');

  // Our custom tasks.
  grunt.registerTask('releasedevel', 'Manages building of developer version.', function () {
    var done = this.async();

    var tagversionfromgit = exec('git describe');
    var tagversionfromgitdev = exec('git describe --dirty=-dev');
    var tagversion = tagversionfromgit + (tagversionfromgitdev != tagversionfromgit?'-dev':'');
    grunt.config('buildversion', tagversion);
    console.log('Building developer version:', tagversion);
    done();
  });
  grunt.registerTask('releasetag', 'Manages building of tagged version. Copies tree by specified as "--osdktag" option tag or from last commit to ./temp.', function() {
    var done = this.async();

    var tagversion = grunt.option('osdktag') ? grunt.option('osdktag') : false;
    if (!tagversion) {
      tagversion = exec('git describe');
    }
    grunt.config('buildversion', tagversion);
    console.log('Building release version:', tagversion);
    exec('rm -rf temp && mkdir temp && git archive ' + tagversion + ' | tar -x -C temp');
    done();
  });


  // Other tasks.

  // Check code (only developer version in src)
  grunt.registerTask('check', ['jshint:developer']);

  grunt.registerTask('preparedev', ['releasedevel', 'check', 'clean:developer']);

  grunt.registerTask('builddev', function () {
    grunt.config('concat.developer.src', srcToBuild(toBuild));
    console.log('Included modules:', grunt.config('modules'));
    grunt.config('namePostfix', (pkg.modulesDefault === toBuild) ? '' : '-' + grunt.config('modules').join('-'));
    grunt.task.run('concat:developer');
    grunt.task.run('symlink:clean');
  });
  grunt.registerTask('buildbasesipdev', function () {
    grunt.config('modules', ['base', 'sip']);
    grunt.task.run('concat:developerbasesip');
  });
  grunt.registerTask('buildbasexmppdev', function () {
    grunt.config('modules', ['base', 'xmpp']);
    grunt.task.run('concat:developerbasexmpp');
  });
  grunt.registerTask('buildbasedev', function () {
    grunt.config('modules', ['base']);
    grunt.task.run('concat:developerbase');
  });

  grunt.registerTask('preparedocsdev', ['releasedevel', 'clean:docsdeveloper']);
  grunt.registerTask('builddocsdev', ['jsdoc:developer', 'copy:developer']);

  grunt.registerTask('buildalldev', ['preparedev', 'builddev', 'buildbasesipdev', 'buildbasexmppdev', 'buildbasedev', 'preparedocsdev', 'builddocsdev']);

  grunt.registerTask('deploydocsdev', ['rsync:docswip']);

  grunt.registerTask('replacetest', ['replace:test']);
  grunt.registerTask('replacewip', ['replace:wip']);

  grunt.registerTask('prepare', ['releasetag', 'clean:milestone']);

  grunt.registerTask('build', function () {
    grunt.config('concat.milestone.src', srcToBuild(toBuild).map(function (value) { return 'temp/' + value; }));
    console.log('Included modules:', grunt.config('modules'));
    grunt.config('namePostfix', (pkg.modulesDefault === toBuild) ? '' : '-' + grunt.config('modules').join('-'));
    grunt.task.run('concat:milestone', 'symlink:clean', 'uglify:milestone', 'symlink:minified');
  });
  grunt.registerTask('buildbasesip', function () {
    grunt.config('modules', ['base', 'sip']);
    grunt.task.run('concat:milestonebasesip', 'uglify:milestonebasesip');
  });
  grunt.registerTask('buildbasexmpp', function () {
    grunt.config('modules', ['base', 'xmpp']);
    grunt.task.run('concat:milestonebasexmpp', 'uglify:milestonebasexmpp');
  });
  grunt.registerTask('buildbase', function () {
    grunt.config('modules', ['base']);
    grunt.task.run('concat:milestonebase', 'uglify:milestonebase');
  });

  grunt.registerTask('preparedocs', ['releasetag', 'clean:docsmilestone']);
  grunt.registerTask('builddocs', ['jsdoc:milestone', 'copy:milestone']);

  grunt.registerTask('buildall', ['prepare', 'build', 'buildbasesip', 'buildbasexmpp', 'buildbase', 'preparedocs', 'builddocs']);

  grunt.registerTask('default', ['prepare', 'build', 'preparedocs', 'builddocs']);

};
