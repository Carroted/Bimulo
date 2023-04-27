var host = false;
// get query string for host (?host=true, ?host=false or none for false)
var queryString = window.location.search;
if (queryString) {
    queryString = queryString.substring(1);
    var queryArray = queryString.split('&');
    queryArray.forEach(function (query) {
        var queryPair = query.split('=');
        if (queryPair[0] == 'host') {
            if (queryPair[1] == 'true') {
                host = true;
            } else if (queryPair[1] == 'false') {
                host = false;
            }
        }
    });
}

// SimuloClientConnection class only has empty connect method and constructor, but the JSDoc is there for reference
class SimuloClientConnection {
    constructor() {
        let localCandidates = [];
        this._activeDc = null;
        this._listeners = {};
        this.id = null;
    }
    // emitData func, we will add jsdoc description
    /**
        * @returns {boolean}
        * @description Emit data to the server over WebRTC. Returns true if the data was sent, false if not.
        * @param {string} type
        * @param {object} data
        * @example
        * clientConnection.emitData('playerMove', { x: 0, y: 0 });
        */
    emitData(type, data) {
        if (this._activeDc) {
            this._activeDc.send(JSON.stringify({
                type: type,
                data: data
            }));
            return true;
        }
        return false;
    }

    // emitReliableData func, we will add jsdoc description
    /**
     * @returns {boolean}
     * @description Emit data to the server over WebSocket. Returns true if the data was sent, false if not.
     * @param {string} type
     * @param {object} data
     * @example
     * clientConnection.emitReliableData('chatMessage', { message: 'Hello, world!' });
    */
    emitReliableData(type, data) {
        if (this._ws) {
            this._ws.send(JSON.stringify({
                type: type,
                data: data
            }));
            return true;
        }
        return false;
    }

    // connect func, we will add jsdoc description
    /**
     * @description Connect to the server in both WebRTC and WebSocket. Fires `connect` event when WebSocket connects, and `ready` event when WebRTC connects.
     * @returns {void}
    */
    connect() {
        this._ws = io();
        this._ws.on('connect', () => {
            this.id = this._ws.id;
            console.log('WebSocket connection established');
            this._ws.send('i exist, notice me');
            // Connect event is for WebSocket, ready event is for WebRTC
            if (this._listeners['connect']) {
                this._listeners['connect'].forEach((listener) => {
                    listener();
                });
            }
        });
        this._ws.on('message', (event) => {
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
                                        this._ws.send(JSON.stringify(answer));
                                    });
                            });
                        }
                    });
            } else if (msg.candidate) {
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
                        if (this._listeners[formatted.type]) {
                            this._listeners[formatted.type].forEach((listener) => {
                                listener(formatted.data);
                            });
                        }
                        if (this._listeners['data']) {
                            this._listeners['data'].forEach((listener) => {
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
                    dc.send('Hello, server!');
                    this._activeDc = dc;
                    if (this._listeners['ready']) {
                        this._listeners['ready'].forEach((listener) => {
                            listener();
                        });
                    }
                };
            };

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    this._ws.send(JSON.stringify({ candidate: event.candidate.candidate, mid: event.candidate.sdpMid }));
                    localCandidates.push(event.candidate);
                }
            };
        });
    }

    // on func
    /**
     * @description Add an event listener for a specific event type
     * @param {string} type
     * @param {function} listener
     * @returns {void}
     * @example
     * clientConnection.on('connect', () => {
     *    console.log('Connected to WebSocket!');
     * });
    */
    on(type, listener) {
        if (!this._listeners[type]) {
            this._listeners[type] = [];
        }
        this._listeners[type].push(listener);
    }

    // off func
    /**
     * @description Remove an event listener for a specific event type
     * @param {string} type
     * @param {function} listener
     * @returns {void}
    */
    off(type, listener) {
        if (this._listeners[type]) {
            this._listeners[type] = this._listeners[type].filter((l) => {
                return l !== listener;
            });
        }
    }
}