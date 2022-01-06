import genId from "genid";

export default class WebRTC {
    id;
    socket;
    localStream;
    remoteStream;
    peerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
            },
        ],
        iceCandidatePoolSize: 10,
    });

    async connect() {
        let { id, wsEndpoint } = await fetch("http://localhost:3000/connect")
            .then(r => r.json());

        this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        this.remoteStream = new MediaStream();

        // Add local tracks to peer connection, so they can be sent to remote
        for (let track of this.localStream.getTracks()) {
            this.peerConnection.addTrack(track, this.localStream);
        }

        // Handle incoming remote tracks
        this.peerConnection.ontrack = event => {
            for (let track of event.streams[0].getTracks()) {
                this.remoteStream.addTrack(track);
            }
        };

        this.id = id;
        this.connectToSocket(wsEndpoint)
    }

    connectToSocket(endpoint) {
        this.socket = new WebSocket("ws://localhost:3000" + endpoint);

        this.socket.addEventListener("message", message => {
            this.handleMessage(JSON.parse(message.data));
        });
    }

    send(type, payload = {}) {
        this.socket.send(JSON.stringify({
            type,
            payload,
            from: this.id,
        }));
    }

    handleMessage({ type, payload }) {
        console.log("Handle", type, payload);

        switch (type) {
            case "requestOffer":
                this.sendOffer();
                break;

            case "requestAnswer":
                this.sendAnswer(payload);
                break;

            case "answered":
                this.onAnswered(payload);
                break;

            case "remoteIceCandidates":
                this.remoteCandidates(payload);
                break;
        }
    }

    async sendOffer() {
        this.peerConnection.onicecandidate = event => {
            if (event.candidate) {
                this.send("iceCandidate", event.candidate.toJSON());
            }
        };

        let offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        let offerJson = {
            type: offer.type,
            sdp: offer.sdp,
        };

        this.send("offerResponse", offerJson);
    }

    async sendAnswer(offer) {
        this.peerConnection.onicecandidate = event => {
            if (event.candidate) {
                this.send("iceCandidate", event.candidate.toJSON());
            }
        };

        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        let answer = await this.peerConnection.createAnswer(offer);
        await this.peerConnection.setLocalDescription(answer);

        let answerJson = {
            type: answer.type,
            sdp: answer.sdp,
        };

        this.send("answerResponse", answerJson);
    }

    async onAnswered(answer) {
        if (!this.peerConnection.remoteDescription) {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }

    async remoteCandidates({ candidates }) {
        for (let candidate of candidates) {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    }
}