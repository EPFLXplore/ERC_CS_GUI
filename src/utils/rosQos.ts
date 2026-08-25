import * as ROSLIB from "roslib";

/**
 * roslib's `Topic` never puts a `qos` field on the wire, so rosbridge falls back to its own
 * defaults (for publishers: reliable + transient_local, keep_last depth 100 — see
 * ROSBRIDGE_PROTOCOL.md §4.2.2). Mutating the outgoing message is the only way to pick a profile.
 *
 * Both `subscribe` and `advertise` go through `callForSubscribeAndAdvertise`, and with
 * `reconnect_on_close` roslib replays the *same object* on websocket reconnect, so the profile
 * survives a bridge restart.
 *
 * @param ops which rosbridge operations to attach the profile to. A publisher needs "advertise";
 *            a subscriber needs "subscribe".
 */
export function patchTopicRosbridgeQoS(
	topic: ROSLIB.Topic<any>,
	qos: Record<string, unknown>,
	ops: ReadonlyArray<"subscribe" | "advertise"> = ["subscribe"]
): void {
	const t = topic as ROSLIB.Topic<any> & {
		callForSubscribeAndAdvertise: (msg: Record<string, unknown>) => void;
	};
	const original = t.callForSubscribeAndAdvertise.bind(topic);
	t.callForSubscribeAndAdvertise = (msg: Record<string, unknown>) => {
		if (ops.includes(msg.op as "subscribe" | "advertise")) {
			msg.qos = { ...qos };
		}
		original(msg);
	};
}
