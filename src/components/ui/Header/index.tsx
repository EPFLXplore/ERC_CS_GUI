import styles from "./style.module.sass";
import React, { useEffect, useState } from "react";
import CellWifiIcon from "@mui/icons-material/CellWifi";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2024
Description: Header of information on the control page: battery level and network dbm
*/

function linkPingApiUrl(): string {
	if (typeof window === "undefined") {
		return "http://127.0.0.1:5000/link-ping";
	}
	const { protocol, hostname } = window.location;
	return `${protocol}//${hostname}:5000/link-ping`;
}

type LinkPingState =
	| { status: "loading" }
	| { status: "ok"; host: string; ms: number; method?: string }
	| { status: "unavailable"; host?: string; detail?: string };

const Header = ({
	wifiLevel
}: {
	wifiLevel: number | string
}) => {
	const [linkPing, setLinkPing] = useState<LinkPingState>({ status: "loading" });

	useEffect(() => {
		let cancelled = false;

		const poll = async () => {
			const url = linkPingApiUrl();
			try {
				const r = await fetch(url);
				const j = (await r.json()) as {
					ok?: boolean;
					host?: string;
					ms?: number | null;
					method?: string;
					detail?: string;
				};
				if (cancelled) return;
				if (j?.ok && typeof j.ms === "number" && Number.isFinite(j.ms)) {
					setLinkPing({
						status: "ok",
						host: j.host ?? "169.254.55.230",
						ms: j.ms,
						method: j.method,
					});
				} else {
					setLinkPing({
						status: "unavailable",
						host: j?.host,
						detail: j?.detail ?? (r.ok ? undefined : `HTTP ${r.status}`),
					});
				}
			} catch (e) {
				if (!cancelled) {
					setLinkPing({
						status: "unavailable",
						detail: e instanceof Error ? e.message : String(e),
					});
				}
			}
		};

		void poll();
		const id = window.setInterval(() => void poll(), 2000);
		return () => {
			cancelled = true;
			window.clearInterval(id);
		};
	}, []);

	const linkPingTitle =
		linkPing.status === "ok"
			? `${linkPing.method ?? "RTT"} to ${linkPing.host}: ${linkPing.ms.toFixed(2)} ms`
			: linkPing.status === "unavailable"
				? `Link check failed (${linkPingApiUrl()}). ${linkPing.detail ?? "Is ssh_backend running on port 5000?"}`
				: "Measuring…";

	const linkPingLabel =
		linkPing.status === "ok"
			? linkPing.host
			: linkPing.status === "unavailable" && linkPing.host
				? linkPing.host
				: "169.254.55.230";

	const linkPingValue =
		linkPing.status === "loading"
			? "…"
			: linkPing.status === "ok"
				? `${linkPing.ms.toFixed(2)} ms${linkPing.method && linkPing.method.startsWith("tcp:") ? "*" : ""}`
				: "—";

	return (
		<div
			className={styles.timerSmall}
			onKeyDown={(e) => {
				e.stopPropagation();
			}}
		>
			<div className={styles.wifi}>
				<CellWifiIcon className={styles.icon} />
				<p>{wifiLevel} {wifiLevel === "NO DATA" ? "" : "dBm"}</p>
			</div>
			<div className={styles.linkPing} title={linkPingTitle}>
				<p className={styles.linkPingHost}>{linkPingLabel}</p>
				<p className={styles.linkPingValue}>{linkPingValue}</p>
			</div>
		</div>
	);
};

export default Header;