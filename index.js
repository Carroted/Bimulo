// Simulo Server
// Node.js backend for Simulo with server-side physics, WebRTC signaling, etc.

import express from "express";
import { WebSocketServer } from 'ws'; // TODO: move back to ws from socket.io
import nodeDataChannel from 'node-datachannel'; // for WebRTC data channels

// from ./shared/utils.js
import { getRandomColor, randomRange, hsvToRgb } from "./shared/utils.js";

// This is ESM, let's get back __dirname and __filename
import * as url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

import Box2DFactory from "box2d-wasm";
const box2D = await Box2DFactory();

var themes = {
  "default": {
    "background": "linear-gradient(180deg, #0f1130 0%, #553f90 180%)",
    "ground": {
      "color": "#a1acfa",
      "border": null,
      "border_width": null,
      "border_scale_with_zoom": false
    },
    "new_objects": {
      "color": {
        "hue_min": 0,
        "hue_max": 360,
        "sat_min": 0,
        "sat_max": 100,
        "val_min": 80,
        "val_max": 100,
        "alp_min": 1,
        "alp_max": 1
      },
      "border": null,
      "border_width": null,
      "border_scale_with_zoom": false,
      "circle_cake": true
    }
  },
  "nostalgia": {
    "background": "#738cff",
    "ground": {
      "color": "#57b00d",
      "border": "#111111a0",
      "border_width": 1,
      "border_scale_with_zoom": true
    },
    "new_objects": {
      "color": {
        "hue_min": 0,
        "hue_max": 360,
        "sat_min": 0,
        "sat_max": 100,
        "val_min": 0,
        "val_max": 100,
        "alp_min": 1,
        "alp_max": 1
      },
      "border": "#111111a0",
      "border_width": 1,
      "border_scale_with_zoom": true,
      "circle_cake": false
    }
  }
};

var theme = themes['nostalgia'];

const app = express();
// make http server (esm import)
import http from "http";
const server = http.createServer();
server.on('request', app);

//const wss = new WebSocketServer({ server });
// socket.io on the http
import { Server } from 'socket.io'; // we use socket.io since websocket without SSL doesnt usually work. this could be replaced with ws and add SSL cert creation (Let's Encrypt?)
const io = new Server(server);

var dataChannels = [];

const gravity = new box2D.b2Vec2(0, 9.81);
const world = new box2D.b2World(gravity);
world.SetContinuousPhysics(true);

const bd_ground = new box2D.b2BodyDef();
const ground = world.CreateBody(bd_ground);

/*
// floor which boxes rest on
{
  const shape = new box2D.b2EdgeShape();
  shape.SetTwoSided(new box2D.b2Vec2(3, 18), new box2D.b2Vec2(22, 18));
  ground.CreateFixture(shape, 0);
}
*/
const sideLengthMetres = 0.1;
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
floor.GetUserData().color = theme.ground.color;
floor.GetUserData().border = theme.ground.border;
floor.GetUserData().border_width = theme.ground.border_width;
floor.GetUserData().border_scale_with_zoom = theme.ground.border_scale_with_zoom;

var polygonPoints = [[0.000, 0.640],
[0.712, 0.499],
[1.190, 0.172],
[1.504, -0.270],
[1.670, -0.779],
[1.678, -3.272],
[1.643, -3.469],
[1.451, -3.597],
[-1.416, -3.589],
[-1.582, -3.510],
[-1.654, -3.350],
[-1.670, -0.779],
[-1.497, -0.305],
[-1.231, 0.126],
[-0.650, 0.517],
[-0.328, 0.614]];
// map to box2d.b2Vec2
polygonPoints = polygonPoints.map((point) => {
  console.log(point);
  return new box2D.b2Vec2(point[0], point[1]);
});

polygonPoints.reverse();

const bd_polygon = new box2D.b2BodyDef();
bd_polygon.set_type(box2D.b2_dynamicBody);
bd_polygon.set_position(new box2D.b2Vec2(0, 0));
const polygon = world.CreateBody(bd_polygon);
const polygonShape = new box2D.b2PolygonShape();
polygonShape.Set(polygonPoints, polygonPoints.length);
polygon.CreateFixture(polygonShape, 1);
polygon.GetUserData().color = '#ff0000';
polygon.GetUserData().border = '#000000';
polygon.GetUserData().border_width = 1;
polygon.GetUserData().border_scale_with_zoom = true;

