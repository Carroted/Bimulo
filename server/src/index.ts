// Simulo Server
// Node.js backend for Simulo with server-side physics, WebRTC signaling, etc.

import express from "express";
import path from "path";

import chalk from "chalk";

let dirname = 'dist';

import fs from "fs";

let dev = false;
if (process.argv.includes("--dev")) {
	dev = true;
}

// if it has --dir, set dirname to it
if (process.argv.includes("--dir")) {
	let dirIndex = process.argv.indexOf("--dir");
	if (process.argv[dirIndex + 1]) {
		dirname = process.argv[dirIndex + 1];
	}
}

// make absolute
dirname = path.join(process.cwd(), dirname);

const versionInfo = JSON.parse(fs.readFileSync(path.join(dirname, 'version.json'), 'utf8'));

console.log(chalk.bold.hex('#99e077')(`Simulo ${dev ? 'Development ' : ''}Server v${versionInfo.version}`));

console.log("Bun server for Simulo");

// Get log from log.ts
import log from './log.js';

log.info("Starting servers...") // Servers take a few seconds to start up, so we'll log this to the console

const app: any = express(); // TODO: type this
// make http server (esm import)
import * as http from "http";
const server = http.createServer();
server.on("request", app);

if (dev) {
	// we will add Cache-Control: no-store, max-age=0 to each response using express middleware:
	app.use((req: any, res: any, next: any) => {
		res.set("Cache-Control", "no-store, max-age=0");
		next();
	});
}

// if / request without dev param and we're in dev mode, redirect to with dev param (keeping existing params)
app.get("/client", (req: any, res: any, next: any) => {
	if (dev && (req.query.dev === undefined || req.query.dev === "")) {
		let params = "?";
		for (let key in req.query) {
			params += key + "=" + req.query[key] + "&";
		}
		// add dev param
		params += "dev=true";
		// redirect
		res.redirect("/client" + params);
	}
	else {
		// next, we static it later
		next();
	}
});

app.use(express.static(path.join(dirname)));

var port = 4613;
// override with env var
if (process.env.PORT) {
	if (isNaN(parseInt(process.env.PORT))) {
		log.error(`Invalid port "${process.env.PORT}"`);
		log.exit(1);
	}
	port = parseInt(process.env.PORT);
}

server.listen(port, () => {
	console.log(chalk.bold.greenBright(`\nHTTP server started on port ${port}!`) + '\nSee it on ' + 'http://localhost:' + port + ' directly');
});

server.on('error', (e: any) => {
	if (e.code === 'EADDRINUSE') {
		log.error(`Port ${port} for the public server is already in use`, null, `Close other apps using port ${port} or override the port with "export PORT=1234"`);
		log.exit(1);
	}
	else {
		log.error(e.message);
	}
});

