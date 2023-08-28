// this is JS so we can run it directly with node
// for some reason gh-pages doesnt work on bun :/

import fs from 'fs';
import * as url from "url";
import path from 'path';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL("../.", import.meta.url));
const packageJson = JSON.parse(fs.readFileSync(__dirname + 'package.json', 'utf8'));

import ghpages from 'gh-pages';

import chalk from 'chalk';

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// get canary param if it exists
var canary = false;
if (process.argv.includes('--canary')) {
    canary = true;
}

var buildInfo = chalk.bold('Deploying ' + capitalizeFirstLetter(packageJson.name) + ' v' + packageJson.version + (canary ? ' to Canary' : '') + '...\n');
console.log(buildInfo);

var steps = [
    async (stepInfo) => {
        console.log(stepInfo, 'Checking for build...');
        if (!fs.existsSync(path.join(__dirname, 'dist'))) {
            console.log(chalk.redBright('No build found! Please run `bun run build` first.'));
            process.exit(1);
        }
    },
    // deploy to gh-pages
    async (stepInfo) => {
        console.log(stepInfo, 'Deploying to GitHub Pages...');
        await new Promise((resolve, reject) => {
            ghpages.publish(path.join(__dirname, 'dist'), {
                branch: 'gh-pages',
                repo: canary ? 'git@github.com:Carroted/Simulo-Canary.git' : undefined,
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