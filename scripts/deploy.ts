// Like build.js, since this isn't supposed to be in `dist`, it's not a TypeScript file to build and is just a plain JS file. It works cross-platform.

// deploy.js emulates the server's routes in a static way, so that the client can be served from GitHub Pages.
// This leads to a lot of duplicate assets and code, and it'll always be better to run the provided server instead, but this is a good alternative for when static hosting is the only option.

import fs from 'fs';
import * as url from "url";
import path from 'path';
import { copyFolderRecursiveSync, __dirname, packageJson } from './lib.js';

import ghpages from 'gh-pages';

import chalk from 'chalk';

// import child_process
import { exec } from 'child_process';

function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

var buildInfo = chalk.bold('Deploying ' + capitalizeFirstLetter(packageJson.name) + ' v' + packageJson.version + '...\n');
console.log(buildInfo);

var steps = [
    async (stepInfo: string) => {
        console.log(stepInfo, 'Checking for build...');
        if (!fs.existsSync(path.join(__dirname, 'dist'))) {
            console.log(chalk.redBright('No build found! Please run `bun run build` first.'));
            process.exit(1);
        }
    },
    // deploy to gh-pages
    async (stepInfo: string) => {
        console.log(stepInfo, 'Deploying to GitHub Pages...');
        await new Promise((resolve, reject) => {
            ghpages.publish(path.join(__dirname, 'dist'), {
                branch: 'gh-pages',
                dotfiles: true,
            }, function (err) {
                if (err) {
                    console.log(chalk.redBright('Error deploying to GitHub Pages: ' + err));
                    reject(err);
                    process.exit(1);
                }
                else {
                    resolve(null);
                }
            });
        });
    }
];

// run steps
for (var i = 0; i < steps.length; i++) {
    await steps[i]((i + 1) + '/' + steps.length);
}


console.log(chalk.greenBright.bold('\nDeployed successfully!') + '\nNote: While changes have been sent to GitHub, it takes up to 10 minutes for them to be visible.');