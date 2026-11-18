/*
Arbitration for the HD gamepad topic. The Gamepad and the SpaceMouse both publish sensor_msgs/Joy
on /CS/GamepadCmdsHandlingDevice; if both did at 30 ms the arm would see interleaved commands.
While the SpaceMouse is armed it owns the topic and the gamepad hook skips its HD publishes
(NAV/DRILL are other topics and are unaffected, so the gamepad can keep driving).
*/

import { useEffect, useState } from "react";

export const HD_INPUT_OWNER_EVENT = "erc-cs-hd-input-owner";

let spaceMouseOwnsHd = false;

export const isSpaceMouseHdOwner = () => spaceMouseOwnsHd;

export const setSpaceMouseHdOwner = (owns: boolean) => {
	if (spaceMouseOwnsHd === owns) return;
	spaceMouseOwnsHd = owns;
	window.dispatchEvent(new CustomEvent(HD_INPUT_OWNER_EVENT, { detail: { owns } }));
};

export const useSpaceMouseOwnsHd = () => {
	const [owns, setOwns] = useState(isSpaceMouseHdOwner);
	useEffect(() => {
		const sync = () => setOwns(isSpaceMouseHdOwner());
		window.addEventListener(HD_INPUT_OWNER_EVENT, sync);
		sync();
		return () => window.removeEventListener(HD_INPUT_OWNER_EVENT, sync);
	}, []);
	return owns;
};
