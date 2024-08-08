import { Alert, AlertColor, Snackbar } from "@mui/material";
import { SyntheticEvent, useEffect, useState } from "react";

// This interface is used to define the content of an alert message
export interface AlertSnackbarMessage {
	severity: AlertColor;
	message: string;
}

// This type is used to define the state of the snackbar
type AlertSnackbarState = AlertSnackbarMessage & {
	open: boolean;
};

/**
 * This component is used to display a snackbar with a message and a severity
 * @param alertMessage The message and severity of the snackbar
 * @returns A snackbar with the message and severity
 * @example
 * ```tsx
 * <AlertSnackbar alertMessage={{ severity: "error", message: "This is an error message" }} />
 * ```
 */
const AlertSnackbar = ({ alertMessage }: { alertMessage: AlertSnackbarMessage }) => {
	const [snackbar, setSnackbar] = useState<AlertSnackbarState>({
		open: false,
		severity: "error",
		message: "This is a snackbar",
	});

	const { severity, message, open } = snackbar;

	const handleClose = (event?: SyntheticEvent | Event, reason?: string) => {
		if (reason === "clickaway") {
			return;
		}

		setSnackbar({ ...snackbar, open: false });
	};

	useEffect(() => {
		setSnackbar({ open: true, ...alertMessage });
	}, [alertMessage]);

	return (
		<Snackbar
			open={open}
			autoHideDuration={4000}
			onClose={handleClose}
			anchorOrigin={{ vertical: "top", horizontal: "center" }}
			sx={{ position: "absolute" }}
		>
			<Alert
				onClose={handleClose}
				severity={severity}
				variant="filled"
				sx={{ width: "100%", whiteSpace: "pre-line", borderRadius: 3 }}
			>
				{message}
			</Alert>
		</Snackbar>
	);
};

export default AlertSnackbar;
