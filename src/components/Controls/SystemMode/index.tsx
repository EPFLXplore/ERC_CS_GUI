import styles from "./style.module.sass";

/*
Author: Ugo Balducci
Year: 2023
Description: Sliders with choices to select the subsystem mode. It's on the control page
*/

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
	
	// A <select> whose value matches no option silently displays the first one (e.g. "Auto"),
	// which hides a mode mismatch with the rover. Show the unknown value instead, unselectable.
	const isKnown = modes.includes(currentMode);

	return (
		<div className={`${styles.system}`}>
			<h2 className={`${styles.name}`}>{system}</h2>
			<div className={styles.selectWrapper}>
				<select name="mode" id="mode" onChange={handleChange} value={String(currentMode)} className={styles.select}>
					{!isKnown && (
						<option value={String(currentMode)} disabled>
							{`Unknown (${String(currentMode)})`}
						</option>
					)}
					{modes.map((mode) => (
						<option key={mode} value={mode}>
							{mode}
						</option>
					))}
				</select>
				<span className={styles.chevron} aria-hidden="true" />
			</div>
		</div>
	);
}

export default SystemMode;
