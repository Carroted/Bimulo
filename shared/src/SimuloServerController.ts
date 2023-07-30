import { getRandomColor, randomRange, hsvToRgb } from "./utils.js";

import { SimuloPhysicsServer, SimuloJoint, SimuloMouseSpring, SimuloObject, SimuloSavedObject } from "./SimuloPhysicsServer.js";
import SimuloTheme from "./SimuloTheme.js";
import SimuloNetworkServer from "./SimuloNetworkServer.js";

import * as http from "http";
import SimuloStep from "./SimuloStep.js";
import SimuloLocalClient from "./SimuloLocalClient.js";

interface SimuloStepExtended extends SimuloStep {
    creating_objects: object;
    time_scale: number;
    paused: boolean;
    creating_springs: object;
    selected_objects: object;
}

function rotatePoint(point: [x: number, y: number], angle: number): [number, number] {
    const [x, y] = point;
    const newX = x * Math.cos(angle) - y * Math.sin(angle);
    const newY = x * Math.sin(angle) + y * Math.cos(angle);
    return [newX, newY] as [x: number, y: number];
}

interface SpringData {
    p1: [number, number];
    p2: [number, number];
    image?: string | null;
    line: { color: string, scale_with_zoom: boolean } | null;
    width: number;
}

import { SimuloCreatingObject, SimuloCreatingPolygon } from "./SimuloCreatingObject.js";
import SimuloShape, { SimuloPolygon } from "./SimuloShape.js";
import { SimuloCircle } from "./SimuloShape.js";
import { SimuloRectangle } from "./SimuloShape.js";

import themes from "../themes.js";

function getDistance(point1: [x: number, y: number], point2: [x: number, y: number]): number {
    const xDiff = point2[0] - point1[0];
    const yDiff = point2[1] - point1[1];
    return Math.sqrt(xDiff ** 2 + yDiff ** 2);
}

class SimuloServerController {
    physicsServer: SimuloPhysicsServer;
    networkServer: SimuloNetworkServer | null = null;
    tools: { [key: string]: string } = {};
    //previousStep: SimuloStepExtended | null = null;
    timeScale: number = 1 / 500;
    frameRate: number = 1000 / 60;
    velocityIterations: number = 8;
    positionIterations: number = 3;
    springs: { [key: string]: SimuloMouseSpring } = {}; // this will be an object soon for multiplayer support
    creatingObjects: { [key: string]: SimuloCreatingObject } = {}; // will be renamed for clarity, but this is all the tool actions in progress. for example, a circle being drawn, selection box, spring being added, etc
    creatingSprings: { [key: string]: { start: [x: number, y: number], image: string | null, end: [x: number, y: number], width: number } } = {};
    timeScaleMultiplier: number = 1;
    paused: boolean = false;
    theme: SimuloTheme;
    localClients: SimuloLocalClient[] = [];
    selectedObjects: { [key: string]: (SimuloJoint | SimuloObject)[] } = {};
    playerColors: { [key: string]: string } = {};

    sendAll(type: string, data: any) {
        if (this.networkServer) {
            this.networkServer.sendAll(type, data);
        }
        this.localClients.forEach((client: SimuloLocalClient) => {
            client.emit('data', { type: type, data: data });
        });
    }

    send(id: string, type: string, data: any) {
        if (this.networkServer) {
            this.networkServer.sendAll(type, data); // we unfortunately dont know the IDs of the datachannels, so we have to send to all
        }
        this.localClients.forEach((client: SimuloLocalClient) => {
            if (client.id === id) {
                client.emit('data', { type: type, data: data });
            }
        });
    }

    savedWorld: any = {};

