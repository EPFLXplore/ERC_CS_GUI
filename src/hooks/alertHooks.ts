import { AlertColor } from "@mui/material";
import { useState } from "react";
import { AlertSnackbarMessage } from "../components/ui/Snackbar";

const useAlert = () => {
	const [snackbar, setSnackbar] = useState<AlertSnackbarMessage>({
		severity: "error",
		message: "This is a snackbar",
	});

	// Show a snackbar with a message and a severity
	// Severity can be "error", "warning", "info" or "success"
	const showSnackbar = (severity: AlertColor, message: string) => {
		setSnackbar({ severity, message });
	};

	return [snackbar, showSnackbar] as const;
};

export default useAlert;
