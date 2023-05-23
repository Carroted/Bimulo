import { getRandomColor, randomRange, hsvToRgb } from "./utils.js";

import { SimuloPhysicsServer, SimuloJoint, SimuloMouseSpring, SimuloObject } from "./SimuloPhysicsServer.js";
import SimuloTheme from "./SimuloTheme.js";
var SimuloNetworkServer: any | null = null;
//import SimuloNetworkServer from "./SimuloNetworkServer.js";
var isNode = false;
try {
    if (process) {
        isNode = true;
    }
} catch (e) {
    isNode = false;
}
if (isNode) {
    var module = await import("./SimuloNetworkServer.js");
    SimuloNetworkServer = module.default;
}

import * as http from "http";
import SimuloStep from "./SimuloStep.js";
import SimuloLocalClient from "./SimuloLocalClient.js";

interface SimuloStepExtended extends SimuloStep {
    creating_objects: object;
    time_scale: number;
    paused: boolean;
    creating_springs: object;
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
    line: { color: string, width: number, scale_with_zoom: boolean } | null;
}

import { SimuloCreatingObject, SimuloCreatingPolygon } from "./SimuloCreatingObject.js";

function getDistance(point1: [x: number, y: number], point2: [x: number, y: number]): number {
    const xDiff = point2[0] - point1[0];
    const yDiff = point2[1] - point1[1];
    return Math.sqrt(xDiff ** 2 + yDiff ** 2);
}

class SimuloServerController {
    physicsServer: SimuloPhysicsServer;
    networkServer: any | null = null;
    tools: { [key: string]: string } = {};
    previousStep: SimuloStepExtended | null = null;
    timeScale: number = 1 / 500;
    frameRate: number = 1000 / 60;
    velocityIterations: number = 3;
    positionIterations: number = 2;
    springs: SimuloMouseSpring[] = []; // this will be an object soon for multiplayer support
    creatingObjects: { [key: string]: SimuloCreatingObject } = {}; // will be renamed for clarity, but this is all the tool actions in progress. for example, a circle being drawn, selection box, spring being added, etc
    creatingSprings: { [key: string]: { start: [x: number, y: number], image: string | null } } = {};
    timeScaleMultiplier: number = 1;
    paused: boolean = false;
    theme: SimuloTheme;
    localClients: SimuloLocalClient[] = [];
    selectedObjects: { [key: string]: (SimuloJoint | SimuloObject)[] } = {};

    sendAll(type: string, data: any) {
        if (this.networkServer) {
            this.networkServer.sendAll(type, data);
        }
        this.localClients.forEach((client: SimuloLocalClient) => {
            client.emit('data', { type: type, data: data });
        });
    }

