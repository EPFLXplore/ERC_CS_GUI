import styles from "./style.module.sass";
import CellWifiIcon from "@mui/icons-material/CellWifi";
import {
	Battery2Bar,
	Battery0Bar,
	Battery1Bar,
	Battery3Bar,
	Battery4Bar,
	Battery5Bar,
	Battery6Bar,
	BatteryFullRounded,
} from "@mui/icons-material";

const Timer = ({
	battery,
	wifiLevel
}: {
	battery: number | string;
	wifiLevel: number | string
}) => {

	return (
		<div
			className={styles.timerSmall}
			onKeyDown={(e) => {
				e.stopPropagation();
			}}
		>
			<div className={styles.battery}>
				{getBatteryState(battery)}
				<p>{battery} {battery === "NO DATA" ? "" : "%"}</p>
			</div>
			<div className={styles.wifi}>
				<CellWifiIcon className={styles.icon} />
				<p>{wifiLevel} {wifiLevel === "NO DATA" ? "" : "dBm"}</p>
			</div>
		</div>
	);
};

export default Timer;


const getBatteryState = (battery: number | string) => {
	if (typeof battery == "number") {
		if (battery < 12.5) {
			return <Battery0Bar className={styles.icon} />;
		} else if (battery < 25) {
			return <Battery1Bar className={styles.icon} />;
		} else if (battery < 37.5) {
			return <Battery2Bar className={styles.icon} />;
		} else if (battery < 50) {
			return <Battery3Bar className={styles.icon} />;
		} else if (battery < 62.5) {
			return <Battery4Bar className={styles.icon} />;
		} else if (battery < 75) {
			return <Battery5Bar className={styles.icon} />;
		} else if (battery < 87.5) {
			return <Battery6Bar className={styles.icon} />;
		} else {
			return <BatteryFullRounded className={styles.icon} />;
		}
	} else {
		return <Battery0Bar className={styles.icon} />;
	}
};