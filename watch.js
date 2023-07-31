// this is watch.js, it runs `npm run dev` with chokidar

import fs from 'fs';
import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';

import WebSocket, { WebSocketServer } from "ws";

let devServerSocket = new WebSocketServer({ port: 4614 });
devServerSocket.on("connection", (socket) => {
    console.log("\n" + chalk.greenBright('->') + " Dev WebSocket connected");
});

import { exec } from 'child_process';

const packageJson = JSON.parse(fs.readFileSync(__dirname + '/package.json', 'utf8'));

// get dev script
var devScript = packageJson.scripts.dev; // its multiple commands with &&

let process = null;

import kill from 'tree-kill';

async function killAsync(pid) {
    return new Promise((resolve, reject) => {
        kill(pid, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}

async function runDev() {
    console.log(' │');
    console.log(' ├ Running dev server...');
    if (process) {
        //process.kill();
        await killAsync(process.pid);
        console.log(' ├ Killed previous dev server.');
    }
    process = exec(devScript, { cwd: __dirname });
    process.stdout.on('data', (data) => {
        // if it contains "Build complete in", log it, otherwise ignore
        if (data.includes('Build complete in')) {
            console.log(' ├ ' + chalk.greenBright(data.trim()).trim());
        }
        // if it includes "HTTP server started on port", we tell the dev server to reload
        else if (data.includes('HTTP server started on port')) {
            console.log(' ├ ' + chalk.greenBright('Server started on http://localhost:4613/'));
            devServerSocket.clients.forEach((client) => {
                client.send("refresh");
            });
            console.log(' └ Told dev WebSockets to reload');
        }
    });
    process.stderr.on('data', (data) => {
        console.error(chalk.redBright(data.trim()).trim() + '\n');
    });
}

console.log(chalk.bold('Starting dev server...'));
runDev();

// watch for changes. specifically, we will look at these:
let watchDirs = [
    'client',
    'server',
    'shared',
    'package.json',
    'media',
    //'website', // dev server doesnt serve that
];

// watch for changes
for (let watchDir of watchDirs) {
    /*fs.watch(path.join(__dirname, watchDir), { recursive: true }, (eventType, filename) => {
        //console.log(`event type is: ${eventType}`);
        if (filename) {
            console.log(chalk.yellowBright(`${filename} file changed!`));
            runDev();
        }
    });*/ // no linux 😭 so we chokidar instead

    chokidar.watch(path.join(__dirname, watchDir), { ignoreInitial: true }).on('all', (event, pathStr) => {
        // make it relative to __dirname
        pathStr = path.relative(__dirname, pathStr);
        console.log(chalk.bold(`\n${pathStr} changed!`));
        runDev();
    });
}