/**
 * Detect the OS of the device
 */
const getOSDetails = () => {
	const userAgent = navigator.userAgent || navigator.vendor;

	if (/android/i.test(userAgent)) {
		return "Android";
	}

	if (/iPad|iPhone|iPod/.test(userAgent)) {
		return "iOS";
	}

	if (/Linux/.test(userAgent)) {
		return "Linux";
	}

	if (/Mac/.test(userAgent)) {
		return "MacOS";
	}

	if (/Windows/.test(userAgent)) {
		return "Windows";
	}

	return "Unknown OS";
};

/**
 * Detect the browser of the device
 */
const getBrowserDetails = () => {
	const userAgent = navigator.userAgent || navigator.vendor;

	if (/OPR/.test(userAgent)) {
		return "Opera";
	}

	if (/Firefox/.test(userAgent)) {
		return "Firefox";
	}

	if (/Edg/.test(userAgent)) {
		return "Edge";
	}

	if (/Chrome/.test(userAgent)) {
		return "Chrome";
	}

	if (/Safari/.test(userAgent)) {
		return "Safari";
	}

	return "Unknown Browser";
};

export { getOSDetails, getBrowserDetails };
