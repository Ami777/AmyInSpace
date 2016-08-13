var gulp = require('gulp'),
	ts = require('gulp-typescript'),
	rename = require('gulp-rename'),
    browserify = require('browserify'),
	watchify = require('watchify'),
	tsify = require('tsify'),
    uglify = require('gulp-uglify'),
    gutil = require('gulp-util'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
	walkSync = require('walk-sync'),
	assign = require('lodash.assign');

var
	srcTsSource = 'src/ts/',
    sourceFiles = {
        srcTsEntryPoint : 'app.ts'
    },
	srcJsTarget = 'build/js/',
	targetFiles = {
		srcJsTarget : 'app.js'
	};

function isListingTasks() {
	return process.argv[process.argv.length - 1] === '--tasks';
}

if (!isListingTasks()) {

//Prepare Browserify/Watchify:
	var opts = assign({}, watchify.args, {
			entries: [srcTsSource + sourceFiles['srcTsEntryPoint']]
		}),
		alreadyAddedWalk = false;


	var bwatch = watchify(
		browserify(opts)
			.add(srcTsSource + sourceFiles['srcTsEntryPoint'])
			.plugin(tsify, {
				noImplicitAny: false,
				removeComments: true,
				jsx: 'react'
			})
	);


	bwatch.on('update', bundleJs); // on any dep update, runs the bundler
	bwatch.on('log', gutil.log); // output build logs to terminal
	bundleJs();

}

gulp.task('production', ['app-js'], function(){
	return gulp.src(srcJsTarget+'/'+targetFiles['srcJsTarget'])
		.pipe(uglify())
		.on('error', function (error) { console.error(error.toString()); })
		.pipe(gulp.dest(srcJsTarget));
});

function bundleJs(){
	if (!alreadyAddedWalk) {
		alreadyAddedWalk = true;
		walkSync(srcTsSource).forEach(function (file) {
			if (file.match(/\.d\.tsx?$/) || file.match(/\.tsx?$/) || file.match(/\.jsx?$/)) {
				bwatch.add(srcTsSource + file);
			}
		});
	}

	return bwatch.bundle()
		.on('error', function (error) { console.error(error.toString(), error.stack); })
		.pipe(source(sourceFiles['srcTsEntryPoint']))
		.pipe(buffer())
		.on('error', function (error) { console.error(error.toString(), error.stack); })
		.pipe(rename(targetFiles['srcJsTarget']))
		.pipe(gulp.dest(srcJsTarget));
}

gulp.task('app-js', function(){
	var ret = bundleJs();
	bwatch.close();
	console.log('Manual close of this Gulp task may be required.');
	return ret;
});

gulp.task('watch', function(){
	// watchify is turned on anyway
});

