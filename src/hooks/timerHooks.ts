import { useCallback, useState, useEffect, useRef } from "react";

function useTimer(onFinished?: () => void) {
	const [minutes, setMinutes] = useState(60); // minutes left
	const [seconds, setSeconds] = useState(0); // seconds left
	const [finished, setFinished] = useState(false);
	const [active, _setActive] = useState(false);
	const [inputFocused, setInputFocused] = useState(false);
	const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Set up timer time
	const getTime = useCallback((changeMinutes?: number, changeSeconds?: number) => {
		let newMinutes = changeMinutes || minutes;
		let newSeconds = changeSeconds || seconds;
		let time = newMinutes * 60000 + newSeconds * 1000;

		if (time <= 0) {
			setFinished(true);
			setMinutes(0);
			setSeconds(0);
			return;
		}

		if (active) time -= 1000;

		console.log("Computed time: " + Math.floor((time / 1000) % 60));

		setMinutes(Math.floor((time / 1000 / 60) % 100));
		setSeconds(Math.floor((time / 1000) % 60));
		setFinished(false);
	}, [active, minutes, seconds]);

	// Set up interval of one second for update
	useEffect(() => {
		if (!finished && active) {
			intervalRef.current = setTimeout(() => getTime(), 1000);
		}

		return () => {
			if (intervalRef.current) clearTimeout(intervalRef.current);
		};
	}, [finished, active, getTime]);

	// Private function to change time
	const _changeTime = (minutes: number, seconds: number) => {
		if (minutes >= 0 && seconds >= 0 && seconds < 60) {
			if (intervalRef.current) clearTimeout(intervalRef.current);
			getTime(minutes, seconds);
		} else if (minutes >= 0 && seconds >= 60) {
			if (intervalRef.current) clearTimeout(intervalRef.current);
			getTime(
				minutes + Math.floor(seconds / 60),
				(seconds - Math.floor(seconds / 60) * 60) % 60
			);
		}
	};

	// Public function to change time through websocket if available
	const changeTime = (minutes: number, seconds: number) => {
		_changeTime(minutes, seconds);
	};

	// Public function to change active through websocket if available
	const setActive = (active: boolean) => {
		console.log("Active: " + seconds);
		_setActive(active);
	};

	// Call onFinished if timer is finished
	useEffect(() => {
		if (finished && onFinished) {
			onFinished();
		}
	}, [finished, onFinished]);

	useEffect(() => {
		setInputFocused(false);
	}, []);

	return [
		minutes,
		seconds,
		active,
		inputFocused,
		changeTime,
		setActive,
		setInputFocused,
	] as const;
}

export default useTimer;
