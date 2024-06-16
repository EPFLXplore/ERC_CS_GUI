import React, { SyntheticEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import Background from "../../components/Background";
import Logo from "../../components/Logo";
import { Size } from "../../utils/size.type";
import styles from "./style.module.sass";
import useRosBridge from "../../hooks/rosbridgeHooks";
import { Alert, Snackbar } from "@mui/material";

export default () => {
	const navigate = useNavigate();
	const [connected, setConnected] = useState(false);

	// @ts-ignore
	const [snackbar, setSnackbar] = useState<State>({
		open: false,
		severity: "error",
		message: "This is a snackbar",
	});
	const { severity, message, open } = snackbar;

	// Show a snackbar with a message and a severity
	// Severity can be "error", "warning", "info" or "success"
	const showSnackbar = (severity: string, message: string) => {
		setSnackbar({ severity, message, open: true });
	};

	const handleClose = (event?: SyntheticEvent | Event, reason?: string) => {
		if (reason === "clickaway") {
			return;
		}

		setSnackbar({ ...snackbar, open: false });
	};

	const [ros] = useRosBridge(showSnackbar);

	// Check if the rover is connected
	React.useEffect(() => {
		if (ros) {
			let num_checks = 0;
			const check = setInterval(() => {
				ros.getNodes(
					(nodes) => {
						if (nodes.includes("/ROVER")) {
							setConnected(true);
							clearInterval(check);
						} else {
							num_checks++;

							setConnected(false);

							if (num_checks % 20 === 0) {
								// Show a snackbar
								setConnected(false);
							}
						}
					},
					(error) => {
						// Show a snackbar
						console.error(error);
						clearInterval(check);
					}
				);
			}, 1000);
		}
	}, [ros]);

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
			<Snackbar
				open={open}
				autoHideDuration={4000}
				onClose={handleClose}
				anchorOrigin={{ vertical: "top", horizontal: "center" }}
				sx={{ position: "absolute" }}
			>
				<Alert
					onClose={handleClose}
					severity={severity}
					variant="filled"
					sx={{ width: "100%", whiteSpace: "pre-line", borderRadius: 3 }}
				>
					{message}
				</Alert>
			</Snackbar>
		</div>
	);
};
