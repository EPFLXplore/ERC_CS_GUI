import styles from "./style.module.sass";

/*
Author: Ugo Balducci
Year: 2024
Description: Toggle in the settings panel of the control page
*/

const ToggleFeature = ({
	title,
	onChange,
	value
}: {
	title: string;
	onChange: (mode: boolean) => void;
	value?: boolean;
}) => {
	if(value !== undefined) {
		return (
			<div className={styles.sliderContainer}>
				<h3 className={styles.sliderTitle}>{title}</h3>
				<label className={styles.switch}>
					<input
						type="checkbox"
						onChange={(e) => {
							onChange(e.target.checked);
						}}
						checked={value}
					/>
					<span className={`${styles.slider} ${styles.round}`}></span>
				</label>
			</div>
		);
	} else {
		return (
			<div className={styles.sliderContainer}>
				<h3 className={styles.sliderTitle}>{title}</h3>
				<label className={styles.switch}>
					<input
						type="checkbox"
						onChange={(e) => {
							onChange(e.target.checked);
						}}
					/>
					<span className={`${styles.slider} ${styles.round}`}></span>
				</label>
			</div>
		);
	}
	
};

export default ToggleFeature;
