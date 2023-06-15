/// @ts-nocheck
import { io } from "./socket.io.esm.min.js"; // dont think theres TS types for this, why not just ignore and move on for the time being
class SimuloNetworkClient {
    constructor() {
        this.activeDc = null;
        this.listeners = {};
        this.id = null;
        this.ws = null;
        this.localCandidates = [];
        this.localCandidates = [];
        this.activeDc = null;
        this.listeners = {};
        this.id = null;
    }
    /**
        Emit data to the server over WebRTC. Returns true if the data was sent, false if not.
        * @example
        * networkClient.emitData('playerMove', { x: 0, y: 0 });
        */
    emitData(type, data) {
        if (this.activeDc) {
            this.activeDc.send(JSON.stringify({
                type: type,
                data: data
            }));
            return true;
        }
        return false;
    }
    /** Emit data to the server over WebSocket. Returns true if the data was sent, false if not.
     * @example
     * networkClient.emitReliableData('chatMessage', { message: 'Hello, world!' });
    */
    emitReliableData(type, data) {
        if (this.ws) {
            this.ws.send(JSON.stringify({
                type: type,
                data: data
            }));
            return true;
        }
        return false;
    }
    // connect func, we will add jsdoc description
    /**
     * Connect to the server in both WebRTC and WebSocket. Fires `connect` event when WebSocket connects, and `ready` event when WebRTC connects.
    */
    connect() {
        this.ws = io();
        this.ws.on('connect', () => {
            this.id = this.ws.id;
            console.log('WebSocket connection established');
            this.ws.send('i exist, notice me');
            // Connect event is for WebSocket, ready event is for WebRTC
            if (this.listeners['connect']) {
                this.listeners['connect'].forEach((listener) => {
                    listener();
                });
            }
        });
        this.ws.on('message', (event) => {
            console.log('Received message from server:', event);
            const msg = JSON.parse(event);
            // rtcpeerconnection to the same domain
            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
                // set remote description
            });
            if (msg.sdp) {
                console.log('using sdp');
                pc.setRemoteDescription(new RTCSessionDescription(msg))
                    .then(() => {
                    if (msg.type === 'offer') {
                        pc.createAnswer().then((answer) => {
                            pc.setLocalDescription(answer)
                                .then(() => {
                                this.ws.send(JSON.stringify(answer));
                            });
                        });
                    }
                });
            }
            else if (msg.candidate) {
                console.log('using candidate');
                try {
                    pc.addIceCandidate(new RTCIceCandidate({
                        sdpMid: msg.mid, candidate: msg.candidate,
                        // description
                    })).catch((e) => {
                        console.log(e);
                        console.log('failed to add ice candidate :( i wanted to add it so bad, but i failed. i am so sorry, please forgive me');
                    });
                    console.log('added ice candidate');
                }
                catch (e) {
                    console.log(e);
                    console.log('failed to add ice candidate :( i wanted to add it so bad, but i failed. i am so sorry, please forgive me');
                }
            }
            pc.ondatachannel = (event) => {
                const dc = event.channel;
                console.log('data channel established!!! omg! yay!\n\n\n------\n\ntell asour the data channel is established\n\n------\n\n\n');
                // Handle incoming data from server
                dc.onmessage = (event) => {
                    //console.log(`Received data from server: ${event.data}`);
                    try {
                        var formatted = JSON.parse(event.data);
                        //handleData(formatted);
                        if (this.listeners[formatted.type]) {
                            this.listeners[formatted.type].forEach((listener) => {
                                listener(formatted.data);
                            });
                        }
                        if (this.listeners['data']) {
                            this.listeners['data'].forEach((listener) => {
                                listener(formatted);
                            });
                        }
                    }
                    catch (e) {
                        console.log(e);
                    }
                };
                // Send data to server
                dc.onopen = () => {
                    //dc.send('Hello, server!');
                    this.activeDc = dc;
                    if (this.listeners['ready']) {
                        this.listeners['ready'].forEach((listener) => {
                            listener();
                        });
                    }
                };
            };
            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this.ws.send(JSON.stringify({ candidate: event.candidate.candidate, mid: event.candidate.sdpMid }));
                    this.localCandidates.push(event.candidate);
                }
            };
        });
    }
    // on func
    /**
     * Add an event listener for a specific event type
     * @example
     * networkClient.on('connect', () => {
     *    console.log('Connected to WebSocket!');
     * });
    */
    on(type, listener) {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(listener);
    }
    // off func
    /**
     * Remove an event listener for a specific event type
    */
    off(type, listener) {
        if (this.listeners[type]) {
            this.listeners[type] = this.listeners[type].filter((l) => {
                return l !== listener;
            });
        }
    }
}
// export the class of SimuloNetworkClient as default
export default SimuloNetworkClient;
//# sourceMappingURL=index.js.map