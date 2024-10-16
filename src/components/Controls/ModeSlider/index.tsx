import styles from "./style.module.sass";
import { useState } from "react";

export default ({
	name,
	mode,
	startMode,
	functionTrigger,
}: {
	name: string;
	mode: Array<string>;
	startMode?: number;
	functionTrigger: (mode: number) => void;
}) => {
	const [activeIndex, setActiveIndex] = useState(startMode || 0);
	//const texts = ["IK", "FK"];

	const _setActiveIndex = (mode: number) => {
		functionTrigger(mode);
		setActiveIndex(mode);
	};

	const handlePrev = () => {
		const newMode = (activeIndex - 1 + mode.length) % mode.length;
		_setActiveIndex(newMode);
	};

	const handleNext = () => {
		const newMode = (activeIndex + 1 + mode.length) % mode.length;
		_setActiveIndex(newMode);
	};

	return (
		<div className={styles.sliderContainer}>
			<h3 className={styles.sliderTitle}>{name}</h3>
			<div className={styles.sliderArrows}>
				<button onClick={handlePrev}>{"<"}</button>
				<span className={styles.sliderText}>{mode[activeIndex]}</span>
				<button onClick={handleNext}>{">"}</button>
			</div>
		</div>
	);
};
