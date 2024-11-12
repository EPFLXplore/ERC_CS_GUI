import { roundToTwoDecimals } from "../../../utils/maths";
import styles from "./style.module.sass";
import RosNodesButton from "../../Controls/RosNodesButton";

export interface Info {
	name: string;
	value: any;
	unit?: string;
}

export interface WheelsInfo {
	info: Info,
	connected: string
}

export interface RosNodesInfo {
	name: string;
	onClick: () => void;
    icon: string;
}

const InfoBox = ({ title, infos, unit, color = false }: { title: string; infos: Info[]; unit?: string, color?: boolean }) => {
	return (
		<div className={styles.infos}>
			<div>
				<h3 className={styles.infosTitle}>{title}</h3>
				<div className={styles.infoArrangement}>
					{infos.map((info, index) => {
						const value =
							typeof info.value === "number"
								? roundToTwoDecimals(info.value)
								: info.value;
						return (
							<div className={styles.info} key={index}>
								<p className={styles.infoName}>{info.name}</p>
								{info.value === "NO DATA" ? 
								<p className={styles.infoValue}>{`${info.value}`}</p> :
								<p className={styles.infoValue} 
								style={{color: !color ? "" : (info.value == "Connected" ? "#00d009" : "red")}}>
									{`${info.value} ${unit ?? (info.unit ?? "")}`}</p>}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

const ControllerInfoBox = ({ title, infos, unit }: { title: string; infos: WheelsInfo[]; unit?: string }) => {
	return (
		<div className={styles.infos_big}>
			<div>
				<h3 className={styles.infosTitle}>{title}</h3>
				<div className={styles.infoArrangementController}>
					{infos.map((info, index) => {
						const value =
							typeof info.info.value === "number"
								? roundToTwoDecimals(info.info.value)
								: info.info.value;
						return (
							<div className={styles.info} key={index}>
								<p className={styles.infoName}>{info.info.name}</p>
								{(info.connected === "NO DATA" || info.connected !== "Connected") ?
									<p className={styles.infoNameColoredRed}>{info.connected}</p>
								: <p className={styles.infoNameColoredGreen}>{info.connected}</p>}
								<p className={styles.infoValueController}>{`${info.info.value} 
								${unit ?? (info.info.unit ?? "")}`}</p>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

const InfoBoxButton = ({ title, infos }: { title: string; infos: RosNodesInfo[] }) => {
	return (
		<div className={styles.infos}>
			<div>
				<h3 className={styles.infosTitle}>{title}</h3>
				<div className={styles.infoArrangement}>
					{infos.map((info, index) => {
						return (
							<div className={styles.info} key={index}>
								<p className={styles.infoName}>{info.name}</p>
							
								<RosNodesButton onClick={info.onClick} icon={info.icon}/>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export {InfoBox, ControllerInfoBox, InfoBoxButton}
