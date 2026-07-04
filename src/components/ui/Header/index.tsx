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

function wifiSignalApiUrl(): string {
	if (typeof window === "undefined") {
		return "http://127.0.0.1:5000/wifi-signal";
	}
	const { protocol, hostname } = window.location;
	return `${protocol}//${hostname}:5000/wifi-signal`;
}

/** dBm -> mW, using the standard RF power reference (0 dBm = 1 mW). */
function dbmToMilliwatts(dbm: number): number {
	return Math.pow(10, dbm / 10);
}

const WIFI_QUALITY_BANDS: { min: number; label: string; color: string }[] = [
	{ min: -50, label: "Very Good", color: "#2e7d32" },
	{ min: -60, label: "Good", color: "#8bc34a" },
	{ min: -67, label: "OK", color: "#cddc39" },
	{ min: -75, label: "Mid", color: "#ffc107" },
	{ min: -85, label: "Bad", color: "#ff9800" },
	{ min: -Infinity, label: "Shit", color: "#f44336" },
];

function wifiQuality(dbm: number): { label: string; color: string } {
	const band = WIFI_QUALITY_BANDS.find((b) => dbm >= b.min);
	return band ?? WIFI_QUALITY_BANDS[WIFI_QUALITY_BANDS.length - 1];
}

type WifiInfo = {
	signal: number | null;
	txRate: string | null;
	rxRate: string | null;
	raw: Record<string, unknown>;
};

const EMPTY_WIFI_INFO: WifiInfo = { signal: null, txRate: null, rxRate: null, raw: {} };

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

const Header = () => {
	const [linkPing, setLinkPing] = useState<LinkPingState>({ status: "loading" });
	const [wifiInfo, setWifiInfo] = useState<WifiInfo>(EMPTY_WIFI_INFO);

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

	useEffect(() => {
		let cancelled = false;

		const pollWifi = async () => {
			try {
				const r = await fetch(wifiSignalApiUrl());
				const j = (await r.json()) as {
					ok?: boolean;
					signal?: number | string;
					raw?: Record<string, unknown>;
				};
				if (cancelled) return;

				const signal = Number(j.signal);
				const raw = j.raw ?? {};
				const txRate = typeof raw["tx-rate"] === "string" ? raw["tx-rate"] : null;
				const rxRate = typeof raw["rx-rate"] === "string" ? raw["rx-rate"] : null;
				setWifiInfo(
					j.ok && Number.isFinite(signal)
						? { signal, txRate, rxRate, raw }
						: EMPTY_WIFI_INFO
				);
			} catch {
				if (!cancelled) setWifiInfo(EMPTY_WIFI_INFO);
			}
		};

		void pollWifi();
		const id = window.setInterval(() => void pollWifi(), 2000);
		return () => {
			cancelled = true;
			window.clearInterval(id);
		};
	}, []);

	const rows: LinkPingRow[] =
		linkPing.status === "ready" ? linkPing.rows : DEFAULT_ROWS;

	const { signal, txRate, rxRate, raw } = wifiInfo;
	const quality = signal != null ? wifiQuality(signal) : null;
	const milliwatts = signal != null ? dbmToMilliwatts(signal) : null;

	const wifiTitle =
		signal == null
			? "No wifi data"
			: Object.entries(raw)
					.map(([key, value]) => `${key}: ${value}`)
					.join("\n");

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
			<div className={styles.wifi} title={wifiTitle}>
				<CellWifiIcon className={styles.icon} />
				<p>{signal != null ? `${signal} dBm` : "NO DATA"}</p>
				{signal != null && milliwatts != null && (
					<p className={styles.wifiMw}>({milliwatts.toExponential(2)} mW)</p>
				)}
				{quality != null && (
					<p className={styles.wifiQuality} style={{ color: quality.color }}>
						{quality.label}
					</p>
				)}
				{(txRate != null || rxRate != null) && (
					<p className={styles.wifiRate}>
						{txRate != null && `TX ${txRate}`}
						{txRate != null && rxRate != null && " / "}
						{rxRate != null && `RX ${rxRate}`}
					</p>
				)}
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
