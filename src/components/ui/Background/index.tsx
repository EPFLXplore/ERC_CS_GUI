import React from "react";
import styles from "./style.module.sass";
import image from "../../../assets/images/background.jpg";

const Background = () => {
	return (
		<div className={styles.Background}>
			<img src={image} className={styles.Image} alt="Background" />
		</div>
	);
};

export default Background;
