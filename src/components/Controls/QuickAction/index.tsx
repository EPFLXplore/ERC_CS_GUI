import States from "../../../data/states.type";
import styles from "./style.module.sass";

/*
Author: Ugo Balducci
Year: 2022
Description: Buttons for Actions on control page. It's the different modals
*/

function QuickAction({
	onClick,
	selected,
	running,
	icon,
	tooltip
}: {
	onClick: () => void;
	selected: boolean;
	running: string;
	icon: string;
	tooltip: string;
}) {
	return (
		<div
			className={`${styles.container} ${selected ? styles.selected : ""} ${
				running !== States.OFF ? styles.running : ""
			}`}
			onClick={onClick}
		>
			<img className={styles.icon} src={icon} alt="icon" />
			<span className={styles.tooltip}>{tooltip}</span>
		</div>
	);
}

export default QuickAction;
