import React, { useEffect, useRef } from "react";
import styles from "./style.module.sass";

const NPKComponents = ["Phosphate", "Azote", "Potassium"];
const ALLComponents = ["Temp", "Humidity", "Elec", "PH"];
const MASSComponents = ["Drill", "Container"];

export const Table = ({}: {}) => {
	let lines: { id: string; content: number }[];

	return (
		<div>
			<h2 className={styles.title}>{"Title"}</h2>
			<table className={styles.table}>
				<thead>
					<tr>
						<th>
							<text>Element</text>
						</th>
						<th>
							<text>Value</text>
						</th>
					</tr>
				</thead>
				<tbody>
					{/* {lines.map((line) => (
						<tr key={line.id}>
							<td>
								<text>{line.id}</text>
							</td>
							<td>
								<text>{line.content}</text>
							</td>
						</tr>
					))} */}
				</tbody>
			</table>
		</div>
	);
};
