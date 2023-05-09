
// import Box2DFactory from "box2d-wasm";

// check if node or browser

var isNode = false;
try {
    if (process) {
        isNode = true;
    }
} catch (e) {
    isNode = false;
}
/*

const Box2DFactoryFactory = import(isNode ? "box2d-wasm" : "/box2d-wasm/entry.js");
var ok = await Box2DFactoryFactory;
const Box2DFactory = ok.default;
const box2D = await Box2DFactory();
// import Box2D namespace
*/


//import { Box2D } from "../../node_modules/box2d-wasm/dist/es/entry";
import Box2DFactory from "../../node_modules/box2d-wasm/dist/es/entry.js";
//import earcut from 'earcut';

/*// @ts-ignore
import * as earcut from "../../node_modules/earcut/dist/earcut.min.js"; // cant figure out how to get typescript to let me import this properly. have type definitions but its not reading it when i relatively import it (which is needed for browser)
console.log('earcut:', earcut);
console.log('earcut.default:', earcut.default);*/
// @ts-ignore
import earcut from 'https://cdn.jsdelivr.net/npm/earcut@2.2.4/+esm'

const box2D = await Box2DFactory();

import SimuloObjectData from "./SimuloObjectData.js";
import SimuloJointData from "./SimuloJointData.js";
import SimuloTheme from "./SimuloTheme.js";

import { randomRange } from "./utils.js";

import { SimuloShape, SimuloEdge, SimuloPolygon, SimuloCircle } from "./SimuloShape.js";
import SimuloStep from "./SimuloStep.js";

// One PhysicsServer per world/room should be used. This makes things simple and secure since events like `physicsServer.on("collision", ...)` will only be called for collisions in that room.

function createPolygonShape(tuples: [x: number, y: number][]) { // This isn't in utils because only the PhysicsServer will ever touch Box2D
    var shape = new box2D.b2PolygonShape();
    var [vecArrFirstElem, destroyVecArr] = box2D.tuplesToVec2Array(tuples);
    shape.Set(vecArrFirstElem, tuples.length);
    destroyVecArr();
    return shape;
}

class SimuloObject {
    private physicsServer: SimuloPhysicsServer;
    get id(): number | null {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        return objectData.id;
    }
    get position(): [x: number, y: number] {
        return [this.body.GetPosition().get_x(), this.body.GetPosition().get_y()];
    }
    set position([x, y]: [x: number, y: number]) {
        this.body.SetTransform(new box2D.b2Vec2(x, y), this.body.GetAngle());
    }
    get rotation(): number {
        return this.body.GetAngle();
    }
    set rotation(angle: number) {
        this.body.SetTransform(this.body.GetPosition(), angle);
    }
    get density(): number {
        return this.body.GetFixtureList().GetDensity();
    }
    set density(density: number) {
        this.body.GetFixtureList().SetDensity(density);
        this.body.ResetMassData();
    }
    get friction(): number {
        return this.body.GetFixtureList().GetFriction();
    }
    set friction(friction: number) {
        this.body.GetFixtureList().SetFriction(friction);
    }
    get restitution(): number {
        return this.body.GetFixtureList().GetRestitution();
    }
    set restitution(restitution: number) {
        this.body.GetFixtureList().SetRestitution(restitution);
    }
    get border(): string | null {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        return objectData.border;
    }
    set border(border: string | null) {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        objectData.border = border;
    }
    get borderWidth(): number | null {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        return objectData.border_width;
    }
    set borderWidth(borderWidth: number | null) {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        objectData.border_width = borderWidth;
    }
    get borderScaleWithZoom(): boolean {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        return objectData.border_scale_with_zoom;
    }
    set borderScaleWithZoom(borderScaleWithZoom: boolean) {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        objectData.border_scale_with_zoom = borderScaleWithZoom;
    }
    get circleCake(): boolean {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        // if undefined return false
        if (objectData.circle_cake == undefined) {
            return false;
        }
        return objectData.circle_cake;
    }
    set circleCake(circleCake: boolean) {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        objectData.circle_cake = circleCake;
    }
    get image(): string | null {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        return objectData.image;
    }
    set image(image: string | null) {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        objectData.image = image;
    }
    get collision_sound(): string | null {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        return objectData.sound;
    }
    set collision_sound(sound: string | null) {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        objectData.sound = sound;
    }
    get color(): string {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        return objectData.color;
    }
    set color(color: string) {
        let objectData = this.body.GetUserData() as SimuloObjectData;
        objectData.color = color;
    }
    get isStatic(): boolean {
        return this.body.GetType() == box2D.b2_staticBody;
    }
    set isStatic(isStatic: boolean) {
        if (isStatic) {
            this.body.SetType(box2D.b2_staticBody);
        } else {
            this.body.SetType(box2D.b2_dynamicBody);
        }
    }
    get mass(): number {
        return this.body.GetMass();
    }