// get the scale offset. box2d makes shapes slightly smaller, but we need to render bigger. we get it from shape class
var scaleOffset = polygonShape.m_radius;
console.log('offset: ' + scaleOffset);

// circle next to it
const bd_circle = new box2D.b2BodyDef();
bd_circle.set_type(box2D.b2_dynamicBody);
bd_circle.set_position(new box2D.b2Vec2(5, 0));
const circleBody = world.CreateBody(bd_circle);
const circleShape = new box2D.b2CircleShape();
circleShape.set_m_radius(0.1);
circleBody.CreateFixture(circleShape, 1);
circleBody.GetUserData().color = getRandomColor(theme.new_objects.color.hue_min, theme.new_objects.color.hue_max, theme.new_objects.color.sat_min, theme.new_objects.color.sat_max, theme.new_objects.color.val_min, theme.new_objects.color.val_max, theme.new_objects.color.alp_min, theme.new_objects.color.alp_max, true);
circleBody.GetUserData().border = theme.new_objects.border;
circleBody.GetUserData().border_width = theme.new_objects.border_width;
circleBody.GetUserData().border_scale_with_zoom = theme.new_objects.border_scale_with_zoom;


const ZERO = new box2D.b2Vec2(0, 0);
const temp = new box2D.b2Vec2(0, 0);


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
var springs = [];
var tools = {};
/*
wss.on('connection', (ws) => {
  */
