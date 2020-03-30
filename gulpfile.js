const { src, dest, watch, series, parallel } = require("gulp");
const pug = require("gulp-pug");
const sass = require("gulp-sass");
const replace = require("gulp-replace");
const inlineCss = require("gulp-inline-css");
const rename = require("gulp-rename");
const browserSync = require("browser-sync").create();

const { data } = require("./src/mock.db");

console.log(data);

// browserSync base directory
// this will be the base directory of files for web preview
// since we are building `index.pug` templates (located in src/emails) to `dist` folder.
const baseDir = "./dist";

// compile sass to css
function compileSass() {
  // import all email .scss files from src/scss folder
  // ** means any sub or deep-sub files or foders
  return (
    src("./src/sass/**/*.scss")
      // on error, do not break the process
      .pipe(sass().on("error", sass.logError))

      // output to `src/styles` folder
      .pipe(dest("./src/styles"))
  );
}
// ok
function preBuildComponentes() {
  return (
    src("src/components/**/*.pug")
      .pipe(replace(new RegExp("/sass/(.+).scss", "ig"), "/styles/$1.css"))
      //.pipe(replace("../sass", "../styles"))
      .pipe(dest("views/components"))
  );
}

// build complete HTML email template
// compile sass (compileSass task) before running build
async function build() {
  return await src("src/emails/**/*.pug")
    // replace `.scss` file paths from template with compiled file paths
    .pipe(replace(new RegExp("/sass/(.+).scss", "ig"), "/styles/$1.css"))

    // compile using Pug
    .pipe(pug({ locals: { ...data } }))

    // inline CSS
    // .pipe(inlineCss({ options: { preserveMediaQueries: true } }))

    // do not generate sub-folders inside dist folder
    .pipe(rename({ dirname: "" }))

    // put compiled HTML email templates inside dist folder
    .pipe(dest("dist"));
}

// browserSync task to launch preview server
function _browserSync() {
  return browserSync.init({
    reloadDelay: 0, // reload after 2s, compilation is finished (hopefully)
    server: { baseDir: baseDir },
    port: 8080
  });
}

// task to reload browserSync
function reloadBrowserSync() {
  return browserSync.reload();
}

function copyCss() {
  return src("src/styles/**/*.css").pipe(dest("views/styles"));
}

function copyImages() {
  return src(["src/images/.*", "src/images/*"]).pipe(dest("views/images"));
}

function copyImagesDist() {
  return src(["src/images/*.svg", "src/images/*.jpeg"]).pipe(
    dest("dist/images")
  );
}

function preBuild() {
  return (
    src("src/emails/**/*.pug")
      // replace `.scss` file paths from template with compiled file paths
      .pipe(replace(new RegExp("/sass/(.+).scss", "ig"), "/styles/$1.css"))

      // change the reference folder
      .pipe(replace("../", "./"))

      // do not generate sub-folders inside view folder
      .pipe(rename({ dirname: "" }))

      // put pre compiled pug email templates inside view folder
      .pipe(dest("views"))
  );
}

// compile sass to css
exports.sass = compileSass;
// pre-build templates pug to view folder
exports.prebcp = preBuildComponentes;
// copy css to view folder
exports.cpcss = copyCss;
// copy images to images folder in views
exports.cpimages = copyImages;
// copy all emails to views folder root
exports.pb = series(
  compileSass,
  parallel(preBuildComponentes, copyCss, copyImages),
  preBuild
);

// generate dist to test

exports.teste = series(compileSass, build);

exports.watch = async function() {
  return watch(
    ["src/**/*", "!src/**/*.css"],
    await series(compileSass, build, copyImagesDist, _browserSync)
  ).on(
    "change",
    await series(compileSass, build, copyImagesDist, reloadBrowserSync)
  );
};
