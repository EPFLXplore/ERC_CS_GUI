import { useNavigate } from "react-router-dom";
import Background from "../../components/ui/Background";
import Logo from "../../components/ui/Logo";
import { Size } from "../../data/size.type";
import styles from "./style.module.sass";
import useRosBridge from "../../hooks/rosbridgeHooks";
import useAlert from "../../hooks/alertHooks";
import AlertSnackbar from "../../components/ui/Snackbar";

const Home = () => {
	const navigate = useNavigate();
	const [snackbar, showSnackbar] = useAlert();
	const [, connected] = useRosBridge(showSnackbar);

	return (
		<div className="page">
			<Background />
			<div className={styles.header}>
				<Logo size={Size.LARGE} />
			</div>
			<div className={styles.body}>
				<a
					className={connected ? styles.buttonStart : styles.buttonStartDisabled}
					onClick={() => {
						if (connected) navigate("/control");
					}}
				>
					Start
				</a>
				<a
					className={connected ? styles.buttonStart : styles.buttonStartDisabled}
					onClick={() => {
						if (connected) navigate("/simulation");
					}}
				>
					Simulation
				</a>
				<a
					className={connected ? styles.buttonStart : styles.buttonStartDisabled}
					onClick={() => {
						if (connected) navigate("/network");
					}}
				>
					Network
				</a>
				<a
					className={connected ? styles.buttonStart : styles.buttonStartDisabled}
					onClick={() => {
						if (connected) navigate("/cameras");
					}}
				>
					Cameras
				</a>
			</div>
			<div className={styles.footer}>
				<div className={styles.links}>
					<a
						className={styles.buttonLinks}
						onClick={() =>
							window.open(
								"https://www.notion.so/xplore-doc/ERC-Workspace-8d4df6e2dbc441deac23240e28c90b46?pvs=4",
								"_blank"
							)
						}
					>
						Documentation
					</a>
					<a
						className={styles.buttonLinks}
						onClick={() =>
							window.open(
								"https://drive.google.com/drive/folders/0ALNSOmBqG6aAUk9PVA",
								"_blank"
							)
						}
					>
						Drive
					</a>
				</div>
				<div className={styles.state}>
					<div
						className={styles.indicator}
						style={{ background: connected ? "#5CCE7C" : "#FF4444" }}
					/>
					<div className={styles.text}>Rover {connected ? "Connected" : "Off"}</div>
				</div>
			</div>
			<AlertSnackbar alertMessage={snackbar} />
		</div>
	);
};

export default Home;
