// Simulo Server
// Node.js backend for Simulo with server-side physics, WebRTC signaling, etc.

import express from "express";

import chalk from "chalk";
import terminalLink from 'terminal-link';

// This is ESM, let's get back __dirname and __filename
import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

import fs from "fs";

const versionInfo = JSON.parse(fs.readFileSync(__dirname + '/../../version.json', 'utf8'));

console.log(chalk.bold.hex('#99e077')(`Simulo Server v${versionInfo.version}`));

console.log("Node.js server for Simulo with " + terminalLink('Express', 'https://npmjs.com/package/express', {
	fallback: false
}) + ", WebSocket and WebRTC");

// Get log from log.ts
import log from './log.js';

log.info("Starting servers...") // Servers take a few seconds to start up, so we'll log this to the console


const app: any = express(); // TODO: type this
// make http server (esm import)
import * as http from "http";
const server = http.createServer();
server.on("request", app);


app.use(express.static(__dirname + "/../../client"));

// static serve node_modules/@tabler/icons/icons
app.use("/icons", express.static(__dirname + "/../../node_modules/@mdi/svg/svg"));

// static serve media
app.use("/media", express.static(__dirname + "/../../media"));

// static serve /../../node_modules/box2d-wasm/dist/es to /box2d-wasm
app.use("/node_modules", express.static(__dirname + "/../../node_modules"));

// note the two ../ because it'll end up in dist. if you ever run the TS directly without transpiling to a different directory, you'll need to remove one of the ../

import SimuloServerController from "../../shared/src/SimuloServerController.js"; // when this isnt imported, most files dont get transpiled. to be investigated more
//var serverController = new SimuloServerController(themes["default"], server, false);

// static serve the shared folder
app.use("/shared", express.static(__dirname + "/../../shared"));
app.get("/version", (req: any, res: any) => {
	res.send(versionInfo);
});

// for anything under ../../*, redirect to /*
app.get("../../:anything", (req: any, res: any) => {
	// redirect to /*
	res.redirect("/" + req.params.anything);
});

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
	console.log(chalk.bold.greenBright(`\nHTTP server started on port ${port}!`) + '\nSee it on ' + terminalLink('http://localhost:' + port, 'http://localhost:' + port, {
		fallback: false
	}) + ' directly');
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

