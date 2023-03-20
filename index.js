const express = require("express");
const Matter = require("matter-js");

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

const Box2DFactory = require("box2d-wasm");
const { assertFloatEqual } = require('./assertFloatEqual');
Box2DFactory().then(box2D => {
  const { b2BodyDef, b2_dynamicBody, b2PolygonShape, b2Vec2, b2World, b2Shape } = box2D;
  const gravity = new b2Vec2(0, 10);
  const world = new b2World(gravity);

  const sideLengthMetres = 1;
  const square = new b2PolygonShape();
  square.SetAsBox(sideLengthMetres / 2, sideLengthMetres / 2);

  const zero = new b2Vec2(0, 0);

  const bd = new b2BodyDef();
  bd.set_type(b2_dynamicBody);
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
  const floatCompareTolerance = 0.01;

  const iterations = 6;
  for (let i = 0; i < iterations; i++) {
    const timeElapsedMillis = timeStepMillis * i;
    {
      const { y } = body.GetLinearVelocity();
      assertFloatEqual(y, gravity.y * timeElapsedMillis, floatCompareTolerance);
      {
        const { y } = body.GetPosition();
        assertFloatEqual(y, 0.5 * gravity.y * timeElapsedMillis ** 2, floatCompareTolerance);
      }
    }
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



    world.Step(timeStepMillis, velocityIterations, positionIterations);
  }

  console.log(`👍 Ran ${iterations} iterations of a falling body. Body had the expected position on each iteration.`);
});

app.use(express.static("client"));

// static serve node_modules/@tabler/icons/icons
app.use("/icons", express.static(__dirname + "/node_modules/@tabler/icons/icons"));

const frameRate = 1000 / 30;
const canvas = { width: 800, height: 400 };
const boxes = 20;
const boxSize = 20;
const wallThickness = 20;
let online = 0;

const entities = {
  boxes: [...Array(boxes)].map(() =>
    Matter.Bodies.rectangle(
      Math.random() * canvas.width,
      boxSize,
      Math.random() * boxSize + boxSize,
      Math.random() * boxSize + boxSize,
    )
  ),
  walls: [
    Matter.Bodies.rectangle(
      canvas.width / 2, 0,
      canvas.width,
      wallThickness,
      { isStatic: true }
    ),
    Matter.Bodies.rectangle(
      0, canvas.height / 2,
      wallThickness,
      canvas.height / 2,
      { isStatic: true }
    ),
    Matter.Bodies.rectangle(
      canvas.width,
      canvas.height / 2,
      wallThickness,
      canvas.height,
      { isStatic: true }
    ),
    Matter.Bodies.rectangle(
      canvas.width / 2,
      canvas.height,
      canvas.width,
      wallThickness,
      { isStatic: true }
    ),
  ],
  carBox: Matter.Bodies.rectangle(
    canvas.width / 2,
    canvas.height / 2,
    80,
    20
  )
};

const engine = Matter.Engine.create();
Matter.Composite.add(engine.world, Object.values(entities).flat());
const toVertices = e => e.vertices.map(({ x, y }) => ({ x, y }));

var left = false;
var right = false;

setInterval(() => {
  // if left, add a constant force on all boxes left. if right, constant force pushing right
  entities.boxes.forEach(box => {
    if (left || right) {
      Matter.Body.applyForce(box, box.position, Matter.Vector.create(left ? -0.005 : 0.005, 0));
    }
    /*
        // if a player's dragging property is this box, apply a force to it towards the player's mouse
        Object.values(players).forEach(player => {
          if (player.dragging == box.id) {
            //Matter.Body.applyForce(box, box.position, Matter.Vector.create((player.x - box.position.x) / 1000, (player.y - box.position.y) / 1000));
          }
        });*/
  });
  Matter.Engine.update(engine, frameRate);
  io.emit("update state", {
    boxes: entities.boxes.map(toVertices),
    walls: entities.walls.map(toVertices),
    carBox: toVertices(entities.carBox),
    online,
  });
}, frameRate);

var players = {};
var playerSprings = {};

io.on("connection", socket => {
  online++;
  players[socket.id] = { x: 0, y: 0, down: false };
  socket.on("disconnect", () => --online);
  socket.on("register", cb => cb({ canvas }));
  socket.on("player mouse down", coordinates => {

  });
  socket.on("player start", direction => {
    if (direction == 'left') {
      left = true;
    }
    else {
      right = true;
    }
  });
  socket.on("player stop", direction => {
    if (direction == 'left') {
      left = false;
    }
    else {
      right = false;
    }
  });

  socket.on("player mouse", player => {
    players[socket.id] = {
      x: player.x,
      y: player.y,
      down: player.down,
      dragging: players[socket.id].dragging
    }

    // update spring
    if (playerSprings[socket.id]) {
      playerSprings[socket.id].pointA = { x: player.x, y: player.y };
      console.log("Skree! Spring updated. PointBWorld: " + Matter.Constraint.pointAWorld(playerSprings[socket.id]).x + ", " + Matter.Constraint.pointAWorld(playerSprings[socket.id]).y);
    }
    socket.broadcast.emit("state", {
      id: socket.id,
      player: players[socket.id]
    });
  });

  socket.on("player mouse up", player => {
    console.log("mouse up");
    // same as regular mouse, but it's the frame when the mouse is released
    players[socket.id] = {
      x: player.x,
      y: player.y,
      down: player.down,
      dragging: null
    }

    // remove spring
    if (playerSprings[socket.id]) {
      Matter.Composite.remove(engine.world, playerSprings[socket.id]);
      playerSprings[socket.id] = null;
      console.log("Clock! Spring removed");
    }

    socket.broadcast.emit("state", {
      id: socket.id,
      player: players[socket.id]
    });
  });

  socket.on("player mouse down", player => {
    console.log("player mouse down");
    // same as regular mouse, but it's the frame when the mouse is pressed
    players[socket.id] = {
      x: player.x,
      y: player.y,
      down: player.down,
      dragging: players[socket.id].dragging
    }
    // start dragging obj at mouse position
    entities.boxes.forEach(box => {
      if (Matter.Bounds.contains(box.bounds, { x: player.x, y: player.y })) {
        players[socket.id].dragging = box.id;

        // we drag based on the mouse position in box. lets get local coords of player.x and player.y in box
        var localPos = Matter.Vector.sub({ x: player.x, y: player.y }, box.position);

        // attach spring
        playerSprings[socket.id] = Matter.Constraint.create({
          pointB: localPos,
          bodyB: box,
          pointA: { x: player.x, y: player.y },
          stiffness: 0,
          damping: 0,
          length: 0
        });

        // add constraint to world
        Matter.Composite.add(engine.world, playerSprings[socket.id]);

        console.log("Click! Spring attached");
      }
    });

    socket.broadcast.emit("state", {
      id: socket.id,
      player: players[socket.id]
    });

    /*entities.boxes.forEach(box => {
      // servers://stackoverflow.com/a/50472656/6243352
      const force = 0.012;
      const deltaVector = Matter.Vector.sub(box.position, { x: player.x, y: player.y });
      const normalizedDelta = Matter.Vector.normalise(deltaVector);
      const forceVector = Matter.Vector.mult(normalizedDelta, force);
      Matter.Body.applyForce(box, box.position, forceVector);
    });*/


  });
});

server.listen(4613, () =>
  console.log("server listening on " + 4613)
);