    // when set any of the above, itll update the box2d body, which we'll define now:
    body: Box2D.b2Body; // this is not meant to be accessed in scripting, only in the physics server. however, we cant really make it private and it shouldnt cause any issues

    constructor(physicsServer: SimuloPhysicsServer, body: Box2D.b2Body) {
        this.body = body;
        this.physicsServer = physicsServer;
    }
    addForce([x, y]: [x: number, y: number]) {
        this.body.ApplyForce(new box2D.b2Vec2(x, y), this.body.GetPosition(), true);
    }
    addImpulse([x, y]: [x: number, y: number]) {
        this.body.ApplyLinearImpulse(new box2D.b2Vec2(x, y), this.body.GetPosition(), true);
    }
    addTorque(torque: number) {
        this.body.ApplyTorque(torque, true);
    }
    addAngularImpulse(impulse: number) {
        this.body.ApplyAngularImpulse(impulse, true);
    }
    destroy() {
        this.body.GetWorld().DestroyBody(this.body);
        // No longer real
    }
}

class SimuloJoint {
    physicsServer: SimuloPhysicsServer;
    joint: Box2D.b2Joint;
    constructor(physicsServer: SimuloPhysicsServer, joint: Box2D.b2Joint) {
        this.joint = joint;
        this.physicsServer = physicsServer;
    }
    destroy() {
        this.joint.GetBodyA().GetWorld().DestroyJoint(this.joint);
    }
}
// extension of SimuloJoint (SimuloMouseSpring):
class SimuloMouseSpring extends SimuloJoint {
    mouseJoint: Box2D.b2MouseJoint;
    constructor(physicsServer: SimuloPhysicsServer, joint: Box2D.b2Joint) {
        // cast with box2d
        var mouseJoint = box2D.castObject(joint, box2D.b2MouseJoint);
        super(physicsServer, joint); // super is used to call functions of the parent class
        this.mouseJoint = mouseJoint;
    }
    get damping(): number {
        return this.mouseJoint.GetDamping();
    }
    set damping(damping: number) {
        this.mouseJoint.SetDamping(damping);
    }
    get stiffness(): number {
        return this.mouseJoint.GetStiffness();
    }
    set stiffness(stiffness: number) {
        this.mouseJoint.SetStiffness(stiffness);
    }
    get target(): [x: number, y: number] {
        let target = this.mouseJoint.GetTarget();
        return [target.get_x(), target.get_y()];
    }
    set target([x, y]: [x: number, y: number]) {
        this.mouseJoint.SetTarget(new box2D.b2Vec2(x, y));
    }
    get maxForce(): number {
        return this.mouseJoint.GetMaxForce();
    }
    set maxForce(maxForce: number) {
        this.mouseJoint.SetMaxForce(maxForce);
    }
    get anchor(): [x: number, y: number] {
        let anchor = this.mouseJoint.GetAnchorB();
        return [anchor.get_x(), anchor.get_y()];
    }
}




