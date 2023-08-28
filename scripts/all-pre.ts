import chalk from 'chalk';
import { packageJson, __dirname, __filename, copyFolderRecursiveSync } from './lib.js';

function capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

var buildInfo = chalk.bold(capitalizeFirstLetter(packageJson.name) + ' v' + packageJson.version + '\n');
console.log(buildInfo);

// ask for version to use
var defaultVersion = packageJson.version;

import readline from 'readline';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question: string, defaultValue: string, callback: (answer: string) => void) {
    rl.question(question + ' (enter nothing to use ' + defaultValue + ') ', (answer) => {
        if (answer == '') {
            answer = defaultValue;
        }
        else if (answer.startsWith('v')) {
            answer = answer.slice(1);
        }
        callback(answer);
    });
}

import fs from 'fs';
import path from 'path';

ask('What version should be used?', defaultVersion, (version) => {
    console.log('Using version ' + version);
    packageJson.version = version;
    fs.writeFileSync(path.join(__dirname, 'package.json'), JSON.stringify(packageJson, null, 4));
    rl.close();
    // all done
    process.exit(0);
});