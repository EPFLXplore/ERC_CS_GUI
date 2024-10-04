import styles from "./styles.module.sass";
import logo from "../../assets/images/logos/logo_XPlore.png";
import useRosBridge from "../../hooks/rosbridgeHooks";

import useAlert from "../../hooks/alertHooks";
import useRoverControls, { typeModal } from "../../hooks/roverControlsHooks";
import useRoverNetwork from "../../hooks/networkHooks";
import { getNetworkData } from "../../utils/roverStateParser";


const NetworkPage = () => {
	const [, showSnackbar] = useAlert();
	const [ros,] = useRosBridge(showSnackbar);
	const [logs, setLogs] = useRoverNetwork(ros);
	const [
		roverState,
		images,
		rotateCams,
		currentVideo,
		setCurrentVideo,
		dataOpen,
		setDataOpen,
		display,
		setDisplay,
		stateServices,
		stateActions,
		setStateActions,
		systemsModalOpen,
		setSystemsModalOpen,
		manualMode,
		modal,
		volumetric,
		setModal,
		dataFocus,
		cancelAction,
		cancelAllActions,
		launchAction,
		startService,
		changeMode,
		triggerDataFocus,
		point,
		setPoint,
		sentAction,
		setSendAction,
		setVolumetric,
	] = useRoverControls(ros, showSnackbar);


	return (
		<div className={"page " + styles.mainPage}>
			<div className={styles.header}>
				<img src={logo} className={styles.logo} alt="Logo Xplore" />
			</div>
			<div className={styles.control}>
			</div>
		</div>
	);
};


export default NetworkPage;
