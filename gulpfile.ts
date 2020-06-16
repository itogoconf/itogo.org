'use strict';
import {dest, parallel, series, src, task} from 'gulp';
import {DevMindGulpBuilder} from 'devmind-website';

import * as del from 'del';
import * as sourcemaps from 'gulp-sourcemaps';
import * as sass from 'gulp-sass';
import * as postcss from 'gulp-postcss';
import * as cssnano from 'cssnano';
import * as rev from 'gulp-rev';
import * as size from 'gulp-size';
import * as autoPrefixer from "autoprefixer";
import * as htmlmin from 'gulp-htmlmin';
import * as babel from 'gulp-babel';
import * as uglify from 'gulp-uglify';
import * as revReplace from 'gulp-rev-replace';
import * as imagemin from 'gulp-imagemin';
import * as cwebp from './node_modules/gulp-cwebp/index.js';
import {Duplex} from "stream";

const HTMLMIN_OPTIONS = {
    removeComments: true,
    collapseWhitespace: true,
    collapseBooleanAttributes: true,
    removeAttributeQuotes: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    removeOptionalTags: true,
    minifyCSS: true,
    minifyJS: true,
    jsmin: true
};

const HANDLEBARS_PARTIALS = [
    {key: '_html_header', path: 'src/templates/_html_header.handlebars'},
    {key: '_page_header', path: 'src/templates/_page_header.handlebars'},
    {key: '_page_footer', path: 'src/templates/_page_footer.handlebars'},
    {key: '_html_footer', path: 'src/templates/_html_footer.handlebars'}
];

const CACHE_BUSTING_EXTENSIONS = ['.js', '.css', '.html', '.xml', '.handlebars'];


const website = new DevMindGulpBuilder({
    metadata: {
        rss: 'src/metadata/rss.json',
        blog: 'src/metadata/blog.json',
        html: 'src/metadata/html.json',
        sitemap: 'src/metadata/sitemap.json'
    }
});


// Clean the working directories
// =============================
task('clean', () => del('build', {dot: true}));


// Compile sass file in css
// =============================
task('styles', (cb) => {
    src(['src/sass/main.scss'])
        .pipe(sass({precision: 10}).on('error', sass.logError))
        .pipe(dest('build/.tmp/css'))
        .pipe(rev())
        .pipe(sourcemaps.init())
        .pipe(postcss([autoPrefixer(), cssnano()]))
        .pipe(sourcemaps.write('./'))
        .pipe(size({title: 'styles'}))
        .pipe(dest('build/dist/css'))
        .pipe(rev.manifest())
        .pipe(dest('build/dist/css'))
        .on('end', () => cb())
});

// HTML pages generation
// =============================
task('html-indexing', () =>
    src(`src/html/**/*.html`)
        .pipe(website.readHtml())
        .pipe(website.convertToJson('pageindex.json'))
        .pipe(dest('build/.tmp')));

task('html-template', () =>
    src(`src/html/**/*.html`)
        .pipe(website.readHtml())
        .pipe(website.applyTemplate(`src/templates/site.handlebars`, HANDLEBARS_PARTIALS))
        .pipe(size({title: 'html', showFiles: true}))
        .pipe(dest('build/.tmp'))
        .pipe(htmlmin(HTMLMIN_OPTIONS))
        .pipe(dest('build/dist')));

task('html', parallel('html-indexing', 'html-template'));

// Javascript files
// =============================
task('local-js', () =>
    src(['src/js/*.js'])
        .pipe(babel({presets: ['@babel/env']}))
        .pipe(rev())
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(size({title: 'scripts'}))
        .pipe(sourcemaps.write())
        .pipe(dest('build/dist/js'))
        .pipe(rev.manifest())
        .pipe(dest('build/dist/js'))
);

task('vendor-js', () =>
    src(['node_modules/fg-loadcss/src/*.js'])
        .pipe(uglify())
        .pipe(dest('build/dist/js'))
);

// Images files
// =============================
// Converts png and jpg in webp
task('images-webp', () =>
    src('src/images/**/*.{png,jpg}')
        .pipe(cwebp() as Duplex)
        .pipe(dest('build/.tmp/img'))
);
// minify assets
task('images-minify', () =>
    src('src/images/**/*.{svg,png,jpg}')
        .pipe(imagemin([
            imagemin.gifsicle({interlaced: true}),
            imagemin.mozjpeg({progressive: true}),
            imagemin.optipng(),
            imagemin.svgo()]))
        .pipe(size({title: 'images', showFiles: false}))
        .pipe(dest('build/.tmp/img'))
);
// Images generated in image pre processing are renamed with a MD5 (cache busting) and copied in the dist directory
task('images', () =>
    src('build/.tmp/img/**/*.{svg,png,jpg,webp}')
        //.pipe(dest('build/dist/img'))
        .pipe(rev())
        .pipe(dest('build/dist/img'))
        .pipe(rev.manifest())
        .pipe(dest('build/dist/img'))
);

// Copy static files
// =============================
task('copy', (cb) =>
    src(['src/*.{ico,html,txt,json,webapp,xml}',
        'src/.htaccess',
        'node_modules/workbox-sw/build/*-sw.js'], {dot: true})
        .pipe(size({title: 'copy', showFiles: true}))
        .pipe(dest('build/dist'))
        .on('end', () => cb())
);

// Site
// =============================
task('sitemap', () =>
    src('build/.tmp/*index.json')
        .pipe(website.readIndex())
        .pipe(website.convertToSitemap())
        .pipe(dest('build/dist'))
);

// Cache busting
// =============================
const cacheBusting = (path, target?: string) =>
    src(path)
        .pipe(revReplace({
            manifest: src('build/dist/img/rev-manifest.json'),
            replaceInExtensions: CACHE_BUSTING_EXTENSIONS
        }))
        .pipe(revReplace({
            manifest: src('build/dist/css/rev-manifest.json'),
            replaceInExtensions: CACHE_BUSTING_EXTENSIONS
        }))
        .pipe(revReplace({
            manifest: src('build/dist/js/rev-manifest.json'),
            replaceInExtensions: CACHE_BUSTING_EXTENSIONS
        }))
        .pipe(dest(target ? target : 'build/dist'));

task('cache-busting', () => cacheBusting('build/dist/**/*.{html,js,css,xml,json,webapp}'));


task('build', series(
    'images-minify',
    'images-webp',
    'styles',
    'images',
    'html',
    'local-js',
    'vendor-js',
    'copy',
    'cache-busting'));

// // Build production files, the default task
task('default', series('clean', 'build', 'sitemap'));