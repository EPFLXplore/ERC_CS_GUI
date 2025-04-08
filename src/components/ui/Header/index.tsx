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

/*
Author: Ugo Balducci and Giovanni Ranieri
Year: 2024
Description: Header of information on the control page: battery level and network dbm
*/

const Header = ({
	wifiLevel
}: {
	wifiLevel: number | string
}) => {

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
		</div>
	);
};

export default Header;