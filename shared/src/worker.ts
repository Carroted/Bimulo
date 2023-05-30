var promises: { [key: number]: { resolve: (value: any) => void, reject: (reason?: any) => void, type: 'get' | 'has' | 'getObject' } } = {};
var requestID = -1;

class SimuloRemoteObject {
    cachedObjectID: number;
    async getName() {
        return new Promise((resolve: (value: any) => void, reject: (reason?: any) => void) => {
            requestID++;
            promises[requestID] = { resolve, reject, type: 'get' };
            postMessage({
                type: 'get',
                key: 'name',
                requestID,
                cachedObjectID: this.cachedObjectID,
                args: []
            });
        });
    }
    constructor(cacheObjectID: number) {
        this.cachedObjectID = cacheObjectID;
    }
}

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
};
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
            var obj = new SimuloRemoteObject(cachedObjectID);
            return obj;
        }
        else {
            return null;
        }
    }
}

async function test() {
    console.log('getting obj')
    var obj = (await Scene.getObjectByID(1)) as SimuloRemoteObject;
    console.log('got it');
    console.log('name: ' + await obj.getName());
} test();