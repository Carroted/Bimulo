import express from "express";

const app = express();
// make http server (esm import)
import http from "http";
const server = http.createServer(app);
import { Server } from "socket.io";
const io = new Server(server);

import * as url from 'url';
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

import Box2DFactory from "box2d-wasm";
//import { assertFloatEqual } from './assertFloatEqual.js';
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

app.use(express.static("client"));

// static serve node_modules/@tabler/icons/icons
app.use("/icons", express.static(__dirname + "/node_modules/@tabler/icons/icons"));

const frameRate = 1000 / 30;
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

const timeStepMillis = 1 / 60;
const velocityIterations = 1;
const positionIterations = 1;

const iterations = 6;
for (let i = 0; i < iterations; i++) {
  const timeElapsedMillis = timeStepMillis * i;
  {
    const { y } = body.GetLinearVelocity();
    console.log(`body.GetLinearVelocity().y = ${y}`);
    {
      const { y } = body.GetPosition();
      console.log(`body.GetPosition().y = ${y}`);
    }
  }
  world.Step(timeStepMillis, velocityIterations, positionIterations);
}

console.log(`👍 Ran ${iterations} iterations of a falling body. Body had the expected position on each iteration.`);

server.listen(4613, () =>
  console.log("server listening on " + 4613)
);

