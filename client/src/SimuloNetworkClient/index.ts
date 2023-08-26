import SimuloClient from "../SimuloClient.js";

class SimuloNetworkClient implements SimuloClient {
    activeDc: RTCDataChannel | null = null;
    listeners: { [key: string]: Function[] } = {};
    id: string;
    ws: any | null = null;
    localCandidates: RTCIceCandidate[] = [];

    constructor() {
        this.localCandidates = [];
        this.activeDc = null;
        this.listeners = {};
        this.id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15); // generate a random id
    }

    /**
        Emit data to the server over WebRTC. Returns true if the data was sent, false if not.
        * @example
        * networkClient.emitData('playerMove', { x: 0, y: 0 });
        */
    emitData(type: string, data: any) {
        if (this.activeDc) {
            this.activeDc.send(JSON.stringify({
                type: type,
                data: data,
                uuid: this.id
            }));
            return true;
        }
        return false;
    }

    /** Emit data to the server over WebSocket. Returns true if the data was sent, false if not.
     * @example
     * networkClient.emitReliableData('chatMessage', { message: 'Hello, world!' });
    */
    emitReliableData(type: string, data: any) {
        if (this.ws) {
            this.ws.send(JSON.stringify({
                type: type,
                data: data,
                uuid: this.id
            }));
            return true;
        }
        return false;
    }

    // connect func, we will add jsdoc description
    /**
     * Connect to the server in both WebRTC and WebSocket. Fires `connect` event when WebSocket connects, and `ready` event when WebRTC connects.
    */
    connect(offerSdp: string) {
        console.log('network client connecting with offersdp')
        let desc = new RTCSessionDescription({ type: 'offer', sdp: offerSdp });
        let pc = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302",
                },
            ],
        });
        pc.onicecandidate = (e) => {
            if (e.candidate) return;
            console.log('omng! ice!')
            //alert(pc.localDescription!.sdp); // this is our answer to the offer
            console.log('answer sdp:', encodeURIComponent(pc.localDescription!.sdp));
            this.emit("answerSdp", encodeURIComponent(pc.localDescription!.sdp));
        }
        pc.oniceconnectionstatechange = (e) => {
            console.log('ice connection state change', e);
            switch (pc.iceConnectionState) {
                case "connected":
                    console.log('connected');
                    break;
                case "disconnected":
                    console.log('disconnected');
                    alert('Disconnected from server!');
                    break;
                case "failed":
                    console.log('failed');
                    // log anything that could be relevant about why ICE failed
                    console.log('gathering state:', pc.iceGatheringState);
                    console.log('connection state:', pc.iceConnectionState);
                    console.log('signaling state:', pc.signalingState);
                    console.log('local candidates:', this.localCandidates);
                    // log a big red message with huge text
                    console.log('%cICE failed!', 'font-size: 50px; color: red;');
                    alert('Connection failed! This could be due to router settings, firewall, VPN, etc.');
                    break;
                case "closed":
                    console.log('closed');
                    break;
            }
        };
        pc.ondatachannel = (e) => {
            let dc = e.channel;
            dc.onmessage = (e) => {
                try {
                    var formatted = JSON.parse(e.data);
                    if (
                        formatted.type !== undefined &&
                        formatted.data !== undefined &&
                        formatted.type !== null &&
                        formatted.data !== null
                    ) {
                        this.emit("data", { type: formatted.type, data: formatted.data, uuid: this.id });
                    }
                } catch (e) {
                    console.log(e);
                }
            }
            dc.onopen = () => {
                this.activeDc = dc;
                this.emit("ready", this.id);
            }
        }
        pc.setRemoteDescription(desc).then(() => {
            pc.createAnswer().then((answer) => {
                pc.setLocalDescription(answer);
            });
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
    on(type: string, listener: Function) {
        if (!this.listeners[type]) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(listener);
    }

    // off func
    /**
     * Remove an event listener for a specific event type
    */
    off(type: string, listener: Function) {
        if (this.listeners[type]) {
            this.listeners[type] = this.listeners[type].filter((l) => {
                return l !== listener;
            });
        }
    }

    emit(type: string, data: any) {
        if (this.listeners[type]) {
            this.listeners[type].forEach((l) => {
                l(data);
            });
        }
    }
}

// export the class of SimuloNetworkClient as default
export default SimuloNetworkClient;