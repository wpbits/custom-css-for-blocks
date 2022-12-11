/**
 * Grunt tasks
 *
 * use 'grunt publish' for production
 *
 */

module.exports = function (grunt) {
	grunt.loadNpmTasks('grunt-mkdir');
	grunt.loadNpmTasks('grunt-contrib-clean');
	grunt.loadNpmTasks('grunt-zip');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-wp-i18n');

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		pluging_dir: './',

		//--------------------------
		// mkdir
		//--------------------------
		mkdir: {
			all: {
				options: {
					create: ['publish'],
				},
			},
		},

		//--------------------------
		// clean
		//--------------------------
		clean: {
			ds_store: ['<%= pluging_dir %>/**/.DS_Store'],
		},

		//--------------------------
		// copy
		//--------------------------
		copy: {
			plugin: {
				files: [
					{
						expand: true,
						flatten: false,
						src: [
							'<%= pkg.name %>.php',
							'php-vendor/**',
							'build/**',
							'languages/**',
							'*.md',
							'*.txt',
						],
						dest: './publish/<%= pkg.name %>/',
					},
				],
			},
		},

		//--------------------------
		// zip
		//--------------------------
		zip: {
		'release': {
			cwd: 'publish/<%= pkg.name %>/',
			src: ['publish/<%= pkg.name %>/**'],
			dest: 'publish/<%= pkg.name %>.zip'
		}
		},      		  

	});

	// Release Task
	grunt.registerTask('publish', [
		'mkdir:all',
		'clean:ds_store',
		'copy:plugin',
		'zip:release',
	]);
};
