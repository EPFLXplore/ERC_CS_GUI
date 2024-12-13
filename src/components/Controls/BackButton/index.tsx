import React from "react";
import styles from "./style.module.sass";
import image from "../../../assets/images/icons/back_button.png";
import { useNavigate } from "react-router-dom";

/*
Author: Ugo Balducci
Year: 2024
Description: Button on the Log page to return on the control page
*/


const BackButton = ({ onGoBack }: { onGoBack?: () => void }) => {
	const navigate = useNavigate();

	return (
		<button
			className={styles.Back}
			onClick={() => {
				if (onGoBack) onGoBack();
				navigate(-1);
			}}
		>
			<img src={image} className={styles.Image} alt="Background" />
		</button>
	);
};

export default BackButton;
