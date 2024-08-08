import { Themes } from "../../../utils/themes";
import styles from "./style.module.sass";

const LogFilter = ({
	name,
	active,
	onActivate,
	onDisactivate,
	color,
}: {
	name: string;
	active: boolean;
	onActivate: () => void;
	onDisactivate: () => void;
	color: Omit<Themes, Themes.DARK | Themes.LIGHT>;
}) => {
	const getColorType = (type: Omit<Themes, Themes.DARK | Themes.LIGHT>) => {
		switch (type) {
			case Themes.GREY:
				return styles.Grey;
			case Themes.BROWN:
				return styles.Brown;
			case Themes.ORANGE:
				return styles.Orange;
			default:
				return styles.Red;
		}
	};

	const handleClick = () => {
		if (active) {
			onDisactivate();
		} else {
			onActivate();
		}
	};

	return (
		<button
			className={`${getColorType(color)} ${active ? styles.Filled : styles.Outlined} ${
				styles.Filter
			}`}
			onClick={handleClick}
		>
			{name}
		</button>
	);
};

export default LogFilter;
