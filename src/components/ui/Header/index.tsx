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

/**
 * RouterOS wifi registration-table rate fields: bare numeric strings are raw
 * bps (e.g. "229400000"); the legacy wifi package instead embeds the rate as
 * a prefix like "866.7Mbps-40MHz/2S/SGI". Normalize both to "X.X Mbps".
 */
function formatWifiRate(rate: string | null): string | null {
	if (rate == null) return null;
	if (/^\d+(\.\d+)?$/.test(rate)) {
		return `${(Number(rate) / 1_000_000).toFixed(1)} Mbps`;
	}
	const match = rate.match(/^(\d+(\.\d+)?)\s*Mbps/i);
	return match ? `${Number(match[1]).toFixed(1)} Mbps` : rate;
}

/**
 * RouterOS reports the live channel as "<freq>/<mode>" (e.g. "5745/ax"). Falls back to the
 * configured `channel.frequency`, which may be a range like "5745-5765".
 */
function formatWifiChannel(channel: string | null, frequency: string | null): string | null {
	const source = channel ?? frequency;
	if (!source) return null;
	const [freq, mode] = source.split("/");
	return mode ? `${freq} MHz ${mode}` : `${freq} MHz`;
}

/** "20mhz" -> "20 MHz" */
function formatWifiWidth(width: string | null): string | null {
	if (!width) return null;
	const match = width.match(/^(\d+(?:\/\d+)*)\s*mhz$/i);
	return match ? `${match[1]} MHz` : width;
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
	ssid: string | null;
	channel: string | null;
	width: string | null;
	mode: string | null;
	txPower: string | null;
	raw: Record<string, unknown>;
};

const EMPTY_WIFI_INFO: WifiInfo = {
	signal: null,
	txRate: null,
	rxRate: null,
	ssid: null,
	channel: null,
	width: null,
	mode: null,
	txPower: null,
	raw: {},
};

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
					radio?: {
						ssid?: string | null;
						width?: string | null;
						frequency?: string | null;
						channel?: string | null;
						mode?: string | null;
						txPower?: string | null;
					} | null;
				};
				if (cancelled) return;

				const signal = Number(j.signal);
				const raw = j.raw ?? {};
				const radio = j.radio ?? null;
				// The registration table already carries the SSID we are associated with; the
				// interface config is only a fallback.
				const ssid =
					typeof raw["ssid"] === "string" ? (raw["ssid"] as string) : radio?.ssid ?? null;
				const channel = formatWifiChannel(radio?.channel ?? null, radio?.frequency ?? null);
				const width = formatWifiWidth(radio?.width ?? null);
				const mode = radio?.mode ?? null;
				// RouterOS reports tx-power in dBm. Labelled "TX power" rather than "TX" so it is
				// not read as the throughput shown alongside it.
				const txPower = radio?.txPower != null ? `TX power ${radio.txPower} dBm` : null;
				// Use live throughput (bits-per-second), not tx-rate/rx-rate — those report
				// the negotiated PHY link rate, which stays pinned near the radio's max
				// regardless of actual traffic.
				const txRate = formatWifiRate(
					typeof raw["tx-bits-per-second"] === "string" ? raw["tx-bits-per-second"] : null
				);
				const rxRate = formatWifiRate(
					typeof raw["rx-bits-per-second"] === "string" ? raw["rx-bits-per-second"] : null
				);
				setWifiInfo(
					j.ok && Number.isFinite(signal)
						? { signal, txRate, rxRate, ssid, channel, width, mode, txPower, raw }
						: EMPTY_WIFI_INFO
				);
			} catch {
				if (!cancelled) setWifiInfo(EMPTY_WIFI_INFO);
			}
		};

		void pollWifi();
		const id = window.setInterval(() => void pollWifi(), 1000);
		return () => {
			cancelled = true;
			window.clearInterval(id);
		};
	}, []);

	const rows: LinkPingRow[] =
		linkPing.status === "ready" ? linkPing.rows : DEFAULT_ROWS;

	const { signal, txRate, rxRate, ssid, channel, width, mode, txPower, raw } = wifiInfo;
	const radioLabel = [ssid, channel, width, mode, txPower].filter(Boolean).join(" · ");
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
				{radioLabel !== "" && <p className={styles.wifiRadio}>{radioLabel}</p>}
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
