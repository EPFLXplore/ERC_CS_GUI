import { AlertColor } from "@mui/material";
import { useState } from "react";
import { AlertSnackbarMessage } from "../components/ui/Snackbar";

/*
Author: Ugo Balducci
Year: 2023
Description: Hook for showing a bar of information on the web page
*/

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
