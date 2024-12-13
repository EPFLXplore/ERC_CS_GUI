import React, { useState } from "react";
import styles from "./style.module.sass";
import ToggleFeature from "../../Controls/ToggleFeature";

/*
Author: Giovanni Ranieri and Matas Jones
Year: 2024
Description: Settings Modal. Shows the settings of the simulation. Actually it is not used.
*/

function SettingsModal({
	title = "Settings",
	volumetric,
	setVolumetric,
	onClose,
}: {
	title?: string;
	volumetric: boolean;
	setVolumetric: (mode: boolean) => void;
	onClose?: () => void;
}) {
	const [_volumetric, _setVolumetric] = useState(volumetric);

	const changeVolumetric = (mode: boolean) => {
		_setVolumetric(mode);
		setVolumetric(mode);
	};

	return (
		<div className={styles.Background} onClick={onClose}>
			<div className={styles.Modal} onClick={(e) => e.stopPropagation()}>
				<h1>{title}</h1>
				<div className={styles.CloseButton} onClick={onClose}></div>
				<ToggleFeature title="Volumetric" onChange={changeVolumetric} value={_volumetric} />
			</div>
		</div>
	);
}

export default SettingsModal;
