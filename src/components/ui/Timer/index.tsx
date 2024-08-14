import styles from "./style.module.sass";
import { Status } from "../../../data/status.type";
import PlayArrowIcon from "@mui/icons-material/PlayArrowRounded";
import PauseIcon from "@mui/icons-material/PauseRounded";
import Replay10Icon from "@mui/icons-material/Replay10Rounded";
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
import useTimer from "../../../hooks/timerHooks";
import axios from "axios";
//import https from 'https';
//import { exec } from 'child_process';

const Timer = ({
	onFinished,
	status = Status.IDLE,
	battery = -1,
	wifiLevel = 0,
}: {
	onFinished?: () => void;
	status?: Status;
	battery?: number;
	wifiLevel?: number;
}) => {
	const [minutes, seconds, active, inputFocused, changeTime, setActive, setInputFocused] =
		useTimer(onFinished);

	return (
		<div
			className={styles.timerSmall}
			onKeyDown={(e) => {
				e.stopPropagation();
			}}
		>
			<p className={`${styles.status} ${status}`} />
			<div className={styles.battery}>
				{getBatteryState(battery)}
				<p>{battery === -1 ? "?" : battery}%</p>
			</div>
			<div className={styles.wifi}>
				<CellWifiIcon className={styles.icon} />
				<p>{wifiLevel === 0 ? "?" : wifiLevel} dBm</p>
			</div>
			<div className={styles.time}>
				<input
					type="text"
					maxLength={2}
					value={inputFocused ? undefined : timeRepresentation(minutes, true)}
					onFocus={(e) => {
						e.target.value = "";
						setInputFocused(true);
					}}
					onBlur={(e) => {
						if (e.target.value !== "") {
							changeTime(parseInt(e.target.value), seconds);
						}
						setInputFocused(false);
					}}
					className={styles.input}
				/>
				<p className={styles.comma}>:</p>
				<input
					type="text"
					maxLength={2}
					value={inputFocused ? undefined : timeRepresentation(seconds, true)}
					onFocus={(e) => {
						e.target.value = "";
						setInputFocused(true);
					}}
					onBlur={(e) => {
						if (e.target.value !== "") {
							changeTime(minutes, parseInt(e.target.value));
						}
						setInputFocused(false);
					}}
					className={styles.input}
				/>
				<button className={styles.button} onClick={() => setActive(!active)}>
					{active ? (
						<PauseIcon className={styles.icon} />
					) : (
						<PlayArrowIcon className={styles.icon} />
					)}
				</button>
				<button className={styles.button} onClick={() => changeTime(minutes, seconds + 10)}>
					<Replay10Icon className={styles.icon} />
				</button>
			</div>
		</div>
	);
};

export default Timer;

////////////////////////////METHODS///////////////////////////

const timeRepresentation = (time: number, active = true) => {
	if (time < 10 && active) {
		return `0${time}`;
	} else {
		return time.toString();
	}
};

const getBatteryState = (battery: number) => {
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
};
