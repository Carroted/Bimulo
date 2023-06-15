import nodeDataChannel from "node-datachannel"; // for WebRTC data channels
import { Server } from "socket.io"; // we use socket.io since websocket without SSL doesnt usually work. this could be replaced with ws and add SSL cert creation (Let's Encrypt?)
class SimuloNetworkServer {
    constructor(server) {
        this.io = null;
        this.listeners = {};
        this.dataChannels = [];
        this.server = server;
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
    connect() {
        this.io = new Server(this.server);
        this.io.on("connection", (ws) => {
            var uuid = ws.id;
            let peer1 = new nodeDataChannel.PeerConnection("Peer" + uuid, {
                iceServers: ["stun:stun.l.google.com:19302"],
            }); // TODO: self-host ICE
            let dc1 = null;
            console.log("------\nweb socket connected through socket.io!\n------");
            // tell them they're connected
            ws.send(JSON.stringify({
                type: "connected",
                data: {
                    message: "connected to server, good job. now all thats left is ICE stuff just like you practiced, client",
                },
            }));
            peer1.onLocalDescription((sdp, type) => {
                console.log("Peer1 SDP:", sdp, " Type:", type);
                ws.send(JSON.stringify({ sdp: sdp, type: type }));
            });
            peer1.onLocalCandidate((candidate, mid) => {
                console.log("Peer1 Candidate:", candidate);
                ws.send(JSON.stringify({ candidate: candidate, mid: mid }));
            });
            ws.on("message", (message) => {
                try {
                    const msg = JSON.parse(message);
                    if (msg.sdp) {
                        peer1.setRemoteDescription(msg.sdp, msg.type);
                    }
                    else if (msg.candidate) {
                        peer1.addRemoteCandidate(msg.candidate, msg.mid);
                    }
                }
                catch (e) {
                    console.log(e);
                }
            });
            this.emit("connect", uuid);
            dc1 = peer1.createDataChannel("main");
            dc1.onMessage((msg) => {
                //console.log('Peer1 Received Msg dc1:', msg);
                try {
                    var formatted = JSON.parse(msg);
                    // it should have a type and data. if not, it's not a valid message
                    if (formatted.type !== undefined &&
                        formatted.data !== undefined &&
                        formatted.type !== null &&
                        formatted.data !== null) {
                        //this.emit(formatted.type, formatted.data);
                        this.emit("data", { formatted: formatted, uuid: uuid }); // TODO: change this to emit the type. will need heavy changes to ServerController
                    }
                }
                catch (e) {
                    console.log(e);
                }
            });
            dc1.onOpen(() => {
                this.dataChannels.push(dc1);
                this.emit("ready", uuid);
            });
        });
    }
    sendAll(type, data) {
        this.dataChannels.forEach((dc) => {
            // check if open first
            if (!dc.isOpen()) {
                return;
            }
            try {
                dc.sendMessage(JSON.stringify({
                    type: type,
                    data: data,
                }));
            }
            catch (e) {
                console.error('Error sending message to data channel:', e);
            }
        });
    }
}
export default SimuloNetworkServer;
//# sourceMappingURL=SimuloNetworkServer.js.map