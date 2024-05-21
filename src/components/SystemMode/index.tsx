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
	onSelect: (mode: string) => Promise<any>;
}) {

	console.log("currentmode " + currentMode)

	const changeMode = async (e: string) => {
		await onSelect(e).then((value) => {
			//console.log(value)
		}).catch(err => console.log(err))
	}

	return (
		<div className={`${styles.system}`}>
			<h2 className={`${styles.name}`}>{system}</h2>
			<select name="mode" id="mode" value={currentMode} className={styles.select}>
				{modes.map((mode) => (
					<option value={mode} onClick={() => onSelect(mode)}>
						{mode}
					</option>
				))}
			</select>
		</div>
	);
}

export default SystemMode;
