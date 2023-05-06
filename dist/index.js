// Simulo Server
// Node.js backend for Simulo with server-side physics, WebRTC signaling, etc.
import express from "express";
//import { WebSocketServer } from "ws"; // TODO: move back to ws from socket.io
import nodeDataChannel from "node-datachannel"; // for WebRTC data channels
// from ./shared/utils.js
import { getRandomColor, randomRange } from "../shared/src/utils.js";
// This is ESM, let's get back __dirname and __filename
import * as url from "url";
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL(".", import.meta.url));
import Box2DFactory from "box2d-wasm";
const box2D = await Box2DFactory();
var themes = {
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
;
var theme = themes["nostalgia"];
var timeScaleMultiplier = 1;
var paused = false;
const app = express(); // TODO: type this
// make http server (esm import)
import * as http from "http";
const server = http.createServer();
server.on("request", app);
//const wss = new WebSocketServer({ server });
// socket.io on the http
import { Server } from "socket.io"; // we use socket.io since websocket without SSL doesnt usually work. this could be replaced with ws and add SSL cert creation (Let's Encrypt?)
const io = new Server(server);
var dataChannels = [];
const gravity = new box2D.b2Vec2(0, 9.81);
const world = new box2D.b2World(gravity);
world.SetContinuousPhysics(true);
const bd_ground = new box2D.b2BodyDef();
const ground = world.CreateBody(bd_ground);
var defaultImpact = "impact.wav";
var contactListener = new box2D.JSContactListener();
contactListener.BeginContact = function (contactPtr) {
    let contact = box2D.wrapPointer(contactPtr, box2D.b2Contact);
    // get object mass if non-zero
    var mass1 = contact.GetFixtureA().GetBody().GetMass();
    var mass2 = contact.GetFixtureB().GetBody().GetMass();
    // get userdata as SimuloObjectData
    var data1 = contact.GetFixtureA().GetBody().GetUserData();
    var data2 = contact.GetFixtureB().GetBody().GetUserData();
    // if static and mass 0, set to 10
    if (mass1 == 0 &&
        contact.GetFixtureA().GetBody().GetType() == box2D.b2_staticBody) {
        mass1 = 10;
    }
    if (mass2 == 0 &&
        contact.GetFixtureB().GetBody().GetType() == box2D.b2_staticBody) {
        mass2 = 10;
    }
    var sound1 = data1.sound || defaultImpact;
    var sound2 = data2.sound || defaultImpact;
    // we want to play a collision noise
    // first, calculate volume based on how hard they hit
    var volume = Math.max(contact.GetFixtureA().GetBody().GetLinearVelocity().Length(), contact.GetFixtureB().GetBody().GetLinearVelocity().Length()) / 100;
    sendAll("collision", {
        sound: sound1,
        volume: Math.max(Math.min(Math.abs(volume * mass2), 1), 0),
        pitch: randomRange(0.5, 1.5),
    });
    sendAll("collision", {
        sound: sound2,
        volume: Math.max(Math.min(Math.abs(volume * mass1), 1), 0),
        pitch: randomRange(0.5, 1.5),
    });
};
contactListener.EndContact = function (contactPtr) {
    let contact = box2D.wrapPointer(contactPtr, box2D.b2Contact);
    // nothing for now, soon it will call JS scripts that listen for collisions
};
contactListener.PreSolve = function (contactPtr, oldManifoldPtr) {
    let contact = box2D.wrapPointer(contactPtr, box2D.b2Contact);
    // nothing for now, soon it will call JS scripts that listen for collisions
};
contactListener.PostSolve = function (contactPtr, impulsePtr) {
    let contact = box2D.wrapPointer(contactPtr, box2D.b2Contact);
    // nothing for now, soon it will call JS scripts that listen for collisions
};
world.SetContactListener(contactListener);
/*
// floor which boxes rest on
{
  const shape = new box2D.b2EdgeShape();
  shape.SetTwoSided(new box2D.b2Vec2(3, 18), new box2D.b2Vec2(22, 18));
  ground.CreateFixture(shape, 0);
}
*/
const sideLengthMetres = 0.7;
const square = new box2D.b2PolygonShape();
square.SetAsBox(sideLengthMetres / 2, sideLengthMetres / 2);
const circle = new box2D.b2CircleShape();
circle.set_m_radius(sideLengthMetres / 2);
// huge floor under ground of 500 units high, and 10000 units wide
const bd_floor = new box2D.b2BodyDef();
bd_floor.set_type(box2D.b2_staticBody);
bd_floor.set_position(new box2D.b2Vec2(0, 25030));
const floor = world.CreateBody(bd_floor);
const floorShape = new box2D.b2PolygonShape();
floorShape.SetAsBox(50000, 25000);
floor.CreateFixture(floorShape, 0);
var floorData = floor.GetUserData();
floorData.color = theme.ground.color;
floorData.border = theme.ground.border;
floorData.border_width = theme.ground.border_width;
floorData.border_scale_with_zoom =
    theme.ground.border_scale_with_zoom;
floorData.sound = "ground.wav";
var polygonPoints = [
    [0.0, 0.64],
    [0.712, 0.499],
    [1.19, 0.172],
    [1.504, -0.27],
    [1.67, -0.779],
    [1.678, -3.272],
    [1.643, -3.469],
    [1.451, -3.597],
    [-1.416, -3.589],
    [-1.582, -3.51],
    [-1.654, -3.35],
    [-1.67, -0.779],
    [-1.497, -0.305],
    [-1.231, 0.126],
    [-0.65, 0.517],
    [-0.328, 0.614],
];
var personScale = 0.4;
polygonPoints = polygonPoints.map(function (point) {
    return [point[0] * personScale, point[1] * personScale];
});
// map to box2d.b2Vec2
// for each 8 points, create a new polygon
var pointsSplit = [];
for (var i = 0; i < polygonPoints.length; i += 6) {
    pointsSplit.push(polygonPoints.slice(i, i + 6));
    // if theres a next point, add it to the end of the array
    if (i + 6 < polygonPoints.length) {
        pointsSplit[pointsSplit.length - 1].push(polygonPoints[i + 6]);
    }
    else {
        //pointsSplit[pointsSplit.length - 1].push(polygonPoints[0]);
    }
    // push final point to start of array
    if (i < polygonPoints.length) {
        pointsSplit[pointsSplit.length - 1].unshift(polygonPoints[polygonPoints.length - 1]);
    }
}
var bd_polygon = new box2D.b2BodyDef();
bd_polygon.set_type(box2D.b2_dynamicBody);
bd_polygon.set_position(new box2D.b2Vec2(0, 0));
const polygon = world.CreateBody(bd_polygon);
// set full points in userdata for drawing
/*polygon.GetUserData().points = polygonPoints.map(function (point) {
  return { x: point[0], y: point[1] };
});*/
pointsSplit.forEach(function (points) {
    var polygonShape = createPolygonShape(points);
    polygon.CreateFixture(polygonShape, 1);
});
var polygonData = polygon.GetUserData();
polygonData.color = "#00000000";
polygonData.border = null;
polygonData.border_width = null;
polygonData.border_scale_with_zoom = false;
// image
polygonData.image = "/assets/textures/body.png";
polygonData.sound = "ground.wav";
// add a circle as the head at [0, 1.880], radius 1.710
const bd_circle_head = new box2D.b2BodyDef();
bd_circle_head.set_type(box2D.b2_dynamicBody);
bd_circle_head.set_position(new box2D.b2Vec2(0, 1.88 * personScale));
const circle_head = world.CreateBody(bd_circle_head);
circle.set_m_radius(1.71 * personScale);
circle_head.CreateFixture(circle, 1);
var circle_head_data = circle_head.GetUserData();
circle_head_data.color = "#99e077";
circle_head_data.border = theme.new_objects.border;
circle_head_data.border_width = theme.new_objects.border_width;
circle_head_data.border_scale_with_zoom =
    theme.new_objects.border_scale_with_zoom;
circle_head_data.circle_cake = theme.new_objects.circle_cake;
circle_head_data.sound = "ground.wav";
// joint it
const jd = new box2D.b2RevoluteJointDef();
jd.set_bodyA(polygon);
jd.set_bodyB(circle_head);
jd.set_localAnchorA(new box2D.b2Vec2(0, 0.32 * personScale));
// difference between the two bodies
jd.set_localAnchorB(new box2D.b2Vec2(0, (1.88 - 0.32) * personScale));
// no collide
jd.set_collideConnected(false);
world.CreateJoint(jd);
// distance joint it
const jd2ify = new box2D.b2DistanceJointDef();
jd2ify.set_bodyA(polygon);
jd2ify.set_bodyB(circle_head);
// its at [0, 3.26], frequency 2, target distance 0.005, damping ratio 0
jd2ify.set_localAnchorA(new box2D.b2Vec2(0, 3.26 * personScale));
jd2ify.set_localAnchorB(new box2D.b2Vec2(0, (1.88 - 3.26) * personScale));
jd2ify.set_stiffness(20 * personScale);
jd2ify.set_length(0.005 * personScale);
jd2ify.set_damping(0);
// no collide
jd2ify.set_collideConnected(false);
world.CreateJoint(jd2ify);
function createPolygonShape(tuples) {
    var shape = new box2D.b2PolygonShape();
    var [vecArrFirstElem, destroyVecArr] = box2D.tuplesToVec2Array(tuples);
    shape.Set(vecArrFirstElem, tuples.length);
    destroyVecArr();
    return shape;
}
// get the scale offset. box2d makes shapes slightly smaller, but we need to render bigger. we get it from shape class
var scaleOffset = square.m_radius;
console.log("offset: " + scaleOffset);
// circle next to it
const bd_circle = new box2D.b2BodyDef();
bd_circle.set_type(box2D.b2_dynamicBody);
bd_circle.set_position(new box2D.b2Vec2(5, 0));
const circleBody = world.CreateBody(bd_circle);
const circleShape = new box2D.b2CircleShape();
circleShape.set_m_radius(0.1);
circleBody.CreateFixture(circleShape, 1);
var circleData = circleBody.GetUserData();
circleData.color = getRandomColor(theme.new_objects.color.hue_min, theme.new_objects.color.hue_max, theme.new_objects.color.sat_min, theme.new_objects.color.sat_max, theme.new_objects.color.val_min, theme.new_objects.color.val_max, theme.new_objects.color.alp_min, theme.new_objects.color.alp_max, true);
circleData.border = theme.new_objects.border;
circleData.border_width = theme.new_objects.border_width;
circleData.border_scale_with_zoom =
    theme.new_objects.border_scale_with_zoom;
circleData.circle_cake = theme.new_objects.circle_cake;
const ZERO = new box2D.b2Vec2(0, 0);
const temp = new box2D.b2Vec2(0, 0);
// car with rectangle and 2 circles hooked up by joints
const bd_car = new box2D.b2BodyDef();
bd_car.set_type(box2D.b2_dynamicBody);
bd_car.set_position(new box2D.b2Vec2(-5, 0));
const car = world.CreateBody(bd_car);
const carShape = new box2D.b2PolygonShape();
carShape.SetAsBox(1.1, 0.1);
car.CreateFixture(carShape, 1);
var carData = car.GetUserData();
carData.color = "#00a0ff";
carData.border = theme.new_objects.border;
carData.border_width = theme.new_objects.border_width;
carData.border_scale_with_zoom =
    theme.new_objects.border_scale_with_zoom;
const bd_wheel1 = new box2D.b2BodyDef();
bd_wheel1.set_type(box2D.b2_dynamicBody);
bd_wheel1.set_position(new box2D.b2Vec2(-6, 0.5));
const wheel1 = world.CreateBody(bd_wheel1);
const wheelShape1 = new box2D.b2CircleShape();
wheelShape1.set_m_radius(0.5);
wheel1.CreateFixture(wheelShape1, 1);
var wheel1Data = wheel1.GetUserData();
wheel1Data.color = "#404040";
wheel1Data.border = theme.new_objects.border;
wheel1Data.border_width = theme.new_objects.border_width;
wheel1Data.border_scale_with_zoom =
    theme.new_objects.border_scale_with_zoom;
wheel1Data.circle_cake = theme.new_objects.circle_cake;
const bd_wheel2 = new box2D.b2BodyDef();
bd_wheel2.set_type(box2D.b2_dynamicBody);
bd_wheel2.set_position(new box2D.b2Vec2(-4, 0.5));
const wheel2 = world.CreateBody(bd_wheel2);
const wheelShape2 = new box2D.b2CircleShape();
wheelShape2.set_m_radius(0.5);
wheel2.CreateFixture(wheelShape2, 1);
var wheel2Data = wheel2.GetUserData();
wheel2Data.color = "#404040";
wheel2Data.border = theme.new_objects.border;
wheel2Data.border_width = theme.new_objects.border_width;
wheel2Data.border_scale_with_zoom =
    theme.new_objects.border_scale_with_zoom;
wheel2Data.circle_cake = theme.new_objects.circle_cake;
const jd1 = new box2D.b2RevoluteJointDef();
jd1.set_bodyA(car);
jd1.set_bodyB(wheel1);
jd1.set_localAnchorA(new box2D.b2Vec2(-1, 0));
jd1.set_localAnchorB(ZERO);
// no collide
jd1.set_collideConnected(false);
world.CreateJoint(jd1);
const jd2 = new box2D.b2RevoluteJointDef();
jd2.set_bodyA(car);
jd2.set_bodyB(wheel2);
jd2.set_localAnchorA(new box2D.b2Vec2(1, 0));
jd2.set_localAnchorB(ZERO);
// no collide
jd2.set_collideConnected(false);
world.CreateJoint(jd2);
/*
const initPosition = (body, index) => {
  temp.Set(4 + sideLengthMetres * (Math.random() - 0.5), -sideLengthMetres * index);
  body.SetTransform(temp, 0);
  body.SetLinearVelocity(ZERO);
  body.SetAwake(1);
  body.SetEnabled(1);
}
 
// make falling boxes
const boxCount = 10;
for (let i = 0; i < boxCount; i++) {
  const bd = new box2D.b2BodyDef();
  bd.set_type(box2D.b2_dynamicBody);
  bd.set_position(ZERO);
  const body = world.CreateBody(bd);
  body.CreateFixture(i % 2 ? square : circle, 1);
  var userData = body.GetUserData();
  userData.color = getRandomColor(0, 360, 0, 100, 80, 100, 1, 1, true);
  initPosition(body, i);
}
*/
var ei = 0;
var creatingObjects = {};
var springs = []; // this will be an object soon for multiplayer support
var tools = {};
//var draggingObjects = {};
var deleteSprings = false;
/*
wss.on('connection', (ws) => {
  */
io.on("connection", (ws) => {
    let peer1 = new nodeDataChannel.PeerConnection("Peer" + ei, {
        iceServers: ["stun:stun.l.google.com:19302"],
    }); // TODO: self-host ICE
    let dc1 = null;
    console.log("------\nweb socket connected through socket.io!\n------");
    // tell them they're connected
    ws.send(JSON.stringify({
        type: "connected",
        data: {
            message: "connected to server, good job. now all thats left is ICE stuff just like you practiced, client",
        },
    }));
    peer1.onLocalDescription((sdp, type) => {
        console.log("Peer1 SDP:", sdp, " Type:", type);
        ws.send(JSON.stringify({ sdp: sdp, type: type }));
    });
    peer1.onLocalCandidate((candidate, mid) => {
        console.log("Peer1 Candidate:", candidate);
        ws.send(JSON.stringify({ candidate: candidate, mid: mid }));
    });
    ws.on("message", (message) => {
        try {
            const msg = JSON.parse(message);
            if (msg.sdp) {
                peer1.setRemoteDescription(msg.sdp, msg.type);
            }
            else if (msg.candidate) {
                peer1.addRemoteCandidate(msg.candidate, msg.mid);
            }
        }
        catch (e) {
            console.log(e);
        }
    });
    // make a uuid with a bunch of math.randoms
    var uuid = ws.id;
    tools[uuid] = "drag";
    // gonna use proper uuids later, im just too lazy to npm i it yk
    dc1 = peer1.createDataChannel("main");
    dc1.onMessage((msg) => {
        //console.log('Peer1 Received Msg dc1:', msg);
        try {
            var formatted = JSON.parse(msg);
            // it should have a type and data. if not, it's not a valid message
            if (formatted.type !== undefined &&
                formatted.data !== undefined &&
                formatted.type !== null &&
                formatted.data !== null) {
                // handle it
                //console.log('    Type: "' + formatted.type + '"');
                if (formatted.type == "player mouse") {
                    var springsFormatted = [];
                    springs.forEach((spring) => {
                        spring.SetTarget(new box2D.b2Vec2(formatted.data.x, formatted.data.y));
                        springsFormatted.push({
                            p1: [formatted.data.x, formatted.data.y],
                            p2: [spring.GetAnchorB().get_x(), spring.GetAnchorB().get_y()],
                        });
                    });
                    sendAll("player mouse", {
                        id: uuid,
                        x: formatted.data.x,
                        y: formatted.data.y,
                        springs: springsFormatted,
                    });
                    // 👍 we did it, yay, we're so cool
                }
                else if (formatted.type == "player mouse down") {
                    if (tools[uuid] == "add_rectangle") {
                        creatingObjects[uuid] = {
                            x: formatted.data.x,
                            y: formatted.data.y,
                            color: getRandomColor(theme.new_objects.color.hue_min, theme.new_objects.color.hue_max, theme.new_objects.color.sat_min, theme.new_objects.color.sat_max, theme.new_objects.color.val_min, theme.new_objects.color.val_max, theme.new_objects.color.alp_min, theme.new_objects.color.alp_max, true),
                            shape: "rectangle",
                            border: theme.new_objects.border,
                            border_width: theme.new_objects.border_width,
                            border_scale_with_zoom: theme.new_objects.border_scale_with_zoom,
                        };
                    }
                    else if (tools[uuid] == "add_circle") {
                        creatingObjects[uuid] = {
                            x: formatted.data.x,
                            y: formatted.data.y,
                            color: getRandomColor(theme.new_objects.color.hue_min, theme.new_objects.color.hue_max, theme.new_objects.color.sat_min, theme.new_objects.color.sat_max, theme.new_objects.color.val_min, theme.new_objects.color.val_max, theme.new_objects.color.alp_min, theme.new_objects.color.alp_max, true),
                            shape: "circle",
                            border: theme.new_objects.border,
                            border_width: theme.new_objects.border_width,
                            border_scale_with_zoom: theme.new_objects.border_scale_with_zoom,
                            circle_cake: theme.new_objects.circle_cake,
                        };
                    }
                    else if (tools[uuid] == "drag") {
                        // instead, start a spring
                        var pos = new box2D.b2Vec2(formatted.data.x, formatted.data.y);
                        var selectedBody = null;
                        var node = world.GetBodyList();
                        while (box2D.getPointer(node)) {
                            var b = node;
                            node = node.GetNext();
                            var position = b.GetPosition();
                            var fl = b.GetFixtureList();
                            if (!fl) {
                                continue;
                            }
                            while (box2D.getPointer(fl)) {
                                var shape = fl.GetShape();
                                var shapeType = shape.GetType();
                                if (shapeType == box2D.b2Shape.e_circle) {
                                    // test point in fixture (fl.TestPoint)
                                    if (fl.TestPoint(pos)) {
                                        // we found a body
                                        selectedBody = b;
                                        break;
                                    }
                                }
                                else if (shapeType == box2D.b2Shape.e_polygon) {
                                    // test point in fixture (fl.TestPoint)
                                    if (fl.TestPoint(pos)) {
                                        // we found a body
                                        selectedBody = b;
                                        break;
                                    }
                                }
                                fl = fl.GetNext();
                            }
                        }
                        if (selectedBody) {
                            // create a spring
                            var md = new box2D.b2MouseJointDef();
                            md.set_bodyA(ground);
                            md.set_bodyB(selectedBody);
                            md.set_target(pos);
                            md.set_maxForce(1000000 * selectedBody.GetMass());
                            md.set_collideConnected(true);
                            md.set_stiffness(20);
                            md.set_damping(0);
                            var mouseJoint = box2D.castObject(world.CreateJoint(md), box2D.b2MouseJoint);
                            selectedBody.SetAwake(true);
                            springs.push(mouseJoint);
                        }
                    }
                    else {
                        console.log("Unknown tool: " + tools[uuid]);
                    }
                    // 👍 we did it, yay, we're so cool
                    // we did it, yay, we're so cool 👍
                }
                else if (formatted.type == "player mouse up") {
                    deleteSprings = true;
                    // Check if there's a creatingObject for this uuid
                    if (creatingObjects[uuid]) {
                        // if cursor hasnt moved beyond 0.001, delete the object
                        if (Math.abs(formatted.data.x - creatingObjects[uuid].x) < 0.001 &&
                            Math.abs(formatted.data.y - creatingObjects[uuid].y) < 0.001) {
                            delete creatingObjects[uuid];
                            return;
                        }
                        if (creatingObjects[uuid].shape == "rectangle") {
                            // Calculate the size of the new rectangle
                            const width = Math.abs(formatted.data.x - creatingObjects[uuid].x);
                            const height = Math.abs(formatted.data.y - creatingObjects[uuid].y);
                            // Create the rectangle
                            const bd = new box2D.b2BodyDef();
                            bd.set_type(box2D.b2_dynamicBody);
                            var pos = new box2D.b2Vec2((formatted.data.x + creatingObjects[uuid].x) / 2, (formatted.data.y + creatingObjects[uuid].y) / 2);
                            bd.set_position(pos);
                            const body = world.CreateBody(bd);
                            const shape = new box2D.b2PolygonShape();
                            shape.SetAsBox(width / 2, height / 2);
                            body.CreateFixture(shape, 1);
                            var bodyData = body.GetUserData();
                            bodyData.color = creatingObjects[uuid].color;
                            bodyData.border = theme.new_objects.border;
                            bodyData.border_width = theme.new_objects.border_width;
                            bodyData.border_scale_with_zoom =
                                theme.new_objects.border_scale_with_zoom;
                            // Remove the creatingObject for this uuid
                            delete creatingObjects[uuid];
                        }
                        else if (creatingObjects[uuid].shape == "square") {
                            // Calculate the size of the new square
                            const size = Math.max(Math.abs(formatted.data.x - creatingObjects[uuid].x), Math.abs(formatted.data.y - creatingObjects[uuid].y));
                            // Create the square
                            const bd = new box2D.b2BodyDef();
                            bd.set_type(box2D.b2_dynamicBody);
                            var pos = new box2D.b2Vec2((formatted.data.x + creatingObjects[uuid].x) / 2, (formatted.data.y + creatingObjects[uuid].y) / 2);
                            bd.set_position(pos);
                            const body = world.CreateBody(bd);
                            const shape = new box2D.b2PolygonShape();
                            shape.SetAsBox(size / 2, size / 2);
                            body.CreateFixture(shape, 1);
                            var bodyData = body.GetUserData();
                            bodyData.color = creatingObjects[uuid].color;
                            bodyData.border = theme.new_objects.border;
                            bodyData.border_width = theme.new_objects.border_width;
                            bodyData.border_scale_with_zoom =
                                theme.new_objects.border_scale_with_zoom;
                            // Remove the creatingObject for this uuid
                            delete creatingObjects[uuid];
                        }
                        else if (creatingObjects[uuid].shape == "circle") {
                            // Calculate the radius of the new circle
                            const dx = formatted.data.x - creatingObjects[uuid].x;
                            const dy = formatted.data.y - creatingObjects[uuid].y;
                            const radius = Math.max(Math.abs(dx), Math.abs(dy)) / 2;
                            // Create the circle
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
                            var bodyData = body.GetUserData();
                            bodyData.color = creatingObjects[uuid].color;
                            bodyData.border = creatingObjects[uuid].border;
                            bodyData.border_width =
                                creatingObjects[uuid].border_width;
                            bodyData.border_scale_with_zoom =
                                creatingObjects[uuid].border_scale_with_zoom;
                            bodyData.circle_cake =
                                creatingObjects[uuid].circle_cake;
                            // Remove the creatingObject for this uuid
                            delete creatingObjects[uuid];
                        }
                    }
                }
                else if (formatted.type == "set_theme") {
                    theme = themes[formatted.data];
                }
                else if (formatted.type == "set_tool") {
                    console.log("set tool to", formatted.data);
                    tools[uuid] = formatted.data;
                }
                else if (formatted.type == "set_time_scale") {
                    timeScaleMultiplier = formatted.data;
                    sendAll("set_time_scale", timeScaleMultiplier);
                }
                else if (formatted.type == "set_paused") {
                    paused = formatted.data;
                    sendAll("set_paused", paused);
                }
            }
        }
        catch (e) {
            console.log(e);
        }
    });
    dc1.onOpen(() => {
        dataChannels.push(dc1);
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
app.use("/icons", express.static(__dirname + "/node_modules/@mdi/svg/svg"));
// static serve media
app.use("/media", express.static(__dirname + "/media"));
// put app on http server
server.listen(4613, () => console.log("server listening on " + 4613));
var timeScale = 1 / 500;
setInterval(() => {
    loop(frameRate);
}, frameRate);
var previousStep = null;
function loop(delta) {
    // step physics
    if (paused) {
        if (previousStep) {
            sendAll("world update", previousStep);
        }
        return;
    }
    world.Step(delta * timeScale * timeScaleMultiplier, velocityIterations, positionIterations);
    if (deleteSprings) {
        springs.forEach((spring) => {
            world.DestroyJoint(spring);
        });
        deleteSprings = false;
        springs = [];
    }
    // get body
    var node = world.GetBodyList();
    var shapes = [];
    while (box2D.getPointer(node)) {
        var b = node;
        node = node.GetNext();
        var bodyData = b.GetUserData();
        var color = bodyData.color;
        var position = b.GetPosition();
        //console.log("position: " + position.x + ", " + position.y);
        b.GetType();
        // or was it just an illusion?
        // was it ever even real?
        // was it all just a dream?
        // or was our life not reality?
        // or was it all just a dream?
        // or was our life not achieved?
        // or was our mind just a construct beyond the world above?
        var fl = b.GetFixtureList();
        if (!fl) {
            continue;
        }
        while (box2D.getPointer(fl)) {
            var shape = fl.GetShape();
            var shapeType = shape.GetType();
            if (shapeType == box2D.b2Shape.e_circle) {
                const circleShape = box2D.castObject(shape, box2D.b2CircleShape);
                //console.log("circle of radius " + circleShape.get_m_radius() + " at " + position.x + ", " + position.y);
                shapes.push({
                    x: position.x,
                    y: position.y,
                    type: "circle",
                    radius: circleShape.get_m_radius(),
                    angle: b.GetAngle(),
                    color: color,
                    border: bodyData.border,
                    border_width: bodyData.border_width,
                    border_scale_with_zoom: bodyData.border_scale_with_zoom,
                    circle_cake: bodyData.circle_cake,
                    image: bodyData.image,
                });
            }
            else if (shapeType == box2D.b2Shape.e_polygon) {
                const polygonShape = box2D.castObject(shape, box2D.b2PolygonShape);
                var vertexCount = polygonShape.get_m_count();
                var verts = [];
                // iterate over vertices
                for (let i = 0; i < vertexCount; i++) {
                    const vertex = polygonShape.get_m_vertices(i);
                    //console.log("vertex " + i + " at " + vertex.x + ", " + vertex.y);
                    verts.push({
                        x: vertex.x,
                        y: vertex.y,
                    });
                }
                shapes.push({
                    x: position.x,
                    y: position.y,
                    type: "polygon",
                    vertices: verts,
                    angle: b.GetAngle(),
                    color: color,
                    border: bodyData.border,
                    border_width: bodyData.border_width,
                    border_scale_with_zoom: bodyData.border_scale_with_zoom,
                    //points: bodyData.points,
                    image: bodyData.image,
                });
            }
            else if (shapeType == box2D.b2Shape.e_edge) {
                const edgeShape = box2D.castObject(shape, box2D.b2EdgeShape);
                var vertices = [
                    {
                        x: edgeShape.get_m_vertex1().get_x(),
                        y: edgeShape.get_m_vertex1().get_y(),
                    },
                    {
                        x: edgeShape.get_m_vertex2().get_x(),
                        y: edgeShape.get_m_vertex2().get_y(),
                    },
                ];
                //console.log("edge: ");
                //console.log(vertices);
                shapes.push({
                    x: position.x,
                    y: position.y,
                    type: "edge",
                    vertices: vertices,
                    angle: b.GetAngle(),
                    color: color,
                    border: bodyData.border,
                    border_width: bodyData.border_width,
                    border_scale_with_zoom: bodyData.border_scale_with_zoom,
                    image: bodyData.image,
                });
            }
            else {
                //console.log("unknown shape type");
            }
            fl = fl.GetNext();
        }
    }
    var springsFormatted = [];
    springs.forEach((spring) => {
        springsFormatted.push({
            p1: [spring.GetTarget().get_x(), spring.GetTarget().get_y()],
            p2: [spring.GetAnchorB().get_x(), spring.GetAnchorB().get_y()],
        });
    });
    var thisStep = {
        shapes: shapes,
        creating_objects: creatingObjects,
        background: theme.background,
        springs: springsFormatted,
        time_scale: timeScaleMultiplier,
        paused: paused,
    };
    sendAll("world update", thisStep);
    previousStep = thisStep;
    //console.log("vomit");
}
function sendAll(type, data) {
    dataChannels.forEach((dc) => {
        // check if open first
        if (!dc.isOpen()) {
            return;
        }
        try {
            dc.sendMessage(JSON.stringify({
                type: type,
                data: data,
            }));
        }
        catch (e) {
            console.log("error sending message");
            console.log(e);
        }
    });
}
//# sourceMappingURL=index.js.map