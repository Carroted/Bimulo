// Simulo Server
// Node.js backend for Simulo with server-side physics, WebRTC signaling, etc.

import express from "express";
//import { WebSocketServer } from "ws"; // TODO: move back to ws from socket.io
import nodeDataChannel from "node-datachannel"; // for WebRTC data channels

// from ./shared/utils.js
import { getRandomColor, randomRange, hsvToRgb } from "../../shared/src/utils.js";

import { SimuloPhysicsServer, SimuloJoint, SimuloMouseSpring, SimuloObject } from "../../shared/src/SimuloPhysicsServer.js";

// This is ESM, let's get back __dirname and __filename
import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));

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

var theme = themes["nostalgia"];

var timeScaleMultiplier = 1;
var paused = false;

var physicsServer = new SimuloPhysicsServer(theme);

const app: any = express(); // TODO: type this
// make http server (esm import)
import * as http from "http";
const server = http.createServer();
server.on("request", app);

//const wss = new WebSocketServer({ server });
// socket.io on the http
import { Server } from "socket.io"; // we use socket.io since websocket without SSL doesnt usually work. this could be replaced with ws and add SSL cert creation (Let's Encrypt?)
const io = new Server(server);

var dataChannels: nodeDataChannel.DataChannel[] = [];




import SimuloObjectData from "../../shared/src/SimuloObjectData.js";

var ei = 0;


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
interface SimuloCreatingObject {
	x: number;
	y: number;
	color: string;
	shape: "circle" | "rectangle" | "polygon" | "edge" | "square";
	border: string | null;
	border_width: number | null;
	border_scale_with_zoom: boolean;
	circle_cake?: boolean;
}

var creatingObjects: { [key: string]: SimuloCreatingObject } = {};


var springs: SimuloMouseSpring[] = []; // this will be an object soon for multiplayer support
var tools: { [key: string]: string } = {};
//var draggingObjects = {};
var deleteSprings = false;
//var movingObjects = {};

interface SpringData {
	p1: [number, number];
	p2: [number, number];
}

/*
wss.on('connection', (ws) => {
  */
