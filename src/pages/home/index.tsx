import React from "react";
import { useNavigate } from "react-router-dom";
import Background from "../../components/Background";
import Logo from "../../components/Logo";
import { Size } from "../../utils/size.type";
import styles from "./style.module.sass";

export default () => {
	const navigate = useNavigate();
	const [connected, setConnected] = React.useState(false);

	return (
		<div className="page">
			<Background />
			<div className={styles.header}>
				<Logo size={Size.LARGE} />
			</div>
			<div className={styles.body}>
				<a
					className={styles.buttonStart}
					onClick={() => {
						if (connected) navigate("/new_control_page");
					}}
				>
					Start
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
								"https://drive.google.com/drive/folders/0AEpe4eawL6pdUk9PVA",
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
		</div>
	);
};
