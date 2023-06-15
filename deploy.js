// Like build.js, since this isn't supposed to be in `dist`, it's not a TypeScript file to build and is just a plain JS file. It works cross-platform.

import fs from 'fs';
import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
import path from 'path';

import ghpages from 'gh-pages';

import chalk from 'chalk';

// import child_process
import { exec } from 'child_process';

const packageJson = JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf8'));

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

var buildInfo = chalk.bold('Deploying ' + capitalizeFirstLetter(packageJson.name) + ' v' + packageJson.version + '...\n');

var steps = [
    async (stepInfo) => {
        console.log(stepInfo, 'Checking for build...');
        if (!fs.existsSync(path.join(__dirname, 'dist'))) {
            console.log(chalk.redBright('No build found! Please run `npm run build` first.'));
            process.exit(1);
        }
    },
    // copy dist/node_modules to dist/client
    async (stepInfo) => {
        console.log(stepInfo, 'Copying node_modules to client/node_modules...');
        copyFolderRecursiveSync(path.join(__dirname, 'dist', 'node_modules'), path.join(__dirname, 'dist', 'client', 'node_modules'));
    },
    // copy dist/shared to dist/client/shared
    async (stepInfo) => {
        console.log(stepInfo, 'Copying shared to client/shared...');
        copyFolderRecursiveSync(path.join(__dirname, 'dist', 'shared'), path.join(__dirname, 'dist', 'client', 'shared'));
    },
    // copy dist/media to dist/client/media
    async (stepInfo) => {
        console.log(stepInfo, 'Copying media to client/media...');
        copyFolderRecursiveSync(path.join(__dirname, 'dist', 'media'), path.join(__dirname, 'dist', 'client', 'media'));
    },
    // copy dist/version.json to dist/client/version (no extension)
    async (stepInfo) => {
        console.log(stepInfo, 'Copying version.json to client/version...');
        fs.copyFileSync(path.join(__dirname, 'dist', 'version.json'), path.join(__dirname, 'dist', 'client', 'version'));
    },
    // copy node_modules/@mdi/svg/svg to dist/client/icons
    async (stepInfo) => {
        console.log(stepInfo, 'Copying icons...');
        copyFolderRecursiveSync(path.join(__dirname, 'dist', 'node_modules', '@mdi', 'svg', 'svg'), path.join(__dirname, 'dist', 'client', 'icons'));
    },
    // deploy to gh-pages
    async (stepInfo) => {
        console.log(stepInfo, 'Deploying to GitHub Pages...');
        ghpages.publish(path.join(__dirname, 'dist', 'client'), {
            branch: 'gh-pages'
        }, function (err) {
            if (err) {
                console.log(chalk.redBright('Error deploying to GitHub Pages: ' + err));
                process.exit(1);
            }
        });
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


console.log(chalk.greenBright.bold('\nDeployed successfully!'));