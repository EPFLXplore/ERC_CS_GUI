import { roundToTwoDecimals } from "../../../utils/maths";
import styles from "./style.module.sass";
import RosNodesButton from "../../Controls/RosNodesButton";
import HDMotorStates from "../../../data/HDMotorStates.types";
import { useState } from "react";

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2024
Description: Panels on the control page. Depending on the type of the panel, it returns different
shapes of panel. The InfoBox is the simplest, with data - value. The second adds something in between,
for example the disconnected or connected for motors. The last is data - icon, for example the ROS nodes
panel.
*/

const ORANGE_THRESHOLD = 50
const RED_THRESHOLD = 80


export interface Info {
	name: string;
	value: any;
	unit?: string;
}

interface InfoBoxProps {
  title: string;
  infos: Info[];
  unit?: string;
  color?: boolean;
  usages?: number[]; // Optional, for CPU usage circles
  warning?: boolean; // Optional, for warning state
  triggerWarning?: (x: any) => boolean; // Optional, for triggering the warning based on some condition for the info.value
}

export interface WheelsInfo {
	info: Info,
	connected: string
}

export interface RosNodesInfo {
	name: string;
	summary: string;
	onClick: () => void;
	color?: string;
}

const InfoBox: React.FC<InfoBoxProps> = ({
  title,
  infos,
  unit,
  color = false,
  usages,
  warning = false,
  triggerWarning
}) => {
	const [isCollapsed, setIsCollapsed] = useState(false);

	return (
		<div className={styles.infos}>
			<div>
				<div className={styles.headerRow}>
					<h3 className={styles.infosTitle}>{title}</h3>
					<button
						type="button"
						className={styles.collapseButton}
						onClick={() => setIsCollapsed((prev) => !prev)}
					>
						{isCollapsed ? "Show" : "Hide"}
					</button>
				</div>
				{!isCollapsed && <div className={styles.infoArrangement}>
					{infos.map((info, index) => {
						const value =
							typeof info.value === "number"
								? roundToTwoDecimals(info.value)
								: info.value;
						return (
							<div className={styles.info} key={index}>
								<p className={styles.infoName}>{info.name}</p>
								{info.value === "NO DATA" ? 
								<p className={styles.infoValue}
									style={{color: !warning ? "" : (triggerWarning && triggerWarning(info.value) ? "#6fe6ccff" : "white")}}
									>{`${info.value}`}
								</p> :
								<p className={styles.infoValue} 
								style={{color: !color ? "" : (info.value === "Connected" ? "#00d009" : "red")}}>
									{`${value} ${unit ?? (info.unit ?? "")}`}</p>}
							</div>
						);
					})}
				</div>}

				{/* CPU cores section for Jetson cards */}
				{!isCollapsed && usages && usages.length > 0 && (
					<div className={styles.cpuSection}>
					<p className={styles.cpuSectionTitle}>CPU cores</p>
					<div className={styles.cpuCoreList}>
						{usages.map((u, i) => {
						const usage = Number.isFinite(u) ? Math.max(0, Math.min(100, u)) : 0
						const cls =
							usage >= RED_THRESHOLD
							? styles.red
							: usage >= ORANGE_THRESHOLD
							? styles.orange
							: styles.green

						return (
							<div
							key={i}
							className={`${styles.cpuCore} ${cls}`}
							title={`CPU ${i}: ${usage}%`}
							>
								<div className={styles.cpuCoreTop}>
									<span className={styles.cpuCoreLabel}>{`C${i + 1}`}</span>
									<span className={styles.cpuCoreValue}>{`${Math.round(usage)}%`}</span>
								</div>
								<div className={styles.cpuBar}>
									<div className={styles.cpuBarFill} style={{ width: `${usage}%` }} />
								</div>
							</div>
						)
						})}
					</div>
					</div>
				)}

			</div>
		</div>
	);
};

const ControllerInfoBox = ({ title, infos, unit }: { title: string; infos: WheelsInfo[]; unit?: string }) => {
	const [isCollapsed, setIsCollapsed] = useState(false);

	return (
		<div className={styles.infos_big}>
			<div>
				<div className={styles.headerRow}>
					<h3 className={styles.infosTitle}>{title}</h3>
					<button
						type="button"
						className={styles.collapseButton}
						onClick={() => setIsCollapsed((prev) => !prev)}
					>
						{isCollapsed ? "Show" : "Hide"}
					</button>
				</div>
				{!isCollapsed && <div className={styles.infoArrangementController}>
					{infos.map((info, index) => {
						return (
							<div className={styles.info} key={index}>
								<p className={styles.infoName}>{info.info.name}</p>
								
								{info.connected === "NO DATA" ?
									<p className={styles.infoNameNoData}>{info.connected}</p>

								: info.connected === "Disconnected" ?
									<p className={styles.infoNameNoData}>DISCONNECTED</p>

								: (info.connected === HDMotorStates.Fault || info.connected === HDMotorStates.FaultReactionActive) ? 
								<p className={styles.infoNameFault}>{info.connected}</p>

								: (info.connected === "Connected") ? 
									<p className={styles.infoNameColoredGreen}>{info.connected}</p>

								: <p className={styles.infoNameWeirdState}>{info.connected}</p>}
								<p className={styles.infoValueController}>{`${info.info.value} 
								${unit ?? (info.info.unit ?? "")}`}</p>
							</div>
						);
					})}
				</div>}
			</div>
		</div>
	);
};

const InfoBoxButton = ({ title, infos }: { title: string; infos: RosNodesInfo[] }) => {
	const [isCollapsed, setIsCollapsed] = useState(false);

	return (
		<div className={styles.infos}>
			<div>
				<div className={styles.headerRow}>
					<h3 className={styles.infosTitle}>{title}</h3>
					<button
						type="button"
						className={styles.collapseButton}
						onClick={() => setIsCollapsed((prev) => !prev)}
					>
						{isCollapsed ? "Show" : "Hide"}
					</button>
				</div>
				{!isCollapsed && <div className={styles.rosNodeArrangement}>
					{infos.map((info, index) => {
						return (
							<div className={styles.rosNodeRow} key={index}>
								<p className={styles.infoName}>{info.name}</p>
								<p className={styles.rosNodeSummary} style={{ color: info.color ?? "" }}>{info.summary}</p>
								<RosNodesButton onClick={info.onClick} label="info" />
							</div>
						);
					})}
				</div>}
			</div>
		</div>
	);
};

export {InfoBox, ControllerInfoBox, InfoBoxButton}
