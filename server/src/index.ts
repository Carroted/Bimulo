// Simulo Server
// Node.js backend for Simulo with server-side physics, WebRTC signaling, etc.

import express from "express";

import chalk from "chalk";
import terminalLink from 'terminal-link';

//import { WebSocketServer } from "ws"; // TODO: move back to ws from socket.io

// from ./shared/utils.js


// This is ESM, let's get back __dirname and __filename
import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

import fs from "fs";

// import package.json so we can get the version number
const pkg = JSON.parse(fs.readFileSync(__dirname + '/../../package.json', 'utf8'));

console.log(chalk.bold.hex('#99e077')(`Simulo Server v${pkg.version}`));

console.log("Node.js server for Simulo with " + terminalLink('Express', 'https://npmjs.com/package/express', {
	fallback: false
}) + ", WebSocket and WebRTC");

// Get log from log.ts
import log from './log.js';

log.info("Starting servers...") // Servers take a few seconds to start up, so we'll log this to the console

var themes: { [key: string]: SimuloTheme } = {
	default: {
		background: "linear-gradient(180deg, #0f1130 0%, #553f90 100%)",
		ground: {
			color: "#a1acfa",
			border: null,
			border_width: null,
			border_scale_with_zoom: false,
		},
		new_objects: {
			color: {
				hue_min: 0,
				hue_max: 360,
				sat_min: 0,
				sat_max: 100,
				val_min: 80,
				val_max: 100,
				alp_min: 1,
				alp_max: 1,
			},
			border: null,
			border_width: null,
			border_scale_with_zoom: false,
			circle_cake: false,
		},
	},
	nostalgia: {
		background: "#738cff",
		ground: {
			color: "#57b00d",
			border: "#111111a0",
			border_width: 1,
			border_scale_with_zoom: true,
		},
		new_objects: {
			color: {
				hue_min: 0,
				hue_max: 360,
				sat_min: 0,
				sat_max: 100,
				val_min: 0,
				val_max: 100,
				alp_min: 1,
				alp_max: 1,
			},
			border: "#111111a0",
			border_width: 1,
			border_scale_with_zoom: true,
			circle_cake: true,
		},
	},
};

import SimuloTheme from "../../shared/src/SimuloTheme.js";

//var theme = themes["nostalgia"];





const app: any = express(); // TODO: type this
// make http server (esm import)
import * as http from "http";
const server = http.createServer();
server.on("request", app);

//const wss = new WebSocketServer({ server });
// socket.io on the http
import SimuloNetworkServer from "../../shared/src/SimuloNetworkServer.js";



import SimuloObjectData from "../../shared/src/SimuloObjectData.js";


/*							x: formatted.data.x,
							y: formatted.data.y,
							color: getRandomColor(
								theme.new_objects.color.hue_min,
								theme.new_objects.color.hue_max,
								theme.new_objects.color.sat_min,
								theme.new_objects.color.sat_max,
								theme.new_objects.color.val_min,
								theme.new_objects.color.val_max,
								theme.new_objects.color.alp_min,
								theme.new_objects.color.alp_max,
								true
							),
							shape: "circle",
							border: theme.new_objects.border,
							border_width: theme.new_objects.border_width,
							border_scale_with_zoom: theme.new_objects.border_scale_with_zoom,
							circle_cake: theme.new_objects.circle_cake,
							*/




/*
wss.on('connection', (ws) => {
  */


/*
  // get verts from body
  var node = world.GetBodyList();
  /*
  while (node) {
	var b = node;
	node = node.GetNext();
	var position = b.GetPosition();
 
	// Draw the dynamic objects
	if (b.GetType() == b2_dynamicBody) {
	  // Canvas Y coordinates start at opposite location, so we flip
	  var flipy = -position.y;
	  var fl = b.GetFixtureList();
	  if (!fl) {
		continue;
	  }
	  var shape = fl.GetShape();
	  var shapeType = shape.GetType();
	  if (shapeType == b2Shape.e_circle) {
		console.log("circle of radius " + shape.GetRadius() + " at " + position.x + ", " + flipy);
	  } else if (shapeType == b2Shape.e_polygon) {
		const polygonShape = box2D.castObject(shape, box2D.b2PolygonShape);
		var vertexCount = polygonShape.get_m_count();
		// iterate over vertices
		for (let i = 0; i < vertexCount; i++) {
		  const vertex = polygonShape.get_m_vertices(i);
		  console.log("vertex " + i + " at " + vertex.x + ", " + vertex.y);
		}
		console.log("polygon of " + vertexCount + " vertices at " + position.x + ", " + flipy);
	  }
	  else {
		console.log("unknown shape type");
	  }
	}
  }*/




app.use(express.static("client"));

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

