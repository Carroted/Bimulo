// this is watch.js, it runs `npm run dev` with chokidar

import fs from 'fs';
import * as url from "url";
import path from 'path';
import chalk from 'chalk';
import chokidar from 'chokidar';

import WebSocket, { WebSocketServer } from "ws";

let devServerSocket = new WebSocketServer({ port: 4614 });
devServerSocket.on("connection", (socket) => {
    console.log("\n" + chalk.greenBright('->') + " Dev WebSocket connected");
});

import { ChildProcess, exec } from 'child_process';
import { packageJson, __dirname, __filename } from './lib.js';
// get dev script
var devScript = packageJson.scripts.dev; // its multiple commands with &&

let child: ChildProcess;

import kill from 'tree-kill';

async function killAsync(pid: number | undefined) {
    return new Promise((resolve, reject) => {
        kill(pid as number, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(null);
            }
        });
    });
}

async function runDev(staticChangesOnly = false) {
    console.log(' │');
    console.log(' ├ Running dev server...');
    if (child) {
        //process.kill();
        await killAsync(child.pid);
        console.log(' ├ Killed previous dev server.');
    }
    if (!staticChangesOnly) {
        child = exec(devScript, { cwd: __dirname });
    }
    else {
        child = exec('node dist/server/src/index.js --dev', { cwd: __dirname });
    }
    child.stdout?.on('data', (data) => {
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
    child.stderr?.on('data', (data) => {
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
        // check if its in media or in client/assets or in client/icons or its client/index.html or its client/index.css. all those are pretty much the only static files in watchDirs
        let staticChangesOnly = false;
        if (pathStr.startsWith('media') || pathStr.startsWith('client/assets') || pathStr.startsWith('client/icons') || pathStr.startsWith('client/index.html') || pathStr.startsWith('client/index.css')) {
            staticChangesOnly = true;
        }
        if (staticChangesOnly) {
            // remove existing file in dist as long as doesnt start with ..
            if (!pathStr.startsWith('..')) {
                let distPath = path.join(__dirname, 'dist', pathStr);
                if (fs.existsSync(distPath)) {
                    fs.unlinkSync(distPath);
                }
                // copy file to dist
                fs.copyFileSync(path.join(__dirname, pathStr), distPath);
            }
            else {
                console.log('warning, we are somehow watching external files. this is not good')
            }
        }
        runDev(staticChangesOnly);
    });
}