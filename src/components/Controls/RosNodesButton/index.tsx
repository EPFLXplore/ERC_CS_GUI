import styles from "./style.module.sass";

/*
Author: Giovanni Ranieri
Year: 2024
Description: Button on the control page in the ROS node panel.
*/

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