io.on("connection", (ws) => {
	let peer1 = new nodeDataChannel.PeerConnection("Peer" + ei, {
		iceServers: ["stun:stun.l.google.com:19302"],
	}); // TODO: self-host ICE
	let dc1: nodeDataChannel.DataChannel | null = null;

	console.log("------\nweb socket connected through socket.io!\n------");
	// tell them they're connected
	ws.send(
		JSON.stringify({
			type: "connected",
			data: {
				message:
					"connected to server, good job. now all thats left is ICE stuff just like you practiced, client",
			},
		})
	);

	peer1.onLocalDescription((sdp: string, type: nodeDataChannel.DescriptionType) => {
		console.log("Peer1 SDP:", sdp, " Type:", type);
		ws.send(JSON.stringify({ sdp: sdp, type: type }));
	});

	peer1.onLocalCandidate((candidate: string, mid: string) => {
		console.log("Peer1 Candidate:", candidate);
		ws.send(JSON.stringify({ candidate: candidate, mid: mid }));
	});

	ws.on("message", (message) => {
		try {
			const msg = JSON.parse(message);

			if (msg.sdp) {
				peer1.setRemoteDescription(msg.sdp, msg.type);
			} else if (msg.candidate) {
				peer1.addRemoteCandidate(msg.candidate, msg.mid);
			}
		} catch (e) {
			console.log(e);
		}
	});

	// make a uuid with a bunch of math.randoms
	var uuid = ws.id;
	tools[uuid] = "drag";

	// gonna use proper uuids later, im just too lazy to npm i it yk

	dc1 = peer1.createDataChannel("main");
	dc1.onMessage((msg: string | Buffer) => {
		//console.log('Peer1 Received Msg dc1:', msg);
		try {
			var formatted = JSON.parse(msg as string);
			// it should have a type and data. if not, it's not a valid message
			if (
				formatted.type !== undefined &&
				formatted.data !== undefined &&
				formatted.type !== null &&
				formatted.data !== null
			) {
				// handle it
				//console.log('    Type: "' + formatted.type + '"');
				if (formatted.type == "player mouse") {
					var springsFormatted: SpringData[] = [];
					springs.forEach((spring: SimuloMouseSpring) => {
						spring.target = [formatted.data.x, formatted.data.y];
						/*springsFormatted.push({
							p1: [formatted.data.x, formatted.data.y],
							p2: [spring.GetAnchorB().get_x(), spring.GetAnchorB().get_y()],
						});
						*/
					});

					sendAll("player mouse", {
						id: uuid,
						x: formatted.data.x,
						y: formatted.data.y,
						springs: springsFormatted,
					});

					// 👍 we did it, yay, we're so cool
				} else if (formatted.type == "player mouse down") {
					if (tools[uuid] == "add_rectangle") {
						creatingObjects[uuid] = {
							x: formatted.data.x,
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
							) as string,
							shape: "rectangle",
							border: theme.new_objects.border,
							border_width: theme.new_objects.border_width,
							border_scale_with_zoom: theme.new_objects.border_scale_with_zoom,
						};
					} else if (tools[uuid] == "add_circle") {
						creatingObjects[uuid] = {
							x: formatted.data.x,
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
							) as string,
							shape: "circle",
							border: theme.new_objects.border,
							border_width: theme.new_objects.border_width,
							border_scale_with_zoom: theme.new_objects.border_scale_with_zoom,
							circle_cake: theme.new_objects.circle_cake,
						};
					} else if (tools[uuid] == "drag") {
						// instead, start a spring

						var bodies: SimuloObject[] = physicsServer.getObjectsAtPoint([formatted.data.x, formatted.data.y]);

						if (bodies.length > 0) {
							var selectedBody = bodies[0];
							/*// create a spring
							var md = new box2D.b2MouseJointDef();
							md.set_bodyA(ground);
							md.set_bodyB(selectedBody);
							md.set_target(pos);
							md.set_maxForce(1000000 * selectedBody.GetMass());
							md.set_collideConnected(true);
							md.set_stiffness(20);
							md.set_damping(0);

							var mouseJoint = box2D.castObject(
								world.CreateJoint(md),
								box2D.b2MouseJoint
							);
							selectedBody.SetAwake(true);*/
							var mouseJoint = physicsServer.addMouseSpring(
								selectedBody,
								[formatted.data.x, formatted.data.y],
								30,
								0,
								1000000 * selectedBody.mass
							);

							springs.push(mouseJoint);
						}
					} else {
						console.log("Unknown tool: " + tools[uuid]);
					}

					// 👍 we did it, yay, we're so cool

					// we did it, yay, we're so cool 👍
				} else if (formatted.type == "player mouse up") {
					springs.forEach((spring: SimuloMouseSpring) => {
						physicsServer.destroy(spring);
					});
					springs = [];
					// Check if there's a creatingObject for this uuid
					if (creatingObjects[uuid]) {
						// if cursor hasnt moved beyond 0.001, delete the object
						if (
							Math.abs(formatted.data.x - creatingObjects[uuid].x) < 0.001 &&
							Math.abs(formatted.data.y - creatingObjects[uuid].y) < 0.001
						) {
							delete creatingObjects[uuid];
							return;
						}
						if (creatingObjects[uuid].shape == "rectangle") {
							// Calculate the size of the new rectangle
							const width = Math.abs(
								formatted.data.x - creatingObjects[uuid].x
							);
							const height = Math.abs(
								formatted.data.y - creatingObjects[uuid].y
							);

							// Create the rectangle
							/*const bd = new box2D.b2BodyDef();
							bd.set_type(box2D.b2_dynamicBody);
							var pos = new box2D.b2Vec2(
								(formatted.data.x + creatingObjects[uuid].x) / 2,
								(formatted.data.y + creatingObjects[uuid].y) / 2
							);
							bd.set_position(pos);
							const body = world.CreateBody(bd);

							const shape = new box2D.b2PolygonShape();
							shape.SetAsBox(width / 2, height / 2);
							body.CreateFixture(shape, 1);*/
							var bodyData: object = {
								color: creatingObjects[uuid].color,
								border: theme.new_objects.border,
								border_width: theme.new_objects.border_width,
								border_scale_with_zoom:
									theme.new_objects.border_scale_with_zoom,
								id: 92797981789171,
								sound: 'impact.wav',
								image: null,

							};
							// define verts of the rectangle
							const verts: [x: number, y: number][] = [
								[-width / 2, -height / 2],
								[width / 2, -height / 2],
								[width / 2, height / 2],
								[-width / 2, height / 2],
							];

							physicsServer.addPolygon(verts, [(formatted.data.x + creatingObjects[uuid].x) / 2, (formatted.data.y + creatingObjects[uuid].y) / 2], 0, 1, 0.5, 0, bodyData, false);

							// Remove the creatingObject for this uuid
							delete creatingObjects[uuid];
						} else if (creatingObjects[uuid].shape == "square") {
							/*// Calculate the size of the new square
							const size = Math.max(
								Math.abs(formatted.data.x - creatingObjects[uuid].x),
								Math.abs(formatted.data.y - creatingObjects[uuid].y)
							);

							// Create the square
							const bd = new box2D.b2BodyDef();
							bd.set_type(box2D.b2_dynamicBody);
							var pos = new box2D.b2Vec2(
								(formatted.data.x + creatingObjects[uuid].x) / 2,
								(formatted.data.y + creatingObjects[uuid].y) / 2
							);
							bd.set_position(pos);
							const body = world.CreateBody(bd);

							const shape = new box2D.b2PolygonShape();
							shape.SetAsBox(size / 2, size / 2);
							body.CreateFixture(shape, 1);
							var bodyData = body.GetUserData() as SimuloObjectData;
							bodyData.color = creatingObjects[uuid].color;
							bodyData.border = theme.new_objects.border;
							bodyData.border_width = theme.new_objects.border_width;
							bodyData.border_scale_with_zoom =
								theme.new_objects.border_scale_with_zoom;

							// Remove the creatingObject for this uuid
							delete creatingObjects[uuid];*/
						} else if (creatingObjects[uuid].shape == "circle") {
							// Calculate the radius of the new circle
							const dx = formatted.data.x - creatingObjects[uuid].x;
							const dy = formatted.data.y - creatingObjects[uuid].y;
							const radius = Math.max(Math.abs(dx), Math.abs(dy)) / 2;

							/*// Create the circle
							const bd = new box2D.b2BodyDef();
							bd.set_type(box2D.b2_dynamicBody);
							//var pos = new box2D.b2Vec2((formatted.data.x + creatingObjects[uuid].x) / 2, (formatted.data.y + creatingObjects[uuid].y) / 2);
							var posX = creatingObjects[uuid].x + radius;
							var posY = creatingObjects[uuid].y + radius;
							if (dx < 0) {
								posX = creatingObjects[uuid].x - radius;
							}
							if (dy < 0) {
								posY = creatingObjects[uuid].y - radius;
							}
							var pos = new box2D.b2Vec2(posX, posY);
							bd.set_position(pos);
							const body = world.CreateBody(bd);

							const shape = new box2D.b2CircleShape();
							shape.set_m_radius(radius);
							body.CreateFixture(shape, 1);
							var bodyData = body.GetUserData() as SimuloObjectData;
							bodyData.color = creatingObjects[uuid].color;
							bodyData.border = creatingObjects[uuid].border;
							bodyData.border_width =
								creatingObjects[uuid].border_width;
							bodyData.border_scale_with_zoom =
								creatingObjects[uuid].border_scale_with_zoom;
							bodyData.circle_cake =
								creatingObjects[uuid].circle_cake;*/
							var bodyData: object = {
								color: creatingObjects[uuid].color,
								border: theme.new_objects.border,
								border_width: theme.new_objects.border_width,
								border_scale_with_zoom:
									theme.new_objects.border_scale_with_zoom,
								id: 92797981789171,
								sound: 'impact.wav',
								image: null,
								circle_cake: creatingObjects[uuid].circle_cake
							};

							physicsServer.addCircle(radius, [formatted.data.x, formatted.data.y], 0, 1, 0.5, 0, bodyData, false);

							// Remove the creatingObject for this uuid
							delete creatingObjects[uuid];
						}
					}
				} else if (formatted.type == "set_theme") {
					theme = themes[formatted.data];
				} else if (formatted.type == "set_tool") {
					console.log("set tool to", formatted.data);
					tools[uuid] = formatted.data;
				} else if (formatted.type == "set_time_scale") {
					timeScaleMultiplier = formatted.data;
					sendAll("set_time_scale", timeScaleMultiplier);
				} else if (formatted.type == "set_paused") {
					paused = formatted.data;
					sendAll("set_paused", paused);
				}
			}
		} catch (e) {
			console.log(e);
		}
	});
	dc1.onOpen(() => {
		dataChannels.push(dc1 as nodeDataChannel.DataChannel);
	});

	// Send test message to client after some time
	setTimeout(() => {
		if (dc1) {
			/*dc1.sendMessage('Hello from Peer1');
				  dc1.sendMessage('Hello from Peer1');
				  dc1.sendMessage('Hello from Peer1');*/
		}
	}, 5000);
});

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