io.on('connection', (ws) => {

  let peer1 = new nodeDataChannel.PeerConnection('Peer' + ei, { iceServers: ['stun:stun.l.google.com:19302'] }); // TODO: self-host ICE
  let dc1 = null;

  console.log('------\nweb socket connected through socket.io!\n------');
  // tell them they're connected
  ws.send(JSON.stringify({
    type: 'connected', data: {
      message: 'connected to server, good job. now all thats left is ICE stuff just like you practiced, client'
    }
  }));

  peer1.onLocalDescription((sdp, type) => {
    console.log('Peer1 SDP:', sdp, ' Type:', type);
    ws.send(JSON.stringify({ sdp: sdp, type: type }));
  });

  peer1.onLocalCandidate((candidate, mid) => {
    console.log('Peer1 Candidate:', candidate);
    ws.send(JSON.stringify({ candidate: candidate, mid: mid }));
  });

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      if (msg.sdp) {
        peer1.setRemoteDescription(msg.sdp, msg.type);
      } else if (msg.candidate) {
        peer1.addRemoteCandidate(msg.candidate, msg.mid);
      }
    }
    catch (e) {
      console.log(e);
    }
  });

  // make a uuid with a bunch of math.randoms
  var uuid = ws.id;
  tools[uuid] = 'drag';

  // gonna use proper uuids later, im just too lazy to npm i it yk

  dc1 = peer1.createDataChannel('main');
  dc1.onMessage((msg) => {
    //console.log('Peer1 Received Msg dc1:', msg);
    try {
      var formatted = JSON.parse(msg);
      // it should have a type and data. if not, it's not a valid message
      if (formatted.type !== undefined && formatted.data !== undefined && formatted.type !== null && formatted.data !== null) {
        // handle it
        //console.log('    Type: "' + formatted.type + '"');
        if (formatted.type == 'player mouse') {
          var springsFormatted = [];
          springs.forEach(spring => {
            spring.SetTarget(new box2D.b2Vec2(formatted.data.x, formatted.data.y));
            springsFormatted.push({
              p1: [formatted.data.x, formatted.data.y],
              p2: [spring.GetAnchorB().get_x(), spring.GetAnchorB().get_y()]
            });
          });

          sendAll('player mouse', {
            id: uuid,
            x: formatted.data.x,
            y: formatted.data.y,
            springs: springsFormatted
          });

          // 👍 we did it, yay, we're so cool
        }
        else if (formatted.type == 'player mouse down') {
          if (tools[uuid] == 'add_rectangle') {

            var shapes = ['rectangle'];
            creatingObjects[uuid] = {
              x: formatted.data.x,
              y: formatted.data.y,
              color: getRandomColor(theme.new_objects.color.hue_min, theme.new_objects.color.hue_max, theme.new_objects.color.sat_min, theme.new_objects.color.sat_max, theme.new_objects.color.val_min, theme.new_objects.color.val_max, theme.new_objects.color.alp_min, theme.new_objects.color.alp_max, true),
              shape: shapes[Math.floor(Math.random() * shapes.length)],
              border: theme.new_objects.border,
              border_width: theme.new_objects.border_width,
              border_scale_with_zoom: theme.new_objects.border_scale_with_zoom,
            };
          }
          else if (tools[uuid] == 'drag') {
            // instead, start a spring
            var bd = new box2D.b2BodyDef();
            bd.linearDamping = 0;
            bd.set_type(box2D.b2_dynamicBody);
            var pos = new box2D.b2Vec2(formatted.data.x, formatted.data.y);
            bd.set_position(pos);
            const body = world.CreateBody(bd);
            body.CreateFixture(square, 1);
            var userData = body.GetUserData();
            userData.color = getRandomColor(0, 360, 0, 100, 80, 100, 1, 1);

            // create a spring
            var md = new box2D.b2MouseJointDef();
            md.set_bodyA(ground);
            md.set_bodyB(body);
            md.set_target(pos);
            md.set_maxForce(1000000 * body.GetMass());
            md.set_collideConnected(true);
            md.set_stiffness(20);
            md.set_damping(0);

            var mouseJoint = box2D.castObject(world.CreateJoint(md), box2D.b2MouseJoint);

            body.SetAwake(true);
            springs.push(mouseJoint);
          }

          // 👍 we did it, yay, we're so cool

          // we did it, yay, we're so cool 👍
        }
        else if (formatted.type == 'player mouse up') {
          // Check if there's a creatingObject for this uuid
          if (creatingObjects[uuid]) {
            if (creatingObjects[uuid].shape == 'rectangle') {
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
              body.GetUserData().color = creatingObjects[uuid].color;
              body.GetUserData().border = theme.new_objects.border;
              body.GetUserData().border_width = theme.new_objects.border_width;
              body.GetUserData().border_scale_with_zoom = theme.new_objects.border_scale_with_zoom;

              // Remove the creatingObject for this uuid
              delete creatingObjects[uuid];
            }
            else if (creatingObjects[uuid].shape == 'square') {
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
              body.GetUserData().color = creatingObjects[uuid].color;
              body.GetUserData().border = theme.new_objects.border;
              body.GetUserData().border_width = theme.new_objects.border_width;
              body.GetUserData().border_scale_with_zoom = theme.new_objects.border_scale_with_zoom;


              // Remove the creatingObject for this uuid
              delete creatingObjects[uuid];
            }
            else if (creatingObjects[uuid].shape == 'circle') {
              // Calculate the radius of the new circle
              const dx = formatted.data.x - creatingObjects[uuid].x;
              const dy = formatted.data.y - creatingObjects[uuid].y;
              const radius = Math.sqrt(dx * dx + dy * dy);

              // Create the circle
              const bd = new box2D.b2BodyDef();
              bd.set_type(box2D.b2_dynamicBody);
              var pos = new box2D.b2Vec2(creatingObjects[uuid].x, creatingObjects[uuid].y);
              bd.set_position(pos);
              const body = world.CreateBody(bd);

              const shape = new box2D.b2CircleShape();
              shape.set_m_radius(radius);
              body.CreateFixture(shape, 1);
              body.GetUserData().color = creatingObjects[uuid].color;
              body.GetUserData().border = theme.new_objects.border;
              body.GetUserData().border_width = theme.new_objects.border_width;
              body.GetUserData().border_scale_with_zoom = theme.new_objects.border_scale_with_zoom;

              // Remove the creatingObject for this uuid
              delete creatingObjects[uuid];
            }
          }
        }
        else if (formatted.type == 'set_theme') {
          theme = themes[formatted.data];
        }
        else if (formatted.type = 'set_tool') {
          // bruh
        }
      }
    } catch (e) {
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
app.use("/icons", express.static(__dirname + "/node_modules/@tabler/icons/icons"));

// static serve media
app.use("/media", express.static(__dirname + "/media"));

// put app on http server


server.listen(4613, () =>
  console.log("server listening on " + 4613)
);

var timeScale = 1 / 500;

setInterval(() => {
  loop(frameRate);
}, frameRate);

function loop(delta) {
  // step physics
  world.Step(delta * timeScale, velocityIterations, positionIterations);
  // get body
  var node = world.GetBodyList();

  var shapes = [];

  while (box2D.getPointer(node)) {
    var b = node;
    node = node.GetNext();
    var color = b.GetUserData().color;

    var position = b.GetPosition();
    //console.log("position: " + position.x + ", " + position.y);
    b.GetType()

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
    var shape = fl.GetShape();
    var shapeType = shape.GetType();
    if (shapeType == box2D.b2Shape.e_circle) {
      const circleShape = box2D.castObject(shape, box2D.b2CircleShape);
      //console.log("circle of radius " + circleShape.get_m_radius() + " at " + position.x + ", " + position.y);
      shapes.push({
        x: position.x,
        y: position.y,
        type: 'circle',
        radius: circleShape.get_m_radius(),
        angle: b.GetAngle(),
        color: color,
        border: b.GetUserData().border,
        border_width: b.GetUserData().border_width,
        border_scale_with_zoom: b.GetUserData().border_scale_with_zoom
      });
    } else if (shapeType == box2D.b2Shape.e_polygon) {
      const polygonShape = box2D.castObject(shape, box2D.b2PolygonShape);
      var vertexCount = polygonShape.get_m_count();
      var verts = [];
      // iterate over vertices
      for (let i = 0; i < vertexCount; i++) {
        const vertex = polygonShape.get_m_vertices(i);
        //console.log("vertex " + i + " at " + vertex.x + ", " + vertex.y);
        verts.push({
          x: vertex.x,
          y: vertex.y
        });
      }
      shapes.push({
        x: position.x,
        y: position.y,
        type: 'polygon',
        vertices: verts,
        angle: b.GetAngle(),
        color: color,
        border: b.GetUserData().border,
        border_width: b.GetUserData().border_width,
        border_scale_with_zoom: b.GetUserData().border_scale_with_zoom
      });
    }
    else if (shapeType == box2D.b2Shape.e_edge) {
      const edgeShape = box2D.castObject(shape, box2D.b2EdgeShape);
      var vertices = [
        {
          x: edgeShape.get_m_vertex1().get_x(),
          y: edgeShape.get_m_vertex1().get_y()
        },
        {
          x: edgeShape.get_m_vertex2().get_x(),
          y: edgeShape.get_m_vertex2().get_y()
        }
      ];
      //console.log("edge: ");
      //console.log(vertices);
      shapes.push({
        x: position.x,
        y: position.y,
        type: 'edge',
        vertices: vertices,
        angle: b.GetAngle(),
        color: color,
        border: b.GetUserData().border,
        border_width: b.GetUserData().border_width,
        border_scale_with_zoom: b.GetUserData().border_scale_with_zoom
      });
    }
    else {
      //console.log("unknown shape type");
    }
  }

  var springsFormatted = [];
  springs.forEach(spring => {
    springsFormatted.push({
      p1: [spring.GetTarget().get_x(), spring.GetTarget().get_y()],
      p2: [spring.GetAnchorB().get_x(), spring.GetAnchorB().get_y()]
    });
  });

  sendAll('world update', {
    shapes: shapes,
    creatingObjects: creatingObjects,
    background: theme.background,
    springs: springsFormatted
  });

  //console.log("vomit");
};

function sendAll(type, data) {
  dataChannels.forEach((dc) => {
    // check if open first
    if (!dc.isOpen()) {
      return;
    }
    try {
      dc.sendMessage(JSON.stringify({
        type: type,
        data: data
      }));
    }
    catch (e) {
      console.log("error sending message");
      console.log(e);
    }
  });
}