class SimuloPhysicsServer {
    world: Box2D.b2World;
    defaultImpact: string = "impact.wav";
    listeners: { [key: string]: Function[] } = {};
    theme: SimuloTheme;
    ground: Box2D.b2Body;
    // object. key is ID, value is SimuloObject
    bodies: { [key: string]: SimuloObject } = {};
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

    addPolygon(
        vertices: [x: number, y: number][],
        position: [x: number, y: number],
        rotation: number,
        density: number,
        friction: number,
        restitution: number,
        // string key to any value
        data: { [key: string]: any },
        isStatic: boolean = false
    ) { // TODO: change above into an interface or class or whatever named SimuloPolygon simuloobjectdata wont be needed anymore after that, can have stuff directly in the interface
        //var shape = createPolygonShape(vertices);
        // earcut triangulation
        var triangles: number[] = earcut(vertices.flat());

        var bd = new box2D.b2BodyDef();
        bd.set_type(isStatic ? box2D.b2_staticBody : box2D.b2_dynamicBody);
        bd.set_position(new box2D.b2Vec2(position[0], position[1]));
        bd.set_angle(rotation);
        var body = this.world.CreateBody(bd);
        // make a bunch of polygons
        for (var i = 0; i < triangles.length; i += 3) {
            var shape = createPolygonShape([
                [vertices[triangles[i]][0], vertices[triangles[i]][1]],
                [vertices[triangles[i + 1]][0], vertices[triangles[i + 1]][1]],
                [vertices[triangles[i + 2]][0], vertices[triangles[i + 2]][1]]
            ]);
            var fd = new box2D.b2FixtureDef();
            fd.set_shape(shape);
            fd.set_density(density);
            fd.set_friction(friction);
            fd.set_restitution(restitution);
            body.CreateFixture(fd);
        }
        var bodyData = body.GetUserData() as SimuloObjectData;
        // for each key in data, set bodyData[key] to data[key]
        /* here are all the keys:
            id: number | null;
        sound: string | null;
        color: string;
        border: string | null;
        border_width: number | null;
        border_scale_with_zoom: boolean;
        circle_cake ?: boolean;
        image: string | null;
        */
        for (var key in data) {
            if (key == 'id') {
                bodyData.id = data[key];
            }
            else if (key == 'sound') {
                bodyData.sound = data[key];
            }
            else if (key == 'color') {
                bodyData.color = data[key];
            }
            else if (key == 'border') {
                bodyData.border = data[key];
            }
            else if (key == 'border_width') {
                bodyData.border_width = data[key];
            }
            else if (key == 'border_scale_with_zoom') {
                bodyData.border_scale_with_zoom = data[key];
            }
            else if (key == 'circle_cake') {
                bodyData.circle_cake = data[key];
            }
            else if (key == 'image') {
                bodyData.image = data[key];
            }
        }

        // set points to vertices
        bodyData.points = vertices;

        var object = new SimuloObject(this, body);
        if (bodyData.id != null) {
            this.bodies[bodyData.id] = object;
        }
        return object;
    }
    addAxle(anchorA: [x: number, y: number], anchorB: [x: number, y: number], objectA: SimuloObject, objectB: SimuloObject) {
        const jd = new box2D.b2RevoluteJointDef();
        jd.set_bodyA(objectA.body);
        jd.set_bodyB(objectB.body);
        jd.set_localAnchorA(new box2D.b2Vec2(anchorA[0], anchorA[1]));
        jd.set_localAnchorB(new box2D.b2Vec2(anchorB[0], anchorB[1]));
        // no collide
        jd.set_collideConnected(false);
        this.world.CreateJoint(jd);
    }
    getLocalPoint(body: SimuloObject, point: [x: number, y: number]) {
        var p = body.body.GetLocalPoint(new box2D.b2Vec2(point[0], point[1]));
        return [p.get_x(), p.get_y()];
    }
    addSpring(anchorA: [x: number, y: number], anchorB: [x: number, y: number], objectA: SimuloObject, objectB: SimuloObject, stiffness: number, length: number, damping: number, image?: string) {
        // distance joint
        const jd = new box2D.b2DistanceJointDef();
        jd.set_bodyA(objectA.body);
        jd.set_bodyB(objectB.body);
        jd.set_localAnchorA(new box2D.b2Vec2(anchorA[0], anchorA[1]));
        jd.set_localAnchorB(new box2D.b2Vec2(anchorB[0], anchorB[1]));
        jd.set_collideConnected(true);
        jd.set_stiffness(stiffness);
        jd.set_length(length);
        jd.set_damping(damping);
        var joint = this.world.CreateJoint(jd);
        var jointData = joint.GetUserData() as SimuloJointData;
        if (image) {
            jointData.image = image;
        }
        else {
            jointData.image = null;
        }
    }
    addPerson(offset: [x: number, y: number]) {
        var personBodyPoints: [x: number, y: number][] = [
            [0.0, 0.64],
            [0.712, 0.499],
            [1.19, 0.172],
            [1.504, -0.27],
            [1.67, -0.779],
            [1.678, -3.272],
            [1.643, -3.469],
            [1.451, -3.597],
            [-1.416, -3.589],
            [-1.582, -3.51],
            [-1.654, -3.35],
            [-1.67, -0.779],
            [-1.497, -0.305],
            [-1.231, 0.126],
            [-0.65, 0.517],
            [-0.328, 0.614],
        ];

        const personScale = 0.4;

        personBodyPoints = personBodyPoints.map(function (point) {
            return [point[0] * personScale, point[1] * personScale];
        });

        var body = this.addPolygon(personBodyPoints as [x: number, y: number][], [offset[0], offset[1]], 0, 1, 0.5, 0, {
            color: "#00000000",
            border: null,
            border_width: null,
            border_scale_with_zoom: false,
            image: "/assets/textures/body.png",
            sound: "ground.wav"
        } as SimuloObjectData, false);

        var head = this.addCircle(1.71 * personScale, [offset[0], offset[1] + (1.88 * personScale)], 0, 1, 0.5, 0, {
            color: "#99e077",
            border: null,
            border_width: null,
            border_scale_with_zoom: false,
            circle_cake: false,
            sound: "ground.wav"
        } as SimuloObjectData, false);

        var axle = this.addAxle([0, (0.32 * personScale)], [0, ((1.88 - 0.32) * personScale)], body, head);
        // arguments (in order): anchorA, anchorB, bodyA, bodyB

        /*if (Math.random() < 0.5) {
            var spring = this.addSpring([0, (3.26 * personScale)], [0, ((1.88 - 3.26) * personScale)], body, head, 20 * personScale, 0.005 * personScale, 0);
        }
        else*/ {
            // add image (last param) as /assets/textures/spring.png
            var spring = this.addSpring([0, (3.26 * personScale)], [0, ((1.88 - 3.26) * personScale)], body, head, 20 * personScale, 0.005 * personScale, 0, "/assets/textures/spring.png");
        }
    }
    addCircle(
        radius: number,
        position: [x: number, y: number],
        rotation: number,
        density: number,
        friction: number,
        restitution: number,
        // string key to any value
        data: { [key: string]: any },
        isStatic: boolean = false
    ) {
        var shape = new box2D.b2CircleShape();
        shape.set_m_radius(radius);
        var bd = new box2D.b2BodyDef();
        bd.set_type(isStatic ? box2D.b2_staticBody : box2D.b2_dynamicBody);
        bd.set_position(new box2D.b2Vec2(position[0], position[1]));
        bd.set_angle(rotation);
        var body = this.world.CreateBody(bd);
        var fd = new box2D.b2FixtureDef();
        fd.set_shape(shape);
        fd.set_density(density);
        fd.set_friction(friction);
        fd.set_restitution(restitution);
        body.CreateFixture(fd);
        var bodyData = body.GetUserData() as SimuloObjectData;
        // for each key in data, set bodyData[key] to data[key]
        for (var key in data) {
            if (key == 'id') {
                bodyData.id = data[key];
            }
            else if (key == 'sound') {
                bodyData.sound = data[key];
            }
            else if (key == 'color') {
                bodyData.color = data[key];
            }
            else if (key == 'border') {
                bodyData.border = data[key];
            }
            else if (key == 'border_width') {
                bodyData.border_width = data[key];
            }
            else if (key == 'border_scale_with_zoom') {
                bodyData.border_scale_with_zoom = data[key];
            }
            else if (key == 'circle_cake') {
                bodyData.circle_cake = data[key];
            }
            else if (key == 'image') {
                bodyData.image = data[key];
            }
        }

        var object = new SimuloObject(this, body);
        if (bodyData.id != null) {
            this.bodies[bodyData.id] = object;
        }
        return object;
    }
    deleteObjects: (Box2D.b2Body | Box2D.b2Joint | Box2D.b2Fixture)[] = [];
    destroy(object: SimuloObject | SimuloJoint) {
        if (object instanceof SimuloObject) {
            this.deleteObjects.push(object.body);
        }
        else if (object instanceof SimuloJoint) {
            this.deleteObjects.push(object.joint);
        }
    }

