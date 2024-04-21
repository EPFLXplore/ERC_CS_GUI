import { useState } from "react";
import styles from "./style.module.sass";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

function RoverData({
	json,
	triggerDataFocus,
	focusedData,
}: {
	json: object;
	triggerDataFocus: (data: string) => void;
	focusedData: string[];
}) {
	return (
		<div className={`${styles.container}`}>
			{Object.keys(json).map((key) => {
				console.log(key);
				return (
					<div className={styles.systems}>
						<RoverCategory
							category={
								// @ts-ignore
								json[key]
							}
							key={key}
							name={key}
							triggerDataFocus={triggerDataFocus}
							focusedData={focusedData}
							isSystem
						/>
					</div>
				);
			})}
		</div>
	);
}

const RoverCategory = ({
	category,
	key,
	name,
	isSystem = false,
	triggerDataFocus,
	focusedData,
}: {
	category: object;
	key: string;
	name: string;
	isSystem?: boolean;
	triggerDataFocus: (data: string) => void;
	focusedData: string[];
}) => {
	const [open, setOpen] = useState(false);

	return (
		<>
			<div key={key} className={styles.category} onClick={() => setOpen((old) => !old)}>
				<h3 className={isSystem ? styles.system : styles.categoryTitle}>
					{name[0].toUpperCase() + name.substring(1)}
				</h3>
				<ExpandMoreIcon
					sx={{
						color: "white",
						transform: open ? "rotate(-180deg)" : "rotate(0deg)",
						transition: "all 0.2s ease-out",
					}}
				/>
			</div>
			{open && (
				<div key={key + "_subdata"} className={styles.subdata}>
					{Object.keys(category).map((subdata) => {
						// @ts-ignore
						if (typeof category[subdata] === "object") {
							return (
								<RoverCategory
									// @ts-ignore
									category={category[subdata]}
									key={key + "|" + subdata}
									name={subdata}
									triggerDataFocus={triggerDataFocus}
									focusedData={focusedData}
								/>
							);
							// @ts-ignore
						} else if (typeof category[subdata] === "boolean") {
							return (
								<div className={styles.data} key={key + "|" + subdata}>
									<p>
										<input
											type="checkbox"
											checked={focusedData.includes(key + "|" + subdata)}
											onClick={() => triggerDataFocus(key + "|" + subdata)}
										/>
										{subdata[0].toUpperCase() + subdata.substring(1) + ": "}
									</p>
									<p className={styles.value}>
										{
											// @ts-ignore
											category[subdata] ? (
												<CheckCircleIcon
													sx={{ color: "#5CCE7C", width: 20 }}
												/>
											) : (
												<CancelIcon sx={{ color: "#FF4444", width: 20 }} />
											)
										}
									</p>
								</div>
							);
						} else {
							return (
								<div className={styles.data} key={key + "|" + subdata}>
									<p>
										<input
											type="checkbox"
											checked={focusedData.includes(key + "|" + subdata)}
											onClick={() => triggerDataFocus(key + "|" + subdata)}
										/>
										{subdata[0].toUpperCase() + subdata.substring(1) + ": "}
									</p>
									<p className={styles.value}>
										{
											// @ts-ignore
											category[subdata]
										}
									</p>
								</div>
							);
						}
					})}
				</div>
			)}
		</>
	);
};

export default RoverData;
