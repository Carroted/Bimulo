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
      "border_width": null
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
      "circle_cake": true
    }
  },
  "nostalgia": {
    "background": "#738cff",
    "ground": {
      "color": "#57b00d",
      "border": "#1111110a",
      "border_width": 0.2
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
      "border": "#1111110a",
      "border_width": 0.2,
      "circle_cake": false
    }
  }
};

var theme = 'default';

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
const sideLengthMetres = 1;
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
floor.GetUserData().color = themes[theme].ground.color;
floor.GetUserData().border = themes[theme].ground.border;
floor.GetUserData().border_width = themes[theme].ground.border_width;


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
          // tell the other people the cool news
          for (var i = 0; i < dataChannels.length; i++) {
            if (dataChannels[i] != dc1) {
              dataChannels[i].sendMessage(JSON.stringify({
                type: 'player mouse',
                data: {
                  id: uuid,
                  x: formatted.data.x,
                  y: formatted.data.y
                }
              }));
            }
          }

          springs.forEach(spring => {
            spring.set_target(new box2D.b2Vec2(formatted.data.x, formatted.data.y));
          });
          // 👍 we did it, yay, we're so cool
        }
        else if (formatted.type == 'player mouse down') {

          var shapes = ['rectangle'];
          creatingObjects[uuid] = {
            x: formatted.data.x,
            y: formatted.data.y,
            color: getRandomColor(themes[theme].new_objects.color.hue_min, themes[theme].new_objects.color.hue_max, themes[theme].new_objects.color.sat_min, themes[theme].new_objects.color.sat_max, themes[theme].new_objects.color.light_min, themes[theme].new_objects.color.light_max, themes[theme].new_objects.color.alpha_min, themes[theme].new_objects.color.alpha_max, true),
            shape: shapes[Math.floor(Math.random() * shapes.length)]
          };

          // instead, start a spring
          /*var bd = new box2D.b2BodyDef();
          bd.set_type(box2D.b2_dynamicBody);
          var pos = new box2D.b2Vec2(formatted.data.x, formatted.data.y);
          bd.set_position(pos);
          const body = world.CreateBody(bd);
          body.CreateFixture(square, 1);
          var userData = body.GetUserData();
          userData.color = getRandomColor(0, 360, 0, 100, 80, 100, 1, 1);
 
          // create a spring
          var md = new box2D.b2MouseJointDef();
          md.set_bodyA(mouseJointGroundBody);
          md.set_bodyB(body);
          md.set_target(pos);
          md.set_maxForce(1000 * body.GetMass());
          md.set_collideConnected(true);
 
          mouseJoint = box2D.castObject(world.CreateJoint(md), box2D.b2MouseJoint);
          body.SetAwake(true);
 
          springs.push(mouseJoint);*/

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
              body.GetUserData().border = themes[theme].new_objects.border;
              body.GetUserData().border_width = themes[theme].new_objects.border_width;

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

              // Remove the creatingObject for this uuid
              delete creatingObjects[uuid];
            }
          }
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
console.log('staticked the client folderation');

// static serve node_modules/@tabler/icons/icons
app.use("/icons", express.static(__dirname + "/node_modules/@tabler/icons/icons"));

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
        color: color
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
        color: color
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
        color: color
      });
    }
    else {
      //console.log("unknown shape type");
    }
  }

  dataChannels.forEach((dc) => {
    // check if open first
    if (!dc.isOpen()) {
      return;
    }
    try {
      dc.sendMessage(JSON.stringify({
        type: 'world update',
        data: {
          shapes: shapes,
          creatingObjects: creatingObjects
        }
      }));
    }
    catch (e) {
      console.log("error sending message");
      console.log(e);
    }
  });

  //console.log("vomit");
};