    // distancejoints and mousejoints are considered springs.
    addMouseSpring(
        object: SimuloObject, // this is bodyb
        point: [x: number, y: number],
        stiffness: number,
        damping: number,
        maxForce: number
    ) {
        var mouseJointDef = new box2D.b2MouseJointDef();
        mouseJointDef.set_bodyA(this.ground);
        mouseJointDef.set_bodyB(object.body);
        mouseJointDef.set_target(new box2D.b2Vec2(point[0], point[1]));
        mouseJointDef.set_maxForce(maxForce);
        mouseJointDef.set_stiffness(stiffness);
        mouseJointDef.set_damping(damping);
        var mouseJoint = this.world.CreateJoint(mouseJointDef);
        var joint = new SimuloMouseSpring(this, mouseJoint);
        return joint;
    }


    constructor(theme: SimuloTheme) { // theme is the starting theme for the room to know what to set background to for example and new objects
        const gravity = new box2D.b2Vec2(0, 9.81);
        const world = new box2D.b2World(gravity);
        world.SetContinuousPhysics(true);

        const bd_ground = new box2D.b2BodyDef();
        const ground = world.CreateBody(bd_ground);
        this.ground = ground;

        this.world = world;
        this.theme = theme;

        var contactListener = new box2D.JSContactListener();
        contactListener.BeginContact = (contactPtr: number) => {
            let contact = box2D.wrapPointer(contactPtr, box2D.b2Contact);
            // get object mass if non-zero
            var mass1 = contact.GetFixtureA().GetBody().GetMass();
            var mass2 = contact.GetFixtureB().GetBody().GetMass();
            // get userdata as SimuloObjectData
            var data1 = contact.GetFixtureA().GetBody().GetUserData() as SimuloObjectData;
            var data2 = contact.GetFixtureB().GetBody().GetUserData() as SimuloObjectData;
            // if static and mass 0, set to 10
            if (
                mass1 == 0 &&
                contact.GetFixtureA().GetBody().GetType() == box2D.b2_staticBody
            ) {
                mass1 = 10;
            }
            if (
                mass2 == 0 &&
                contact.GetFixtureB().GetBody().GetType() == box2D.b2_staticBody
            ) {
                mass2 = 10;
            }
            var sound1 =
                data1.sound || this.defaultImpact;
            var sound2 =
                data2.sound || this.defaultImpact;

            // we want to play a collision noise
            // first, calculate volume based on how hard they hit
            var volume =
                Math.max(
                    contact.GetFixtureA().GetBody().GetLinearVelocity().Length(),
                    contact.GetFixtureB().GetBody().GetLinearVelocity().Length()
                ) / 100;
            this.emit("collision", {
                sound: sound1,
                volume: Math.max(Math.min(Math.abs(volume * mass2), 1), 0),
                pitch: randomRange(0.5, 1.5),
            });
            this.emit("collision", {
                sound: sound2,
                volume: Math.max(Math.min(Math.abs(volume * mass1), 1), 0),
                pitch: randomRange(0.5, 1.5),
            });
        };
        contactListener.EndContact = function (contactPtr: number) {
            let contact = box2D.wrapPointer(contactPtr, box2D.b2Contact);
            // nothing for now, soon it will call JS scripts that listen for collisions
        };
        contactListener.PreSolve = function (contactPtr: number, oldManifoldPtr: number) {
            let contact = box2D.wrapPointer(contactPtr, box2D.b2Contact);
            // nothing for now, soon it will call JS scripts that listen for collisions
        };
        contactListener.PostSolve = function (contactPtr: number, impulsePtr: number) {
            let contact = box2D.wrapPointer(contactPtr, box2D.b2Contact);
            // nothing for now, soon it will call JS scripts that listen for collisions
        };

        world.SetContactListener(contactListener);

        // TODO: make the following floor not be created here, but instead by ServerController
        // huge floor under ground of 500 units high, and 10000 units wide
        const bd_floor = new box2D.b2BodyDef();
        bd_floor.set_type(box2D.b2_staticBody);
        bd_floor.set_position(new box2D.b2Vec2(0, 25030));
        const floor = world.CreateBody(bd_floor);
        const floorShape = new box2D.b2PolygonShape();
        floorShape.SetAsBox(50000, 25000);
        floor.CreateFixture(floorShape, 0);
        var floorData = floor.GetUserData() as SimuloObjectData;
        floorData.color = theme.ground.color;
        floorData.border = theme.ground.border;
        floorData.border_width = theme.ground.border_width;
        floorData.border_scale_with_zoom =
            theme.ground.border_scale_with_zoom;
        floorData.sound = "ground.wav";

        this.addPerson([0, 0]);
    }

