import { SPACEMOUSE_AXES, SpaceMouseAxis } from "../../../utils/SpaceMouse";

/*
Description: Drawn SpaceMouse (top view + side view) plus per-axis bars. Pure SVG, no assets.
The top view shows the puck sliding with TX/TY and twisting with RZ; the side view shows it
pressing/lifting with TZ and tilting with RX. RY is visible in the bars.
*/

const SpaceMouseDisplay = ({
	axes,
	buttons,
	activeColor = "#FF4345",
	inactiveColor = "black",
}: {
	axes: number[];
	buttons: boolean[];
	activeColor?: string;
	inactiveColor?: string;
}) => {
	const a = (i: SpaceMouseAxis) => axes[i] ?? 0;
	const moving = axes.some((v) => v !== 0);
	const puckFill = moving ? activeColor : inactiveColor;

	// Top view: device frame has +Y away from the user, so screen-up = +TY.
	const topDx = a(SpaceMouseAxis.TX) * 10;
	const topDy = a(SpaceMouseAxis.TY) * 10;
	const twist = a(SpaceMouseAxis.RZ) * -35;
	// Side view: +TZ is pushing down on the cap on 3Dconnexion devices.
	const sideDy = a(SpaceMouseAxis.TZ) * 6;
	const tilt = a(SpaceMouseAxis.RX) * 20;

	return (
		<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
			<svg width="150" height="110" viewBox="0 0 150 110" xmlns="http://www.w3.org/2000/svg">
				{/* Top view: base, two buttons, puck */}
				<rect x="5" y="5" width="80" height="100" rx="18" fill="black" />
				<rect
					x="12"
					y="80"
					width="30"
					height="18"
					rx="6"
					fill={buttons[0] ? activeColor : "#333"}
				/>
				<rect
					x="48"
					y="80"
					width="30"
					height="18"
					rx="6"
					fill={buttons[1] ? activeColor : "#333"}
				/>
				<circle cx="45" cy="42" r="30" fill="#2a2a2a" />
				<g
					style={{ transition: "transform 60ms linear" }}
					transform={`translate(${topDx} ${-topDy}) rotate(${twist} 45 42)`}
				>
					<circle cx="45" cy="42" r="24" fill={puckFill} stroke="#555" strokeWidth="2" />
					{/* Orientation notch so twist is visible */}
					<rect x="43" y="20" width="4" height="9" rx="2" fill="white" />
				</g>

				{/* Side view: base and cap */}
				<rect x="95" y="80" width="50" height="18" rx="5" fill="black" />
				<g
					style={{ transition: "transform 60ms linear" }}
					transform={`translate(0 ${sideDy}) rotate(${tilt} 120 70)`}
				>
					<rect x="104" y="52" width="32" height="26" rx="8" fill={puckFill} />
				</g>
			</svg>

			<div style={{ display: "grid", gridTemplateColumns: "auto 70px", gap: "2px 6px" }}>
				{SPACEMOUSE_AXES.map((label, i) => {
					const v = axes[i] ?? 0;
					return (
						<Bar key={label} label={label} value={v} activeColor={activeColor} />
					);
				})}
			</div>
		</div>
	);
};

const Bar = ({
	label,
	value,
	activeColor,
}: {
	label: string;
	value: number;
	activeColor: string;
}) => {
	const pct = Math.abs(value) * 50;
	return (
		<>
			<span style={{ color: "white", fontSize: "0.65rem", fontWeight: 600 }}>{label}</span>
			<div
				style={{
					position: "relative",
					height: 8,
					marginTop: 4,
					background: "#333",
					borderRadius: 4,
					overflow: "hidden",
				}}
			>
				<div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "#777" }} />
				<div
					style={{
						position: "absolute",
						top: 0,
						bottom: 0,
						left: value >= 0 ? "50%" : `${50 - pct}%`,
						width: `${pct}%`,
						background: activeColor,
					}}
				/>
			</div>
		</>
	);
};

export default SpaceMouseDisplay;
