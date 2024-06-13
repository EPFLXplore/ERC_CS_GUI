import States from "../../utils/States";
import styles from "./style.module.sass";

function QuickAction({
	onClick,
	selected,
	running,
	icon,
}: {
	onClick: () => void;
	selected: boolean;
	running: string;
	icon: string;
}) {
	return (
		<div
			className={`${styles.container} ${selected ? styles.selected : ""} ${
				running !== States.OFF ? styles.running : ""
			}`}
			onClick={onClick}
		>
			<img className={styles.icon} src={icon} alt="icon" />
		</div>
	);
}

export default QuickAction;
