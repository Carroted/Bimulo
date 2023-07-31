// This is a super simple script for `npm run build` that creates a `dist-package.json` file based on the `package.json` file.
// Since it's not supposed to be in `dist`, it's not a TypeScript file to build and is just a plain JS file. It works cross-platform.

import fs from 'fs';
import * as url from "url";

import path from 'path';

import chalk from 'chalk';

// import child_process
import { exec } from 'child_process';
import { packageJson, __dirname, __filename, copyFolderRecursiveSync } from './lib.js';

function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

const buildLogPath = path.join(__dirname, 'build-log.json');
const buildInfo = chalk.bold('Building ' + capitalizeFirstLetter(packageJson.name) + ' v' + packageJson.version + '...\n');
let prevBuildTime: any = null;
if (fs.existsSync(buildLogPath)) {
    const buildLog = JSON.parse(fs.readFileSync(buildLogPath, 'utf8'));
    let timeToBuild;
    if (buildLog.prevBuildTime) {
        const timeToBuild1 = buildLog.buildTime; // ms
        const timeToBuild2 = buildLog.prevBuildTime; // ms
        timeToBuild = (timeToBuild1 + timeToBuild2) / 2; // average
    }
    else {
        timeToBuild = buildLog.buildTime;
    }
    let timeToBuildSeconds = timeToBuild / 1000;
    // ceil it
    timeToBuildSeconds = parseInt(timeToBuildSeconds.toFixed(3));
    console.log(buildInfo + 'Estimated time to build: ' + timeToBuildSeconds + 's\n');

    prevBuildTime = timeToBuild;
}
else {
    console.log(buildInfo);
}
const startTime = Date.now();

function indentLines(str: string, count: number) {
    const lines: string[] = str.split('\n');
    const newLines: string[] = [];
    for (const line of lines) {
        newLines.push(' '.repeat(count) + line);
    }
    return newLines.join('\n');
}

// if --dev param
let dev = false;
if (process.argv.includes('--dev')) {
    dev = true;
}

