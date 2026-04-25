import styles from "./style.module.sass";

/*
Author: Giovanni Ranieri
Year: 2024
Description: Button on the control page in the ROS node panel.
*/

function RosNodesButton({
	onClick,
	label,
}: {
	onClick: () => void;
	label: string;
}) {
	return (
		<div
			className={styles.container}
			onClick={onClick}
		>
			<span className={styles.label}>{label}</span>
		</div>
	);
}

export default RosNodesButton;