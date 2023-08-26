var promises: { [key: number]: { resolve: (value: any) => void, reject: (reason?: any) => void, type: 'get' | 'set' | 'getObject' | 'call' } } = {};
var requestID = -1;

function getProperty(cachedObjectID: number, key: any) {
    return new Promise((resolve: (value: any) => void, reject: (reason?: any) => void) => {
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
function setProperty(cachedObjectID: number, key: any, value: any) {
    return new Promise((resolve: (value: any) => void, reject: (reason?: any) => void) => {
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
function callMethod(cachedObjectID: number, key: any, args: any[]) {
    return new Promise((resolve: (value: any) => void, reject: (reason?: any) => void) => {
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
    cachedObjectID: number;
    id: number;
    async getPosition() {
        return getProperty(this.cachedObjectID, 'position') as Promise<[x: number, y: number]>;
    }
    async setPosition(x: number, y: number) {
        return setProperty(this.cachedObjectID, 'position', [x, y]);
    }
    async getRotation() {
        return getProperty(this.cachedObjectID, 'rotation') as Promise<number>;
    }
    async setRotation(rotation: number) {
        return setProperty(this.cachedObjectID, 'rotation', rotation);
    }
    async getDensity() {
        return getProperty(this.cachedObjectID, 'density') as Promise<number>;
    }
    async setDensity(density: number) {
        return setProperty(this.cachedObjectID, 'density', density);
    }
    async getFriction() {
        return getProperty(this.cachedObjectID, 'friction') as Promise<number>;
    }
    async setFriction(friction: number) {
        return setProperty(this.cachedObjectID, 'friction', friction);
    }
    async getRestitution() {
        return getProperty(this.cachedObjectID, 'restitution') as Promise<number>;
    }
    async setRestitution(restitution: number) {
        return setProperty(this.cachedObjectID, 'restitution', restitution);
    }
    async getBorder() {
        return getProperty(this.cachedObjectID, 'border') as Promise<string | null>;
    }
    async setBorder(border: boolean) {
        return setProperty(this.cachedObjectID, 'border', border);
    }
    async getBorderWidth() {
        return getProperty(this.cachedObjectID, 'borderWidth') as Promise<number>;
    }
    async setBorderWidth(borderWidth: number) {
        return setProperty(this.cachedObjectID, 'borderWidth', borderWidth);
    }
    async getBorderScaleWithZoom() {
        return getProperty(this.cachedObjectID, 'borderScaleWithZoom') as Promise<boolean>;
    }
    async setBorderScaleWithZoom(borderScaleWithZoom: boolean) {
        return setProperty(this.cachedObjectID, 'borderScaleWithZoom', borderScaleWithZoom);
    }
    async getCircleCake() {
        return getProperty(this.cachedObjectID, 'circleCake') as Promise<boolean>;
    }
    async setCircleCake(circleCake: boolean) {
        return setProperty(this.cachedObjectID, 'circleCake', circleCake);
    }
    async getImage() {
        return getProperty(this.cachedObjectID, 'image') as Promise<string | null>;
    }
    async setImage(image: string | null) {
        return setProperty(this.cachedObjectID, 'image', image);
    }
    async getCollisionSound() {
        return getProperty(this.cachedObjectID, 'collisionSound') as Promise<string | null>;
    }
    async setCollisionSound(collisionSound: string | null) {
        return setProperty(this.cachedObjectID, 'collisionSound', collisionSound);
    }
    async getColor() {
        return getProperty(this.cachedObjectID, 'color') as Promise<string>;
    }
    async setColor(color: string) {
        return setProperty(this.cachedObjectID, 'color', color);
    }
    async getStatic() {
        return getProperty(this.cachedObjectID, 'isStatic') as Promise<boolean>;
    }
    async setStatic(isStatic: boolean) {
        return setProperty(this.cachedObjectID, 'isStatic', isStatic);
    }
    async getMass() {
        return getProperty(this.cachedObjectID, 'mass') as Promise<number>;
    }
    async addForce([x, y]: [x: number, y: number]) {
        return callMethod(this.cachedObjectID, 'addForce', [[x, y]]);
    }
    async addImpulse([x, y]: [x: number, y: number]) {
        return callMethod(this.cachedObjectID, 'addImpulse', [[x, y]]);
    }
    async addTorque(torque: number) {
        return callMethod(this.cachedObjectID, 'addTorque', [torque]);
    }
    async addAngularImpulse(impulse: number) {
        return callMethod(this.cachedObjectID, 'addAngularImpulse', [impulse]);
    }
    async destroy() {
        return callMethod(this.cachedObjectID, 'destroy', []);
    }

    /** Don't create a `SimuloRemoteObject` directly, use `Scene.getObjectByID` instead. */
    constructor(cacheObjectID: number, id: number) {
        this.cachedObjectID = cacheObjectID;
        this.id = id;
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
    async getObjectByID(id: number) {
        var res = await new Promise((resolve: (value: any) => void, reject: (reason?: any) => void) => {
            requestID++;
            promises[requestID] = { resolve, reject, type: 'getObject' };
            postMessage({
                type: 'getObject',
                id,
                requestID
            });
        });
        // res is a boolean
        var exists = res.value as boolean;
        var cachedObjectID = res.cachedObjectID as number;
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
    console.log('getting obj')
    var obj = (await Scene.getObjectByID(1)) as SimuloRemoteObject;
    console.log('got it');
    console.log('pos: ' + await obj.getPosition());
} test();