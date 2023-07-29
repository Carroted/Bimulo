"use strict";
var promises = {};
var requestID = -1;
function getProperty(cachedObjectID, key) {
    return new Promise((resolve, reject) => {
        requestID++;
        promises[requestID] = { resolve, reject, type: 'get' };
        postMessage({
            type: 'get',
            key,
            requestID,
            cachedObjectID: cachedObjectID,
            args: []
        });
    });
}
function setProperty(cachedObjectID, key, value) {
    return new Promise((resolve, reject) => {
        requestID++;
        promises[requestID] = { resolve, reject, type: 'set' };
        postMessage({
            type: 'set',
            key,
            requestID,
            cachedObjectID: cachedObjectID,
            args: [],
            value
        });
    });
}
function callMethod(cachedObjectID, key, args) {
    return new Promise((resolve, reject) => {
        requestID++;
        promises[requestID] = { resolve, reject, type: 'call' };
        postMessage({
            type: 'call',
            key,
            requestID,
            cachedObjectID: cachedObjectID,
            args
        });
    });
}
/** Represents an object in the `Scene`. Since scripting runs in a Web Worker, all methods are async. Their promise is only resolved once the server confirms the action. */
class SimuloRemoteObject {
    /** Don't create a `SimuloRemoteObject` directly, use `Scene.getObjectByID` instead. */
    constructor(cacheObjectID, id) {
        this.cachedObjectID = cacheObjectID;
        this.id = id;
    }
    async getPosition() {
        return getProperty(this.cachedObjectID, 'position');
    }
    async setPosition(x, y) {
        return setProperty(this.cachedObjectID, 'position', [x, y]);
    }
    async getRotation() {
        return getProperty(this.cachedObjectID, 'rotation');
    }
    async setRotation(rotation) {
        return setProperty(this.cachedObjectID, 'rotation', rotation);
    }
    async getDensity() {
        return getProperty(this.cachedObjectID, 'density');
    }
    async setDensity(density) {
        return setProperty(this.cachedObjectID, 'density', density);
    }
    async getFriction() {
        return getProperty(this.cachedObjectID, 'friction');
    }
    async setFriction(friction) {
        return setProperty(this.cachedObjectID, 'friction', friction);
    }
    async getRestitution() {
        return getProperty(this.cachedObjectID, 'restitution');
    }
    async setRestitution(restitution) {
        return setProperty(this.cachedObjectID, 'restitution', restitution);
    }
    async getBorder() {
        return getProperty(this.cachedObjectID, 'border');
    }
    async setBorder(border) {
        return setProperty(this.cachedObjectID, 'border', border);
    }
    async getBorderWidth() {
        return getProperty(this.cachedObjectID, 'borderWidth');
    }
    async setBorderWidth(borderWidth) {
        return setProperty(this.cachedObjectID, 'borderWidth', borderWidth);
    }
    async getBorderScaleWithZoom() {
        return getProperty(this.cachedObjectID, 'borderScaleWithZoom');
    }
    async setBorderScaleWithZoom(borderScaleWithZoom) {
        return setProperty(this.cachedObjectID, 'borderScaleWithZoom', borderScaleWithZoom);
    }
    async getCircleCake() {
        return getProperty(this.cachedObjectID, 'circleCake');
    }
    async setCircleCake(circleCake) {
        return setProperty(this.cachedObjectID, 'circleCake', circleCake);
    }
    async getImage() {
        return getProperty(this.cachedObjectID, 'image');
    }
    async setImage(image) {
        return setProperty(this.cachedObjectID, 'image', image);
    }
    async getCollisionSound() {
        return getProperty(this.cachedObjectID, 'collisionSound');
    }
    async setCollisionSound(collisionSound) {
        return setProperty(this.cachedObjectID, 'collisionSound', collisionSound);
    }
    async getColor() {
        return getProperty(this.cachedObjectID, 'color');
    }
    async setColor(color) {
        return setProperty(this.cachedObjectID, 'color', color);
    }
    async getStatic() {
        return getProperty(this.cachedObjectID, 'isStatic');
    }
    async setStatic(isStatic) {
        return setProperty(this.cachedObjectID, 'isStatic', isStatic);
    }
    async getMass() {
        return getProperty(this.cachedObjectID, 'mass');
    }
    async addForce([x, y]) {
        return callMethod(this.cachedObjectID, 'addForce', [[x, y]]);
    }
    async addImpulse([x, y]) {
        return callMethod(this.cachedObjectID, 'addImpulse', [[x, y]]);
    }
    async addTorque(torque) {
        return callMethod(this.cachedObjectID, 'addTorque', [torque]);
    }
    async addAngularImpulse(impulse) {
        return callMethod(this.cachedObjectID, 'addAngularImpulse', [impulse]);
    }
    async destroy() {
        return callMethod(this.cachedObjectID, 'destroy', []);
    }
}
/** Global object that represents the active Simulo scene. */
const Scene = {
    /** Returns a `SimuloRemoteObject` that represents the object with the given ID. If no object exists, we return null, no error is thrown.
     *
     * Example usage:
     * ```ts
     * var obj = await Scene.getObjectByID(0);
     * console.log(await obj.getName()); // Probably prints "Ground"
     * ```
    */
    async getObjectByID(id) {
        var res = await new Promise((resolve, reject) => {
            requestID++;
            promises[requestID] = { resolve, reject, type: 'getObject' };
            postMessage({
                type: 'getObject',
                id,
                requestID
            });
        });
        // res is a boolean
        var exists = res.value;
        var cachedObjectID = res.cachedObjectID;
        if (exists) {
            var obj = new SimuloRemoteObject(cachedObjectID, id);
            return obj;
        }
        else {
            return null;
        }
    }
};
onmessage = async function (event) {
    if (event.data.type === 'response') {
        var promise = promises[event.data.requestID];
        if (promise) {
            if (event.data.error) {
                promise.reject(event.data.error);
            }
            else {
                if (promises[event.data.requestID].type !== 'getObject') {
                    promise.resolve(event.data.value);
                }
                else {
                    promise.resolve(event.data);
                }
            }
            delete promises[event.data.requestID];
        }
    }
    else if (event.data.type === 'log') {
        console.log(event.data.msg);
    }
    else if (event.data.type === 'startScript') {
        // new function
        eval(event.data.value);
    }
};
async function test() {
    console.log('getting obj');
    var obj = (await Scene.getObjectByID(1));
    console.log('got it');
    console.log('pos: ' + await obj.getPosition());
}
test();
//# sourceMappingURL=worker.js.map