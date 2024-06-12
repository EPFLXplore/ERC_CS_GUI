import styles from "./style.module.sass";

function QuickAction({
	onClick,
	selected,
	running,
	icon,
}: {
	onClick: () => void;
	selected: boolean;
	running: boolean;
	icon: string;
}) {
	return (
		<div
			className={`${styles.container} ${selected ? styles.selected : ""} ${
				running ? styles.running : ""
			}`}
			onClick={onClick}
		>
			<img className={styles.icon} src={icon} alt="icon" />
		</div>
	);
}

export default QuickAction;
