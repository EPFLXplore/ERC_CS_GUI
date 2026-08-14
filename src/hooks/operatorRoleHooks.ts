import { useEffect, useState } from "react";

/*
Description: Tells this browser whether it is the operator screen (the browser running on the NUC
itself) or just a viewer of the page the NUC serves.

Only the operator screen shows the HD confirmation dialogs and advertises the confirmation ROS
services. Every extra client used to do both, which meant (a) blocking overlays on screens that
cannot usefully answer them, and (b) N ROS service servers on the same name — rosbridge's duplicate
check is per-connection (advertise_service.py), so ROS 2 routed each call to an arbitrary client.
*/

export type OperatorRoleStatus =
	/** Nothing heard from the backend yet; using the loopback guess below. */
	| "seed"
	/** The backend answered. */
	| "resolved"
	/** The backend is unreachable; still using the loopback guess. */
	| "unreachable";

export type OperatorRole = {
	isOperator: boolean;
	status: OperatorRoleStatus;
};

const OVERRIDE_STORAGE_KEY = "erc-cs-operator-role-override-v1";

const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Same backend origin convention as the header polls (see components/ui/Header/index.tsx). */
function operatorRoleApiUrl(): string {
	if (typeof window === "undefined") return "http://127.0.0.1:5000/operator-role";
	const { protocol, hostname } = window.location;
	return `${protocol}//${hostname}:5000/operator-role`;
}

/**
 * Manual escape hatch: `?operator=1` / `?operator=0`, remembered for the tab. Without it, a NUC
 * opened on its own LAN IP while the backend is down would have no operator at all, and the rover
 * would block forever waiting for a confirmation nobody can answer.
 */
function readOverride(): boolean | null {
	if (typeof window === "undefined") return null;
	try {
		const fromQuery = new URLSearchParams(window.location.search).get("operator");
		if (fromQuery === "1" || fromQuery === "0") {
			const value = fromQuery === "1";
			window.sessionStorage.setItem(OVERRIDE_STORAGE_KEY, fromQuery);
			return value;
		}
		const stored = window.sessionStorage.getItem(OVERRIDE_STORAGE_KEY);
		if (stored === "1" || stored === "0") return stored === "1";
	} catch {
		// Private mode / disabled storage must not break role detection.
	}
	return null;
}

/**
 * Synchronous guess used until the backend answers, so a NUC browser opened on localhost is the
 * operator from the very first render and cannot miss a confirmation in the meantime.
 */
function loopbackSeed(): boolean {
	if (typeof window === "undefined") return false;
	return LOOPBACK_HOSTNAMES.has(window.location.hostname);
}

const INITIAL_RETRY_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;

const useOperatorRole = (): OperatorRole => {
	// Read once: `?operator=` is consumed at mount and persisted for the tab.
	const [override] = useState<boolean | null>(readOverride);
	const [role, setRole] = useState<OperatorRole>(() => ({
		isOperator: override ?? loopbackSeed(),
		status: override === null ? "seed" : "resolved",
	}));

	useEffect(() => {
		if (override !== null) return;

		const controller = new AbortController();
		let retryTimer: ReturnType<typeof setTimeout> | null = null;
		let delay = INITIAL_RETRY_DELAY_MS;
		let cancelled = false;

		const poll = async () => {
			try {
				const response = await fetch(operatorRoleApiUrl(), {
					signal: controller.signal,
					cache: "no-store",
				});
				if (!response.ok) throw new Error(`HTTP ${response.status}`);
				const body = await response.json();
				if (cancelled) return;
				const isOperator = body?.operator === true;
				setRole((current) =>
					current.isOperator === isOperator && current.status === "resolved"
						? current
						: { isOperator, status: "resolved" }
				);
			} catch (error) {
				if (cancelled || controller.signal.aborted) return;
				console.warn("[operator-role] backend unreachable:", error);
				// Keep the loopback seed rather than demoting: a NUC on localhost stays the operator
				// even with the backend down. Returning `current` unchanged on later retries keeps
				// the backoff from re-rendering the whole control page every few seconds.
				setRole((current) =>
					current.status === "unreachable" ? current : { ...current, status: "unreachable" }
				);
				retryTimer = setTimeout(poll, delay);
				delay = Math.min(delay * 2, MAX_RETRY_DELAY_MS);
			}
		};

		poll();

		return () => {
			cancelled = true;
			controller.abort();
			if (retryTimer !== null) clearTimeout(retryTimer);
		};
	}, [override]);

	return role;
};

export default useOperatorRole;
