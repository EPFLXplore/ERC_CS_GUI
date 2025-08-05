import styles from "./styles.module.sass";
import logo from "../../assets/images/logos/logo_XPlore.png";
import useRosBridge from "../../hooks/rosbridgeHooks";

import useAlert from "../../hooks/alertHooks";
import useRoverControls from "../../hooks/roverControlsHooks";
import useRoverNetwork from "../../hooks/networkHooks";
import { getLogs, getNetworkData} from "../../utils/roverStateParser";
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { XTerm } from 'react-xtermjs'

const MyTerminal = () => {
	const onData = (data: any) => {
	  console.log(`Received data: ${data}`)
	}
  
	const onResize = ({ cols, rows }: { cols: number; rows: number }) => {
	  console.log(`Terminal resized to ${cols} columns and ${rows} rows`)
	}
  
	return (
	  <XTerm
		options={{ cursorBlink: true }}
		style={{ width: '100%', height: '100%' }}
		listeners={{
		  onData,
		  onResize,
		}}
	  />
	)
  }

const NetworkPage = () => {
	const [, showSnackbar] = useAlert();
	const [ros,] = useRosBridge(showSnackbar);
	const [logs, setLogs] = useRoverNetwork(ros);
	const [
		roverState,
		qrCode,
		setQrCode,
		hdStackLaunched,
		hdConfirmation,
		hdConfirmationRocks,
		imageRock,
		setImageRock,
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
		point,
		setPoint,
		setVolumetric,
		rosModalOpen,
		setRosModalOpen,
		modalRosNodes,
		setModalRosNodes,
	] = useRoverControls(ros, showSnackbar);

	const networkData = getNetworkData(roverState);

	return (
		<div className={"page " + styles.mainPage}>
			<div className={styles.header}>
				<img src={logo} className={styles.logo} alt="Logo Xplore" />
			</div>

			<MyTerminal />
		
    	</div>
	);
};



export default NetworkPage;
