import { useEffect, useState } from "react";

const useConnectWebRTC = () => {
	const [rotate, setRotate] = useState(false);
	const [videoSrc, setVideoSrc] = useState<MediaStream | null>(null);
	const [pc, setPc] = useState<RTCPeerConnection | null>(null);

	const negotiate = () => {
		pc?.addTransceiver("video", { direction: "recvonly" });
		//
		return pc
			?.createOffer()
			.then((offer) => {
				return pc?.setLocalDescription(offer);
			})
			.then(() => {
				// wait for ICE gathering to complete
				return new Promise<void>((resolve) => {
					if (pc?.iceGatheringState === "complete") {
						resolve();
					} else {
						const checkState = () => {
							if (pc?.iceGatheringState === "complete") {
								pc?.removeEventListener("icegatheringstatechange", checkState);
								resolve();
							}
						};
						pc?.addEventListener("icegatheringstatechange", checkState);
					}
				});
			})
			.then(() => {
				var offer = pc?.localDescription;
				return fetch("169.254.55.234:8080/offer", {
					body: JSON.stringify({
						// @ts-ignore
						sdp: offer.sdp,
						// @ts-ignore
						type: offer.type,
					}),
					headers: {
						"Content-Type": "application/json",
					},
					method: "POST",
				});
			})
			.then((response) => {
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
		};

		// @ts-ignore
		setPc(new RTCPeerConnection(config));

		// connect audio / video
		pc?.addEventListener("track", (evt) => {
			if (evt.track.kind == "video") {
				setVideoSrc(evt.streams[0]);
			} else {
				return;
			}
		});

		negotiate();
	};

	const stop = () => {
		// close peer connection
		setTimeout(() => {
			pc?.close();
		}, 500);
	};

	useEffect(() => {
		start();
		return () => {
			stop();
		};
	}, []);

	return [videoSrc, start, stop] as const;
};

export default useConnectWebRTC;
