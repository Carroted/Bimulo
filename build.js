// This is a super simple script for `npm run build` that creates a `dist-package.json` file based on the `package.json` file.
// Since it's not supposed to be in `dist`, it's not a TypeScript file to build and is just a plain JS file. It works cross-platform.

import fs from 'fs';
import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
import path from 'path';

import chalk from 'chalk';

// import child_process
import { exec } from 'child_process';

const packageJson = JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf8'));

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

var buildLogPath = path.join(__dirname, 'build-log.json');
var buildInfo = chalk.bold('Building ' + capitalizeFirstLetter(packageJson.name) + ' v' + packageJson.version + '...\n');
var prevBuildTime = null;
if (fs.existsSync(buildLogPath)) {
    var buildLog = JSON.parse(fs.readFileSync(buildLogPath, 'utf8'));
    var timeToBuild;
    if (buildLog.prevBuildTime) {
        var timeToBuild1 = buildLog.buildTime; // ms
        var timeToBuild2 = buildLog.prevBuildTime; // ms
        timeToBuild = (timeToBuild1 + timeToBuild2) / 2; // average
    }
    else {
        timeToBuild = buildLog.buildTime;
    }
    var timeToBuildSeconds = timeToBuild / 1000;
    // ceil it
    timeToBuildSeconds = Math.ceil(timeToBuildSeconds);
    console.log(buildInfo + 'Estimated time to build: ' + timeToBuildSeconds + 's\n');

    prevBuildTime = timeToBuild;
}
else {
    console.log(buildInfo);
}
var startTime = Date.now();

function indentLines(str, count) {
    var lines = str.split('\n');
    var newLines = [];
    for (var line of lines) {
        newLines.push(' '.repeat(count) + line);
    }
    return newLines.join('\n');
}

