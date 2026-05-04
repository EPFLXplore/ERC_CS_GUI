import styles from "./style.module.sass";

/**
 * Shows Cyclone / RMW hints from REACT_APP_* (set by docker_humble_desktop run scripts).
 * Helps distinguish wrong DDS profile vs Control Station bugs.
 */
export default function RosDdsDevBanner() {
	const profile = process.env.REACT_APP_DDS_PROFILE?.trim();
	const domain = process.env.REACT_APP_ROS_DOMAIN_ID?.trim();
	const rmw = process.env.REACT_APP_RMW_IMPLEMENTATION?.trim();
	const uri = process.env.REACT_APP_CYCLONEDDS_URI?.trim();

	const profileLabel = profile && profile.length > 0 ? profile : "—";
	const domainLabel =
		domain !== undefined && domain !== null && domain.length > 0 ? domain : "0";
	const rmwLabel = rmw && rmw.length > 0 ? rmw : "—";
	const uriLabel = uri && uri.length > 0 ? uri : "—";

	const tooltip = [
		`DDS profile: ${profileLabel}`,
		`CYCLONEDDS_URI: ${uriLabel}`,
		`RMW: ${rmwLabel}`,
		`ROS_DOMAIN_ID: ${domainLabel}`,
	].join("\n");

	return (
		<div className={styles.banner} title={tooltip}>
			<div className={styles.title}>DDS / RMW (dev)</div>
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
