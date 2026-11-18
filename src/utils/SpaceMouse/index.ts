/*
Description: 3Dconnexion SpaceMouse driver over WebHID.

Why WebHID and not the Gamepad API: on Linux the SpaceMouse is exposed as a relative-axis input
device (EV_REL, no ID_INPUT_JOYSTICK), so Chrome's Gamepad API never lists it. WebHID reads the
raw HID reports instead. Chromium-only, needs a secure context (localhost or https), a one-time
user gesture to grant the device, and read access to /dev/hidraw* (see udev rule in the README
note of the SpaceMouse component).

HID report layout (all 3Dconnexion 6DOF devices):
  report 1: translation x, y, z as int16 LE — newer devices (e.g. SpaceMouse Compact 256f:c635)
            append rotation x, y, z in the same report (12 bytes total)
  report 2: rotation x, y, z as int16 LE (older devices only)
  report 3: button bitmask
*/

// Minimal WebHID typings — not shipped with the TS DOM lib this project uses.
interface HIDInputReportEvent extends Event {
	device: HIDDevice;
	reportId: number;
	data: DataView;
}
interface HIDDevice extends EventTarget {
	opened: boolean;
	vendorId: number;
	productId: number;
	productName: string;
	open(): Promise<void>;
	close(): Promise<void>;
}
interface HIDConnectionEvent extends Event {
	device: HIDDevice;
}
interface HID extends EventTarget {
	getDevices(): Promise<HIDDevice[]>;
	requestDevice(options: {
		filters: { vendorId?: number; productId?: number; usagePage?: number; usage?: number }[];
	}): Promise<HIDDevice[]>;
}

const VENDOR_3DCONNEXION = 0x256f;
const VENDOR_LOGITECH = 0x046d; // pre-2011 3Dconnexion devices
const HID_FILTERS = [
	{ vendorId: VENDOR_3DCONNEXION },
	{ vendorId: VENDOR_LOGITECH, usagePage: 0x01, usage: 0x08 }, // Generic Desktop / Multi-axis
];

/** Raw count at full deflection. ~350 on Compact/Wireless, a bit more on older pucks — clamped. */
const FULL_SCALE = 350;
const DEADZONE = 0.04;

export const SPACEMOUSE_AXES = ["TX", "TY", "TZ", "RX", "RY", "RZ"] as const;
export enum SpaceMouseAxis {
	TX,
	TY,
	TZ,
	RX,
	RY,
	RZ,
}

export interface SpaceMouseState {
	/** WebHID available in this browser/context at all. */
	supported: boolean;
	connected: boolean;
	name: string | null;
	/** [tx, ty, tz, rx, ry, rz], each normalised to -1..1 with a small deadzone. */
	axes: number[];
	/** [left, right] on the Compact; longer on bigger models. */
	buttons: boolean[];
}

const getHid = (): HID | null => {
	const nav = navigator as Navigator & { hid?: HID };
	return typeof window !== "undefined" && window.isSecureContext && nav.hid ? nav.hid : null;
};

const isSpaceMouse = (d: HIDDevice) =>
	d.vendorId === VENDOR_3DCONNEXION ||
	(d.vendorId === VENDOR_LOGITECH && (d.productId & 0xff00) === 0xc600);

/** Per-axis sign [tx, ty, tz, rx, ry, rz]. TY and RZ come out of the HID reports reversed. */
const AXIS_SIGN = [1, -1, 1, 1, 1, -1];

const normalise = (raw: number, axis: number) => {
	const v = Math.max(-1, Math.min(1, (AXIS_SIGN[axis] * raw) / FULL_SCALE));
	return Math.abs(v) < DEADZONE ? 0 : v;
};

class SpaceMouseController {
	private hid = getHid();
	private device: HIDDevice | null = null;
	private state: SpaceMouseState;
	private onState: (state: SpaceMouseState) => void;
	private dirty = false;
	private rafId: number | null = null;
	private disposed = false;

