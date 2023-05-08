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
}

interface SpringData {
    p1: [number, number];
    p2: [number, number];
}

interface SimuloCreatingObject {
    x: number;
    y: number;
    color: string;
    shape: "circle" | "rectangle" | "polygon" | "edge" | "square";
    border: string | null;
    border_width: number | null;
    border_scale_with_zoom: boolean;
    circle_cake?: boolean;
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
    creatingObjects: { [key: string]: SimuloCreatingObject } = {};
    timeScaleMultiplier: number = 1;
    paused: boolean = false;
    theme: SimuloTheme;
    localClients: SimuloLocalClient[] = [];

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
                p2: s.anchor
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
            mouseSprings: []
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
                /*springsFormatted.push({
                    p1: [formatted.data.x, formatted.data.y],
                    p2: [spring.GetAnchorB().get_x(), spring.GetAnchorB().get_y()],
                });
                */
            });

            this.sendAll("player mouse", {
                id: uuid,
                x: formatted.data.x,
                y: formatted.data.y,
                springs: springsFormatted,
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
            } else if (this.tools[uuid] == "add_circle") {
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
            } else {
                console.log("Unknown tool: " + this.tools[uuid]);
            }

            // 👍 we did it, yay, we're so cool

            // we did it, yay, we're so cool 👍
        } else if (formatted.type == "player mouse up") {
            this.springs.forEach((spring: SimuloMouseSpring) => {
                this.physicsServer.destroy(spring);
            });
            this.springs = [];
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

                    this.physicsServer.addPolygon(verts, [(formatted.data.x + this.creatingObjects[uuid].x) / 2, (formatted.data.y + this.creatingObjects[uuid].y) / 2], 0, 1, 0.5, 0, bodyData, false);

                    // Remove the creatingObject for this uuid
                    delete this.creatingObjects[uuid];
                } else if (this.creatingObjects[uuid].shape == "square") {
                    // TODO: make this work (lol)
                } else if (this.creatingObjects[uuid].shape == "circle") {
                    // Calculate the radius of the new circle
                    const dx = formatted.data.x - this.creatingObjects[uuid].x;
                    const dy = formatted.data.y - this.creatingObjects[uuid].y;
                    const radius = Math.max(Math.abs(dx), Math.abs(dy)) / 2;

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

                    this.physicsServer.addCircle(radius, [formatted.data.x, formatted.data.y], 0, 1, 0.5, 0, bodyData, false);

                    // Remove the creatingObject for this uuid
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
            this.localClients.push(new SimuloLocalClient(this, 'local'));
        }

        setInterval(() => {
            this.loop(this.frameRate);
        }, this.frameRate);
    }

}

export default SimuloServerController;