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

type LinkPingRow = {
	host: string;
	ok: boolean;
	ms: number | null;
	method?: string;
	detail?: string;
};

type LinkPingState =
	| { status: "loading" }
	| { status: "ready"; rows: LinkPingRow[]; fetchError?: string };

const DEFAULT_ROWS: LinkPingRow[] = [
	{ host: "169.254.55.230", ok: false, ms: null },
	{ host: "169.254.55.231", ok: false, ms: null },
];

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
					hosts?: Array<{
						host?: string;
						ok?: boolean;
						ms?: number | null;
						method?: string;
						detail?: string;
					}>;
					host?: string;
					ms?: number | null;
					method?: string;
					detail?: string;
				};
				if (cancelled) return;

				if (Array.isArray(j.hosts) && j.hosts.length > 0) {
					const rows: LinkPingRow[] = j.hosts.map((h) => ({
						host: String(h.host ?? "—"),
						ok: Boolean(h.ok),
						ms: typeof h.ms === "number" && Number.isFinite(h.ms) ? h.ms : null,
						method: h.method,
						detail: h.detail,
					}));
					setLinkPing({ status: "ready", rows });
					return;
				}

				// Legacy single-host response
				if (j?.ok && typeof j.ms === "number" && Number.isFinite(j.ms)) {
					setLinkPing({
						status: "ready",
						rows: [
							{
								host: j.host ?? "169.254.55.230",
								ok: true,
								ms: j.ms,
								method: j.method,
							},
						],
					});
					return;
				}

				setLinkPing({
					status: "ready",
					rows: DEFAULT_ROWS.map((d) => ({
						...d,
						detail: j?.detail ?? (r.ok ? undefined : `HTTP ${r.status}`),
					})),
					fetchError: j?.detail,
				});
			} catch (e) {
				if (!cancelled) {
					setLinkPing({
						status: "ready",
						rows: DEFAULT_ROWS.map((d) => ({
							...d,
							detail: e instanceof Error ? e.message : String(e),
						})),
						fetchError: e instanceof Error ? e.message : String(e),
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

	const rows: LinkPingRow[] =
		linkPing.status === "ready" ? linkPing.rows : DEFAULT_ROWS;

	const linkPingTitle =
		linkPing.status === "loading"
			? "Measuring…"
			: linkPing.fetchError
				? `Link check (${linkPingApiUrl()}): ${linkPing.fetchError}`
				: rows
						.map((row) =>
							row.ok && row.ms != null
								? `${row.method ?? "RTT"} ${row.host}: ${row.ms.toFixed(2)} ms`
								: `${row.host}: ${row.detail ?? "—"}`
						)
						.join("\n");

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
			<div className={styles.linkPingWrap} title={linkPingTitle}>
				{linkPing.status === "loading" ? (
					<div className={styles.linkPingRow}>
						<p className={styles.linkPingHost}>…</p>
						<p className={styles.linkPingValue}>…</p>
					</div>
				) : (
					rows.map((row) => (
						<div key={row.host} className={styles.linkPingRow}>
							<p className={styles.linkPingHost}>{row.host}</p>
							<p className={styles.linkPingValue}>
								{row.ok && row.ms != null
									? `${row.ms.toFixed(2)} ms${
											row.method && row.method.startsWith("tcp:") ? "*" : ""
										}`
									: "—"}
							</p>
						</div>
					))
				)}
			</div>
		</div>
	);
};

export default Header;