const steps = [
    // remove dist folder
    async (stepInfo: any) => {
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
    async (stepInfo: any) => {
        console.log(stepInfo, 'Compiling TypeScript...');
        const srcDirs = ['client', 'server', 'shared'];
        const promises: Promise<any>[] = [];
        for (const srcDir of srcDirs) {
            promises.push(new Promise((resolve, reject) => {
                const child = exec('npx tsup', { cwd: __dirname });
                child.stdout?.on('data', (data) => {
                    console.log(chalk.bold(chalk.redBright(indentLines(data.toString(), 4))));
                });
                child.stderr?.on('data', (data) => {
                    console.error(chalk.bold(chalk.redBright(indentLines(data.toString(), 4))));
                });
                child.on('close', (code) => {
                    if (code !== 0) {
                        reject(new Error(`TypeScript compiler exited with code ${code}`));
                    } else {
                        resolve(null);
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
    async (stepInfo: any) => {
        console.log(stepInfo, 'Creating dist-package.json...');
        // create a `dist-package.json` file
        const distPackage = {
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
    async (stepInfo: any) => {
        // we'll do above in separate steps
        console.log(stepInfo, 'Copying client/assets to dist/client/assets...');
        copyFolderRecursiveSync(path.join(__dirname, 'client', 'assets'), path.join(__dirname, 'dist', 'client', 'assets'));
    },
    async (stepInfo: any) => {
        console.log(stepInfo, 'Copying client/icons to dist/client/icons...');
        copyFolderRecursiveSync(path.join(__dirname, 'client', 'icons'), path.join(__dirname, 'dist', 'client', 'icons'));
    },
    async (stepInfo: any) => {
        console.log(stepInfo, 'Copying client/index.css to dist/client...');
        fs.copyFileSync(path.join(__dirname, 'client', 'index.css'), path.join(__dirname, 'dist', 'client', 'index.css'));
    },
    async (stepInfo: any) => {
        console.log(stepInfo, 'Copying client/index.html to dist/client...');
        fs.copyFileSync(path.join(__dirname, 'client', 'index.html'), path.join(__dirname, 'dist', 'client', 'index.html'));
    },
    async (stepInfo: any) => {
        console.log(stepInfo, 'Copying client/manifest.json to dist/client...');
        fs.copyFileSync(path.join(__dirname, 'client', 'manifest.json'), path.join(__dirname, 'dist', 'client', 'manifest.json'));
    },
    async (stepInfo: any) => {
        console.log(stepInfo, 'Copying client/sw.js to dist/client...');
        fs.copyFileSync(path.join(__dirname, 'client', 'sw.js'), path.join(__dirname, 'dist', 'client', 'sw.js'));
    },
    async (stepInfo: any) => {
        console.log(stepInfo, 'Copying media to dist/media...');
        copyFolderRecursiveSync(path.join(__dirname, 'media'), path.join(__dirname, 'dist', 'media'));
    },
    // copy box2d-wasm-7.0.0.tgz to dist
    async (stepInfo: any) => {
        console.log(stepInfo, 'Copying box2d-wasm-7.0.0.tgz to dist...');
        fs.copyFileSync(path.join(__dirname, 'other/box2d-wasm-7.0.0.tgz'), path.join(__dirname, 'dist', 'box2d-wasm-7.0.0.tgz'));
    },
    async (stepInfo: any) => {
        if (!dev) {
            console.log(stepInfo, 'Copying node_modules...');
            copyFolderRecursiveSync(path.join(__dirname, 'node_modules'), path.join(__dirname, 'dist', 'node_modules'));
            // now we have to scan the devDependencies of package.json and remove them if they arent also in dependencies
            let devDependencies = packageJson.devDependencies;
            let dependencies = packageJson.dependencies;
            Object.keys(devDependencies).forEach((devDependency) => {
                if (!dependencies[devDependency]) {
                    console.log('Removing devDependency', devDependency);
                    // if its a dir
                    if (fs.existsSync(path.join(__dirname, 'dist', 'node_modules', devDependency))) {
                        if (fs.lstatSync(path.join(__dirname, 'dist', 'node_modules', devDependency)).isDirectory()) {
                            fs.rmdirSync(path.join(__dirname, 'dist', 'node_modules', devDependency), { recursive: true });
                        }
                        // it could be a symlink
                        else if (fs.lstatSync(path.join(__dirname, 'dist', 'node_modules', devDependency)).isSymbolicLink()) {
                            fs.unlinkSync(path.join(__dirname, 'dist', 'node_modules', devDependency));
                        }
                    }
                }
            });
        }
        else {
            console.log(stepInfo, 'Symbolically linking node_modules...');
            // symlink node_modules
            fs.symlinkSync(path.join(__dirname, 'node_modules'), path.join(__dirname, 'dist', 'node_modules'), 'dir');
        }
    },
    async (stepInfo: any) => {
        console.log(stepInfo, 'Copying client/src to dist/client/src...');
        copyFolderRecursiveSync(path.join(__dirname, 'client', 'src'), path.join(__dirname, 'dist', 'client', 'src'));
    },
    // copy shared/src/intersect.js to dist/shared/src
    async (stepInfo: any) => {
        console.log(stepInfo, 'Copying shared/src/intersect.js to dist/shared/src...');
        fs.copyFileSync(path.join(__dirname, 'shared', 'src', 'intersect.js'), path.join(__dirname, 'dist', 'shared', 'src', 'intersect.js'));
    },
    // read all files in client and list them in dist/client/filelist.txt for serviceworker caching
    async (stepInfo: any) => {
        console.log(stepInfo, 'Creating dist/client/filelist.txt...');
        let files: string[] = [];
        const clientPath = path.join(__dirname, 'dist', 'client');
        const walkSync = function (dir: string, prepend: string) {
            // get all files of the current directory & iterate over them
            const dirFiles = fs.readdirSync(dir);
            dirFiles.forEach(function (file) {
                // construct whole file-path & retrieve file's stats
                const filePath = path.join(dir, file);
                const fileStat = fs.statSync(filePath);
                if (fileStat.isDirectory()) {
                    // recursive call if it's a directory
                    walkSync(path.join(dir, file), prepend + file + '/');
                }
                else {
                    // add current file to fileList array
                    if (!filePath.endsWith('.ts')) {
                        // make relative
                        const relativePath = path.relative(dir, filePath);
                        files.push(prepend + relativePath);
                    }
                }
            });
        };
        // start recursion to fill fileList
        walkSync(clientPath, '/');
        const sharedPath = path.join(__dirname, 'dist', 'shared');
        walkSync(sharedPath, '/shared/');
        const mediaPath = path.join(__dirname, 'dist', 'media');
        walkSync(mediaPath, '/media/');
        const box2DPath = path.join(__dirname, 'dist', 'node_modules', 'box2d-wasm', 'dist');
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
    async (stepInfo: any) => {
        console.log(stepInfo, 'Creating dist/version.json...');
        const version = {
            date: new Date().getTime(),
            version: packageJson.version
        };
        fs.writeFileSync(path.join(__dirname, 'dist', 'version.json'), JSON.stringify(version, null, 4));
    },
    async (stepInfo: any) => {
        console.log(stepInfo, 'Creating log...');
        const endTime = Date.now();
        let log;
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



// run steps
for (let i = 0; i < steps.length; i++) {
    await steps[i]((i + 1) + '/' + steps.length);
}


console.log(chalk.greenBright.bold('\nBuild complete in ' + (Date.now() - startTime) + 'ms!\n'));