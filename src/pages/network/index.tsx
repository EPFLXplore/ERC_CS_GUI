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
import Paper from '@mui/material/Paper';
import { color } from "three/examples/jsm/nodes/shadernode/ShaderNode";


const NetworkPage = () => {
	const [, showSnackbar] = useAlert();
	const [ros,] = useRosBridge(showSnackbar);
	const [logs, setLogs] = useRoverNetwork(ros);
	const [
		roverState,
		cameraStates,
		images,
		currentVideo,
		setCurrentVideo,
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

		
    	<div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', marginRight: '30px', marginLeft : '125px'}}>
        {/* Signal Caracteristics */}
        <TableContainer className={styles.RightTable}>
		<h3 style={{ textAlign: 'center' }}>Signal Caracteristics</h3> 
          <Table>
            <TableBody>
            	<TableRow>
                <TableCell sx={{color: 'white'}} align="center">Signal Strength</TableCell>
                <TableCell sx={{color: 'white'}} align="center"> {
				//@ts-ignore	
				//getNetworkData(roverState)['signal_strength']
				}</TableCell>
              	</TableRow>
				<TableRow>
                <TableCell sx={{color: 'white'}} align="center">Main IP</TableCell>
                <TableCell sx={{color: 'white'}} align="center"> {
				//@ts-ignore	
				//getNetworkData(roverState)['ipv4']
				}</TableCell>
              	</TableRow>
				<TableRow>
                <TableCell sx={{color: 'white'}} align="center">Main MAC</TableCell>
                {/* <TableCell sx={{color: 'white'}} align="center"> {
				//@ts-ignore	
				getNetworkData(roverState)['mac']}</TableCell> */}
              	</TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* Connected devices */}
        <TableContainer className={styles.LeftTable} style={{marginLeft : '20px'}}>
		<h3 style={{ textAlign: 'center' }}>Connected devices</h3> 
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{color: 'white'}}  align="center"> Device </TableCell>
                <TableCell sx={{color: 'white'}}  align="center"> Time </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
			{/* {Array.isArray(networkData) ? networkData[3] : networkData.devices.map((dev: any, index: number) => (
              <TableRow>
                <TableCell sx={{color: 'white'}} align="center">{dev.device}
				</TableCell>
                <TableCell sx={{color: 'white'}} align="center">{dev.time}</TableCell>
              </TableRow>
			))} */}
            </TableBody>
          </Table>
        </TableContainer>
    	</div>

		<div className={styles.TabContainer}>
			<TableContainer>
				<div className={styles.TabContent}>
				<h3 style={{ textAlign: 'center' }}>Logs</h3> 
				<Table>
					<TableHead>
					<TableRow>
						<TableCell  sx={{color: 'white'}} align="right">ID</TableCell>
						<TableCell  sx={{color: 'white'}} align="right">Topic</TableCell>
						<TableCell  sx={{color: 'white'}} align="right">Time</TableCell>
						<TableCell  sx={{color: 'white'}} align="right">Content</TableCell>
					</TableRow>
					</TableHead>
					<TableBody>
						{/* {getLogs(roverState).map((log: any, index: number) => (
							<TableRow>
							<TableCell  sx={{color: 'white'}} align="right"> {log.id} </TableCell>
							<TableCell  sx={{color: 'white'}} align="right">{log.topics}</TableCell>
							<TableCell  sx={{color: 'white'}} align="right">{log.time}</TableCell>
							<TableCell  sx={{color: 'white'}} align="right">{log.message}</TableCell>
							</TableRow>
						))} */}
					</TableBody>
				</Table>
				</div>
			</TableContainer>
			</div>
		</div>
	);
};



export default NetworkPage;
