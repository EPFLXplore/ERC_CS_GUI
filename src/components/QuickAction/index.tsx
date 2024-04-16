import styles from "./style.module.sass";

function QuickAction({
	onClick,
	selected,
	icon,
}: {
	onClick: () => void;
	selected: boolean;
	icon: string;
}) {
	return (
		<div className={`${styles.container} ${selected ? styles.selected : ""}`} onClick={onClick}>
			<img className={styles.icon} src={icon} alt="icon" />
		</div>
	);
}

export default QuickAction;
