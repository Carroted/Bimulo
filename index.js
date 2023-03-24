import express from "express";
import { WebSocketServer } from 'ws';
import nodeDataChannel from 'node-datachannel';

const app = express();
// make http server (esm import)
import http from "http";
const server = http.createServer(app);

const wss = new WebSocketServer({ port: 3000 });

var dataChannels = [];

wss.on('connection', (ws) => {
  let peer1 = new nodeDataChannel.PeerConnection('Peer1', { iceServers: ['stun:stun.l.google.com:19302'] });
  let dc1 = null;

  peer1.onLocalDescription((sdp, type) => {
    console.log('Peer1 SDP:', sdp, ' Type:', type);
    ws.send(JSON.stringify({ sdp: sdp, type: type }));
  });

  peer1.onLocalCandidate((candidate, mid) => {
    console.log('Peer1 Candidate:', candidate);
    ws.send(JSON.stringify({ candidate: candidate, mid: mid }));
  });

  ws.on('message', (message) => {
    const msg = JSON.parse(message);

    if (msg.sdp) {
      peer1.setRemoteDescription(msg.sdp, msg.type);
    } else if (msg.candidate) {
      peer1.addRemoteCandidate(msg.candidate, msg.mid);
    }
  });

  dc1 = peer1.createDataChannel('main');
  dc1.onMessage((msg) => {
    console.log('Peer1 Received Msg dc1:', msg);
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

import * as url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

import Box2DFactory from "box2d-wasm";
const box2D = await Box2DFactory();
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

const frameRate = 1000 / 30;
const canvas = { width: 800, height: 400 };
const boxes = 20;
const boxSize = 20;
const wallThickness = 50;
let online = 0;

const zero = new box2D.b2Vec2(0, 0);

const gravity = new box2D.b2Vec2(0, 10);
const world = new box2D.b2World(gravity);

const bd_ground = new box2D.b2BodyDef();
const ground = world.CreateBody(bd_ground);

// ramp which boxes fall onto initially
{
  const shape = new box2D.b2EdgeShape();
  shape.SetTwoSided(new box2D.b2Vec2(3, 4), new box2D.b2Vec2(6, 7));
  ground.CreateFixture(shape, 0);
}
// floor which boxes rest on
{
  const shape = new box2D.b2EdgeShape();
  shape.SetTwoSided(new box2D.b2Vec2(3, 18), new box2D.b2Vec2(22, 18));
  ground.CreateFixture(shape, 0);
}

const sideLengthMetres = 1;
const square = new box2D.b2PolygonShape();
square.SetAsBox(sideLengthMetres / 2, sideLengthMetres / 2);
const circle = new box2D.b2CircleShape();
circle.set_m_radius(sideLengthMetres / 2);

const ZERO = new box2D.b2Vec2(0, 0);
const temp = new box2D.b2Vec2(0, 0);

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
  initPosition(body, i);
}


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

var timeScale = 0.001;

setTimeout(() => {
  // step constantly and send to clients with webrtc
  setInterval(() => {
    // step physics
    world.Step(frameRate * timeScale, velocityIterations, positionIterations);
    // get body
    var node = world.GetBodyList();

    var shapes = [];

    while (box2D.getPointer(node)) {
      var b = node;
      node = node.GetNext();
      var position = b.GetPosition();
      console.log("position: " + position.x + ", " + position.y);
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
        console.log("circle of radius " + circleShape.get_m_radius() + " at " + position.x + ", " + position.y);
        shapes.push({
          x: position.x,
          y: position.y,
          type: 'circle',
          radius: circleShape.get_m_radius(),
          angle: b.GetAngle()
        });
      } else if (shapeType == box2D.b2Shape.e_polygon) {
        const polygonShape = box2D.castObject(shape, box2D.b2PolygonShape);
        var vertexCount = polygonShape.get_m_count();
        var verts = [];
        // iterate over vertices
        for (let i = 0; i < vertexCount; i++) {
          const vertex = polygonShape.get_m_vertices(i);
          console.log("vertex " + i + " at " + vertex.x + ", " + vertex.y);
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
          angle: b.GetAngle()
        });
      }
      else {
        console.log("unknown shape type");
      }
    }

    dataChannels.forEach((dc) => {
      dc.sendMessage(JSON.stringify({
        type: 'world update',
        data: {
          shapes: shapes
        }
      }));
    });

    //console.log("vomit");
  }, frameRate);
}, 8000);