const frameRate = 1000 / 60;

const velocityIterations = 3;
const positionIterations = 2;

app.use(express.static("client"));

// static serve node_modules/@tabler/icons/icons
app.use("/icons", express.static(__dirname + "/../../node_modules/@mdi/svg/svg"));

// static serve media
app.use("/media", express.static(__dirname + "/../../media"));
// note the two ../ because it'll end up in dist. if you ever run the TS directly without transpiling to a different directory, you'll need to remove one of the ../

// put app on http server

server.listen(4613, () => console.log("server listening on " + 4613));

var timeScale = 1 / 500;

setInterval(() => {
	loop(frameRate);
}, frameRate);

import SimuloStep from "../../shared/src/SimuloStep.js";
var previousStep: SimuloStepExtended | null = null;

import { SimuloShape, SimuloPolygon, SimuloEdge, SimuloCircle } from "../../shared/src/SimuloShape.js";

interface SimuloStepExtended extends SimuloStep {
	creating_objects: object;
	time_scale: number;
	paused: boolean;
}

function loop(delta: number) {
	// step physics
	if (paused) {
		if (previousStep) {
			sendAll("world update", previousStep);
		}
		return;
	}
	var step = physicsServer.step(
		delta * timeScale * timeScaleMultiplier,
		velocityIterations,
		positionIterations
	);

	var springs1 = step.springs;
	var springs2 = springs.map((s) => {
		return {
			p1: s.target,
			p2: s.anchor
		};
	});
	var springs3 = springs1.concat(springs2);

	var thisStep: SimuloStepExtended = {
		shapes: step.shapes,
		creating_objects: creatingObjects,
		background: physicsServer.theme.background,
		springs: springs3,
		time_scale: timeScaleMultiplier,
		paused: paused,
		mouseSprings: []
	};

	sendAll("world update", thisStep);
	previousStep = thisStep;

	//console.log("vomit");
}



function sendAll(type: string, data: any) {
	dataChannels.forEach((dc) => {
		// check if open first
		if (!dc.isOpen()) {
			return;
		}
		try {
			dc.sendMessage(
				JSON.stringify({
					type: type,
					data: data,
				})
			);
		} catch (e) {
			console.log("error sending message");
			console.log(e);
		}
	});
}
