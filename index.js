import express from "express";
import { WebSocketServer } from 'ws';
import nodeDataChannel from 'node-datachannel';

import * as url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

import Box2DFactory from "box2d-wasm";
const box2D = await Box2DFactory();

const app = express();
// make http server (esm import)
import http from "http";
const server = http.createServer();
server.on('request', app);

//const wss = new WebSocketServer({ server });
// socket.io on the http
import { Server } from 'socket.io';
const io = new Server(server);

var dataChannels = [];

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

var ei = 0;
/*
wss.on('connection', (ws) => {
  */
io.on('connection', (ws) => {
  let peer1 = new nodeDataChannel.PeerConnection('Peer' + ei, { iceServers: ['stun:stun.l.google.com:19302'] });
  let dc1 = null;

  console.log('------\nweb socket connected through socket.io!\n------');
  // tell them they're connected
  ws.send(JSON.stringify({
    type: 'connected', data: {
      message: 'connected to server, good job'
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
  var uuid = '';
  for (var i = 0; i < 10; i++) {
    uuid += Math.floor(Math.random() * 10);
  }

  // gonna use proper uuids later, im just too lazy to npm i it yk

  dc1 = peer1.createDataChannel('main');
  dc1.onMessage((msg) => {
    console.log('Peer1 Received Msg dc1:', msg);
    try {
      var formatted = JSON.parse(msg);
      // it should have a type and data. if not, it's not a valid message
      if (formatted.type !== undefined && formatted.data !== undefined && formatted.type !== null && formatted.data !== null) {
        // handle it
        console.log('    Type: "' + formatted.type + '"');
        if (formatted.type == 'player mouse') {
          // tell the other people the cool news
          for (var i = 0; i < dataChannels.length; i++) {
            if (dataChannels[i] !== dc1) {
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
          // 👍 we did it, yay, we're so cool
        }
        else if (formatted.type == 'player mouse down') {
          // create a box at the mouse position (formatted.data.x, formatted.data.y)
          const bd = new box2D.b2BodyDef();
          bd.set_type(box2D.b2_dynamicBody);
          var pos = new box2D.b2Vec2(formatted.data.x, formatted.data.y);
          bd.set_position(pos);
          const body = world.CreateBody(bd);
          body.CreateFixture(square, 1);
          // we did it, yay, we're so cool 👍
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
        angle: b.GetAngle()
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
        angle: b.GetAngle()
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
        angle: b.GetAngle()
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
          shapes: shapes
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