    getObjectsAtPoint(point: [x: number, y: number]) {
        var pos = new box2D.b2Vec2(point[0], point[1]);
        var selectedBodies: Box2D.b2Body[] = [];
        var node = this.world.GetBodyList();
        while (box2D.getPointer(node)) {
            var b = node;
            node = node.GetNext();

            var position = b.GetPosition();

            var fl = b.GetFixtureList();
            if (!fl) {
                continue;
            }
            while (box2D.getPointer(fl)) {
                var shape = fl.GetShape();
                var shapeType = shape.GetType();
                if (shapeType == box2D.b2Shape.e_circle) {
                    // test point in fixture (fl.TestPoint)
                    if (fl.TestPoint(pos)) {
                        // we found a body
                        selectedBodies.push(b);
                        break;
                    }
                } else if (shapeType == box2D.b2Shape.e_polygon) {
                    // test point in fixture (fl.TestPoint)
                    if (fl.TestPoint(pos)) {
                        // we found a body
                        selectedBodies.push(b);
                        break;
                    }
                }
                fl = fl.GetNext();
            }
        }
        return selectedBodies.map((b) => {
            return new SimuloObject(this, b);
        });
    }
    step(delta: number, velocityIterations: number, positionIterations: number) {
        this.world.Step(delta, velocityIterations, positionIterations);
        this.deleteObjects.forEach((obj) => {
            if (obj instanceof box2D.b2Body) {
                this.world.DestroyBody(obj);
            }
            if (obj instanceof box2D.b2Joint) {
                this.world.DestroyJoint(obj);
            }
            if (obj instanceof box2D.b2Fixture) {
                obj.GetBody().DestroyFixture(obj);
            }
        });
        this.deleteObjects = [];

        // get body
        var node: Box2D.b2Body = this.world.GetBodyList();

        var shapes: SimuloShape[] = [];

        while (box2D.getPointer(node)) {
            var b = node;
            node = node.GetNext();
            var bodyData = b.GetUserData() as SimuloObjectData;
            var color = bodyData.color;

            var position = b.GetPosition();
            //console.log("position: " + position.x + ", " + position.y);
            b.GetType();

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
            while (box2D.getPointer(fl)) {
                var shape = fl.GetShape();
                var shapeType = shape.GetType();
                if (shapeType == box2D.b2Shape.e_circle) {
                    const circleShape = box2D.castObject(shape, box2D.b2CircleShape);
                    //console.log("circle of radius " + circleShape.get_m_radius() + " at " + position.x + ", " + position.y);
                    shapes.push({
                        x: position.x,
                        y: position.y,
                        type: "circle",
                        radius: circleShape.get_m_radius(),
                        angle: b.GetAngle(),
                        color: color,
                        border: bodyData.border,
                        border_width: bodyData.border_width,
                        border_scale_with_zoom: bodyData.border_scale_with_zoom,
                        circle_cake: bodyData.circle_cake,
                        image: bodyData.image,
                    } as SimuloCircle);
                } else if (shapeType == box2D.b2Shape.e_polygon) {
                    const polygonShape = box2D.castObject(shape, box2D.b2PolygonShape);
                    var vertexCount = polygonShape.get_m_count();
                    var verts: { x: number, y: number }[] = [];
                    // iterate over vertices
                    for (let i = 0; i < vertexCount; i++) {
                        const vertex = polygonShape.get_m_vertices(i);
                        //console.log("vertex " + i + " at " + vertex.x + ", " + vertex.y);
                        verts.push({
                            x: vertex.x,
                            y: vertex.y,
                        });
                    }
                    if (bodyData.points != null) {
                        shapes.push({
                            x: position.x,
                            y: position.y,
                            type: "polygon",
                            vertices: verts,
                            angle: b.GetAngle(),
                            color: color,
                            border: bodyData.border,
                            border_width: bodyData.border_width,
                            border_scale_with_zoom: bodyData.border_scale_with_zoom,
                            points: bodyData.points.map((p) => {
                                return { x: p[0], y: p[1] };
                            }),
                            image: bodyData.image,
                        } as SimuloPolygon);
                    }
                    else {
                        shapes.push({
                            x: position.x,
                            y: position.y,
                            type: "polygon",
                            vertices: verts,
                            angle: b.GetAngle(),
                            color: color,
                            border: bodyData.border,
                            border_width: bodyData.border_width,
                            border_scale_with_zoom: bodyData.border_scale_with_zoom,
                            image: bodyData.image,
                        } as SimuloPolygon);
                    }
                } else if (shapeType == box2D.b2Shape.e_edge) {
                    const edgeShape = box2D.castObject(shape, box2D.b2EdgeShape);
                    var vertices = [
                        {
                            x: edgeShape.get_m_vertex1().get_x(),
                            y: edgeShape.get_m_vertex1().get_y(),
                        },
                        {
                            x: edgeShape.get_m_vertex2().get_x(),
                            y: edgeShape.get_m_vertex2().get_y(),
                        },
                    ];
                    //console.log("edge: ");
                    //console.log(vertices);
                    shapes.push({
                        x: position.x,
                        y: position.y,
                        type: "edge",
                        vertices: vertices,
                        angle: b.GetAngle(),
                        color: color,
                        border: bodyData.border,
                        border_width: bodyData.border_width,
                        border_scale_with_zoom: bodyData.border_scale_with_zoom,
                        image: bodyData.image,
                    } as SimuloEdge);
                } else {
                    //console.log("unknown shape type");
                }
                fl = fl.GetNext();
            }
        }

        /*var springsFormatted: { p1: number[], p2: number[] }[] = [];
        springs.forEach((spring) => {
            springsFormatted.push({
                p1: [spring.GetTarget().get_x(), spring.GetTarget().get_y()],
                p2: [spring.GetAnchorB().get_x(), spring.GetAnchorB().get_y()],
            });
        });*/

        var joint = this.world.GetJointList();
        var springs: { p1: number[], p2: number[], image: string | null }[] = []; // distance joints are considered springs
        var mouseSprings: { p1: number[], p2: number[] }[] = [];
        while (box2D.getPointer(joint)) {
            var j = joint;
            joint = joint.GetNext();
            if (j.GetType() == box2D.e_distanceJoint) {
                var d = box2D.castObject(j, box2D.b2DistanceJoint);
                var dData = d.GetUserData() as SimuloJointData;
                if (dData.image != null) {
                    springs.push({
                        p1: [d.GetAnchorA().get_x(), d.GetAnchorA().get_y()],
                        p2: [d.GetAnchorB().get_x(), d.GetAnchorB().get_y()],
                        image: dData.image
                    });
                }
                else {
                    springs.push({
                        p1: [d.GetAnchorA().get_x(), d.GetAnchorA().get_y()],
                        p2: [d.GetAnchorB().get_x(), d.GetAnchorB().get_y()],
                        image: null
                    });
                }
            }
            else if (j.GetType() == box2D.e_mouseJoint) {
                var m = box2D.castObject(j, box2D.b2MouseJoint);
                mouseSprings.push({
                    p1: [m.GetAnchorA().get_x(), m.GetAnchorA().get_y()],
                    p2: [m.GetAnchorB().get_x(), m.GetAnchorB().get_y()],
                });
            }
        }

        var thisStep: SimuloStep = {
            shapes: shapes,
            background: this.theme.background,
            springs: springs,
            mouseSprings: mouseSprings
        };

        return thisStep;
    }
    getAllSprings() {
        var joint: Box2D.b2Joint = this.world.GetJointList();
        var springs: { p1: number[], p2: number[], image: string | null }[] = []; // distance joints are considered springs
        var mouseSprings: { p1: number[], p2: number[] }[] = [];
        while (box2D.getPointer(joint)) {
            var j = joint;
            joint = joint.GetNext();
            if (j.GetType() == box2D.e_distanceJoint) {
                var d = box2D.castObject(j, box2D.b2DistanceJoint);
                var dData = d.GetUserData() as SimuloJointData;
                if (dData.image != null) {
                    console.log("PHYSICSSERVER SPRING: image");
                    springs.push({
                        p1: [d.GetAnchorA().get_x(), d.GetAnchorA().get_y()],
                        p2: [d.GetAnchorB().get_x(), d.GetAnchorB().get_y()],
                        image: dData.image
                    });
                }
                else {
                    console.log("PHYSICSSERVER SPRING: no image");
                    springs.push({
                        p1: [d.GetAnchorA().get_x(), d.GetAnchorA().get_y()],
                        p2: [d.GetAnchorB().get_x(), d.GetAnchorB().get_y()],
                        image: null
                    });
                }
            }
            else if (j.GetType() == box2D.e_mouseJoint) {
                var m = box2D.castObject(j, box2D.b2MouseJoint);
                mouseSprings.push({
                    p1: [m.GetAnchorA().get_x(), m.GetAnchorA().get_y()],
                    p2: [m.GetAnchorB().get_x(), m.GetAnchorB().get_y()],
                });
            }
        }
        return { springs: springs, mouseSprings: mouseSprings };
    }
}

export default SimuloPhysicsServer;
export { SimuloPhysicsServer, SimuloObject, SimuloJoint, SimuloMouseSpring };