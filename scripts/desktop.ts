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

var buildInfo = chalk.bold('Packaging ' + capitalizeFirstLetter(packageJson.name) + ' v' + packageJson.version + '...\n');
console.log(buildInfo);

var steps = [
    // make sure theres ../Simulo-Desktop
    async (stepInfo: string) => {
        console.log(stepInfo, 'Checking for ../Simulo-Desktop...');
        if (!fs.existsSync(path.join(__dirname, '..', 'Simulo-Desktop'))) {
            console.log(chalk.redBright('No ../Simulo-Desktop found! Please clone it from https://github.com/Carroted/Simulo-Desktop and run `npm i` there.'));
            process.exit(1);
        }
    },
    async (stepInfo: string) => {
        console.log(stepInfo, 'Checking for build...');
        if (!fs.existsSync(path.join(__dirname, 'dist'))) {
            console.log(chalk.redBright('No build found! Please run `bun run build` first.'));
            process.exit(1);
        }
    },
    // delete static folder there
    async (stepInfo: string) => {
        console.log(stepInfo, 'Clearing previous build from ../Simulo-Desktop...');
        const staticPath = path.join(__dirname, '..', 'Simulo-Desktop', 'static');
        fs.rmSync(staticPath, { recursive: true });
    },
    // copy dist folder there as static
    async (stepInfo: string) => {
        console.log(stepInfo, 'Copying build to ../Simulo-Desktop/static...');
        copyFolderRecursiveSync(path.join(__dirname, 'dist'), path.join(__dirname, '..', 'Simulo-Desktop', 'static'));
    },
    // set version in simulo-desktop
    async (stepInfo: string) => {
        console.log(stepInfo, 'Setting version in ../Simulo-Desktop...');
        const packageJsonPath = path.join(__dirname, '..', 'Simulo-Desktop', 'package.json');
        const desktopPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        desktopPackageJson.version = packageJson.version;
        fs.writeFileSync(packageJsonPath, JSON.stringify(desktopPackageJson, null, 4));
    },
    // exec `./node_modules/.bin/electron-builder` there
    async (stepInfo: string) => {
        console.log(stepInfo, 'Packaging with electron-builder...');
        await new Promise((resolve, reject) => {
            let p = exec('./node_modules/.bin/electron-builder --linux deb tar.xz', {
                cwd: path.join(__dirname, '..', 'Simulo-Desktop')
            }, function (err) {
                if (err) {
                    console.log(chalk.redBright('Error packaging with electron-builder: ' + err));
                    reject(err);
                    process.exit(1);
                }
                else {
                    resolve(null);
                }
            });
            p.stdout!.on('data', function (data) {
                console.log(data);
            });
            p.stderr!.on('data', function (data) {
                console.log(data);
            });
        });
    }
];

// run steps
for (var i = 0; i < steps.length; i++) {
    await steps[i]((i + 1) + '/' + steps.length);
}


console.log(chalk.greenBright.bold('\nPackaged successfully!') + '\nSee it in ../Simulo-Desktop/dist/');