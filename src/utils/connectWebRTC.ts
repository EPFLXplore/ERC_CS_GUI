// @ts-nocheck
import { useEffect, useState } from "react";

const useConnectWebRTC = () => {
	const [rotate, setRotate] = useState(false);
	const [videoId, setVideoId] = useState(0);
	const [videoSrc, setVideoSrc] = useState<MediaStream | null>(null);
	const [pc, setPc] = useState<RTCPeerConnection | null>(null);

	const negotiate = () => {
		if (!pc) {
			console.log("Did not create Peer Connection");
			return;
		}

		pc.addTransceiver("video", { direction: "recvonly" });
		console.log("Start connecting");
		//
		return pc
			.createOffer()
			.then((offer) => {
				console.log("Offer");
				return pc?.setLocalDescription(offer);
			})
			.then(() => {
				// wait for ICE gathering to complete
				return new Promise<void>((resolve) => {
					if (pc.iceGatheringState === "complete") {
						resolve();
					} else {
						const checkState = () => {
							if (pc.iceGatheringState === "complete") {
								pc.removeEventListener("icegatheringstatechange", checkState);
								resolve();
							}
						};
						pc?.addEventListener("icegatheringstatechange", checkState);
					}
				});
			})
			.then(() => {
				var offer = pc.localDescription;
				console.log("Connecting to camera /dev/video" + videoId)
				return fetch("http://192.168.243.66:8080/offer", {
					body: JSON.stringify({
						// @ts-ignore
						sdp: offer.sdp,
						// @ts-ignore
						type: offer.type,
						video: videoId,
					}),
					headers: {
						"Content-Type": "application/json",
					},
					method: "POST",
				});
			})
			.then((response) => {
				console.log("Response from webRTC server");
				return response.json();
			})
			.then((answer) => {
				return pc.setRemoteDescription(answer);
			})
			.catch((e) => {
				alert(e);
			});
	};

	const start = () => {
		var config = {
			sdpSemantics: "unified-plan",
			//iceServers: [{ urls: ["stun:stun.l.google.com:19302"] }],
		};

		const _pc = new RTCPeerConnection(config);

		// connect audio / video
		_pc.addEventListener("track", (evt) => {
			if (evt.track.kind == "video") {
				setVideoSrc(evt.streams[0]);
			} else {
				return;
			}
		});

		// @ts-ignore
		setPc(_pc);
	};

	const stop = () => {
		// close peer connection
		setTimeout(() => {
			if (pc) pc.close();
		}, 500);
	};

	useEffect(() => {
		start();
		return () => {
			stop();
		};
	}, [videoId]);

	useEffect(() => {
		negotiate();
	}, [pc]);

	return [videoSrc, videoId, setVideoId, start, stop] as const;
};

export default useConnectWebRTC;