	constructor(stateCallback: (state: SpaceMouseState) => void) {
		this.onState = stateCallback;
		this.state = {
			supported: this.hid !== null,
			connected: false,
			name: null,
			axes: [0, 0, 0, 0, 0, 0],
			buttons: [false, false],
		};

		if (!this.hid) return;

		this.hid.addEventListener("connect", this.handleConnect);
		this.hid.addEventListener("disconnect", this.handleDisconnect);

		// Devices granted in an earlier session reconnect without a user gesture.
		this.hid.getDevices().then((devices) => {
			const d = devices.find(isSpaceMouse);
			if (d) this.attach(d);
		});

		// Reports arrive at ~60-125 Hz; coalesce React updates to one per frame.
		const tick = () => {
			if (this.disposed) return;
			if (this.dirty) {
				this.dirty = false;
				this.onState(this.getState());
			}
			this.rafId = requestAnimationFrame(tick);
		};
		this.rafId = requestAnimationFrame(tick);
	}

	public getState(): SpaceMouseState {
		return { ...this.state, axes: [...this.state.axes], buttons: [...this.state.buttons] };
	}

	/** Opens the browser's device picker. Must be called from a user gesture (click). */
	public async requestDevice(): Promise<boolean> {
		if (!this.hid) return false;
		try {
			const devices = await this.hid.requestDevice({ filters: HID_FILTERS });
			const d = devices.find(isSpaceMouse) ?? devices[0];
			if (!d) return false;
			await this.attach(d);
			return true;
		} catch (e) {
			console.warn("[spacemouse] requestDevice failed:", e);
			return false;
		}
	}

	public dispose() {
		this.disposed = true;
		if (this.rafId !== null) cancelAnimationFrame(this.rafId);
		this.hid?.removeEventListener("connect", this.handleConnect);
		this.hid?.removeEventListener("disconnect", this.handleDisconnect);
		this.detach();
	}

	private handleConnect = (e: Event) => {
		const d = (e as HIDConnectionEvent).device;
		if (!this.device && isSpaceMouse(d)) this.attach(d);
	};

	private handleDisconnect = (e: Event) => {
		if ((e as HIDConnectionEvent).device === this.device) this.detach();
	};

	private async attach(d: HIDDevice) {
		if (this.disposed) return;
		try {
			if (!d.opened) await d.open();
		} catch (e) {
			// Most common cause on Linux: /dev/hidraw* is root-only (missing udev rule).
			console.error(
				"[spacemouse] could not open device — check /dev/hidraw permissions (udev rule):",
				e
			);
			return;
		}
		this.device = d;
		d.addEventListener("inputreport", this.handleReport);
		this.state = {
			...this.state,
			connected: true,
			name: d.productName || "SpaceMouse",
			axes: [0, 0, 0, 0, 0, 0],
		};
		this.dirty = true;
	}

	private detach() {
		const d = this.device;
		this.device = null;
		if (d) {
			d.removeEventListener("inputreport", this.handleReport);
			d.close().catch(() => {});
		}
		// Neutral on disconnect so nothing downstream keeps a stale deflection.
		this.state = {
			...this.state,
			connected: false,
			name: null,
			axes: [0, 0, 0, 0, 0, 0],
			buttons: this.state.buttons.map(() => false),
		};
		this.dirty = true;
	}

	private handleReport = (e: Event) => {
		const { reportId, data } = e as HIDInputReportEvent;
		const int16 = (offset: number) => data.getInt16(offset, true);
		const axes = this.state.axes;

		if (reportId === 1 && data.byteLength >= 6) {
			axes[0] = normalise(int16(0), 0);
			axes[1] = normalise(int16(2), 1);
			axes[2] = normalise(int16(4), 2);
			if (data.byteLength >= 12) {
				axes[3] = normalise(int16(6), 3);
				axes[4] = normalise(int16(8), 4);
				axes[5] = normalise(int16(10), 5);
			}
		} else if (reportId === 2 && data.byteLength >= 6) {
			axes[3] = normalise(int16(0), 3);
			axes[4] = normalise(int16(2), 4);
			axes[5] = normalise(int16(4), 5);
		} else if (reportId === 3 && data.byteLength >= 1) {
			const nButtons = Math.max(2, Math.min(data.byteLength * 8, 32));
			const prev = this.state.buttons;
			const buttons = Array.from(
				{ length: nButtons },
				(_, i) => (data.getUint8(i >> 3) & (1 << (i & 7))) !== 0
			);
			buttons.forEach((pressed, i) => {
				if (pressed !== !!prev[i]) {
					window.dispatchEvent(
						new CustomEvent(pressed ? "spaceMouseButtonPressed" : "spaceMouseButtonReleased", {
							detail: { buttonIndex: i },
						})
					);
				}
			});
			this.state = { ...this.state, buttons };
		} else {
			return;
		}
		this.dirty = true;
	};
}

export default SpaceMouseController;
