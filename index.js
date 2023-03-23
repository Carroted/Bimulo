import express from "express";
import WebSocket from 'ws';
import nodeDataChannel from 'node-datachannel';

const app = express();
// make http server (esm import)
import http from "http";
const server = http.createServer(app);

const wss = new WebSocket.Server({ port: 3000 });

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

  peer1.onDataChannel((dc) => {
    console.log('Peer1 Got DataChannel: ', dc.getLabel());
    dc1 = dc;
    dc1.onMessage((msg) => {
      console.log('Peer1 Received Msg:', msg);
    });
  });

  dc1 = peer1.createDataChannel('test');
  dc1.onMessage((msg) => {
    console.log('Peer1 Received Msg dc1:', msg);
  });

  // Send test message to client after some time
  setTimeout(() => {
    if (dc1) {
      dc1.sendMessage('Hello from Peer1');
      dc1.sendMessage('Hello from Peer1');
      dc1.sendMessage('Hello from Peer1');
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

// import our webrtc server
import Peer from "simple-peer";
import wrtc from "wrtc";
// we will use peer as a server. yes, its for p2p, but if all clients are only connected to server and not each other, it works for authority multiplayer

// create peer server with our existing http server
const peerServer = new Peer({
  initiator: true,
  wrtc: wrtc,
  trickle: false
});
peerServer.on("connect", () => {
  // webrtc connection
  // send verts to client
  console.log("vomit everywhere");
});
peerServer.on("signal", (data) => {
  console.log("signal vomit");
  // send signal to client
});
peerServer.on("data", (data) => {
  console.log("data vomit");
  // receive data from client
});

var peers = [];
// ploopy monkey
const omniPeer = new Peer({
  initiator: false,
  wrtc: wrtc,
  trickle: false
});
omniPeer.on("connect", () => {
  // webrtc connection
  console.log("OMNI vomit everywhere");
});
omniPeer.on("signal", (data) => {
  console.log("OMNI signal vomit");
  // send signal to client
});
omniPeer.on("data", (data) => {
  console.log("OMNI data vomit");
  // receive data from client
});
peers.push(omniPeer);

const frameRate = 1000 / 10;
const canvas = { width: 800, height: 400 };
const boxes = 20;
const boxSize = 20;
const wallThickness = 20;
let online = 0;

const gravity = new box2D.b2Vec2(0, 10);
const world = new box2D.b2World(gravity);

const sideLengthMetres = 1;
const square = new box2D.b2PolygonShape();
square.SetAsBox(sideLengthMetres / 2, sideLengthMetres / 2);

const zero = new box2D.b2Vec2(0, 0);

const bd = new box2D.b2BodyDef();
bd.set_type(box2D.b2_dynamicBody);
bd.set_position(zero);

const body = world.CreateBody(bd);
body.CreateFixture(square, 1);
body.SetTransform(zero, 0);
body.SetLinearVelocity(zero);
body.SetAwake(true);
body.SetEnabled(true);

const velocityIterations = 1;
const positionIterations = 1;

app.use(express.static("client"));
console.log('staticked the client folderation');

// static serve node_modules/@tabler/icons/icons
app.use("/icons", express.static(__dirname + "/node_modules/@tabler/icons/icons"));

// put app on http server


server.listen(4613, () =>
  console.log("server listening on " + 4613)
);

// step constantly and send to clients with webrtc
setInterval(() => {
  // step physics
  world.Step(frameRate, velocityIterations, positionIterations);
  // get body
  var node = world.GetBodyList();
  while (box2D.getPointer(node)) {
    var b = node;
    node = node.GetNext();
    var position = b.GetPosition();
    console.log("position: " + position.x + ", " + position.y);

    // send to clients that are real
  }


  console.log("vomit");
}, frameRate);