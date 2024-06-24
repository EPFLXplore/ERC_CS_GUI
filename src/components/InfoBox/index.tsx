import { roundToTwoDecimals } from "../../utils/maths";
import styles from "./style.module.sass";

export type Info = {
	name: string;
	value: any;
};

export default ({ title, infos, unit }: { title: string; infos: Info[]; unit?: string }) => {
	return (
		<div className={styles.infos}>
			<div>
				<h3 className={styles.infosTitle}>{title}</h3>
				<div className={styles.infoArrangement}>
					{infos.map((info, index) => (
						<div className={styles.info} key={index}>
							<p className={styles.infoName}>{info.name}</p>
							<p className={styles.infoValue}>{`${info.value} ${unit ?? ""}`}</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
