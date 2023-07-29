import SimuloPhysicsServer from "./SimuloPhysicsServer";
const physicsServer = new SimuloPhysicsServer({});
var cachedObjects = {};
var cachedObjectID = -1;
var worker = new Worker('worker.js');
worker.onmessage = async function (event) {
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
        var gottenObj = { name: 'joe' };
        if (gottenObj) {
            cachedObjectID++;
            cachedObjects[cachedObjectID] = gottenObj;
            worker.postMessage({
                type: 'response',
                value: gottenObj ? true : false,
                cachedObjectID: cachedObjectID,
                requestID: event.data.requestID // pass it back so it can identify what request it is responding to
            });
        }
    }
};
//# sourceMappingURL=Example.js.map