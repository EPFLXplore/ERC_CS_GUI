import { roundToTwoDecimals } from "../../../utils/maths";
import styles from "./style.module.sass";

export interface Info {
	name: string;
	value: any;
	unit?: string;
}

export interface WheelsInfo {
	info: Info,
	connected: string
}

const InfoBox = ({ title, infos, unit }: { title: string; infos: Info[]; unit?: string }) => {
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
								<p className={styles.infoValue}>{`${info.value} ${unit ?? (info.unit ?? "")}`}</p>}
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
				<div className={styles.infoArrangement}>
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
								<p className={styles.infoValue}>{`${info.info.value} 
								${unit ?? (info.info.unit ?? "")}`}</p>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
};

export {InfoBox, ControllerInfoBox}
