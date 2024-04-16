import React, { useEffect, useState } from "react";
import styles from "./style.module.sass";
import Logo from "../../components/Logo";
import { Size } from "../../utils/size.type";
import Timer from "../../components/Timer";
import ExpandButton from "../../components/ExpandButton";
import CameraView from "../../components/CameraView";
import GamepadHint from "../../components/GamepadHint";
import QuickAction from "../../components/QuickAction";

import NavIcon from "../../assets/images/icons/nav_logo.png";
import ScienceIcon from "../../assets/images/icons/science_logo.png";
import HDIcon from "../../assets/images/icons/handling_device_logo.png";
import Stop from "../../assets/images/icons/stop.png";
import Drill from "../../assets/images/icons/drill.png";
import SystemMode from "../../components/SystemMode";
import Simulation from "../../components/Simulation";

export default () => {
	const [dataOpen, setDataOpen] = useState(false);
	const [dataJson, setDataJson] = useState({});
	const [display, setDisplay] = useState("camera");

	return (
		<div className={"page " + styles.mainPage}>
			<div className={styles.header}>
				<Logo size={Size.SMALL} />
				<div className={styles.systems}>
					<SystemMode
						system="Navigation"
						currentMode="Auto"
						modes={["Auto", "Manual", "Off"]}
						onSelect={(mode) => console.log(mode)}
					/>
					<SystemMode
						system="Handling Device"
						currentMode="Auto"
						modes={["Auto", "Manual", "Off"]}
						onSelect={(mode) => console.log(mode)}
					/>
					<SystemMode
						system="Cameras"
						currentMode="Stream"
						modes={["Stream", "Off"]}
						onSelect={(mode) => console.log(mode)}
					/>
					<SystemMode
						system="Drill"
						currentMode="Off"
						modes={["On", "Off"]}
						onSelect={(mode) => console.log(mode)}
					/>
				</div>
				<Timer end={Date.now() + 10000} size={Size.SMALL} />
			</div>
			<div className={styles.control}>
				<div className={styles.data} style={{ width: dataOpen ? "15%" : 0 }}>
					{dataOpen && <h1>Rover Data</h1>}
					{
						// @ts-ignore
						dataOpen && !dataJson["rover"] && <p>No data yet</p>
					}
				</div>
				<div className={styles.visualization}>
					<div className={styles.expand}>
						<ExpandButton
							onClick={() => setDataOpen((old) => !old)}
							expanded={dataOpen}
						/>
					</div>
					{display === "camera" ? (
						<CameraView images={[]} />
					) : (
						<Simulation armJointAngles={[]} wheelsSpeed={[]} wheelsSteeringAngle={[]} />
					)}
					<div className={styles.infos}>
						<div>
							<h3>Current position</h3>
							<div className={styles.infoArrangement}>
								<div style={{ marginRight: "20px" }}>
									<p>X coordinate: 0</p>
									<p>Y coordinate: 0</p>
									<p>Orientation: 0</p>
								</div>
							</div>
						</div>
					</div>
					<div className={styles.previews}>
						<GamepadHint mode="NAV" selectorCallback={() => {}} visible />
						<div
							className={styles.simulation}
							onDoubleClick={() =>
								setDisplay((old) => (old === "camera" ? "simulation" : "camera"))
							}
						>
							{display !== "camera" ? (
								<CameraView images={[]} />
							) : (
								<Simulation
									armJointAngles={[]}
									wheelsSpeed={[]}
									wheelsSteeringAngle={[]}
								/>
							)}
						</div>
					</div>
					<div className={styles.actions}>
						<QuickAction onClick={() => {}} selected={false} icon={NavIcon} />
						<QuickAction onClick={() => {}} selected={true} icon={HDIcon} />
						<QuickAction onClick={() => {}} selected={false} icon={Drill} />
						<QuickAction onClick={() => {}} selected={false} icon={Stop} />
					</div>
				</div>
			</div>
		</div>
	);
};
