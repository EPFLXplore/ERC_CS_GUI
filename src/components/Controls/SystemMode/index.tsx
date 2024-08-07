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

	const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedMode = event.target.value;
        if (selectedMode !== currentMode) {
            onSelect(selectedMode);
        }
    }
	
	return (
		<div className={`${styles.system}`}>
			<h2 className={`${styles.name}`}>{system}</h2>
			<select name="mode" id="mode" onChange={handleChange} value={currentMode} className={styles.select}>
				{modes.map((mode) => (
					<option value={mode}>
						{mode}
					</option>
				))}
			</select>
		</div>
	);
}

export default SystemMode;
