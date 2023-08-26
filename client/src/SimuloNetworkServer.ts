interface Peer {
    pc: RTCPeerConnection;
    dc: RTCDataChannel;
}

class SimuloNetworkServer {
    listeners: { [key: string]: Function[] } = {};
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
    peers: { [id: string]: Peer } = {};
    connectingPeers: Peer[] = [];

    dcInit(dc: RTCDataChannel, pc: RTCPeerConnection) {
        dc.onopen = () => {
            //this.dataChannels.push(dc);
            this.connectingPeers.push({ pc: pc, dc: dc });
            this.emit("ready", null);
        };
        dc.onmessage = (msg) => {
            try {
                var formatted = JSON.parse(msg.data);
                //this.dcIDs[formatted.id] = dc;
                // find our peer from the datachannel
                if (!this.peers[formatted.uuid]) {
                    var peer = this.connectingPeers.find((p) => p.dc === dc);
                    if (peer) {
                        this.peers[formatted.uuid] = peer;
                        this.connectingPeers = this.connectingPeers.filter((p) => p !== peer);
                    }
                }
                // it should have a type and data. if not, it's not a valid message
                if (
                    formatted.type !== undefined &&
                    formatted.data !== undefined &&
                    formatted.type !== null &&
                    formatted.data !== null
                ) {
                    //this.emit(formatted.type, formatted.data);
                    this.emit("data", { formatted: formatted, uuid: formatted.uuid }); // TODO: change this to emit the type. will need heavy changes to ServerController
                }
            } catch (e) {
                console.log(e);
            }
        };
    }

    offered: RTCPeerConnection[] = [];

    connect() {
        let pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
        pc.onicecandidate = (e) => {
            if (e.candidate) {
                console.log('returning because e.candidate is not null, which means we are not done yet since we are still getting candidates');
                return;
            }; // ok
            //alert(encodeURIComponent(pc.localDescription!.sdp)); // if its null we cry about it
            console.log('on ice candidate, the sdp is:', encodeURIComponent(pc.localDescription!.sdp));
        };
        pc.ondatachannel = (e) => {
            let dc = e.channel;
            this.dcInit(dc, pc);
        };
        pc.oniceconnectionstatechange = (e) => {
            console.log("ICE connection state changed to " + pc.iceConnectionState);
            switch (pc.iceConnectionState) {
                case "closed":
                case "failed":
                case "disconnected":
                    this.emit("disconnect", 'someone');
                    break;
                case "connected":
                    this.emit("connect", 'someone');
                    // remove it from the list
                    this.offered = this.offered.filter((p) => p !== pc);
                    break;
            }
        };

        let dc = pc.createDataChannel("main");
        this.dcInit(dc, pc);

        // create the offer
        pc.createOffer().then((offer) => {
            pc.setLocalDescription(offer);
            /*alert(encodeURIComponent(offer.sdp!));
            console.log('after creating offer, the sdp is:', encodeURIComponent(offer.sdp!));*/
        });

        //this.connectingPeers.push({ pc: pc, dc: dc });
        this.offered.push(pc);
    }

    useAnswerSdp(sdp: string) {
        let desc = new RTCSessionDescription({ type: "answer", sdp: sdp });
        //this.pc!.setRemoteDescription(desc);
        this.offered.forEach((pc) => {
            pc.setRemoteDescription(desc);
        });
    }

    sendAll(type: string, data: any) {
        Object.keys(this.peers).forEach((key: string) => {
            let peer = this.peers[key];
            let dc = peer.dc;
            if (dc.readyState != 'open') {
                // remove it from the list
                delete this.peers[key];
                this.emit("disconnect", null);
                console.log('disconnected')
                return;
            }
            try {
                dc.send(
                    JSON.stringify({
                        type: type,
                        data: data,
                    })
                );
            } catch (e) {
                console.error('Error sending message to data channel:', e);
            }
        });
    }
}

export default SimuloNetworkServer;