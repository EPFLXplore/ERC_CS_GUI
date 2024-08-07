function ExpandButton({ onClick, expanded }: { onClick: () => void; expanded: boolean }) {
	if (expanded)
		return (
			<svg
				width="98"
				height="239"
				viewBox="0 0 98 239"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				onClick={onClick}
			>
				<path
					d="M0.00417909 1.88394C-0.00137626 1.25952 -0.00140978 0.631542 0.00417909 0V1.88394C0.495625 57.1225 44.1998 84.5 61.5042 84.5C79.0042 84.5 97.5042 94 97.5042 119C97.5042 144 78.0042 150.5 61.5042 150.5C40.4092 150.5 0.00417909 176.5 0.00417909 238.5V1.88394Z"
					fill="#3E101D"
					style={{ cursor: "pointer" }}
				/>
				<line x1="57" y1="116" x2="84" y2="116" stroke="white" stroke-width="4" />
			</svg>
		);
	else
		return (
			<svg
				width="98"
				height="239"
				viewBox="0 0 98 239"
				fill="none"
				xmlns="http://www.w3.org/2000/svg"
				onClick={onClick}
			>
				<path
					d="M0.500029 1.88394C0.494473 1.25952 0.49444 0.631542 0.500029 0V1.88394C0.991475 57.1225 44.6957 84.5 62 84.5C79.5 84.5 98.0001 94 98 119C98 144 78.5 150.5 62 150.5C40.905 150.5 0.500029 176.5 0.500029 238.5V1.88394Z"
					fill="#300F1E"
					style={{ cursor: "pointer" }}
				/>
				<path
					d="M64 102.001V101.999H62V102.001L61.9887 117.989L46.0007 118H45.9993V120H46.0007L61.9887 120.011L62 135.999V136.001H64V135.999L64.0113 120.011L79.9993 120H80.0007V118H79.9993L64.0113 117.989L64 102.001Z"
					stroke="white"
					stroke-width="2"
				/>
			</svg>
		);
}

export default ExpandButton;
