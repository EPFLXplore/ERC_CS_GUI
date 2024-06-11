import styles from "./style.module.sass";

function SystemMode({
	system,
	currentMode,
	modes,
	onSelect,
}: {
	system: string;
	currentMode: any;
	modes: string[];
	onSelect: (mode: string) => void;
}) {
	
	return (
		<div className={`${styles.system}`}>
			<h2 className={`${styles.name}`}>{system}</h2>
			<select name="mode" id="mode" value={currentMode} className={styles.select}>
				{modes.map((mode) => (
					<option value={mode} onClick={() => {
						
						// Click on the current mode does nothing
						if(mode != currentMode) {
							onSelect(mode)
						}
					}}>
						{mode}
					</option>
				))}
			</select>
		</div>
	);
}

export default SystemMode;