var steps = [
    // remove dist folder
    async (stepInfo) => {
        // first, remove dist folder
        const distPath = path.join(__dirname, 'dist');
        if (fs.existsSync(distPath)) {
            console.log(stepInfo, 'Clearing previous build...');
            fs.rmSync(distPath, { recursive: true });
        }
        else {
            console.log(stepInfo, 'No previous build');
        }
    },
    // run tsc
    async (stepInfo) => {
        console.log(stepInfo, 'Compiling TypeScript...');
        var srcDirs = ['client', 'server', 'shared'];
        var promises = [];
        for (var srcDir of srcDirs) {
            promises.push(new Promise((resolve, reject) => {
                const child = exec('tsc -p ' + srcDir, { cwd: __dirname });
                child.stdout.on('data', (data) => {
                    console.log(chalk.bold(chalk.redBright(indentLines(data.toString(), 4))));
                });
                child.stderr.on('data', (data) => {
                    console.error(chalk.bold(chalk.redBright(indentLines(data.toString(), 4))));
                });
                child.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`TypeScript compiler exited with code ${code}`));
                    } else {
                        resolve();
                    }
                });
            }));
        }
        await Promise.all(promises);
    },
    /*// make dist/client folder if doesnt exist
    async (stepInfo) => {
        if (!fs.existsSync(path.join(__dirname, 'dist', 'client'))) {
            console.log(stepInfo, 'Creating dist/client folder...');
            fs.mkdirSync(path.join(__dirname, 'dist', 'client'));
        }
        else {
            console.log(stepInfo, 'dist/client folder already exists');
        }
    },*/
    // generate distPackage
    async (stepInfo) => {
        console.log(stepInfo, 'Creating dist-package.json...');
        // create a `dist-package.json` file
        var distPackage = {
            name: packageJson.name,
            version: packageJson.version,
            main: 'server/src/index.js',
            scripts: {
                start: 'node server/src/index.js',
                build: 'echo "This is a build, run this on the source" && exit 1' // for convenience since people will likely accidentally run this
            },
            dependencies: packageJson.dependencies,
            engines: packageJson.engines,
            type: packageJson.type
        };
        // write to dist/package.json with 4 spaces
        fs.writeFileSync(path.join(__dirname, 'dist', 'package.json'), JSON.stringify(distPackage, null, 4));
    },
    // recursively copy client/assets to dist/client/assets, client/icons to dist/client/icons, client/index.css and client/index.html to dist/client and media to dist/media. finally, node_modules to dist/node_modules and client/src to dist/client/src
    async (stepInfo) => {
        // we'll do above in separate steps
        console.log(stepInfo, 'Copying client/assets to dist/client/assets...');
        copyFolderRecursiveSync(path.join(__dirname, 'client', 'assets'), path.join(__dirname, 'dist', 'client', 'assets'));
    },
    async (stepInfo) => {
        console.log(stepInfo, 'Copying client/icons to dist/client/icons...');
        copyFolderRecursiveSync(path.join(__dirname, 'client', 'icons'), path.join(__dirname, 'dist', 'client', 'icons'));
    },
    async (stepInfo) => {
        console.log(stepInfo, 'Copying client/index.css to dist/client...');
        fs.copyFileSync(path.join(__dirname, 'client', 'index.css'), path.join(__dirname, 'dist', 'client', 'index.css'));
    },
    async (stepInfo) => {
        console.log(stepInfo, 'Copying client/index.html to dist/client...');
        fs.copyFileSync(path.join(__dirname, 'client', 'index.html'), path.join(__dirname, 'dist', 'client', 'index.html'));
    },
    async (stepInfo) => {
        console.log(stepInfo, 'Copying client/manifest.json to dist/client...');
        fs.copyFileSync(path.join(__dirname, 'client', 'manifest.json'), path.join(__dirname, 'dist', 'client', 'manifest.json'));
    },
    async (stepInfo) => {
        console.log(stepInfo, 'Copying client/sw.js to dist/client...');
        fs.copyFileSync(path.join(__dirname, 'client', 'sw.js'), path.join(__dirname, 'dist', 'client', 'sw.js'));
    },
    async (stepInfo) => {
        console.log(stepInfo, 'Copying media to dist/media...');
        copyFolderRecursiveSync(path.join(__dirname, 'media'), path.join(__dirname, 'dist', 'media'));
    },
    async (stepInfo) => {
        console.log(stepInfo, 'Copying node_modules to dist/node_modules...');
        copyFolderRecursiveSync(path.join(__dirname, 'node_modules'), path.join(__dirname, 'dist', 'node_modules'));
    },
    async (stepInfo) => {
        console.log(stepInfo, 'Copying client/src to dist/client/src...');
        copyFolderRecursiveSync(path.join(__dirname, 'client', 'src'), path.join(__dirname, 'dist', 'client', 'src'));
    },
    // copy shared/src/intersect.js to dist/shared/src
    async (stepInfo) => {
        console.log(stepInfo, 'Copying shared/src/intersect.js to dist/shared/src...');
        fs.copyFileSync(path.join(__dirname, 'shared', 'src', 'intersect.js'), path.join(__dirname, 'dist', 'shared', 'src', 'intersect.js'));
    },
    // read all files in client and list them in dist/client/filelist.txt for serviceworker caching
    async (stepInfo) => {
        console.log(stepInfo, 'Creating dist/client/filelist.txt...');
        var files = [];
        var clientPath = path.join(__dirname, 'dist', 'client');
        var walkSync = function (dir, prepend) {
            // get all files of the current directory & iterate over them
            var dirFiles = fs.readdirSync(dir);
            dirFiles.forEach(function (file) {
                // construct whole file-path & retrieve file's stats
                var filePath = path.join(dir, file);
                var fileStat = fs.statSync(filePath);
                if (fileStat.isDirectory()) {
                    // recursive call if it's a directory
                    walkSync(path.join(dir, file), prepend + file + '/');
                }
                else {
                    // add current file to fileList array
                    if (!filePath.endsWith('.ts')) {
                        // make relative
                        var relativePath = path.relative(dir, filePath);
                        files.push(prepend + relativePath);
                    }
                }
            });
        };
        // start recursion to fill fileList
        walkSync(clientPath, '/');
        var sharedPath = path.join(__dirname, 'dist', 'shared');
        walkSync(sharedPath, '/shared/');
        var mediaPath = path.join(__dirname, 'dist', 'media');
        walkSync(mediaPath, '/media/');
        var box2DPath = path.join(__dirname, 'dist', 'node_modules', 'box2d-wasm', 'dist');
        walkSync(box2DPath, '/node_modules/box2d-wasm/dist/');
        // remove /sw.js (its a bit silly to cache the service worker itself, how would it get itself from the cache if its not active to do so? and it seems to cause error too)
        files = files.filter(function (file) { return file !== '/sw.js'; });
        files.push('/Simulo');
        files.push('/');
        // remove / from the start of each one
        files = files.map(function (file) { return file.substring(1); });
        // create dist/client/filelist.txt file with fileList content
        fs.writeFileSync(path.join(clientPath, 'filelist.txt'), files.join('\n'));
    },
    // add the date to version.json
    async (stepInfo) => {
        console.log(stepInfo, 'Creating dist/version.json...');
        var version = {
            date: new Date().getTime(),
            version: packageJson.version
        };
        fs.writeFileSync(path.join(__dirname, 'dist', 'version.json'), JSON.stringify(version, null, 4));
    },
    async (stepInfo) => {
        console.log(stepInfo, 'Creating log...');
        var endTime = Date.now();
        var log;
        if (prevBuildTime) {
            log = {
                buildTime: endTime - startTime,
                prevBuildTime: prevBuildTime,
            };
        }
        else {
            log = {
                buildTime: endTime - startTime
            };
        }
        fs.writeFileSync(buildLogPath, JSON.stringify(log, null, 4));
    }
];

function copyFolderRecursiveSync(source, target) {
    var files = [];
    // check if folder needs to be created or integrated
    var targetFolder = target;
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
    }
    // copy
    if (fs.lstatSync(source).isDirectory()) {
        files = fs.readdirSync(source);
        files.forEach(function (file) {
            var curSource = path.join(source, file);
            if (fs.lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, path.join(targetFolder, path.basename(curSource)));
            }
            else {
                fs.copyFileSync(curSource, path.join(targetFolder, path.basename(curSource)));
            }
        });
    }
}

// run steps
for (var i = 0; i < steps.length; i++) {
    await steps[i]((i + 1) + '/' + steps.length);
}


console.log(chalk.greenBright.bold('\nBuild complete!'));