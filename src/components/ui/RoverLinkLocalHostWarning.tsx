import React, { useMemo, useState } from "react";
import { Alert } from "@mui/material";

const SESSION_DISMISS_KEY = "cs_rover_subnet_banner_dismissed";

function parseIpv4(host: string): [number, number, number, number] | null {
	const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
	if (!m) return null;
	const parts = m.slice(1, 5).map((x) => Number(x));
	if (parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
	return parts as [number, number, number, number];
}

/** True when hostname is an IPv4 host that is not loopback and not 169.254.55.x (rover link-local). */
function shouldWarnNonRoverLinkLocal(hostname: string): boolean {
	const quad = parseIpv4(hostname);
	if (quad === null) return false;
	const [a, b, c, d] = quad;
	if (a === 127 && b === 0 && c === 0 && d === 1) return false;
	if (a === 169 && b === 254 && c === 55) return false;
	return true;
}

/**
 * Banner when the CS is opened via a host IP that is not the expected rover Ethernet
 * link-local 169.254.55.x range (matches CRA “On Your Network” using Wi‑Fi/VPN instead).
 */
const RoverLinkLocalHostWarning: React.FC = () => {
	const [dismissed, setDismissed] = useState(
		() => sessionStorage.getItem(SESSION_DISMISS_KEY) === "1"
	);

	const show = useMemo(() => {
		if (dismissed || typeof window === "undefined") return false;
		return shouldWarnNonRoverLinkLocal(window.location.hostname);
	}, [dismissed]);

	if (!show) return null;

	const dismiss = () => {
		sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
		setDismissed(true);
	};

	const origin = typeof window !== "undefined" ? window.location.origin : "";

	return (
		<Alert
			severity="warning"
			variant="filled"
			onClose={dismiss}
			sx={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				zIndex: 20000,
				borderRadius: 0,
				justifyContent: "center",
				"& .MuiAlert-message": { width: "100%", textAlign: "center" },
			}}
		>
			You are using <strong>{origin}</strong> — for direct rover Ethernet, open the control station
			on <strong>169.254.55.x</strong> (the dev server “On Your Network” line should show that
			subnet, not another interface like Wi‑Fi).
		</Alert>
	);
};

export default RoverLinkLocalHostWarning;