    loop(delta: number) {
        // step physics
        /*if (this.paused) {
            if (this.previousStep) {
                this.sendAll("world_update", this.previousStep);
            }
            return;
        }*/

        if (!this.paused) {
            var succeeded = false;
            try {
                succeeded = this.physicsServer.step(
                    delta * this.timeScale * this.timeScaleMultiplier,
                    this.velocityIterations,
                    this.positionIterations
                );
            }
            catch (e) {
                console.log(e);
            }
            if (!succeeded) {
                console.log("step failed");
                this.sendAll("world_update_failed", null);
                this.physicsServer = this.setupPhysicsServer(); // reset the server
                this.physicsServer.loadWorld(this.savedWorld);
                console.log("reverted to last step");
            }
            else {
                this.savedWorld = this.physicsServer.saveWorld();
            }
        }
        var render = this.physicsServer.render() as SimuloStep;

        var springs1 = render.springs;
        var springs2 = Object.values(this.springs).map((s) => {
            return {
                p1: s.target,
                p2: s.anchor,
                image: s.image,
                line: s.line,
                width: s.width
            };
        });
        var springs3 = springs1.concat(springs2);

        var thisStep: SimuloStepExtended = {
            shapes: render.shapes,
            creating_objects: this.creatingObjects,
            background: this.theme.background,
            springs: springs3,
            time_scale: this.timeScaleMultiplier,
            paused: this.paused,
            mouseSprings: [],
            creating_springs: this.creatingSprings,
            selected_objects: this.selectedObjectIDs(),
            particles: render.particles
        };
        this.sendAll("world_update", thisStep);
        //this.previousStep = thisStep;

        //console.log("vomit");
    }
    selectedObjectIDs() {
        return Object.keys(this.selectedObjects).reduce((acc: { [key: string]: string[] }, key: string) => {
            acc[key] = this.selectedObjects[key].map((obj: SimuloObject | SimuloJoint) => obj.id.toString());
            return acc;
        }, {});
    }
    handleData(formatted: { type: string; data: any }, uuid: string) {
        if (formatted.type == "player mouse") {
            var springsFormatted: SpringData[] = [];
            if (this.springs[uuid]) {
                let spring = this.springs[uuid];
                spring.target = [formatted.data.x, formatted.data.y];
                springsFormatted.push({
                    p1: [formatted.data.x, formatted.data.y],
                    p2: [spring.anchor[0], spring.anchor[1]],
                    image: spring.image,
                    line: spring.line,
                    width: spring.width
                });
            }
            // push the other springs (skip the one we just added)
            Object.keys(this.springs).forEach((key: string) => {
                if (key != uuid) {
                    let spring = this.springs[key];
                    springsFormatted.push({
                        p1: [spring.target[0], spring.target[1]],
                        p2: [spring.anchor[0], spring.anchor[1]],
                        image: spring.image,
                        line: spring.line,
                        width: spring.width
                    });
                }
            });


            if (this.creatingObjects[uuid]) {
                if (this.creatingObjects[uuid].shape == 'polygon') {
                    var polygon = this.creatingObjects[uuid] as SimuloCreatingPolygon;
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
                        this.selectedObjects[uuid].forEach((obj: SimuloObject | SimuloJoint) => {
                            if (obj instanceof SimuloObject) {
                                obj.position = {
                                    x: obj.position.x + dx,
                                    y: obj.position.y + dy
                                };
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

            var springsFormatted2: SpringData[] = this.physicsServer.getAllSprings().springs as SpringData[];
            springsFormatted2.forEach((spring: SpringData) => {
                //console.log('SERVERCONTROLLER SPRING img:', spring.image);
            });
            springsFormatted2 = springsFormatted2.concat(springsFormatted);

            this.sendAll("player mouse", {
                id: uuid,
                x: formatted.data.x,
                y: formatted.data.y,
                springs: springsFormatted2,
                creating_objects: this.creatingObjects,
                selected_objects: this.selectedObjectIDs(),
                color: this.playerColors[uuid],
                tool: this.tools[uuid]
            });

            // 👍 we did it, yay, we're so cool
        } else if (formatted.type == "player mouse down") {
            if (this.tools[uuid] == "addRectangle") {
                this.creatingObjects[uuid] = {
                    x: formatted.data.x,
                    y: formatted.data.y,
                    color: getRandomColor(
                        this.theme.newObjects.color.hueMin,
                        this.theme.newObjects.color.hueMax,
                        this.theme.newObjects.color.satMin,
                        this.theme.newObjects.color.satMax,
                        this.theme.newObjects.color.valMin,
                        this.theme.newObjects.color.valMax,
                        this.theme.newObjects.color.alpMin,
                        this.theme.newObjects.color.alpMax,
                        true
                    ) as string,
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
                    let wasStatic = this.creatingObjects[uuid].wasStatic as { [key: string]: boolean };
                    // set everything to static
                    this.selectedObjects[uuid].forEach((obj: SimuloObject | SimuloJoint) => {
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
                    color: getRandomColor(
                        this.theme.newObjects.color.hueMin,
                        this.theme.newObjects.color.hueMax,
                        this.theme.newObjects.color.satMin,
                        this.theme.newObjects.color.satMax,
                        this.theme.newObjects.color.valMin,
                        this.theme.newObjects.color.valMax,
                        this.theme.newObjects.color.alpMin,
                        this.theme.newObjects.color.alpMax,
                        true
                    ) as string,
                    shape: "circle",
                    border: this.theme.newObjects.border,
                    borderWidth: this.theme.newObjects.borderWidth,
                    borderScaleWithZoom: this.theme.newObjects.borderScaleWithZoom,
                    circleCake: this.theme.newObjects.circleCake,
                    currentX: formatted.data.x,
                    currentY: formatted.data.y
                };
            } else if (this.tools[uuid] == "drag") {
                // instead, start a spring

                var bodies: SimuloObject[] = this.physicsServer.getObjectsAtPoint([formatted.data.x, formatted.data.y]);
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

                    var mouseJoint = this.physicsServer.addMouseSpring(
                        selectedBody,
                        [formatted.data.x, formatted.data.y],
                        30,
                        0,
                        1000000 * selectedBody.mass,
                        4,
                    );

                    this.springs[uuid] = mouseJoint;
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
                    color: getRandomColor(
                        this.theme.newObjects.color.hueMin,
                        this.theme.newObjects.color.hueMax,
                        this.theme.newObjects.color.satMin,
                        this.theme.newObjects.color.satMax,
                        this.theme.newObjects.color.valMin,
                        this.theme.newObjects.color.valMax,
                        this.theme.newObjects.color.alpMin,
                        this.theme.newObjects.color.alpMax,
                        true
                    ) as string,
                    shape: "polygon",
                    border: this.theme.newObjects.border,
                    borderWidth: this.theme.newObjects.borderWidth,
                    borderScaleWithZoom: this.theme.newObjects.borderScaleWithZoom,
                    vertices: [[formatted.data.x, formatted.data.y]] as [x: number, y: number][]
                } as SimuloCreatingPolygon;
            }
            else if (this.tools[uuid] == "addParticle") {
                this.physicsServer.addParticleBox(formatted.data.x, formatted.data.y, 0.5, 0.5);
            }
            else if (this.tools[uuid] == "addAxle") {
                // get 2 objects at point
                var bodies = this.physicsServer.getObjectsAtPoint([formatted.data.x, formatted.data.y]);
                if (bodies.length >= 2) {
                    let bodyA = bodies[0];
                    let bodyB = bodies[1];
                    let bodyALocalPoint = this.physicsServer.getLocalPoint(bodyA, [formatted.data.x, formatted.data.y]) as [x: number, y: number];
                    let bodyBLocalPoint = this.physicsServer.getLocalPoint(bodyB, [formatted.data.x, formatted.data.y]) as [x: number, y: number];
                    this.physicsServer.addAxle(bodyALocalPoint, bodyBLocalPoint, bodyA, bodyB, this.theme.newObjects.axleImage);
                }
                else if (bodies.length == 1) {
                    // get ground body
                    let groundBody = this.physicsServer.getGroundBody();
                    let bodyA = bodies[0];
                    let bodyB = groundBody;
                    let bodyALocalPoint = this.physicsServer.getLocalPoint(bodyA, [formatted.data.x, formatted.data.y]) as [x: number, y: number];
                    let bodyBLocalPoint = this.physicsServer.getLocalPoint(bodyB, [formatted.data.x, formatted.data.y]) as [x: number, y: number];
                    this.physicsServer.addAxle(bodyALocalPoint, bodyBLocalPoint, bodyA, bodyB, this.theme.newObjects.axleImage);
                }
            }
            else if (this.tools[uuid] == "addBolt") {
                // get 2 objects at point
                var bodies = this.physicsServer.getObjectsAtPoint([formatted.data.x, formatted.data.y]);
                if (bodies.length >= 2) {
                    let bodyA = bodies[0];
                    let bodyB = bodies[1];
                    let bodyALocalPoint = this.physicsServer.getLocalPoint(bodyA, [formatted.data.x, formatted.data.y]) as [x: number, y: number];
                    let bodyBLocalPoint = this.physicsServer.getLocalPoint(bodyB, [formatted.data.x, formatted.data.y]) as [x: number, y: number];
                    this.physicsServer.addBolt(bodyALocalPoint, bodyBLocalPoint, bodyA, bodyB, this.theme.newObjects.boltImage);
                }
                else if (bodies.length == 1) {
                    // get ground body
                    let groundBody = this.physicsServer.getGroundBody();
                    let bodyA = bodies[0];
                    let bodyB = groundBody;
                    let bodyALocalPoint = this.physicsServer.getLocalPoint(bodyA, [formatted.data.x, formatted.data.y]) as [x: number, y: number];
                    let bodyBLocalPoint = this.physicsServer.getLocalPoint(bodyB, [formatted.data.x, formatted.data.y]) as [x: number, y: number];
                    this.physicsServer.addBolt(bodyALocalPoint, bodyBLocalPoint, bodyA, bodyB, this.theme.newObjects.boltImage);
                }
            }
            else {
                console.log("Unknown tool: " + this.tools[uuid]);
            }
        } else if (formatted.type == "player mouse up") {
            /*this.springs.forEach((spring: SimuloMouseSpring) => {
                this.physicsServer.destroy(spring);
            });
            this.springs = [];*/
            if (this.springs[uuid]) {
                this.physicsServer.destroy(this.springs[uuid]);
                delete this.springs[uuid];
            }
            if (this.creatingSprings[uuid]) {
                var pointABodies = this.physicsServer.getObjectsAtPoint(this.creatingSprings[uuid].start);
                var pointBBodies = this.physicsServer.getObjectsAtPoint([formatted.data.x, formatted.data.y]);
                if (pointABodies.length > 0 || pointBBodies.length > 0) {
                    if (pointABodies.length === 0) {
                        pointABodies = [this.physicsServer.getGroundBody()];
                    }
                    if (pointBBodies.length === 0) {
                        pointBBodies = [this.physicsServer.getGroundBody()];
                    }
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
                        var spring = this.physicsServer.addSpring(
                            rotatedAnchorA as [x: number, y: number],
                            rotatedAnchorB as [x: number, y: number],
                            pointABodies[0],
                            pointBBodies[0],
                            30,
                            // Calculate the distance between the two points using the Pythagorean theorem
                            Math.sqrt(
                                Math.pow(this.creatingSprings[uuid].start[0] - formatted.data.x, 2) +
                                Math.pow(this.creatingSprings[uuid].start[1] - formatted.data.y, 2)
                            ),
                            0,
                            4 / formatted.data.zoom
                        );
                    }
                    else {
                        var spring = this.physicsServer.addSpring(
                            rotatedAnchorA as [x: number, y: number],
                            rotatedAnchorB as [x: number, y: number],
                            pointABodies[0],
                            pointBBodies[0],
                            30,
                            // Calculate the distance between the two points using the Pythagorean theorem
                            Math.sqrt(
                                Math.pow(this.creatingSprings[uuid].start[0] - formatted.data.x, 2) +
                                Math.pow(this.creatingSprings[uuid].start[1] - formatted.data.y, 2)
                            ),
                            0,
                            this.creatingSprings[uuid].width as number,
                            this.creatingSprings[uuid].image as string,
                        );
                    }
                }


                delete this.creatingSprings[uuid];
            }
            // Check if there's a creatingObject for this uuid
            if (this.creatingObjects[uuid]) {
                // if cursor hasnt moved beyond 0.001, delete the object
                if ((
                    Math.abs(formatted.data.x - this.creatingObjects[uuid].x) < 0.001 &&
                    Math.abs(formatted.data.y - this.creatingObjects[uuid].y) < 0.001
                ) && this.creatingObjects[uuid].shape != "select") {
                    delete this.creatingObjects[uuid];
                    return;
                }
                if (this.creatingObjects[uuid].shape == "rectangle") {
                    // Calculate the size of the new rectangle
                    const width = Math.abs(
                        formatted.data.x - this.creatingObjects[uuid].x
                    );
                    const height = Math.abs(
                        formatted.data.y - this.creatingObjects[uuid].y
                    );

                    var bodyData: object = {
                        color: this.creatingObjects[uuid].color,
                        border: this.theme.newObjects.border,
                        borderWidth: this.theme.newObjects.borderWidth,
                        borderScaleWithZoom:
                            this.theme.newObjects.borderScaleWithZoom,
                        id: 92797981789171,
                        sound: 'impact.wav',
                        image: null,

                    };
                    // define verts of the rectangle
                    const verts: [x: number, y: number][] = [
                        [-width / 2, -height / 2],
                        [width / 2, -height / 2],
                        [width / 2, height / 2],
                        [-width / 2, height / 2],
                    ];

                    let rectangle = this.physicsServer.addPolygon(verts, [(formatted.data.x + this.creatingObjects[uuid].x) / 2, (formatted.data.y + this.creatingObjects[uuid].y) / 2], 0, 1, 0.5, 0.5, bodyData, false, false);

                    // Remove the creatingObject for this uuid
                    delete this.creatingObjects[uuid];
                } else if (this.creatingObjects[uuid].shape == "select") {
                    // select draws a box with the same properties, but instead of creating a new object, it selects all objects in the box. for now, we'll just console.log the objects since we dont have a selection system yet
                    if (!this.creatingObjects[uuid].moving) {
                        // now we query world
                        var bodies = this.physicsServer.getObjectsInRect(
                            // point A
                            [this.creatingObjects[uuid].x, this.creatingObjects[uuid].y],
                            // point B
                            [formatted.data.x, formatted.data.y]
                        );

                        // if theres more than one body, ignore id 1 (the floor)
                        if (bodies.length > 1) {
                            bodies = bodies.filter((body) => body.id != 1);
                        }

                        /*// on each object, set color to red
                        for (var i = 0; i < bodies.length; i++) {
                            bodies[i].color = "#ff0000"; // trolled :uber_troll:
                        }*/
                        this.selectedObjects[uuid] = bodies;

                        delete this.creatingObjects[uuid]; // void
                    }
                    else {
                        let wasStatic = this.creatingObjects[uuid].wasStatic as { [key: number]: boolean };
                        let initialVelocity = this.creatingObjects[uuid].initialVelocity as { x: number, y: number };
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

                        if (
                            Math.abs(formatted.data.x - this.creatingObjects[uuid].x) < 0.001 &&
                            Math.abs(formatted.data.y - this.creatingObjects[uuid].y) < 0.001
                        ) {
                            var bodies = this.physicsServer.getObjectsInRect(
                                // point A
                                [this.creatingObjects[uuid].x, this.creatingObjects[uuid].y],
                                // point B
                                [formatted.data.x, formatted.data.y]
                            );

                            this.selectedObjects[uuid] = bodies;
                        }
                        delete this.creatingObjects[uuid];
                    }
                }

                else if (this.creatingObjects[uuid].shape == "square") {
                    // TODO: make this work (lol)
                } else if (this.creatingObjects[uuid].shape == "circle") {
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

                    var bodyData: object = {
                        color: this.creatingObjects[uuid].color,
                        border: this.theme.newObjects.border,
                        borderWidth: this.theme.newObjects.borderWidth,
                        borderScaleWithZoom:
                            this.theme.newObjects.borderScaleWithZoom,
                        id: 92797981789171,
                        sound: 'impact.wav',
                        image: null,
                        circleCake: this.creatingObjects[uuid].circleCake
                    };

                    let circle = this.physicsServer.addCircle(radius, [posX, posY], 0, 1, 0.5, 0.5, bodyData, false);

                    // Remove the creatingObject for this uuid
                    delete this.creatingObjects[uuid];
                }
                else if (this.creatingObjects[uuid].shape == "polygon") {
                    // just addPolygon with the points
                    var polygon = this.creatingObjects[uuid] as SimuloCreatingPolygon;
                    var pointsLocal = polygon.vertices;
                    pointsLocal.forEach((point) => {
                        point[0] = point[0] - this.creatingObjects[uuid].x;
                        point[1] = point[1] - this.creatingObjects[uuid].y;
                    });
                    let createdPolygon = this.physicsServer.addPolygon(pointsLocal as [x: number, y: number][], [this.creatingObjects[uuid].x, this.creatingObjects[uuid].y], 0, 1, 0.5, 0.5, {
                        color: this.creatingObjects[uuid].color,
                        border: this.theme.newObjects.border,
                        borderWidth: this.theme.newObjects.borderWidth,
                        borderScaleWithZoom:
                            this.theme.newObjects.borderScaleWithZoom,
                        sound: 'impact.wav',
                        image: null,
                    }, false);

                    delete this.creatingObjects[uuid];
                }
            }
        } else if (formatted.type == "set_theme") {
            if (this.theme !== themes[formatted.data]) {
                this.theme = themes[formatted.data];
                var floor = this.physicsServer.getObjectByID(2);
                if (floor) {
                    floor.color = this.theme.ground.color;
                    floor.border = this.theme.ground.border;
                    floor.borderWidth = this.theme.ground.borderWidth;
                    floor.borderScaleWithZoom = this.theme.ground.borderScaleWithZoom;
                }
                // get 2 and 3 and set those to person.color and person.border and all that
                var personBody = this.physicsServer.getObjectByID(5);
                var personHead = this.physicsServer.getObjectByID(7);
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
                this.physicsServer.theme = this.theme;
                this.sendAll("set_theme", this.theme);
            }
        } else if (formatted.type == "set_tool") {
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
        } else if (formatted.type == "set_paused") {
            this.paused = formatted.data;
            this.sendAll("set_paused", this.paused);
        }
        else if (formatted.type == "save_selection") {
            var selectedObjects = this.selectedObjects[uuid];
            if (selectedObjects) {
                /*console.log('saved objects:', JSON.stringify(this.physicsServer.save(selectedObjects.filter((object) => {
                    return object instanceof SimuloObject;
                }) as SimuloObject[])));*/
                if (formatted.data.key !== undefined) {
                    //console.log('sending result with key', formatted.data.key);
                    this.send(uuid, "save_selection", {
                        key: formatted.data.key,
                        data: JSON.stringify(this.physicsServer.save(selectedObjects.filter((object) => {
                            return object instanceof SimuloObject;
                        }) as SimuloObject[], { x: formatted.data.x, y: formatted.data.y }).map((object) => {
                            // subtract mouse pos
                            let position = { x: object.position.x, y: object.position.y };
                            position.x -= formatted.data.x;
                            position.y -= formatted.data.y;
                            object.position = position;
                            return object;
                        }))
                    });
                }
                else {
                    // console.log('no key, not sending result')
                }
            }
        }
        else if (formatted.type == "load_save_data") {
            // load saved objects
            var savedObjects = JSON.parse(formatted.data.data);
            let position = { x: formatted.data.x, y: formatted.data.y };
            for (let i = 0; i < savedObjects.length; i++) {
                let objectPosition = { x: savedObjects[i].position.x, y: savedObjects[i].position.y };
                objectPosition.x += position.x;
                objectPosition.y += position.y;
                savedObjects[i].position = objectPosition;
            }
            this.physicsServer.load(savedObjects, position);
        }
        else if (formatted.type == "delete_selection") {
            var selectedObjects = this.selectedObjects[uuid];
            if (selectedObjects) {
                selectedObjects.forEach((object) => {
                    this.physicsServer.destroy(object);
                });
            }
        }
        else if (formatted.type == "save_world") {
            let world = this.physicsServer.saveWorld();
            if (formatted.data.key !== undefined) {
                this.send(uuid, "save_world", {
                    key: formatted.data.key,
                    data: JSON.stringify(world)
                });
            }
        }
        else if (formatted.type == "load_world") {
            let world = JSON.parse(formatted.data.data);
            this.physicsServer.loadWorld(world).then(() => {
                if (formatted.data.key !== undefined) {
                    this.send(uuid, "load_world", {
                        key: formatted.data.key,
                        data: 'Loaded scene'
                    });
                }
            });
        }
        else if (formatted.type == 'get_object_at_point') {
            let objects = this.physicsServer.getObjectsAtPoint([formatted.data.x, formatted.data.y]);
            if (objects.length >= 1 && formatted.data.key !== undefined) {
                this.send(uuid, 'get_object_at_point', {
                    key: formatted.data.key,
                    data: { id: objects[0].id, color: objects[0].color, image: objects[0].image, name: objects[0].name }
                });
            }
            else if (objects.length == 0 && formatted.data.key !== undefined) {
                this.send(uuid, 'get_object_at_point', {
                    key: formatted.data.key,
                    data: { id: null }
                });
            }
        }
        else if (formatted.type == 'delete_object') {
            let object = this.physicsServer.getObjectByID(formatted.data.id);
            if (object) {
                this.physicsServer.destroy(object).then(() => {
                    if (formatted.data.key !== undefined) {
                        this.send(uuid, 'delete_object', {
                            key: formatted.data.key,
                            data: true
                        });
                    }
                });
            }
            else {
                if (formatted.data.key !== undefined) {
                    this.send(uuid, 'delete_object', {
                        key: formatted.data.key,
                        data: false
                    });
                }
            }
        }
        else if (formatted.type == 'change_object_color') {
            let object = this.physicsServer.getObjectByID(formatted.data.id);
            if (object) {
                object.color = formatted.data.color;
                if (formatted.data.key !== undefined) {
                    this.send(uuid, 'change_object_color', {
                        key: formatted.data.key,
                        data: true
                    });
                }
            }
            else {
                if (formatted.data.key !== undefined) {
                    this.send(uuid, 'change_object_color', {
                        key: formatted.data.key,
                        data: false
                    });
                }
            }
        }
        else if (formatted.type == 'change_object_image') {
            let object = this.physicsServer.getObjectByID(formatted.data.id);
            if (object) {
                object.image = formatted.data.image;
                if (formatted.data.key !== undefined) {
                    this.send(uuid, 'change_object_image', {
                        key: formatted.data.key,
                        data: true
                    });
                }
            }
            else {
                if (formatted.data.key !== undefined) {
                    this.send(uuid, 'change_object_image', {
                        key: formatted.data.key,
                        data: false
                    });
                }
            }
        }
        else if (formatted.type == 'change_object_name') {
            let object = this.physicsServer.getObjectByID(formatted.data.id);
            if (object) {
                object.name = formatted.data.name;
                if (formatted.data.key !== undefined) {
                    this.send(uuid, 'change_object_name', {
                        key: formatted.data.key,
                        data: true
                    });
                }
            }
            else {
                if (formatted.data.key !== undefined) {
                    this.send(uuid, 'change_object_name', {
                        key: formatted.data.key,
                        data: false
                    });
                }
            }
        }
    }

    addScript(code: string) {
        var cachedObjects: { [key: number]: any } = {};
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
                            requestID: event.data.requestID, // pass it back so it can identify what request it is responding to
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
                            requestID: event.data.requestID, // pass it back so it can identify what request it is responding to
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
                            requestID: event.data.requestID, // pass it back so it can identify what request it is responding to
                            error: e
                        });
                    }
                }
                else {
                    worker.postMessage({
                        type: 'response',
                        requestID: event.data.requestID, // pass it back so it can identify what request it is responding to
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

    setupPhysicsServer() {
        if (this.physicsServer) {
            this.physicsServer.destroyPhysicsServer();
        }
        let physicsServer = new SimuloPhysicsServer(this.theme);
        physicsServer.on('collision', (data: any) => {
            // .sound, .volume and .pitch. we can just send it as-is through network
            this.sendAll('collision', {
                sound: data.sound,
                volume: data.volume,
                pitch: data.pitch * this.timeScaleMultiplier
            });
        });
        physicsServer.on('themeChange', (data: any) => {
            this.theme = data;
            this.sendAll("set_theme", data);
        });
        return physicsServer;
    }

    constructor(theme: SimuloTheme, multiplayer: boolean, localClient: boolean) {
        this.theme = theme;
        this.physicsServer = this.setupPhysicsServer();

        let colors = [
            '#ff5454',
            '#ff9147',
            '#ffe44a',
            '#82e74c',
            '#309eff',
            '#ac58ff',
            '#ff8eca',
            '#ffffff',
        ];

        if (multiplayer) {
            this.networkServer = new SimuloNetworkServer();

            this.networkServer.on("connect", (uuid: string) => {
                console.log("connect", uuid);
                this.tools[uuid] = "drag";
                this.playerColors[uuid] = colors[Math.floor(Math.random() * colors.length)];
                this.sendAll("connect", uuid);
            });

            this.networkServer.on("disconnect", (uuid: string) => {
                console.log("disconnect", uuid);
                this.sendAll("disconnect", uuid);
            });

            this.networkServer.on("data", (data: { formatted: { type: string; data: any }, uuid: string }) => {
                if (!this.tools[data.uuid]) {
                    this.tools[data.uuid] = "drag";
                }
                if (!this.playerColors[data.uuid]) {
                    this.playerColors[data.uuid] = colors[Math.floor(Math.random() * colors.length)];
                }
                this.handleData(data.formatted, data.uuid);
            });

            this.networkServer.connect();
        }

        if (localClient) {
            var id = 'local';
            this.localClients.push(new SimuloLocalClient(this, id));
            this.tools[id] = "drag";
            this.playerColors[id] = '#000000';
        }

        setInterval(() => {
            this.loop(this.frameRate);
        }, this.frameRate);
        //let handle: number;
        /*var loop = (prevMs: number) => {
            const nowMs = window.performance.now();
            handle = requestAnimationFrame(loop.bind(null, nowMs));
            const deltaMs = nowMs - prevMs;
            this.loop(deltaMs);
        }
        loop(window.performance.now());*/
    }

}

export default SimuloServerController;