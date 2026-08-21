import { useEffect, useMemo, useState } from "react";
import type { StateTopicDiagnostic } from "../../../hooks/roverStateHooks";
import styles from "./style.module.sass";

interface RosDdsDevBannerProps {
	rosConnected?: boolean;
	stateTopics?: StateTopicDiagnostic[];
}

const STALE_TOPIC_MS = 4000;

function formatAge(timestamp: number, now: number): string {
	if (!timestamp) return "never";
	const ageSeconds = Math.max(0, (now - timestamp) / 1000);
	if (ageSeconds < 10) return `${ageSeconds.toFixed(1)}s`;
	return `${Math.round(ageSeconds)}s`;
}

/**
 * Shows Cyclone / RMW hints from REACT_APP_* (set by docker_humble_desktop run scripts).
 * Helps distinguish wrong DDS profile vs Control Station bugs.
 */
export default function RosDdsDevBanner({
	rosConnected = false,
	stateTopics = [],
}: RosDdsDevBannerProps) {
	const profile = process.env.REACT_APP_DDS_PROFILE?.trim();
	const domain = process.env.REACT_APP_ROS_DOMAIN_ID?.trim();
	const rmw = process.env.REACT_APP_RMW_IMPLEMENTATION?.trim();
	const uri = process.env.REACT_APP_CYCLONEDDS_URI?.trim();
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 1000);
		return () => window.clearInterval(timer);
	}, []);

	const profileLabel = profile && profile.length > 0 ? profile : "—";
	const domainLabel =
		domain !== undefined && domain !== null && domain.length > 0 ? domain : "0";
	const rmwLabel = rmw && rmw.length > 0 ? rmw : "—";
	const uriLabel = uri && uri.length > 0 ? uri : "—";
	const rosbridgeStatus = rosConnected ? "connected" : "disconnected";

	const topicRows = useMemo(
		() =>
			stateTopics.map((topic) => {
				const hasParsed = topic.lastParsedAt > 0;
				const hasRecentParse = hasParsed && now - topic.lastParsedAt <= STALE_TOPIC_MS;
				const hasNewerError = topic.lastErrorAt > topic.lastParsedAt;
				const hasRawOnly = topic.lastMessageAt > 0 && topic.lastParsedAt === 0;
				const status = hasNewerError || hasRawOnly ? "error" : hasRecentParse ? "ok" : "stale";
				const ageLabel = hasNewerError
					? "parse error"
					: hasRawOnly
						? "raw only"
						: hasParsed
							? `${formatAge(topic.lastParsedAt, now)} ago`
							: "no data";

				return {
					...topic,
					status,
					ageLabel,
				};
			}),
		[now, stateTopics]
	);

	const tooltip = [
		`rosbridge: ${rosbridgeStatus}`,
		`DDS profile: ${profileLabel}`,
		`CYCLONEDDS_URI: ${uriLabel}`,
		`RMW: ${rmwLabel}`,
		`ROS_DOMAIN_ID: ${domainLabel}`,
		...topicRows.map((topic) => `${topic.label}: ${topic.topicName} — ${topic.status}`),
	].join("\n");

	return (
		<div className={styles.banner} title={tooltip}>
			<div className={styles.title}>Data Path</div>
			<div className={styles.statusRow}>
				<span
					className={`${styles.dot} ${rosConnected ? styles.dotOk : styles.dotError}`}
					aria-hidden="true"
				/>
				<strong>rosbridge</strong> {rosbridgeStatus}
			</div>
			{topicRows.map((topic) => (
				<div className={styles.statusRow} key={topic.topicName}>
					<span
						className={`${styles.dot} ${
							topic.status === "ok"
								? styles.dotOk
								: topic.status === "error"
									? styles.dotError
									: styles.dotStale
						}`}
						aria-hidden="true"
					/>
					<strong>{topic.label}</strong> {topic.ageLabel}
				</div>
			))}
			<div className={styles.divider} />
			<div className={styles.row}>
				<strong>profile</strong> {profileLabel}
			</div>
			<div className={styles.row}>
				<strong>URI</strong> {uriLabel}
			</div>
			<div className={styles.row}>
				<strong>RMW</strong> {rmwLabel} · <strong>DOMAIN</strong> {domainLabel}
			</div>
		</div>
	);
}
