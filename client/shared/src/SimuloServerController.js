import { getRandomColor } from "./utils.js";
import { SimuloPhysicsServer, SimuloObject } from "./SimuloPhysicsServer.js";
var SimuloNetworkServer = null;
//import SimuloNetworkServer from "./SimuloNetworkServer.js";
var isNode = false;
try {
    if (process) {
        isNode = true;
    }
}
catch (e) {
    isNode = false;
}
if (isNode) {
    var module = await import("./SimuloNetworkServer.js");
    SimuloNetworkServer = module.default;
}
import SimuloLocalClient from "./SimuloLocalClient.js";
function rotatePoint(point, angle) {
    const [x, y] = point;
    const newX = x * Math.cos(angle) - y * Math.sin(angle);
    const newY = x * Math.sin(angle) + y * Math.cos(angle);
    return [newX, newY];
}
import themes from "../themes.js";
function getDistance(point1, point2) {
    const xDiff = point2[0] - point1[0];
    const yDiff = point2[1] - point1[1];
    return Math.sqrt(xDiff ** 2 + yDiff ** 2);
}
class SimuloServerController {
    constructor(theme, server, localClient) {
        this.networkServer = null;
        this.tools = {};
        this.previousStep = null;
        this.timeScale = 1 / 500;
        this.frameRate = 1000 / 60;
        this.velocityIterations = 3;
        this.positionIterations = 2;
        this.springs = []; // this will be an object soon for multiplayer support
        this.creatingObjects = {}; // will be renamed for clarity, but this is all the tool actions in progress. for example, a circle being drawn, selection box, spring being added, etc
        this.creatingSprings = {};
        this.timeScaleMultiplier = 1;
        this.paused = false;
        this.localClients = [];
        this.selectedObjects = {};
        this.theme = theme;
        this.physicsServer = new SimuloPhysicsServer(this.theme);
        this.physicsServer.on('collision', (data) => {
            // .sound, .volume and .pitch. we can just send it as-is through network
            this.sendAll('collision', {
                sound: data.sound,
                volume: data.volume,
                pitch: data.pitch * this.timeScaleMultiplier
            });
        });
        if (server) {
            this.networkServer = new SimuloNetworkServer(server);
            this.networkServer.on("connect", (uuid) => {
                console.log("connect", uuid);
                this.tools[uuid] = "drag";
            });
            this.networkServer.on("data", (data) => {
                this.handleData(data.formatted, data.uuid);
            });
            this.networkServer.connect();
        }
        if (localClient) {
            var id = 'local';
            this.localClients.push(new SimuloLocalClient(this, id));
            this.tools[id] = "drag";
        }
        /*setInterval(() => {
            this.loop(this.frameRate);
        }, this.frameRate);*/
        let handle;
        var loop = (prevMs) => {
            const nowMs = window.performance.now();
            handle = requestAnimationFrame(loop.bind(null, nowMs));
            const deltaMs = nowMs - prevMs;
            this.loop(deltaMs);
        };
        loop(window.performance.now());
    }
    sendAll(type, data) {
        if (this.networkServer) {
            this.networkServer.sendAll(type, data);
        }
        this.localClients.forEach((client) => {
            client.emit('data', { type: type, data: data });
        });
    }
    loop(delta) {
        // step physics
        if (this.paused) {
            if (this.previousStep) {
                this.sendAll("world_update", this.previousStep);
            }
            return;
        }
        var step = this.physicsServer.step(delta * this.timeScale * this.timeScaleMultiplier, this.velocityIterations, this.positionIterations);
        if (!step) {
            this.sendAll("world_update_failed", null);
        }
        step = step;
        var springs1 = step.springs;
        var springs2 = this.springs.map((s) => {
            return {
                p1: s.target,
                p2: s.anchor,
                image: s.image,
                line: s.line,
                width: s.width
            };
        });
        var springs3 = springs1.concat(springs2);
        var thisStep = {
            shapes: step.shapes,
            creating_objects: this.creatingObjects,
            background: this.theme.background,
            springs: springs3,
            time_scale: this.timeScaleMultiplier,
            paused: this.paused,
            mouseSprings: [],
            creating_springs: this.creatingSprings,
            selected_objects: // map to { userid: [objectID, objectID, objectID] }
            // lets use object. methods
            Object.keys(this.selectedObjects).reduce((acc, key) => {
                acc[key] = this.selectedObjects[key].map((obj) => obj.id.toString());
                return acc;
            }, {}),
            particles: step.particles
        };
        this.sendAll("world_update", thisStep);
        this.previousStep = thisStep;
        //console.log("vomit");
    }
    handleData(formatted, uuid) {
        if (formatted.type == "player mouse") {
            var springsFormatted = [];
            this.springs.forEach((spring) => {
                spring.target = [formatted.data.x, formatted.data.y];
                springsFormatted.push({
                    p1: [formatted.data.x, formatted.data.y],
                    p2: [spring.anchor[0], spring.anchor[1]],
                    image: spring.image,
                    line: spring.line,
                    width: spring.width
                });
            });
            if (this.creatingObjects[uuid]) {
                if (this.creatingObjects[uuid].shape == 'polygon') {
                    var polygon = this.creatingObjects[uuid];
                    if (polygon.vertices.length > 1) {
                        var prevPoint = polygon.vertices[polygon.vertices.length - 1];
                        var distance = getDistance(prevPoint, [formatted.data.x, formatted.data.y]);
                        if (distance > 0.2) {
                            polygon.vertices.push([formatted.data.x, formatted.data.y]);
                        }
                    }
                    else {
                        polygon.vertices.push([formatted.data.x, formatted.data.y]);
                    }
                }
                else if (this.creatingObjects[uuid].shape == 'select') {
                    let select = this.creatingObjects[uuid];
                    if (select.moving) {
                        let dx = formatted.data.x - select.currentX;
                        let dy = formatted.data.y - select.currentY;
                        select.currentX = formatted.data.x;
                        select.currentY = formatted.data.y;
                        this.selectedObjects[uuid].forEach((obj) => {
                            if (obj instanceof SimuloObject) {
                                obj.position = {
                                    x: obj.position.x + dx,
                                    y: obj.position.y + dy
                                };
                                if (this.previousStep) {
                                    // edit the shape
                                    let shape = this.previousStep.shapes.find((shape) => shape.id == obj.id);
                                    if (shape) {
                                        shape.x = obj.position.x;
                                        shape.y = obj.position.y;
                                    }
                                }
                                select.initialVelocity = {
                                    x: dx * 10,
                                    y: dy * 10
                                };
                                var touchingBodies = this.physicsServer.getTouchingObjects(obj);
                                for (var i = 0; i < touchingBodies.length; i++) {
                                    touchingBodies[i].wakeUp();
                                }
                            }
                        });
                    }
                }
                this.creatingObjects[uuid].currentX = formatted.data.x;
                this.creatingObjects[uuid].currentY = formatted.data.y;
            }
            if (this.creatingSprings[uuid]) {
                this.creatingSprings[uuid].end = [formatted.data.x, formatted.data.y];
            }
            var springsFormatted2 = this.physicsServer.getAllSprings().springs;
            springsFormatted2.forEach((spring) => {
                //console.log('SERVERCONTROLLER SPRING img:', spring.image);
            });
            springsFormatted2 = springsFormatted2.concat(springsFormatted);
            this.sendAll("player mouse", {
                id: uuid,
                x: formatted.data.x,
                y: formatted.data.y,
                springs: springsFormatted2,
                creating_objects: this.creatingObjects,
                selected_objects: this.selectedObjects
            });
            // 👍 we did it, yay, we're so cool
        }
        else if (formatted.type == "player mouse down") {
            if (this.tools[uuid] == "addRectangle") {
                this.creatingObjects[uuid] = {
                    x: formatted.data.x,
                    y: formatted.data.y,
                    color: getRandomColor(this.theme.newObjects.color.hueMin, this.theme.newObjects.color.hueMax, this.theme.newObjects.color.satMin, this.theme.newObjects.color.satMax, this.theme.newObjects.color.valMin, this.theme.newObjects.color.valMax, this.theme.newObjects.color.alpMin, this.theme.newObjects.color.alpMax, true),
                    shape: "rectangle",
                    border: this.theme.newObjects.border,
                    borderWidth: this.theme.newObjects.borderWidth,
                    borderScaleWithZoom: this.theme.newObjects.borderScaleWithZoom,
                    currentX: formatted.data.x,
                    currentY: formatted.data.y
                };
            }
            else if (this.tools[uuid] == "select") {
                // same as rectangle
                if (!this.selectedObjects[uuid] || this.selectedObjects[uuid].length == 0) {
                    this.creatingObjects[uuid] = {
                        x: formatted.data.x,
                        y: formatted.data.y,
                        color: 'rgba(255, 255, 255, 0.5)',
                        shape: "select",
                        border: null,
                        borderWidth: null,
                        borderScaleWithZoom: false,
                        currentX: formatted.data.x,
                        currentY: formatted.data.y
                    };
                }
                else {
                    // move tool
                    this.creatingObjects[uuid] = {
                        x: formatted.data.x,
                        y: formatted.data.y,
                        color: 'rgba(255, 255, 255, 0.5)',
                        shape: "select",
                        border: null,
                        borderWidth: null,
                        borderScaleWithZoom: false,
                        moving: true,
                        currentX: formatted.data.x,
                        currentY: formatted.data.y,
                        wasStatic: {},
                        initialVelocity: { x: 0, y: 0 }
                    };
                    let wasStatic = this.creatingObjects[uuid].wasStatic;
                    // set everything to static
                    this.selectedObjects[uuid].forEach((obj) => {
                        // if its a simulo object
                        if (obj instanceof SimuloObject) {
                            wasStatic[obj.id] = obj.isStatic;
                            obj.isStatic = true;
                            var touchingBodies = this.physicsServer.getTouchingObjects(obj);
                            for (var i = 0; i < touchingBodies.length; i++) {
                                touchingBodies[i].wakeUp();
                            }
                        }
                    });
                }
            }
            else if (this.tools[uuid] == "addCircle") {
                this.creatingObjects[uuid] = {
                    x: formatted.data.x,
                    y: formatted.data.y,
                    color: getRandomColor(this.theme.newObjects.color.hueMin, this.theme.newObjects.color.hueMax, this.theme.newObjects.color.satMin, this.theme.newObjects.color.satMax, this.theme.newObjects.color.valMin, this.theme.newObjects.color.valMax, this.theme.newObjects.color.alpMin, this.theme.newObjects.color.alpMax, true),
                    shape: "circle",
                    border: this.theme.newObjects.border,
                    borderWidth: this.theme.newObjects.borderWidth,
                    borderScaleWithZoom: this.theme.newObjects.borderScaleWithZoom,
                    circleCake: this.theme.newObjects.circleCake,
                    currentX: formatted.data.x,
                    currentY: formatted.data.y
                };
            }
            else if (this.tools[uuid] == "drag") {
                // instead, start a spring
                var bodies = this.physicsServer.getObjectsAtPoint([formatted.data.x, formatted.data.y]);
                var radius = 20 / formatted.data.zoom; // its a square but we call it radius anyway
                if (bodies.length === 0 || bodies[0].isStatic) {
                    bodies = this.physicsServer.getObjectsInRect([formatted.data.x - radius, formatted.data.y - radius], [formatted.data.x + radius, formatted.data.y + radius]);
                    // filter it put bodies with .isStatic true at the end, and those with .isStatic false at the beginning
                    bodies = bodies.sort((a, b) => {
                        if (a.isStatic && !b.isStatic) {
                            return 1;
                        }
                        else if (!a.isStatic && b.isStatic) {
                            return -1;
                        }
                        else {
                            return 0;
                        }
                    });
                }
                if (bodies.length > 0) {
                    var selectedBody = bodies[0];
                    var mouseJoint = this.physicsServer.addMouseSpring(selectedBody, [formatted.data.x, formatted.data.y], 30, 0, 1000000 * selectedBody.mass, 4);
                    this.springs.push(mouseJoint);
                }
            }
            else if (this.tools[uuid] == 'addSpring') {
                this.creatingSprings[uuid] = { start: [formatted.data.x, formatted.data.y], image: this.theme.newObjects.springImage, end: [formatted.data.x, formatted.data.y], width: 50 / formatted.data.zoom };
            }
            else if (this.tools[uuid] == "addPerson") {
                // just run this.physicsServer.addPerson
                var person = this.physicsServer.addPerson([formatted.data.x, formatted.data.y]);
            }
            else if (this.tools[uuid] == "addPolygon") {
                this.creatingObjects[uuid] = {
                    x: formatted.data.x,
                    y: formatted.data.y,
                    color: getRandomColor(this.theme.newObjects.color.hueMin, this.theme.newObjects.color.hueMax, this.theme.newObjects.color.satMin, this.theme.newObjects.color.satMax, this.theme.newObjects.color.valMin, this.theme.newObjects.color.valMax, this.theme.newObjects.color.alpMin, this.theme.newObjects.color.alpMax, true),
                    shape: "polygon",
                    border: this.theme.newObjects.border,
                    borderWidth: this.theme.newObjects.borderWidth,
                    borderScaleWithZoom: this.theme.newObjects.borderScaleWithZoom,
                    vertices: [[formatted.data.x, formatted.data.y]]
                };
            }
            else if (this.tools[uuid] == "addParticle") {
                this.physicsServer.addParticleBox(formatted.data.x, formatted.data.y, 0.2, 0.2);
            }
            else {
                console.log("Unknown tool: " + this.tools[uuid]);
            }
            if (this.previousStep) {
                this.previousStep.creating_objects = this.creatingObjects;
                this.previousStep.selected_objects = this.selectedObjects;
            }
        }
        else if (formatted.type == "player mouse up") {
            this.springs.forEach((spring) => {
                this.physicsServer.destroy(spring);
            });
            this.springs = [];
            if (this.creatingSprings[uuid]) {
                var pointABodies = this.physicsServer.getObjectsAtPoint(this.creatingSprings[uuid].start);
                var pointBBodies = this.physicsServer.getObjectsAtPoint([formatted.data.x, formatted.data.y]);
                if (pointABodies.length > 0 && pointBBodies.length > 0) {
                    /*// Calculate rotated anchor points
                    var anchorAPosition = [
                        this.creatingSprings[uuid][0] - pointABodies[0].position[0],
                        this.creatingSprings[uuid][1] - pointABodies[0].position[1]
                    ];
                    var anchorBPosition = [
                        formatted.data.x - pointBBodies[0].position[0],
                        formatted.data.y - pointBBodies[0].position[1]
                    ];
 
                    var rotatedAnchorA = rotatePoint(anchorAPosition as [x: number, y: number], pointABodies[0].rotation);
                    var rotatedAnchorB = rotatePoint(anchorBPosition as [x: number, y: number], pointBBodies[0].rotation);*/
                    // just getlocalpoint
                    var rotatedAnchorA = this.physicsServer.getLocalPoint(pointABodies[0], this.creatingSprings[uuid].start);
                    var rotatedAnchorB = this.physicsServer.getLocalPoint(pointBBodies[0], [formatted.data.x, formatted.data.y]);
                    // Add the spring with rotated anchor points
                    if (this.creatingSprings[uuid].image == undefined) {
                        var spring = this.physicsServer.addSpring(rotatedAnchorA, rotatedAnchorB, pointABodies[0], pointBBodies[0], 30, 
                        // Calculate the distance between the two points using the Pythagorean theorem
                        Math.sqrt(Math.pow(this.creatingSprings[uuid].start[0] - formatted.data.x, 2) +
                            Math.pow(this.creatingSprings[uuid].start[1] - formatted.data.y, 2)), 0, 4 / formatted.data.zoom);
                        if (this.previousStep) {
                            this.previousStep.springs.push({
                                p1: this.creatingSprings[uuid].start,
                                p2: [formatted.data.x, formatted.data.y],
                                width: 4 / formatted.data.zoom,
                                line: null,
                                image: null,
                            });
                        }
                    }
                    else {
                        var spring = this.physicsServer.addSpring(rotatedAnchorA, rotatedAnchorB, pointABodies[0], pointBBodies[0], 30, 
                        // Calculate the distance between the two points using the Pythagorean theorem
                        Math.sqrt(Math.pow(this.creatingSprings[uuid].start[0] - formatted.data.x, 2) +
                            Math.pow(this.creatingSprings[uuid].start[1] - formatted.data.y, 2)), 0, this.creatingSprings[uuid].width, this.creatingSprings[uuid].image);
                        if (this.previousStep) {
                            this.previousStep.springs.push({
                                p1: this.creatingSprings[uuid].start,
                                p2: [formatted.data.x, formatted.data.y],
                                width: this.creatingSprings[uuid].width,
                                line: null,
                                image: this.creatingSprings[uuid].image,
                            });
                        }
                    }
                }
                delete this.creatingSprings[uuid];
            }
            // Check if there's a creatingObject for this uuid
            if (this.creatingObjects[uuid]) {
                // if cursor hasnt moved beyond 0.001, delete the object
                if ((Math.abs(formatted.data.x - this.creatingObjects[uuid].x) < 0.001 &&
                    Math.abs(formatted.data.y - this.creatingObjects[uuid].y) < 0.001) && this.creatingObjects[uuid].shape != "select") {
                    delete this.creatingObjects[uuid];
                    return;
                }
                if (this.creatingObjects[uuid].shape == "rectangle") {
                    // Calculate the size of the new rectangle
                    const width = Math.abs(formatted.data.x - this.creatingObjects[uuid].x);
                    const height = Math.abs(formatted.data.y - this.creatingObjects[uuid].y);
                    var bodyData = {
                        color: this.creatingObjects[uuid].color,
                        border: this.theme.newObjects.border,
                        borderWidth: this.theme.newObjects.borderWidth,
                        borderScaleWithZoom: this.theme.newObjects.borderScaleWithZoom,
                        id: 92797981789171,
                        sound: 'impact.wav',
                        image: null,
                    };
                    // define verts of the rectangle
                    const verts = [
                        [-width / 2, -height / 2],
                        [width / 2, -height / 2],
                        [width / 2, height / 2],
                        [-width / 2, height / 2],
                    ];
                    let rectangle = this.physicsServer.addPolygon(verts, [(formatted.data.x + this.creatingObjects[uuid].x) / 2, (formatted.data.y + this.creatingObjects[uuid].y) / 2], 0, 1, 0.5, 0.5, bodyData, false);
                    if (this.previousStep) {
                        this.previousStep.shapes.push({
                            type: "rectangle",
                            angle: 0,
                            color: this.creatingObjects[uuid].color,
                            border: this.theme.newObjects.border,
                            borderWidth: this.theme.newObjects.borderWidth,
                            borderScaleWithZoom: this.theme.newObjects.borderScaleWithZoom,
                            image: null,
                            x: this.creatingObjects[uuid].x,
                            y: this.creatingObjects[uuid].y,
                            id: rectangle.id,
                            width: width,
                            height: height,
                        });
                    }
                    // Remove the creatingObject for this uuid
                    delete this.creatingObjects[uuid];
                }
                else if (this.creatingObjects[uuid].shape == "select") {
                    // select draws a box with the same properties, but instead of creating a new object, it selects all objects in the box. for now, we'll just console.log the objects since we dont have a selection system yet
                    if (!this.creatingObjects[uuid].moving) {
                        // now we query world
                        var bodies = this.physicsServer.getObjectsInRect(
                        // point A
                        [this.creatingObjects[uuid].x, this.creatingObjects[uuid].y], 
                        // point B
                        [formatted.data.x, formatted.data.y]);
                        /*// on each object, set color to red
                        for (var i = 0; i < bodies.length; i++) {
                            bodies[i].color = "#ff0000"; // trolled :uber_troll:
                        }*/
                        this.selectedObjects[uuid] = bodies;
                        delete this.creatingObjects[uuid]; // void
                        if (this.previousStep) {
                            this.previousStep.creating_objects = this.creatingObjects;
                            this.previousStep.selected_objects = this.selectedObjects;
                        }
                    }
                    else {
                        let wasStatic = this.creatingObjects[uuid].wasStatic;
                        let initialVelocity = this.creatingObjects[uuid].initialVelocity;
                        // make them original static again
                        Object.keys(wasStatic).forEach((key) => {
                            // find the body
                            var body = this.physicsServer.getObjectByID(parseInt(key));
                            if (body) {
                                body.isStatic = wasStatic[parseInt(key)];
                                body.velocity = initialVelocity;
                                // wake touching bodies
                                var touchingBodies = this.physicsServer.getTouchingObjects(body);
                                for (var i = 0; i < touchingBodies.length; i++) {
                                    touchingBodies[i].wakeUp();
                                }
                            }
                        });
                        if (Math.abs(formatted.data.x - this.creatingObjects[uuid].x) < 0.001 &&
                            Math.abs(formatted.data.y - this.creatingObjects[uuid].y) < 0.001) {
                            var bodies = this.physicsServer.getObjectsInRect(
                            // point A
                            [this.creatingObjects[uuid].x, this.creatingObjects[uuid].y], 
                            // point B
                            [formatted.data.x, formatted.data.y]);
                            this.selectedObjects[uuid] = bodies;
                        }
                        delete this.creatingObjects[uuid];
                        if (this.previousStep) {
                            this.previousStep.creating_objects = this.creatingObjects;
                            this.previousStep.selected_objects = this.selectedObjects;
                        }
                    }
                }
                else if (this.creatingObjects[uuid].shape == "square") {
                    // TODO: make this work (lol)
                }
                else if (this.creatingObjects[uuid].shape == "circle") {
                    // Calculate the radius of the new circle
                    const dx = formatted.data.x - this.creatingObjects[uuid].x;
                    const dy = formatted.data.y - this.creatingObjects[uuid].y;
                    const radius = Math.max(Math.abs(dx), Math.abs(dy)) / 2;
                    var posX = this.creatingObjects[uuid].x + radius;
                    var posY = this.creatingObjects[uuid].y + radius;
                    if (dx < 0) {
                        posX = this.creatingObjects[uuid].x - radius;
                    }
                    if (dy < 0) {
                        posY = this.creatingObjects[uuid].y - radius;
                    }
                    var bodyData = {
                        color: this.creatingObjects[uuid].color,
                        border: this.theme.newObjects.border,
                        borderWidth: this.theme.newObjects.borderWidth,
                        borderScaleWithZoom: this.theme.newObjects.borderScaleWithZoom,
                        id: 92797981789171,
                        sound: 'impact.wav',
                        image: null,
                        circleCake: this.creatingObjects[uuid].circleCake
                    };
                    let circle = this.physicsServer.addCircle(radius, [posX, posY], 0, 1, 0.5, 0.5, bodyData, false);
                    if (this.previousStep) {
                        this.previousStep.shapes.push({
                            type: "circle",
                            angle: 0,
                            color: this.creatingObjects[uuid].color,
                            border: this.theme.newObjects.border,
                            borderWidth: this.theme.newObjects.borderWidth,
                            borderScaleWithZoom: this.theme.newObjects.borderScaleWithZoom,
                            image: null,
                            x: this.creatingObjects[uuid].x + radius,
                            y: this.creatingObjects[uuid].y + radius,
                            id: circle.id,
                            circleCake: this.creatingObjects[uuid].circleCake,
                            radius: radius,
                        });
                    }
                    // Remove the creatingObject for this uuid
                    delete this.creatingObjects[uuid];
                }
                else if (this.creatingObjects[uuid].shape == "polygon") {
                    // just addPolygon with the points
                    var polygon = this.creatingObjects[uuid];
                    var pointsLocal = polygon.vertices;
                    pointsLocal.forEach((point) => {
                        point[0] = point[0] - this.creatingObjects[uuid].x;
                        point[1] = point[1] - this.creatingObjects[uuid].y;
                    });
                    let createdPolygon = this.physicsServer.addPolygon(pointsLocal, [this.creatingObjects[uuid].x, this.creatingObjects[uuid].y], 0, 1, 0.5, 0.5, {
                        color: this.creatingObjects[uuid].color,
                        border: this.theme.newObjects.border,
                        borderWidth: this.theme.newObjects.borderWidth,
                        borderScaleWithZoom: this.theme.newObjects.borderScaleWithZoom,
                        sound: 'impact.wav',
                        image: null,
                    }, false);
                    if (this.previousStep) {
                        this.previousStep.shapes.push({
                            type: "polygon",
                            vertices: pointsLocal.map((point) => {
                                return { x: point[0], y: point[1] };
                            }),
                            points: pointsLocal.map((point) => {
                                return { x: point[0], y: point[1] };
                            }),
                            angle: 0,
                            color: this.creatingObjects[uuid].color,
                            border: this.theme.newObjects.border,
                            borderWidth: this.theme.newObjects.borderWidth,
                            borderScaleWithZoom: this.theme.newObjects.borderScaleWithZoom,
                            image: null,
                            x: this.creatingObjects[uuid].x,
                            y: this.creatingObjects[uuid].y,
                            id: createdPolygon.id,
                        });
                    }
                    delete this.creatingObjects[uuid];
                }
            }
            if (this.previousStep) {
                this.previousStep.creating_objects = this.creatingObjects;
                this.previousStep.selected_objects = this.selectedObjects;
            }
        }
        else if (formatted.type == "set_theme") {
            if (this.theme !== themes[formatted.data]) {
                this.theme = themes[formatted.data];
                var floor = this.physicsServer.getObjectByID(1);
                if (floor) {
                    floor.color = this.theme.ground.color;
                    floor.border = this.theme.ground.border;
                    floor.borderWidth = this.theme.ground.borderWidth;
                    floor.borderScaleWithZoom = this.theme.ground.borderScaleWithZoom;
                }
                // get 2 and 3 and set those to person.color and person.border and all that
                var personBody = this.physicsServer.getObjectByID(2);
                var personHead = this.physicsServer.getObjectByID(3);
                var personParts = [personBody, personHead];
                personParts.forEach((part) => {
                    if (part) {
                        part.color = this.theme.person.color;
                        part.border = this.theme.person.border;
                        part.borderWidth = this.theme.person.borderWidth;
                        part.borderScaleWithZoom = this.theme.person.borderScaleWithZoom;
                        part.image = null;
                    }
                });
                this.sendAll("set_theme", this.theme);
            }
        }
        else if (formatted.type == "set_tool") {
            console.log("set tool to", formatted.data);
            this.tools[uuid] = formatted.data;
        }
        else if (formatted.type == "spawn_object") {
            console.log("spawn object", formatted.data);
            // regardless of what anyone thinks, call addPerson
            this.physicsServer.addPerson([
                formatted.data.x,
                formatted.data.y
            ]);
        }
        else if (formatted.type == "set_time_scale") {
            this.timeScaleMultiplier = formatted.data;
            this.sendAll("set_time_scale", this.timeScaleMultiplier);
        }
        else if (formatted.type == "set_paused") {
            this.paused = formatted.data;
            this.sendAll("set_paused", this.paused);
        }
    }
    addScript(code) {
        var cachedObjects = {};
        var cachedObjectID = -1;
        var worker = new Worker('worker.js');
        worker.onmessage = async (event) => {
            if (event.data.type === 'get') {
                if (cachedObjects[event.data.cachedObjectID]) {
                    try {
                        worker.postMessage({
                            type: 'response',
                            key: event.data.key,
                            value: cachedObjects[event.data.cachedObjectID][event.data.key],
                            requestID: event.data.requestID // pass it back so it can identify what request it is responding to
                        });
                    }
                    catch (e) {
                        worker.postMessage({
                            type: 'response',
                            key: event.data.key,
                            value: undefined,
                            requestID: event.data.requestID,
                            error: e
                        });
                    }
                }
                else {
                    worker.postMessage({
                        type: 'response',
                        key: event.data.key,
                        value: undefined,
                        requestID: event.data.requestID // pass it back so it can identify what request it is responding to
                    });
                }
            }
            else if (event.data.type === 'call') {
                if (cachedObjects[event.data.cachedObjectID]) {
                    try {
                        var returned = cachedObjects[event.data.cachedObjectID][event.data.key](...event.data.args); // this might error if its not a function or doesn't exist, but we're in try-catch and this way it'll send real error to the worker
                        worker.postMessage({
                            type: 'response',
                            key: event.data.key,
                            value: returned,
                            requestID: event.data.requestID // pass it back so it can identify what request it is responding to
                        });
                    }
                    catch (e) {
                        worker.postMessage({
                            type: 'response',
                            key: event.data.key,
                            value: undefined,
                            requestID: event.data.requestID,
                            error: e
                        });
                    }
                }
                else {
                    worker.postMessage({
                        type: 'response',
                        key: event.data.key,
                        value: undefined,
                        requestID: event.data.requestID // pass it back so it can identify what request it is responding to
                    });
                }
            }
            else if (event.data.type === 'set') {
                //(obj as any)[event.data.key] = event.data.value;
                if (cachedObjects[event.data.cachedObjectID]) {
                    try {
                        cachedObjects[event.data.cachedObjectID][event.data.key] = event.data.value;
                        worker.postMessage({
                            type: 'response',
                            requestID: event.data.requestID // pass it back so it can identify what request it is responding to
                        });
                    }
                    catch (e) {
                        worker.postMessage({
                            type: 'response',
                            requestID: event.data.requestID,
                            error: e
                        });
                    }
                }
                else {
                    worker.postMessage({
                        type: 'response',
                        requestID: event.data.requestID,
                        error: 'ReferenceError: object is not defined'
                    });
                }
            }
            else if (event.data.type === 'log') {
                console.log(event.data.msg);
            }
            else if (event.data.type === 'getObject') {
                var gottenObj = this.physicsServer.getObjectByID(event.data.id);
                if (gottenObj) {
                    cachedObjectID++;
                    cachedObjects[cachedObjectID] = this.physicsServer.getProxy(gottenObj);
                    worker.postMessage({
                        type: 'response',
                        value: gottenObj ? true : false,
                        cachedObjectID: cachedObjectID,
                        requestID: event.data.requestID // pass it back so it can identify what request it is responding to
                    });
                }
            }
        };
        worker.postMessage({
            type: 'startScript',
            value: code
        });
    }
}
export default SimuloServerController;
//# sourceMappingURL=SimuloServerController.js.map