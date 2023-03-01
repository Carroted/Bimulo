import express from "express";
import Matter from "matter-js";
import geckos from '@geckos.io/server';
// http for .createServer
import http from "http";

const app = express();
const server = http.createServer(app);
const io = geckos();

io.addServer(server);

app.use(express.static("client"));

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
      { density: 0.1 }
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
  io.room('default').emit("update state", {
    boxes: entities.boxes.map(toVertices),
    walls: entities.walls.map(toVertices),
    carBox: toVertices(entities.carBox),
    online,
  });
}, frameRate);

var players = {};
var playerSprings = {};

io.onConnection(socket => {
  socket.join('default');
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

