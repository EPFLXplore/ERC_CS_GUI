import { useNavigate } from "react-router-dom";
import Background from "../../components/ui/Background";
import Logo from "../../components/ui/Logo";
import { Size } from "../../data/size.type";
import styles from "./style.module.sass";
import useAlert from "../../hooks/alertHooks";
import AlertSnackbar from "../../components/ui/Snackbar";

const Home = () => {
	const navigate = useNavigate();
	const [snackbar] = useAlert();
	//const [, connected] = useRosBridge(showSnackbar);

	return (
		<div className="page">
			<Background />
			<div className={styles.header}>
				<Logo size={Size.LARGE} />
			</div>
			<div className={styles.body}>
				<button
					type="button"
					className={true ? styles.buttonStart : styles.buttonStartDisabled}
					onClick={() => {
						navigate("/control");
					}}
				>
					Start
				</button>
				<button
					type="button"
					className={true ? styles.buttonStart : styles.buttonStartDisabled}
					onClick={() => {
						navigate("/simulation");
					}}
				>
					Simulation
				</button>
				<button
					type="button"
					className={true ? styles.buttonStart : styles.buttonStartDisabled}
					onClick={() => {
						navigate("/network");
					}}
				>
					Network
				</button>
				<button
					type="button"
					className={true ? styles.buttonStart : styles.buttonStartDisabled}
					onClick={() => {
						navigate("/cameras");
					}}
				>
					Cameras
				</button>
			</div>
			<div className={styles.footer}>
				<div className={styles.links}>
					<button
						type="button"
						className={styles.buttonLinks}
						onClick={() =>
							window.open(
								"https://www.notion.so/xplore-doc/ERC-Workspace-8d4df6e2dbc441deac23240e28c90b46?pvs=4",
								"_blank"
							)
						}
					>
						Documentation
					</button>
					<button
						type="button"
						className={styles.buttonLinks}
						onClick={() =>
							window.open(
								"https://drive.google.com/drive/folders/0ALNSOmBqG6aAUk9PVA",
								"_blank"
							)
						}
					>
						Drive
					</button>
				</div>
			</div>
			<AlertSnackbar alertMessage={snackbar} />
		</div>
	);
};

export default Home;
