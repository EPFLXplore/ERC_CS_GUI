type HdMode = "direct" | "inverse";

type HdModeBindings = {
	axisMap: number[];
	buttonMap: number[];
};

export type HdBindingsConfig = {
	version: number;
	direct: HdModeBindings;
	inverse: HdModeBindings;
};

export const HD_BINDINGS_STORAGE_KEY = "erc_cs_hd_bindings_v1";
export const HD_BINDINGS_EVENT = "erc-cs-hd-bindings-updated";

export const CANONICAL_AXIS_NAMES = [
	"LEFT_STICK_X",
	"LEFT_STICK_Y",
	"RIGHT_STICK_X",
	"RIGHT_STICK_Y",
	"LT",
	"RT",
] as const;

export const CANONICAL_BUTTON_NAMES = [
	"A",
	"B",
	"X",
	"Y",
	"LB",
	"RB",
	"BACK",
	"START",
	"LEFT_STICK",
	"RIGHT_STICK",
	"UP",
	"DOWN",
	"LEFT",
	"RIGHT",
	"HOME",
] as const;

const AXIS_COUNT = CANONICAL_AXIS_NAMES.length;
const BUTTON_COUNT = CANONICAL_BUTTON_NAMES.length;

export const HD_MODE_DESCRIPTIONS: Record<HdMode, string[]> = {
	direct: [
		"J1 = RIGHT_STICK_X",
		"J2 = RIGHT_STICK_Y",
		"J3 = RT (RB reverses sign)",
		"J4 = LT (LB reverses sign)",
		"J5 = LEFT_STICK_Y",
		"J6 = LEFT_STICK_X",
		"Gripper: B/X (+/-), Y/A fine (+/-)",
	],
	inverse: [
		"TX = RIGHT_STICK_X",
		"TZ = RIGHT_STICK_Y",
		"TY = RT - LT",
		"RY = -LEFT_STICK_X",
		"RX = -LEFT_STICK_Y",
		"RZ = RB/LB",
		"Gripper: B/X (+/-), Y/A fine (+/-)",
	],
};

function identityMap(length: number): number[] {
	return Array.from({ length }, (_, index) => index);
}

export function getDefaultHdBindingsConfig(): HdBindingsConfig {
	return {
		version: 1,
		direct: {
			axisMap: identityMap(AXIS_COUNT),
			buttonMap: identityMap(BUTTON_COUNT),
		},
		inverse: {
			axisMap: identityMap(AXIS_COUNT),
			buttonMap: identityMap(BUTTON_COUNT),
		},
	};
}

function sanitizeMap(mapValue: unknown, expectedLength: number): number[] {
	if (!Array.isArray(mapValue) || mapValue.length !== expectedLength) {
		return identityMap(expectedLength);
	}

	return mapValue.map((value, index) => {
		if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value >= expectedLength) {
			return index;
		}
		return value;
	});
}

function sanitizeModeBindings(modeValue: unknown): HdModeBindings {
	const mode = modeValue && typeof modeValue === "object" ? (modeValue as Partial<HdModeBindings>) : {};
	return {
		axisMap: sanitizeMap(mode.axisMap, AXIS_COUNT),
		buttonMap: sanitizeMap(mode.buttonMap, BUTTON_COUNT),
	};
}

function sanitizeConfig(raw: unknown): HdBindingsConfig {
	const fallback = getDefaultHdBindingsConfig();
	if (!raw || typeof raw !== "object") {
		return fallback;
	}

	const partial = raw as Partial<HdBindingsConfig>;
	return {
		version: typeof partial.version === "number" ? partial.version : 1,
		direct: sanitizeModeBindings(partial.direct),
		inverse: sanitizeModeBindings(partial.inverse),
	};
}

export function loadHdBindingsConfig(): HdBindingsConfig {
	if (typeof window === "undefined") {
		return getDefaultHdBindingsConfig();
	}

	try {
		const raw = window.localStorage.getItem(HD_BINDINGS_STORAGE_KEY);
		if (!raw) {
			return getDefaultHdBindingsConfig();
		}
		return sanitizeConfig(JSON.parse(raw));
	} catch {
		return getDefaultHdBindingsConfig();
	}
}

export function saveHdBindingsConfig(config: HdBindingsConfig): void {
	if (typeof window === "undefined") {
		return;
	}

	const sanitized = sanitizeConfig(config);
	window.localStorage.setItem(HD_BINDINGS_STORAGE_KEY, JSON.stringify(sanitized));
	window.dispatchEvent(new CustomEvent(HD_BINDINGS_EVENT, { detail: sanitized }));
}

export function applyHdBindingMap(
	buttons: readonly boolean[],
	axes: readonly number[],
	modeBindings: HdModeBindings
): { buttons: boolean[]; axes: number[] } {
	const mappedButtons = modeBindings.buttonMap.map((sourceIndex, targetIndex) => {
		const safeIndex = sourceIndex >= 0 && sourceIndex < buttons.length ? sourceIndex : targetIndex;
		return Boolean(buttons[safeIndex]);
	});

	const mappedAxes = modeBindings.axisMap.map((sourceIndex, targetIndex) => {
		const safeIndex = sourceIndex >= 0 && sourceIndex < axes.length ? sourceIndex : targetIndex;
		const value = axes[safeIndex];
		return typeof value === "number" ? value : 0;
	});

	return {
		buttons: mappedButtons,
		axes: mappedAxes,
	};
}
