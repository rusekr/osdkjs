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
    for(var moduleName in pkg.srcFiles) {
      if(toBuild.indexOf(moduleName) !== -1)
      srcToBuild = srcToBuild.concat(pkg.srcFiles[moduleName]);
    }
    return srcToBuild;
  }

  var pkg = grunt.file.readJSON('teligent-osdk.json');

  // Profile for config selection to build.
  var profile = grunt.option('profile') ? grunt.option('profile') : 'default';
  // Git tag to build.
  var tagversion = grunt.option('osdktag') ? grunt.option('osdktag') : false;

  var toBuild = grunt.option('modules') ? ['base'].concat(grunt.option('modules').split(/,;/)) : pkg.modulesDefault;

  var namePostfix = (pkg.modulesDefault === toBuild) ? '' : '-' + toBuild.join('-');

  // Configuration file according to profile.
  var currentConfig = grunt.file.readJSON('teligent-osdk-config-' + profile + '.json');
  // Last tag version (plus commits if exists) from git repository. (No "--dirty" because "releasetag" ignores current tree)
  var tagversionfromgit = exec('git describe');
  // Dirty flag
  var tagversionfromgitdev = exec('git describe --dirty=-dev');
  // Using git tag if not specified.
  if (!tagversion) {
    tagversion = tagversionfromgit;
  }

  // Project configuration.
  grunt.config.init({
    pkg: pkg,
    modules: toBuild,
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
        src: srcToBuild(toBuild).map(function (value) { return 'temp/' + value; }),
        dest: 'built/clean/<%= pkg.name %>' + namePostfix + '/<%= pkg.name %>.js'
      },
      milestonebasesip: {
        src: srcToBuild(['base', 'sip']).map(function (value) { return 'temp/' + value; }),
        dest: 'built/clean/<%= pkg.name %>-base-sip/<%= pkg.name %>.js'
      },
      milestonebasexmpp: {
        src: srcToBuild(['base', 'xmpp']).map(function (value) { return 'temp/' + value; }),
        dest: 'built/clean/<%= pkg.name %>-base-xmpp/<%= pkg.name %>.js'
      },
      milestonebase: {
        src: srcToBuild(['base']).map(function (value) { return 'temp/' + value; }),
        dest: 'built/clean/<%= pkg.name %>-base/<%= pkg.name %>.js'
      },
      developer: {
        src: srcToBuild(toBuild),
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
        replacements: currentConfig.replacementsTEST
      },
      wip: {
        src: ['built/**/*.js','built/**/*.html'],
        overwrite: true,
        replacements: currentConfig.replacementsWIP
      }
    },
    uglify: {
      options: {
        banner: '<%= pkg.banner.join("\\n") %>'
      },
      milestone: {
        src: '<%= concat.milestone.dest %>',
        dest: 'built/minified/<%= pkg.name %>' + namePostfix + '/<%= pkg.name %>.js'
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
              dest: currentConfig.remotePathWIP + "/doc",
              host: currentConfig.remoteUserWIP + "@" + currentConfig.remoteHostWIP,
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
    tagversion = tagversionfromgit + (tagversionfromgitdev != tagversionfromgit?'-dev':'');
    grunt.config('buildversion', tagversion);
    console.log('Building developer version:', tagversion);
    done();
  });
  grunt.registerTask('releasetag', 'Manages building of tagged version. Copies tree by specified as "--osdktag" option tag or from last commit to ./temp.', function() {
    var done = this.async();
    grunt.config('buildversion', tagversion);
    console.log('Building release version:', tagversion);
    exec('rm -rf temp && mkdir temp && git archive ' + tagversion + ' | tar -x -C temp');
    done();
  });


  // Other tasks.

  // Check code (only developer version in src)
  grunt.registerTask('check', ['jshint:developer']);

  grunt.registerTask('preparedev', ['releasedevel', 'check', 'clean:developer']);
  grunt.registerTask('builddev', ['concat:developer', 'symlink:clean']);
  grunt.registerTask('buildbasesipdev', ['concat:developerbasesip']);
  grunt.registerTask('buildbasexmppdev', ['concat:developerbasexmpp']);
  grunt.registerTask('buildbasedev', ['concat:developerbase']);

  grunt.registerTask('preparedocsdev', ['releasedevel', 'clean:docsdeveloper']);
  grunt.registerTask('builddocsdev', ['jsdoc:developer', 'copy:developer']);

  grunt.registerTask('buildalldev', ['preparedev', 'builddev', 'buildbasesipdev', 'buildbasexmppdev', 'buildbasedev', 'preparedocsdev', 'builddocsdev']);

  grunt.registerTask('deploydocsdev', ['rsync:docswip']);

  grunt.registerTask('replacetest', ['replace:test']);
  grunt.registerTask('replacewip', ['replace:wip']);

  grunt.registerTask('prepare', ['releasetag', 'clean:milestone']);
  grunt.registerTask('build', ['concat:milestone', 'symlink:clean', 'uglify:milestone', 'symlink:minified']);
  grunt.registerTask('buildbasesip', ['concat:milestonebasesip', 'uglify:milestonebasesip']);
  grunt.registerTask('buildbasexmpp', ['concat:milestonebasexmpp', 'uglify:milestonebasexmpp']);
  grunt.registerTask('buildbase', ['concat:milestonebase', 'uglify:milestonebase']);

  grunt.registerTask('preparedocs', ['releasetag', 'clean:docsmilestone']);
  grunt.registerTask('builddocs', ['jsdoc:milestone', 'copy:milestone']);

  grunt.registerTask('buildall', ['prepare', 'build', 'buildbasesip', 'buildbasexmpp', 'buildbase', 'preparedocs', 'builddocs']);

  grunt.registerTask('default', ['prepare', 'build', 'preparedocs', 'builddocs']);

};
