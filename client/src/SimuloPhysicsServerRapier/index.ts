import SimuloViewerPIXI from "../SimuloViewerPIXI";

const RAPIER = await import("@dimforge/rapier2d");
import type Rapier from "@dimforge/rapier2d";

import SimuloObjectData from "../SimuloObjectData";

export default class SimuloPhysicsServerRapier {
    world: Rapier.World;
    //graphics: Graphics;
    //mouse: { x: number; y: number };
    listeners: { [key: string]: Function[] } = {};
    colliders: Rapier.Collider[] = [];
    private emit(event: string, data: any) {
        if (this.listeners[event]) {
            this.listeners[event].forEach((listener) => {
                listener(data);
            });
        }
    }
    on(event: string, listener: Function) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }
    off(event: string, listener: Function) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter((l) => l != listener);
        }
    }

    constructor() {
        let gravity = new RAPIER.Vector2(0.0, -9.81);
        let world = new RAPIER.World(gravity);
        this.world = world;
        //this.graphics = new Graphics();

        /*
         * Ground
         */
        // Create Ground.
        let groundSize = 30.0;
        let grounds = [
            { x: 0.0, y: 0.0, hx: groundSize, hy: 1.2 },
            { x: -groundSize, y: groundSize, hx: 1.2, hy: groundSize },
            { x: groundSize, y: groundSize, hx: 1.2, hy: groundSize },
        ];

        grounds.forEach((ground, i) => {
            let data: SimuloObjectData = {
                color: 0xa1acfa,
                border: 0x000000,
                borderScaleWithZoom: true,
                borderWidth: 1,
                zDepth: i,
                id: i,
                name: "Unnamed Object",
                sound: null,
                image: null,
            }
            this.addRectangle(ground.hx, ground.hy, data, [ground.x, ground.y], true);
        });

        let bodyDesc = RAPIER.RigidBodyDesc.dynamic();
        bodyDesc = bodyDesc.setTranslation(
            0,
            0
        );
        bodyDesc.setUserData({
            color: 0xff3030,
            border: 0xffffff,
        });
        let body = this.world.createRigidBody(bodyDesc);
        let colliderDesc = RAPIER.ColliderDesc.cuboid(25.0, 5.0);
        let coll = this.world.createCollider(colliderDesc, body);
        //this.graphics.addCollider(RAPIER, this.world, coll);

        // revolute to world
        let anchor = new RAPIER.Vector2(0.0, 0.0);
        let jointDesc = RAPIER.JointData.revolute(
            new RAPIER.Vector2(0.0, 0.0),
            anchor,
        );

        // ok now we need a ground body like in box2d, its a static body with mass 10000 (mass 0 bodies break the sim)
        let groundBodyDesc = RAPIER.RigidBodyDesc.fixed();
        let groundBody = this.world.createRigidBody(groundBodyDesc);

        let JointData = RAPIER.JointData.revolute(anchor, anchor);
        world.createImpulseJoint(JointData, groundBody, body, true);

        /*
         * Create the convex polygons
         */
        let num = 14;
        let scale = 4.0;

        let shift = scale;
        let centerx = (shift * num) / 2.0;
        let centery = shift / 2.0;

        let i, j, k;
        /*for (i = 0; i < num; ++i) {
            for (j = 0; j < num * 2; ++j) {
                let x = i * shift - centerx;
                let y = j * shift * 2.0 + centery + 2.0;

                let bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y);
                let body = world.createRigidBody(bodyDesc);

                let points = [];
                for (k = 0; k < 10; ++k) {
                    points.push(rng() * scale, rng() * scale);
                }
                let colliderDesc = RAPIER.ColliderDesc.convexHull(
                    new Float32Array(points),
                );
                world.createCollider(colliderDesc, body);
            }
        }*/

        for (i = 0; i < num; ++i) {
            for (j = 0; j < num * 2; ++j) {
                let x = i * shift - centerx;
                let y = j * shift * 2.0 + centery + 2.0;

                let points: [x: number, y: number][] = [];
                for (k = 0; k < 10; ++k) {
                    points.push([Math.random() * scale, Math.random() * scale]);
                }

                // random hex color with sat 100
                let color = Math.floor(Math.random() * 0xffffff);
                let data: SimuloObjectData = {
                    color: color,
                    border: 0x000000,
                    borderScaleWithZoom: true,
                    borderWidth: 1,
                    zDepth: i,
                    id: i,
                    name: "Unnamed Object",
                    sound: null,
                    image: null,
                }

                this.addPolygon(points, data, [x, y]);
            }
        }

        /*this.mouse = { x: 0, y: 0 };

        window.addEventListener("mousemove", (event) => {
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = 1 - (event.clientY / window.innerHeight) * 2;
        });

        this.graphics.viewport.moveCenter(-100.0, -300.0);*/

        this.loop();
    }

    /** multiple gon */
    addPolygon(points: [x: number, y: number][], data: SimuloObjectData, position: [x: number, y: number], isStatic: boolean = false) {
        let bodyDesc = isStatic ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic();
        bodyDesc = bodyDesc.setTranslation(
            position[0],
            position[1]
        );
        bodyDesc.setUserData(data);

        let body = this.world.createRigidBody(bodyDesc);

        let colliderDesc = RAPIER.ColliderDesc.convexHull(
            new Float32Array(points.flat()),
        );
        let coll = this.world.createCollider(colliderDesc!, body);
        //this.graphics.addCollider(RAPIER, this.world, coll);
    }

    addRectangle(width: number, height: number, data: SimuloObjectData, position: [x: number, y: number], isStatic: boolean) {
        let bodyDesc = isStatic ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic();
        bodyDesc = bodyDesc.setTranslation(
            position[0],
            position[1]
        );
        bodyDesc.setUserData(data);
        let body = this.world.createRigidBody(bodyDesc);
        let colliderDesc = RAPIER.ColliderDesc.cuboid(width, height);
        let coll = this.world.createCollider(colliderDesc!, body);
        //this.graphics.addCollider(RAPIER, this.world, coll);
    }

    loop() {
        this.world.maxVelocityIterations = 4;
        this.world.maxVelocityFrictionIterations =
            4 * 2;

        let t0 = new Date().getTime();
        this.world.step();

        //this.graphics.render(this.world, false);
        this.emit("world", this.colliders.map((collider) => {
            let body = collider.parent()!;
            let bodyPosition = body.translation();
            let bodyRotation = body.rotation();
            let colliderPosition = collider.translation();
            let colliderRotation = collider.rotation();


        }));

        requestAnimationFrame(() => this.loop());
    }
}