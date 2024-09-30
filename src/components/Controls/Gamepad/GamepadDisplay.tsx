import * as React from "react";

export default ({
	buttonLeft,
	buttonUp,
	buttonDown,
	buttonRight,
	directionUp,
	directionDown,
	directionLeft,
	directionRight,
	analogLeft,
	analogRight,
	analogLeftDirection,
	analogRightDirection,
	select,
	start,
	home,
	rearLeft,
	rearRight,
	triggerLeft,
	triggerRight,
	activeColor = "#2F80ED",
	inactiveColor = "black",
	isControlling = false,
	...props
}: {
	buttonLeft: boolean;
	buttonUp: boolean;
	buttonDown: boolean;
	buttonRight: boolean;
	directionUp: boolean;
	directionDown: boolean;
	directionLeft: boolean;
	directionRight: boolean;
	analogLeft: boolean;
	analogRight: boolean;
	analogLeftDirection: string[];
	analogRightDirection: string[];
	select: boolean;
	start: boolean;
	home: boolean;
	rearLeft: boolean;
	rearRight: boolean;
	triggerLeft: number;
	triggerRight: number;
	activeColor?: string;
	inactiveColor?: string;
	isControlling?: boolean;
}) => {
	// Method to calculate the direction of the analog stick
	const createTransform = (direction: string) => {
		switch (direction) {
			case "up":
				return "translateY(-10px)";
			case "down":
				return "translateY(10px)";
			case "left":
				return "translateX(-10px)";
			case "right":
				return "translateX(10px)";

			default:
				return "";
		}
	};

	// Method to interpolate between two colors
	const colorInterpolator2 = (value: number, colorFrom: string, colorTo: string) => {
		const from = parseInt(colorFrom.slice(1), 16);
		const to = parseInt(colorTo.slice(1), 16);
		const r = Math.round(((to >> 16) - (from >> 16)) * value + (from >> 16));
		const g = Math.round(
			(((to >> 8) & 0xff) - ((from >> 8) & 0xff)) * value + ((from >> 8) & 0xff)
		);
		const b = Math.round(((to & 0xff) - (from & 0xff)) * value + (from & 0xff));
		return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
	};

	const colorInterpolator = (value: number, colorFrom: string, colorTo: string) => {
		// Convert hex color strings to integers
		const from = parseInt(colorFrom.slice(1), 16);
		const to = parseInt(colorTo.slice(1), 16);
		
		// Adjust the value from [-1, 1] to the range [0, 1]
		const adjustedValue = (value + 1) / 2;  // Converts -1 to 0 and 1 to 1
	
		// Interpolate the red component
		const r = Math.round(((to >> 16) - (from >> 16)) * adjustedValue + (from >> 16));
	
		// Interpolate the green component
		const g = Math.round(
			(((to >> 8) & 0xff) - ((from >> 8) & 0xff)) * adjustedValue + ((from >> 8) & 0xff)
		);
	
		// Interpolate the blue component
		const b = Math.round(((to & 0xff) - (from & 0xff)) * adjustedValue + (from & 0xff));
	
		// Combine the components back into a hex color and return
		return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
	};
	

	return (
		<svg
			width="230"
			height="160"
			viewBox="0 0 800 636"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M697.568 176.275C675.149 161.942 691.323 153.754 668.118 136.011C644.913 118.269 550.739 88.2361 534.355 101.885C517.971 115.534 499.553 118.261 499.553 118.261H400.094H399.926H300.458C300.458 118.261 282.031 115.534 265.656 101.885C249.28 88.2361 155.096 118.261 131.893 136.011C108.689 153.754 124.862 161.942 102.443 176.275C80.0232 190.608 21.3326 388.52 21.3326 388.52C21.3326 388.52 -55.1004 608.955 81.39 635.569C81.39 635.569 114.834 614.417 143.49 580.29C172.156 546.164 228.11 497.713 258.143 497.029C287.518 496.363 395.224 497.003 399.917 497.029C399.917 497.029 399.95 497.029 400.001 497.029C400.061 497.029 400.087 497.029 400.087 497.029C404.78 497.003 512.486 496.363 541.861 497.029C571.886 497.713 627.849 546.164 656.514 580.29C685.179 614.417 718.613 635.569 718.613 635.569C855.103 608.955 778.67 388.52 778.67 388.52C778.67 388.52 719.988 190.608 697.568 176.275ZM604.169 172.654C623.104 172.654 638.499 188.058 638.499 206.983C638.499 225.907 623.094 241.312 604.169 241.312C585.245 241.312 569.84 225.915 569.84 206.983C569.84 188.05 585.235 172.654 604.169 172.654ZM551.6 225.198C570.533 225.198 585.929 240.595 585.929 259.527C585.929 278.46 570.524 293.856 551.6 293.856C532.674 293.856 517.269 278.452 517.269 259.527C517.269 240.603 532.666 225.198 551.6 225.198ZM458.107 237.564C470.22 237.564 480.07 247.423 480.07 259.536C480.07 271.648 470.22 281.499 458.107 281.499C445.995 281.499 436.143 271.648 436.143 259.536C436.143 247.423 445.995 237.564 458.107 237.564ZM128.354 258.161C128.354 220.836 158.725 190.473 196.051 190.473C233.376 190.473 263.739 220.836 263.739 258.161C263.739 295.487 233.376 325.857 196.051 325.857C158.725 325.856 128.354 295.487 128.354 258.161ZM353.634 405.014C353.634 407.344 351.743 409.235 349.414 409.235H318.453V440.206C318.453 442.534 316.562 444.426 314.232 444.426H280.807C278.477 444.426 276.586 442.535 276.586 440.206V409.235H245.625C243.296 409.235 241.405 407.345 241.405 405.014V371.589C241.405 369.259 243.296 367.37 245.625 367.37H276.586V336.399C276.586 334.069 278.477 332.179 280.807 332.179H314.232C316.562 332.179 318.453 334.069 318.453 336.399V367.37H349.414C351.743 367.37 353.634 369.259 353.634 371.589V405.014ZM343.456 281.492C331.343 281.492 321.493 271.641 321.493 259.529C321.493 247.416 331.343 237.556 343.456 237.556C355.568 237.556 365.418 247.415 365.418 259.529C365.418 271.643 355.558 281.492 343.456 281.492ZM400.008 212.571C377.31 212.571 358.851 194.102 358.851 171.405C358.851 148.716 377.32 130.248 400.008 130.248C422.697 130.248 441.166 148.717 441.166 171.405C441.166 194.11 422.706 212.571 400.008 212.571ZM503.833 449.38C466.507 449.38 436.144 419.008 436.144 381.683C436.144 344.359 466.507 313.996 503.833 313.996C541.158 313.996 571.52 344.359 571.52 381.683C571.52 419.01 541.158 449.38 503.833 449.38ZM604.169 349.162C585.235 349.162 569.84 333.766 569.84 314.833C569.84 295.9 585.245 280.504 604.169 280.504C623.094 280.504 638.499 295.909 638.499 314.833C638.499 333.758 623.102 349.162 604.169 349.162ZM660.791 293.865C641.858 293.865 626.462 278.46 626.462 259.536C626.462 240.611 641.858 225.207 660.791 225.207C679.725 225.207 695.122 240.603 695.122 259.536C695.12 278.47 679.724 293.865 660.791 293.865Z"
				fill="black"
				name="Gamepad"
			/>
			<path
				d="M196.043 198.922C163.369 198.922 136.788 225.495 136.788 258.169C136.788 290.843 163.369 317.423 196.043 317.423C228.71 317.423 255.291 290.843 255.291 258.169C255.291 225.495 228.717 198.922 196.043 198.922ZM196.043 304.02C170.763 304.02 150.192 283.442 150.192 258.16C150.192 232.879 170.763 212.309 196.043 212.309C221.324 212.309 241.894 232.88 241.894 258.16C241.894 283.44 221.331 304.02 196.043 304.02Z"
				fill="black"
				name="axis"
			/>
			<path
				d="M503.833 322.447C471.166 322.447 444.585 349.019 444.585 381.693C444.585 414.367 471.166 440.948 503.833 440.948C536.499 440.948 563.079 414.369 563.079 381.693C563.079 349.018 536.497 322.447 503.833 322.447ZM503.833 427.543C478.552 427.543 457.982 406.965 457.982 381.683C457.982 356.403 478.552 335.834 503.833 335.834C529.113 335.834 549.683 356.405 549.683 381.683C549.683 406.965 529.113 427.543 503.833 427.543Z"
				fill="black"
				name="axis"
			/>
			<path
				d="M196.043 220.759C175.414 220.759 158.633 237.54 158.633 258.169C158.633 278.798 175.414 295.588 196.043 295.588C216.674 295.588 233.453 278.806 233.453 258.169C233.453 237.538 216.672 220.759 196.043 220.759Z"
				fill={analogLeft ? activeColor : inactiveColor}
				style={{
					position: "relative",
					transition: "transform 200ms ease-out",
					transform:
						analogLeftDirection.length > 0
							? `${createTransform(analogLeftDirection[0])} ${createTransform(
									analogLeftDirection[1]
							  )}`
							: "",
				}}
				name="joystick_left"
			/>
			<path
				d="M503.833 344.283C483.202 344.283 466.423 361.064 466.423 381.693C466.423 402.322 483.202 419.112 503.833 419.112C524.462 419.112 541.242 402.331 541.242 381.693C541.234 361.062 524.462 344.283 503.833 344.283Z"
				fill={analogRight ? activeColor : inactiveColor}
				style={{
					position: "relative",
					transition: "transform 200ms ease-out",
					transform:
						analogRightDirection.length > 0
							? `${createTransform(analogRightDirection[0])} ${createTransform(
									analogRightDirection[1]
							  )}`
							: "",
				}}
				name="joystick_right"
			/>
			<path
				d="M310.012 371.589V340.619H285.027V371.589C285.027 373.918 283.136 375.811 280.807 375.811H249.846V400.794H280.807C283.136 400.794 285.027 402.685 285.027 405.016V435.985H310.012V405.016C310.012 402.686 311.903 400.794 314.232 400.794H345.193V375.811H314.232C311.903 375.809 310.012 373.918 310.012 371.589Z"
				fill="black"
				name="arrows"
			/>
			<path
				d="M314.232 400.794C311.903 400.794 310.012 402.686 310.012 405.016V371.589C310.012 373.918 311.903 375.809 314.232 375.81H345.193V400.794H314.232Z"
				fill={directionRight ? activeColor : inactiveColor}
				opacity={directionRight ? 1 : 0}
				name="arrow_right"
			/>
			<path
				d="M285.027 405.016C285.027 402.685 283.136 400.794 280.807 400.794H314.232C311.903 400.794 310.012 402.686 310.012 405.016V435.985H285.027V405.016Z"
				fill={directionDown ? activeColor : inactiveColor}
				opacity={directionDown ? 1 : 0}
				name="arrow_down"
			/>
			<path
				d="M280.807 375.81C283.136 375.81 285.027 373.918 285.027 371.589V405.016C285.027 402.685 283.136 400.794 280.807 400.794H249.846V375.81H280.807Z"
				fill={directionLeft ? activeColor : inactiveColor}
				opacity={directionLeft ? 1 : 0}
				name="arrow_left"
			/>
			<path
				d="M310.012 340.619V371.589C310.012 373.918 311.903 375.809 314.232 375.811H280.807C283.136 375.811 285.027 373.918 285.027 371.589V340.619H310.012Z"
				fill={directionUp ? activeColor : inactiveColor}
				opacity={directionUp ? 1 : 0}
				name="arrow_up"
			/>
			<path
				d="M604.169 232.871C618.467 232.871 630.058 221.28 630.058 206.983C630.058 192.685 618.467 181.094 604.169 181.094C589.872 181.094 578.281 192.685 578.281 206.983C578.281 221.28 589.872 232.871 604.169 232.871Z"
				fill={buttonUp ? activeColor : inactiveColor}
				name="y"
			/>
			<path
				d="M551.6 285.416C565.898 285.416 577.488 273.825 577.488 259.527C577.488 245.23 565.898 233.639 551.6 233.639C537.302 233.639 525.712 245.23 525.712 259.527C525.712 273.825 537.302 285.416 551.6 285.416Z"
				fill={buttonLeft ? activeColor : inactiveColor}
				name="x"
			/>
			<path
				d="M660.791 285.416C675.089 285.416 686.679 273.825 686.679 259.527C686.679 245.23 675.089 233.639 660.791 233.639C646.493 233.639 634.903 245.23 634.903 259.527C634.903 273.825 646.493 285.416 660.791 285.416Z"
				fill={buttonRight ? activeColor : inactiveColor}
				name="b"
			/>
			<path
				d="M604.169 340.72C618.467 340.72 630.058 329.13 630.058 314.832C630.058 300.534 618.467 288.944 604.169 288.944C589.872 288.944 578.281 300.534 578.281 314.832C578.281 329.13 589.872 340.72 604.169 340.72Z"
				fill={buttonDown ? activeColor : inactiveColor}
				name="a"
			/>
			<path
				d="M343.456 273.049C350.924 273.049 356.978 266.995 356.978 259.527C356.978 252.059 350.924 246.005 343.456 246.005C335.988 246.005 329.934 252.059 329.934 259.527C329.934 266.995 335.988 273.049 343.456 273.049Z"
				fill={select ? activeColor : inactiveColor}
				name="screen"
			/>
			<path
				d="M400 205C418.778 205 434 189.778 434 171C434 152.222 418.778 137 400 137C381.222 137 366 152.222 366 171C366 189.778 381.222 205 400 205Z"
				fill={home ? activeColor : inactiveColor}
				name="home"
			/>
			<path
				d="M458.107 273.049C465.575 273.049 471.629 266.995 471.629 259.527C471.629 252.059 465.575 246.005 458.107 246.005C450.639 246.005 444.585 252.059 444.585 259.527C444.585 266.995 450.639 273.049 458.107 273.049Z"
				fill={start ? activeColor : inactiveColor}
				name="menu"
			/>
			<path
				d="M668.118 136.012C691.323 153.754 675.149 161.943 697.568 176.276C697.568 176.276 656.5 151.5 600 136.012C543.5 120.523 499.553 118.261 499.553 118.261C499.553 118.261 517.971 115.534 534.355 101.885C550.739 88.2362 644.913 118.269 668.118 136.012Z"
				fill={rearRight ? activeColor : inactiveColor}
				name="rb"
			/>
			<path
				d="M265.656 101.885C282.031 115.534 300.458 118.261 300.458 118.261C300.458 118.261 265.656 113.789 199 133C148.27 147.621 113.393 169.093 104.612 174.825C103.932 175.302 103.21 175.785 102.443 176.275C102.443 176.275 103.181 175.759 104.612 174.825C123.801 161.371 109.483 153.147 131.893 136.011C155.096 118.261 249.28 88.2361 265.656 101.885Z"
				fill={rearLeft ? activeColor : inactiveColor}
				name="lb"
			/>
			<path
				d="M679.5 110.641C685.1 116.242 683 132.141 678 140.141C648.5 113.141 560.5 90.1414 538 96.6414C538 88.1414 539.522 74.9044 553.522 71.4044C567.522 67.9044 656.5 87.6413 679.5 110.641Z"
				fill={colorInterpolator(triggerRight, inactiveColor, activeColor)}
				name="rt"
			/>
			<path
				d="M121.5 110.5C115.9 116.1 118 132 123 140C152.5 113 240.5 90 263 96.5C263 88 261.478 74.763 247.478 71.263C233.478 67.763 144.5 87.4999 121.5 110.5Z"
				fill={colorInterpolator(triggerLeft, inactiveColor, activeColor)}
				name="lt"
			/>
			<g
				style={{
					opacity: isControlling ? 1 : 0,
				}}
			>
				<path
					d="M335 76.9999C362.894 51.9424 422.319 54.0815 449 77"
					stroke="black"
					stroke-width="10"
					stroke-linecap="round"
				/>
				<path
					d="M312 58.9999C350.66 24.1978 433.021 27.1687 470 59"
					stroke="black"
					stroke-width="10"
					stroke-linecap="round"
				/>
				<path
					d="M298 34.452C344 -6.54785 442 -3.04781 486 34.4522"
					stroke="black"
					stroke-width="10"
					stroke-linecap="round"
				/>
			</g>
		</svg>
	);
};
