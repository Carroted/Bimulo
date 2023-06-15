// import Box2DFactory from "box2d-wasm";
// check if node or browser
var isNode = false;
try {
    if (process) {
        isNode = true;
    }
}
catch (e) {
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
import earcut from 'https://cdn.jsdelivr.net/npm/earcut@2.2.4/+esm';
const box2D = await Box2DFactory();
import { randomRange } from "./utils.js";
// One PhysicsServer per world/room should be used. This makes things simple and secure since events like `physicsServer.on("collision", ...)` will only be called for collisions in that room.
function createPolygonShape(tuples) {
    var shape = new box2D.b2PolygonShape();
    var [vecArrFirstElem, destroyVecArr] = box2D.tuplesToVec2Array(tuples);
    shape.Set(vecArrFirstElem, tuples.length);
    destroyVecArr();
    return shape;
}
class SimuloObject {
    constructor(physicsServer, body) {
        this._body = body;
        this._physicsServer = physicsServer;
    }
    wakeUp() {
        this._body.SetAwake(true);
    }
    get id() {
        let objectData = this._body.GetUserData();
        return objectData.id;
    }
    get position() {
        return { x: this._body.GetPosition().get_x(), y: this._body.GetPosition().get_y() };
    }
    set position({ x, y }) {
        this._body.SetTransform(new box2D.b2Vec2(x, y), this._body.GetAngle());
    }
    get velocity() {
        return { x: this._body.GetLinearVelocity().get_x(), y: this._body.GetLinearVelocity().get_y() };
    }
    set velocity({ x, y }) {
        this._body.SetLinearVelocity(new box2D.b2Vec2(x, y));
    }
    get rotation() {
        return this._body.GetAngle();
    }
    set rotation(angle) {
        this._body.SetTransform(this._body.GetPosition(), angle);
    }
    get density() {
        return this._body.GetFixtureList().GetDensity();
    }
    set density(density) {
        this._body.GetFixtureList().SetDensity(density);
        this._body.ResetMassData();
    }
    get friction() {
        return this._body.GetFixtureList().GetFriction();
    }
    set friction(friction) {
        this._body.GetFixtureList().SetFriction(friction);
    }
    get restitution() {
        return this._body.GetFixtureList().GetRestitution();
    }
    set restitution(restitution) {
        this._body.GetFixtureList().SetRestitution(restitution);
    }
    get border() {
        let objectData = this._body.GetUserData();
        return objectData.border;
    }
    set border(border) {
        let objectData = this._body.GetUserData();
        objectData.border = border;
    }
    get borderWidth() {
        let objectData = this._body.GetUserData();
        return objectData.borderWidth;
    }
    set borderWidth(borderWidth) {
        let objectData = this._body.GetUserData();
        objectData.borderWidth = borderWidth;
    }
    get borderScaleWithZoom() {
        let objectData = this._body.GetUserData();
        return objectData.borderScaleWithZoom;
    }
    set borderScaleWithZoom(borderScaleWithZoom) {
        let objectData = this._body.GetUserData();
        objectData.borderScaleWithZoom = borderScaleWithZoom;
    }
    get circleCake() {
        let objectData = this._body.GetUserData();
        // if undefined return false
        if (objectData.circleCake == undefined) {
            return false;
        }
        return objectData.circleCake;
    }
    set circleCake(circleCake) {
        let objectData = this._body.GetUserData();
        objectData.circleCake = circleCake;
    }
    get image() {
        let objectData = this._body.GetUserData();
        return objectData.image;
    }
    set image(image) {
        let objectData = this._body.GetUserData();
        objectData.image = image;
    }
    get collision_sound() {
        let objectData = this._body.GetUserData();
        return objectData.sound;
    }
    set collision_sound(sound) {
        let objectData = this._body.GetUserData();
        objectData.sound = sound;
    }
    get color() {
        let objectData = this._body.GetUserData();
        return objectData.color;
    }
    set color(color) {
        let objectData = this._body.GetUserData();
        objectData.color = color;
    }
    get isStatic() {
        return this._body.GetType() == box2D.b2_staticBody;
    }
    set isStatic(isStatic) {
        if (isStatic) {
            this._body.SetType(box2D.b2_staticBody);
        }
        else {
            this._body.SetType(box2D.b2_dynamicBody);
        }
    }
    get mass() {
        return this._body.GetMass();
    }
    addForce([x, y]) {
        this._body.ApplyForce(new box2D.b2Vec2(x, y), this._body.GetPosition(), true);
    }
    addImpulse([x, y]) {
        this._body.ApplyLinearImpulse(new box2D.b2Vec2(x, y), this._body.GetPosition(), true);
    }
    addTorque(torque) {
        this._body.ApplyTorque(torque, true);
    }
    addAngularImpulse(impulse) {
        this._body.ApplyAngularImpulse(impulse, true);
    }
    destroy() {
        this._body.GetWorld().DestroyBody(this._body);
        // No longer real
    }
}
function createSandboxedInstance(targetClass) {
    const handler = {
        get(target, prop) {
            if (typeof prop === "string" && prop.startsWith("_")) {
                throw new Error(`Property "${prop}" is not allowed in the sandboxed environment.`);
            }
            const property = target[prop];
            if (typeof property === "function") {
                return function (...args) {
                    return property.apply(target, args);
                };
            }
            else {
                return property;
            }
        },
        set(target, prop, value) {
            const descriptor = Object.getOwnPropertyDescriptor(target, prop);
            if (typeof prop === "string" && prop.startsWith("_")) {
                throw new Error(`Property "${prop}" is not allowed in the sandboxed environment.`);
            }
            if (descriptor?.writable === false) {
                throw new Error(`Property "${prop}" is readonly and cannot be modified in the sandboxed environment.`);
            }
            if (descriptor?.enumerable === false) {
                return false;
            }
            target[prop] = value;
            return true;
        },
        has(target, prop) {
            const property = target[prop];
            if (typeof property === "function") {
                return true;
            }
            else {
                return false;
            }
        },
        ownKeys(target) {
            return Object.getOwnPropertyNames(target);
        }
    };
    return new Proxy(targetClass, handler);
}
class SimuloJoint {
    constructor(physicsServer, joint) {
        this._joint = joint;
        this._physicsServer = physicsServer;
    }
    get id() {
        let jointData = this._joint.GetUserData();
        return jointData.id;
    }
    destroy() {
        this._joint.GetBodyA().GetWorld().DestroyJoint(this._joint);
    }
}
// extension of SimuloJoint (SimuloMouseSpring):
class SimuloMouseSpring extends SimuloJoint {
    constructor(physicsServer, joint) {
        // cast with box2d
        var mouseJoint = box2D.castObject(joint, box2D.b2MouseJoint);
        super(physicsServer, joint); // super is used to call functions of the parent class
        this._mouseJoint = mouseJoint;
    }
    get damping() {
        return this._mouseJoint.GetDamping();
    }
    set damping(damping) {
        this._mouseJoint.SetDamping(damping);
    }
    get stiffness() {
        return this._mouseJoint.GetStiffness();
    }
    set stiffness(stiffness) {
        this._mouseJoint.SetStiffness(stiffness);
    }
    get target() {
        let target = this._mouseJoint.GetTarget();
        return [target.get_x(), target.get_y()];
    }
    set target([x, y]) {
        this._mouseJoint.SetTarget(new box2D.b2Vec2(x, y));
    }
    get maxForce() {
        return this._mouseJoint.GetMaxForce();
    }
    set maxForce(maxForce) {
        this._mouseJoint.SetMaxForce(maxForce);
    }
    get anchor() {
        let anchor = this._mouseJoint.GetAnchorB();
        return [anchor.get_x(), anchor.get_y()];
    }
    get image() {
        let jointData = this._mouseJoint.GetUserData();
        return jointData.image;
    }
    set image(image) {
        let jointData = this._mouseJoint.GetUserData();
        jointData.image = image;
    }
    get lineColor() {
        let jointData = this._mouseJoint.GetUserData();
        if (jointData.line) {
            return jointData.line.color;
        }
        else {
            return null;
        }
    }
    set lineColor(color) {
        let jointData = this._mouseJoint.GetUserData();
        if (jointData.line) {
            if (color == null) {
                color = "#000000";
            }
            jointData.line.color = color;
        }
    }
    get width() {
        let jointData = this._mouseJoint.GetUserData();
        return jointData.width;
    }
    set width(width) {
        let jointData = this._mouseJoint.GetUserData();
        jointData.width = width;
    }
    get line() {
        let jointData = this._mouseJoint.GetUserData();
        return jointData.line;
    }
    set line(line) {
        let jointData = this._mouseJoint.GetUserData();
        jointData.line = line;
    }
    get lineScaleWithZoom() {
        let jointData = this._mouseJoint.GetUserData();
        if (jointData.line) {
            return jointData.line.scale_with_zoom;
        }
        else {
            return false;
        }
    }
    set lineScaleWithZoom(scale_with_zoom) {
        let jointData = this._mouseJoint.GetUserData();
        if (jointData.line) {
            jointData.line.scale_with_zoom = scale_with_zoom;
        }
    }
}
function rotateVerts(vertices, angle) {
    // rotate the vertices at the origin (0,0)
    var rotatedVertices = [];
    for (var i = 0; i < vertices.length; i++) {
        // use math to rotate the vertices
        var rotatedX = vertices[i].x * Math.cos(angle) - vertices[i].y * Math.sin(angle);
        var rotatedY = vertices[i].x * Math.sin(angle) + vertices[i].y * Math.cos(angle);
        // add the rotated vertices to the array
        rotatedVertices.push({ x: rotatedX, y: rotatedY });
    }
    return rotatedVertices;
}
function translateVerts(vertices, xOffset, yOffset) {
    return vertices.map((vertex) => {
        return { x: vertex.x + xOffset, y: vertex.y + yOffset };
    });
}
class SimuloPhysicsServer {
    constructor(theme) {
        this.defaultImpact = "impact.wav";
        this.listeners = {};
        // object. key is ID, value is SimuloObject
        this.bodies = {};
        this.currentID = 0; // used to assign IDs to objects
        this.deleteObjects = [];
        const gravity = new box2D.b2Vec2(0, 9.81);
        const world = new box2D.b2World(gravity);
        world.SetContinuousPhysics(true);
        const bd_ground = new box2D.b2BodyDef();
        const ground = world.CreateBody(bd_ground);
        var groundData = ground.GetUserData();
        groundData.id = this.currentID++;
        this.ground = ground;
        this.world = world;
        this.theme = theme;
        var contactListener = new box2D.JSContactListener();
        contactListener.BeginContact = (contactPtr) => {
            let contact = box2D.wrapPointer(contactPtr, box2D.b2Contact);
            // get object mass if non-zero
            var mass1 = contact.GetFixtureA().GetBody().GetMass();
            var mass2 = contact.GetFixtureB().GetBody().GetMass();
            // get userdata as SimuloObjectData
            var data1 = contact.GetFixtureA().GetBody().GetUserData();
            var data2 = contact.GetFixtureB().GetBody().GetUserData();
            // if static and mass 0, set to 10
            if (mass1 == 0 &&
                contact.GetFixtureA().GetBody().GetType() == box2D.b2_staticBody) {
                mass1 = 10;
            }
            if (mass2 == 0 &&
                contact.GetFixtureB().GetBody().GetType() == box2D.b2_staticBody) {
                mass2 = 10;
            }
            var sound1 = data1.sound || this.defaultImpact;
            var sound2 = data2.sound || this.defaultImpact;
            // we want to play a collision noise
            // first, calculate volume based on how hard they hit
            var volume = Math.max(contact.GetFixtureA().GetBody().GetLinearVelocity().Length(), contact.GetFixtureB().GetBody().GetLinearVelocity().Length()) / 100;
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
        contactListener.EndContact = function (contactPtr) {
            let contact = box2D.wrapPointer(contactPtr, box2D.b2Contact);
            // nothing for now, soon it will call JS scripts that listen for collisions
        };
        contactListener.PreSolve = function (contactPtr, oldManifoldPtr) {
            let contact = box2D.wrapPointer(contactPtr, box2D.b2Contact);
            // nothing for now, soon it will call JS scripts that listen for collisions
        };
        contactListener.PostSolve = function (contactPtr, impulsePtr) {
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
        var floorData = floor.GetUserData();
        floorData.color = theme.ground.color;
        floorData.border = theme.ground.border;
        floorData.borderWidth = theme.ground.borderWidth;
        floorData.borderScaleWithZoom =
            theme.ground.borderScaleWithZoom;
        floorData.sound = "ground.wav";
        floorData.id = this.currentID++;
        this.addPerson([0, 0]);
    }
    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach((listener) => {
                listener(data);
            });
        }
    }
    on(event, listener) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(listener);
    }
    off(event, listener) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter((l) => l != listener);
        }
    }
    addPolygon(vertices, position, rotation, density, friction, restitution, 
    // string key to any value
    data, isStatic = false) {
        //var shape = createPolygonShape(vertices);
        // earcut triangulation
        var triangles = earcut(vertices.flat());
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
        var bodyData = body.GetUserData();
        // for each key in data, set bodyData[key] to data[key]
        /* here are all the keys:
            id: number | null;
        sound: string | null;
        color: string;
        border: string | null;
        borderWidth: number | null;
        borderScaleWithZoom: boolean;
        circleCake ?: boolean;
        image: string | null;
        */
        bodyData.id = this.currentID++;
        for (var key in data) {
            if (key == 'sound') {
                bodyData.sound = data[key];
            }
            else if (key == 'color') {
                bodyData.color = data[key];
            }
            else if (key == 'border') {
                bodyData.border = data[key];
            }
            else if (key == 'borderWidth') {
                bodyData.borderWidth = data[key];
            }
            else if (key == 'borderScaleWithZoom') {
                bodyData.borderScaleWithZoom = data[key];
            }
            else if (key == 'circleCake') {
                bodyData.circleCake = data[key];
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
    addAxle(anchorA, anchorB, objectA, objectB) {
        const jd = new box2D.b2RevoluteJointDef();
        jd.set_bodyA(objectA._body);
        jd.set_bodyB(objectB._body);
        jd.set_localAnchorA(new box2D.b2Vec2(anchorA[0], anchorA[1]));
        jd.set_localAnchorB(new box2D.b2Vec2(anchorB[0], anchorB[1]));
        // no collide
        jd.set_collideConnected(false);
        this.world.CreateJoint(jd);
    }
    getProxy(body) {
        return createSandboxedInstance(body);
    }
    getLocalPoint(body, point) {
        var p = body._body.GetLocalPoint(new box2D.b2Vec2(point[0], point[1]));
        return [p.get_x(), p.get_y()];
    }
    addSpring(anchorA, anchorB, objectA, objectB, stiffness, length, damping, width, image, line) {
        // distance joint
        const jd = new box2D.b2DistanceJointDef();
        jd.set_bodyA(objectA._body);
        jd.set_bodyB(objectB._body);
        jd.set_localAnchorA(new box2D.b2Vec2(anchorA[0], anchorA[1]));
        jd.set_localAnchorB(new box2D.b2Vec2(anchorB[0], anchorB[1]));
        jd.set_collideConnected(true);
        jd.set_stiffness(stiffness);
        jd.set_length(length);
        jd.set_damping(damping);
        var joint = this.world.CreateJoint(jd);
        var jointData = joint.GetUserData();
        jointData.width = width;
        if (image) {
            jointData.image = image;
        }
        else {
            jointData.image = null;
        }
        if (line) {
            jointData.line = line;
        }
        else {
            jointData.line = null;
        }
        jointData.id = this.currentID++;
    }
    addPerson(offset) {
        var personBodyPoints = [
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
        var body = this.addPolygon(personBodyPoints, [offset[0], offset[1]], 0, 1, 0.5, 0, {
            color: "#00000000",
            border: null,
            borderWidth: null,
            borderScaleWithZoom: false,
            image: "/assets/textures/body.png",
            sound: "ground.wav",
        }, false);
        var head = this.addCircle(1.71 * personScale, [offset[0], offset[1] + (1.88 * personScale)], 0, 1, 0.5, 0, {
            color: "#99e077",
            border: null,
            borderWidth: null,
            borderScaleWithZoom: false,
            circleCake: false,
            sound: "ground.wav"
        }, false);
        var axle = this.addAxle([0, (0.32 * personScale)], [0, ((1.88 - 0.32) * personScale)], body, head);
        // arguments (in order): anchorA, anchorB, bodyA, bodyB
        /*if (Math.random() < 0.5) {
            var spring = this.addSpring([0, (3.26 * personScale)], [0, ((1.88 - 3.26) * personScale)], body, head, 20 * personScale, 0.005 * personScale, 0);
        }
        else*/ {
            // add image (last param) as /assets/textures/spring.png
            var spring = this.addSpring([0, (3.26 * personScale)], [0, ((1.88 - 3.26) * personScale)], body, head, 20 * personScale, 0.005 * personScale, 0, 0 /*, "/assets/textures/spring.png"*/);
        }
    }
    addCircle(radius, position, rotation, density, friction, restitution, 
    // string key to any value
    data, isStatic = false) {
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
        var bodyData = body.GetUserData();
        bodyData.id = this.currentID++;
        // for each key in data, set bodyData[key] to data[key]
        for (var key in data) {
            if (key == 'sound') {
                bodyData.sound = data[key];
            }
            else if (key == 'color') {
                bodyData.color = data[key];
            }
            else if (key == 'border') {
                bodyData.border = data[key];
            }
            else if (key == 'borderWidth') {
                bodyData.borderWidth = data[key];
            }
            else if (key == 'borderScaleWithZoom') {
                bodyData.borderScaleWithZoom = data[key];
            }
            else if (key == 'circleCake') {
                bodyData.circleCake = data[key];
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
    destroy(object) {
        if (object instanceof SimuloObject) {
            this.deleteObjects.push(object._body);
        }
        else if (object instanceof SimuloJoint) {
            this.deleteObjects.push(object._joint);
        }
    }
    // distancejoints and mousejoints are considered springs.
    addMouseSpring(object, // this is bodyb
    point, stiffness, damping, maxForce, width) {
        var mouseJointDef = new box2D.b2MouseJointDef();
        mouseJointDef.set_bodyA(this.ground);
        mouseJointDef.set_bodyB(object._body);
        mouseJointDef.set_target(new box2D.b2Vec2(point[0], point[1]));
        mouseJointDef.set_maxForce(maxForce);
        mouseJointDef.set_stiffness(stiffness);
        mouseJointDef.set_damping(damping);
        var mouseJoint = this.world.CreateJoint(mouseJointDef);
        // add jointdata
        var jointData = mouseJoint.GetUserData();
        jointData.id = this.currentID++;
        jointData.line = {
            color: "#ffffff",
            scale_with_zoom: true
        };
        jointData.width = width;
        jointData.image = null;
        var joint = new SimuloMouseSpring(this, mouseJoint);
        return joint;
    }
    getObjectsAtPoint(point) {
        var pos = new box2D.b2Vec2(point[0], point[1]);
        var selectedBodies = [];
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
                }
                else if (shapeType == box2D.b2Shape.e_polygon) {
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
    getObjectByID(id) {
        var node = this.world.GetBodyList();
        while (box2D.getPointer(node)) {
            var b = node;
            node = node.GetNext();
            var data = b.GetUserData();
            if (data.id === id) {
                return new SimuloObject(this, b);
            }
        }
        return null;
    }
    getTouchingObjects(object) {
        var selectedBodies = [];
        var node = this.world.GetBodyList();
        while (box2D.getPointer(node)) {
            var b = node;
            node = node.GetNext();
            var data = b.GetUserData();
            if (data.id === object.id) {
                continue;
            }
            var contactList = b.GetContactList();
            while (box2D.getPointer(contactList)) {
                var contact = contactList;
                contactList = contactList.get_next();
                var contactData = contact.get_contact();
                var fixtureA = contactData.GetFixtureA();
                var fixtureB = contactData.GetFixtureB();
                if (fixtureA.GetBody() === object._body || fixtureB.GetBody() === object._body) {
                    selectedBodies.push(b);
                    break;
                }
            }
        }
        var selectedObjects = selectedBodies.map((b) => {
            return new SimuloObject(this, b);
        });
        selectedObjects = selectedObjects.filter((obj, index, self) => index === self.findIndex((t) => (t.id === obj.id)));
        return selectedObjects;
    }
    getObjectsInRect(pointA, pointB) {
        var posA = new box2D.b2Vec2(pointA[0], pointA[1]);
        var posB = new box2D.b2Vec2(pointB[0], pointB[1]);
        // reverse the points if they are backwards (posA needs to be top left, posB needs to be bottom right)
        if (posA.get_x() > posB.get_x()) {
            var temp = posA.get_x();
            posA.set_x(posB.get_x());
            posB.set_x(temp);
        }
        if (posA.get_y() > posB.get_y()) {
            var temp = posA.get_y();
            posA.set_y(posB.get_y());
            posB.set_y(temp);
        }
        // we queryaabb
        var selectedBodies = [];
        var aabb = new box2D.b2AABB();
        aabb.set_lowerBound(posA);
        aabb.set_upperBound(posB);
        /*this.world.QueryAABB((fixturePtr: number) => {
            var fixture = box2D.wrapPointer(fixturePtr, box2D.b2Fixture);
            var body = fixture.GetBody();
            selectedBodies.push(body);
            return true;
        }, aabb);*/
        var callback = new box2D.JSQueryCallback();
        callback.ReportFixture = function (fixturePtr) {
            var fixture = box2D.wrapPointer(fixturePtr, box2D.b2Fixture);
            var body = fixture.GetBody();
            selectedBodies.push(body);
            return true;
        };
        this.world.QueryAABB(callback, aabb);
        /*return selectedBodies.map((b) => {
            return new SimuloObject(this, b);
        });*/
        // now we have a rough selection. however, on rotated boxes and on polygons, the selection is not perfect. lets testpoint on the fixtures
        var selectedObjects = [];
        /*// lets use intersect function. it takes {x: number, y:number}[]s
        var rect = [
            { x: posA.get_x(), y: posA.get_y() },
            { x: posB.get_x(), y: posA.get_y() },
            { x: posB.get_x(), y: posB.get_y() },
            { x: posA.get_x(), y: posB.get_y() },
        ];*/ // the extra filter didnt work yet, the AABB is sufficient for alpha
        selectedObjects = selectedBodies.map((b) => {
            return new SimuloObject(this, b);
        });
        // remove duplicate .id
        selectedObjects = selectedObjects.filter((obj, index, self) => index === self.findIndex((t) => (t.id === obj.id)));
        return selectedObjects;
    }
    step(delta, velocityIterations, positionIterations) {
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
        var node = this.world.GetBodyList();
        var shapes = [];
        while (box2D.getPointer(node)) {
            var b = node;
            node = node.GetNext();
            var bodyData = b.GetUserData();
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
                        borderWidth: bodyData.borderWidth,
                        borderScaleWithZoom: bodyData.borderScaleWithZoom,
                        circleCake: bodyData.circleCake,
                        image: bodyData.image,
                        id: bodyData.id,
                    });
                }
                else if (shapeType == box2D.b2Shape.e_polygon) {
                    const polygonShape = box2D.castObject(shape, box2D.b2PolygonShape);
                    var vertexCount = polygonShape.get_m_count();
                    var verts = [];
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
                            borderWidth: bodyData.borderWidth,
                            borderScaleWithZoom: bodyData.borderScaleWithZoom,
                            points: bodyData.points.map((p) => {
                                return { x: p[0], y: p[1] };
                            }),
                            image: bodyData.image,
                            id: bodyData.id,
                        });
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
                            borderWidth: bodyData.borderWidth,
                            borderScaleWithZoom: bodyData.borderScaleWithZoom,
                            image: bodyData.image,
                            id: bodyData.id,
                        });
                    }
                }
                else if (shapeType == box2D.b2Shape.e_edge) {
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
                        borderWidth: bodyData.borderWidth,
                        borderScaleWithZoom: bodyData.borderScaleWithZoom,
                        image: bodyData.image,
                        id: bodyData.id,
                    });
                }
                else {
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
        var springs = []; // distance joints are considered springs
        var mouseSprings = [];
        while (box2D.getPointer(joint)) {
            var j = joint;
            joint = joint.GetNext();
            if (j.GetType() == box2D.e_distanceJoint) {
                var d = box2D.castObject(j, box2D.b2DistanceJoint);
                var dData = d.GetUserData();
                var image;
                if (dData.image != null) {
                    image = dData.image;
                }
                else {
                    image = null;
                }
                var line;
                if (dData.line != null) {
                    line = dData.line;
                }
                else {
                    line = null;
                }
                springs.push({
                    p1: [d.GetAnchorA().get_x(), d.GetAnchorA().get_y()],
                    p2: [d.GetAnchorB().get_x(), d.GetAnchorB().get_y()],
                    image: image,
                    line: line,
                    width: dData.width,
                });
            }
            else if (j.GetType() == box2D.e_mouseJoint) {
                var m = box2D.castObject(j, box2D.b2MouseJoint);
                var mData = m.GetUserData();
                var image;
                if (mData.image != null) {
                    image = mData.image;
                }
                else {
                    image = null;
                }
                var line;
                if (mData.line != null) {
                    line = mData.line;
                }
                else {
                    line = null;
                }
                mouseSprings.push({
                    p1: [m.GetAnchorA().get_x(), m.GetAnchorA().get_y()],
                    p2: [m.GetAnchorB().get_x(), m.GetAnchorB().get_y()],
                    image: image,
                    line: line,
                    width: mData.width,
                });
            }
        }
        var thisStep = {
            shapes: shapes,
            background: this.theme.background,
            springs: springs,
            mouseSprings: mouseSprings
        };
        return thisStep;
    }
    getAllSprings() {
        var joint = this.world.GetJointList();
        var springs = []; // distance joints are considered springs
        var mouseSprings = [];
        while (box2D.getPointer(joint)) {
            var j = joint;
            joint = joint.GetNext();
            if (j.GetType() == box2D.e_distanceJoint) {
                var d = box2D.castObject(j, box2D.b2DistanceJoint);
                var dData = d.GetUserData();
                var image;
                if (dData.image != null) {
                    image = dData.image;
                }
                else {
                    image = null;
                }
                var line;
                if (dData.line != null) {
                    line = dData.line;
                }
                else {
                    line = null;
                }
                springs.push({
                    p1: [d.GetAnchorA().get_x(), d.GetAnchorA().get_y()],
                    p2: [d.GetAnchorB().get_x(), d.GetAnchorB().get_y()],
                    image: image,
                    line: line,
                    width: dData.width,
                });
            }
            else if (j.GetType() == box2D.e_mouseJoint) {
                var m = box2D.castObject(j, box2D.b2MouseJoint);
                var mData = m.GetUserData();
                var image;
                if (mData.image != null) {
                    image = mData.image;
                }
                else {
                    image = null;
                }
                var line;
                if (mData.line != null) {
                    line = mData.line;
                }
                else {
                    line = null;
                }
                mouseSprings.push({
                    p1: [m.GetAnchorA().get_x(), m.GetAnchorA().get_y()],
                    p2: [m.GetAnchorB().get_x(), m.GetAnchorB().get_y()],
                    image: image,
                    line: line,
                    width: mData.width,
                });
            }
        }
        return { springs: springs, mouseSprings: mouseSprings };
    }
}
export default SimuloPhysicsServer;
export { SimuloPhysicsServer, SimuloObject, SimuloJoint, SimuloMouseSpring };
//# sourceMappingURL=SimuloPhysicsServer.js.map