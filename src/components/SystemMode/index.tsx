import styles from "./style.module.sass";

function SystemMode({
	system,
	currentMode,
	modes,
	onSelect,
}: {
	system: string;
	currentMode: string;
	modes: string[];
	onSelect: (mode: string) => void;
}) {

	if (!currentMode) {
		currentMode = 'Off'
	}

	return (
		<div className={`${styles.system}`}>
			<h2 className={`${styles.name}`}>{system}</h2>
			<select name="mode" id="mode" value={currentMode} className={styles.select}>
				{modes.map((mode) => (
					<option value={mode} onClick={() => {
						onSelect(mode);
					}
					}>
						{mode}
					</option>
				))}
			</select>
		</div>
	);
}

export default SystemMode;