    loop(delta: number) {
        // step physics
        if (this.paused) {
            if (this.previousStep) {
                this.sendAll("world update", this.previousStep);
            }
            return;
        }
        var step = this.physicsServer.step(
            delta * this.timeScale * this.timeScaleMultiplier,
            this.velocityIterations,
            this.positionIterations
        );

        var springs1 = step.springs;
        var springs2 = this.springs.map((s) => {
            return {
                p1: s.target,
                p2: s.anchor,
                image: s.image,
                line: s.line
            };
        });
        var springs3 = springs1.concat(springs2);

        var thisStep: SimuloStepExtended = {
            shapes: step.shapes,
            creating_objects: this.creatingObjects,
            background: this.theme.background,
            springs: springs3,
            time_scale: this.timeScaleMultiplier,
            paused: this.paused,
            mouseSprings: [],
            creating_springs: this.creatingSprings
        };
        this.sendAll("world update", thisStep);
        this.previousStep = thisStep;

        //console.log("vomit");
    }
    handleData(formatted: { type: string; data: any }, uuid: string) {
        if (formatted.type == "player mouse") {
            var springsFormatted: SpringData[] = [];
            this.springs.forEach((spring: SimuloMouseSpring) => {
                spring.target = [formatted.data.x, formatted.data.y];
                springsFormatted.push({
                    p1: [formatted.data.x, formatted.data.y],
                    p2: [spring.anchor[0], spring.anchor[1]],
                    image: spring.image,
                    line: spring.line
                });
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
            });

            // 👍 we did it, yay, we're so cool
        } else if (formatted.type == "player mouse down") {
            if (this.tools[uuid] == "add_rectangle") {
                this.creatingObjects[uuid] = {
                    x: formatted.data.x,
                    y: formatted.data.y,
                    color: getRandomColor(
                        this.theme.new_objects.color.hue_min,
                        this.theme.new_objects.color.hue_max,
                        this.theme.new_objects.color.sat_min,
                        this.theme.new_objects.color.sat_max,
                        this.theme.new_objects.color.val_min,
                        this.theme.new_objects.color.val_max,
                        this.theme.new_objects.color.alp_min,
                        this.theme.new_objects.color.alp_max,
                        true
                    ) as string,
                    shape: "rectangle",
                    border: this.theme.new_objects.border,
                    border_width: this.theme.new_objects.border_width,
                    border_scale_with_zoom: this.theme.new_objects.border_scale_with_zoom,
                };
            }
            else if (this.tools[uuid] == "select") {
                // same as rectangle
                this.creatingObjects[uuid] = {
                    x: formatted.data.x,
                    y: formatted.data.y,
                    color: 'rgba(255, 255, 255, 0.5)',
                    shape: "select",
                    border: null,
                    border_width: null,
                    border_scale_with_zoom: false
                };
            }
            else if (this.tools[uuid] == "add_circle") {
                this.creatingObjects[uuid] = {
                    x: formatted.data.x,
                    y: formatted.data.y,
                    color: getRandomColor(
                        this.theme.new_objects.color.hue_min,
                        this.theme.new_objects.color.hue_max,
                        this.theme.new_objects.color.sat_min,
                        this.theme.new_objects.color.sat_max,
                        this.theme.new_objects.color.val_min,
                        this.theme.new_objects.color.val_max,
                        this.theme.new_objects.color.alp_min,
                        this.theme.new_objects.color.alp_max,
                        true
                    ) as string,
                    shape: "circle",
                    border: this.theme.new_objects.border,
                    border_width: this.theme.new_objects.border_width,
                    border_scale_with_zoom: this.theme.new_objects.border_scale_with_zoom,
                    circle_cake: this.theme.new_objects.circle_cake,
                };
            } else if (this.tools[uuid] == "drag") {
                // instead, start a spring

                var bodies: SimuloObject[] = this.physicsServer.getObjectsAtPoint([formatted.data.x, formatted.data.y]);

                if (bodies.length > 0) {
                    var selectedBody = bodies[0];

                    var mouseJoint = this.physicsServer.addMouseSpring(
                        selectedBody,
                        [formatted.data.x, formatted.data.y],
                        30,
                        0,
                        1000000 * selectedBody.mass
                    );

                    this.springs.push(mouseJoint);
                }
            }
            else if (this.tools[uuid] == 'add_spring') {
                this.creatingSprings[uuid] = { start: [formatted.data.x, formatted.data.y], image: this.theme.new_objects.spring_image };
            }
            else if (this.tools[uuid] == "add_person") {
                // just run this.physicsServer.addPerson
                var person = this.physicsServer.addPerson([formatted.data.x, formatted.data.y]);
            }
            else if (this.tools[uuid] == "add_polygon") {
                this.creatingObjects[uuid] = {
                    x: formatted.data.x,
                    y: formatted.data.y,
                    color: getRandomColor(
                        this.theme.new_objects.color.hue_min,
                        this.theme.new_objects.color.hue_max,
                        this.theme.new_objects.color.sat_min,
                        this.theme.new_objects.color.sat_max,
                        this.theme.new_objects.color.val_min,
                        this.theme.new_objects.color.val_max,
                        this.theme.new_objects.color.alp_min,
                        this.theme.new_objects.color.alp_max,
                        true
                    ) as string,
                    shape: "polygon",
                    border: this.theme.new_objects.border,
                    border_width: this.theme.new_objects.border_width,
                    border_scale_with_zoom: this.theme.new_objects.border_scale_with_zoom,
                    vertices: [[formatted.data.x, formatted.data.y]] as [x: number, y: number][]
                } as SimuloCreatingPolygon;
            }
            else {
                console.log("Unknown tool: " + this.tools[uuid]);
            }

            // 👍 we did it, yay, we're so cool

            // we did it, yay, we're so cool 👍
        } else if (formatted.type == "player mouse up") {
            this.springs.forEach((spring: SimuloMouseSpring) => {
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
                            0
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
                            this.creatingSprings[uuid].image as string
                        );
                    }
                }


                delete this.creatingSprings[uuid];
            }
            // Check if there's a creatingObject for this uuid
            if (this.creatingObjects[uuid]) {
                // if cursor hasnt moved beyond 0.001, delete the object
                if (
                    Math.abs(formatted.data.x - this.creatingObjects[uuid].x) < 0.001 &&
                    Math.abs(formatted.data.y - this.creatingObjects[uuid].y) < 0.001
                ) {
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
                        border: this.theme.new_objects.border,
                        border_width: this.theme.new_objects.border_width,
                        border_scale_with_zoom:
                            this.theme.new_objects.border_scale_with_zoom,
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

                    this.physicsServer.addPolygon(verts, [(formatted.data.x + this.creatingObjects[uuid].x) / 2, (formatted.data.y + this.creatingObjects[uuid].y) / 2], 0, 1, 0.5, 0.5, bodyData, false);

                    // Remove the creatingObject for this uuid
                    delete this.creatingObjects[uuid];
                } else if (this.creatingObjects[uuid].shape == "select") {
                    // select draws a box with the same properties, but instead of creating a new object, it selects all objects in the box. for now, we'll just console.log the objects since we dont have a selection system yet

                    // now we query world
                    var bodies = this.physicsServer.getObjectsInRect(
                        // point A
                        [this.creatingObjects[uuid].x, this.creatingObjects[uuid].y],
                        // point B
                        [formatted.data.x, formatted.data.y]
                    );

                    // on each object, set color to red
                    for (var i = 0; i < bodies.length; i++) {
                        bodies[i].color = "#ff0000"; // trolled :uber_troll:
                    }

                    delete this.creatingObjects[uuid]; // void
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
                        border: this.theme.new_objects.border,
                        border_width: this.theme.new_objects.border_width,
                        border_scale_with_zoom:
                            this.theme.new_objects.border_scale_with_zoom,
                        id: 92797981789171,
                        sound: 'impact.wav',
                        image: null,
                        circle_cake: this.creatingObjects[uuid].circle_cake
                    };

                    this.physicsServer.addCircle(radius, [posX, posY], 0, 1, 0.5, 0.5, bodyData, false);

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
                    this.physicsServer.addPolygon(pointsLocal as [x: number, y: number][], [this.creatingObjects[uuid].x, this.creatingObjects[uuid].y], 0, 1, 0.5, 0.5, {
                        color: this.creatingObjects[uuid].color,
                        border: this.theme.new_objects.border,
                        border_width: this.theme.new_objects.border_width,
                        border_scale_with_zoom:
                            this.theme.new_objects.border_scale_with_zoom,
                        id: 92797981789171,
                        sound: 'impact.wav',
                        image: null,
                    }, false);

                    delete this.creatingObjects[uuid];
                }
            }
        } else if (formatted.type == "set_theme") {
            //this.theme = themes[formatted.data];
            // TODO: check for themes and set
        } else if (formatted.type == "set_tool") {
            console.log("set tool to", formatted.data);
            this.tools[uuid] = formatted.data;
        } else if (formatted.type == "set_time_scale") {
            this.timeScaleMultiplier = formatted.data;
            this.sendAll("set_time_scale", this.timeScaleMultiplier);
        } else if (formatted.type == "set_paused") {
            this.paused = formatted.data;
            this.sendAll("set_paused", this.paused);
        }
    }

    constructor(theme: SimuloTheme, server: http.Server | null, localClient: boolean) {
        this.theme = theme;
        this.physicsServer = new SimuloPhysicsServer(this.theme);
        this.physicsServer.on('collision', (data: any) => {
            // .sound, .volume and .pitch. we can just send it as-is through network
            this.sendAll('collision', {
                sound: data.sound,
                volume: data.volume,
                pitch: data.pitch * this.timeScaleMultiplier
            });
        });

        if (server) {
            this.networkServer = new SimuloNetworkServer(server);

            this.networkServer.on("connect", (uuid: string) => {
                console.log("connect", uuid);
                this.tools[uuid] = "drag";
            });

            this.networkServer.on("data", (data: { formatted: { type: string; data: any }, uuid: string }) => {
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
        let handle: number;
        var loop = (prevMs: number) => {
            const nowMs = window.performance.now();
            handle = requestAnimationFrame(loop.bind(null, nowMs));
            const deltaMs = nowMs - prevMs;
            this.loop(deltaMs);
        }
        loop(window.performance.now());
    }

}

export default SimuloServerController;