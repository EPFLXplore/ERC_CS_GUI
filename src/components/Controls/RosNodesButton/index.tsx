import styles from "./style.module.sass";

function RosNodesButton({
	onClick,
	icon,
}: {
	onClick: () => void;
	icon: string;
}) {
	return (
		<div
			className={styles.container}
			onClick={onClick}
		>
			<img className={styles.icon} src={icon} alt="icon" />
		</div>
	);
}

export default RosNodesButton;