import React from "react";
import { useState, useEffect } from "react";
import * as ROSLIB from "roslib";
import Database from "../utils/IndexedDB/database";

/*
Author: Ugo Balducci
Year: 2024
Description: Hooks managing the Logs recieved by the /rosout topic. It's a high level interface
for showing logs on the Log page. We listen on the /rosout topic and create our type of Log. We can
also filter them using filters.
*/

export type Log = {
	timestamp: number;
	node: string;
	type: string;
	message: string;
	file: string;
	line: number;
};

export enum LogLevel {
	DATA = "data",
	INFO = "info",
	WARNING = "warning",
	ERROR = "error",
}

export const NODE_FILTERS = {
	ALL: [],
	HD: ["HDCSInterfacing", "MotorController", "kinematics_task_executor"],
	NAV: [
		"NAV_cmd_vel_manager",
	"NAV_displacement_cmds",
	"NAV_gamepad_interface",
	"NAV_motor_cmds",
	"NavCSInterfacing",
	],
	SC: ["drill_fsm_node", "SC_motor_cmds"],
	CS: ["/CS/camera_cs_0"],
};const getType = (type: number): string => {
	switch (type) {
		case 10:
			return LogLevel.DATA;
		case 20:
			return LogLevel.INFO;
		case 30:
			return LogLevel.WARNING;
		case 40:
		case 50:
			return LogLevel.ERROR;
		default:
			return LogLevel.INFO;
	}
};

function useRoverLogs(ros: ROSLIB.Ros | null) {
	const [roverlogs, setRoverLogs] = useState<Log[]>([]);
	const [filters, setFilters] = useState<string[]>([
		LogLevel.INFO,
		LogLevel.WARNING,
		LogLevel.ERROR,
	]);
	const [db, setDb] = useState<Database | null>(null);
	const [isAtBottom, setIsAtBottom] = useState(true);
	const PAGE_SIZE = 50;
	const [oldestTimestamp, setOldestTimestamp] = useState<number | null>(null);
	const [hasMore, setHasMore] = useState(true);
	const [mode, setMode] = useState<"all" | "nav" | "hd" | "cs" | "sc" | "el">("all");

	useEffect(() => {
		if (ros && db && db.isConnected) {
			const listener = new ROSLIB.Topic({
				ros: ros,
				name: "/rosout",
				messageType: "rcl_interfaces/msg/Log",
				queue_length: 1,
				queue_size: 1,
			});

			listener.subscribe((message) => {
				const newLog = {
					// @ts-ignore
					timestamp: message.stamp.sec,
					// @ts-ignore
					node: message.name,
					// @ts-ignore
					type: getType(message.level),
					// @ts-ignore
					message: message.msg,
					// @ts-ignore
					file: message.file,
					// @ts-ignore
					line: message.line,
				} as Log;

				db.addLog(newLog);
				setOldestTimestamp((prev) =>
					prev ? Math.min(prev, newLog.timestamp) : newLog.timestamp
				);

				if (
					!filters.includes(newLog.type) ||
					(mode !== "all" &&
						!NODE_FILTERS[mode.toUpperCase() as keyof typeof NODE_FILTERS].includes(
							// @ts-ignore
							newLog.node
						))
				) {
					return;
				}

				if (roverlogs.length >= PAGE_SIZE && isAtBottom) {
					setRoverLogs((prevLogs) => [...prevLogs, newLog].slice(-PAGE_SIZE));
				} else {
					setRoverLogs((prevLogs) => [...prevLogs, newLog]);
				}
			});
		}
	}, [ros, db]);

	useEffect(() => {
		const db = new Database();
		db.init("rover")
			.then(() => setDb(db))
			.catch(console.error);
	}, []);

	const fetchLogs = async (from: number | null, types: string[]) => {
		if (!db || !db.isConnected) return;
		const logs = (await db.getLogsByTimestamp(
			from,
			PAGE_SIZE,
			types,
			NODE_FILTERS[mode.toUpperCase() as keyof typeof NODE_FILTERS]
		)) as Log[];
		if (logs.length > 0) {
			console.log("adding logs", logs);
			setOldestTimestamp(logs[logs.length - 1].timestamp);
			setRoverLogs((prevLogs) => [...logs, ...prevLogs]);

			if (logs.length < PAGE_SIZE) {
				setHasMore(false);
			}
		}
	};

	useEffect(() => {
		setRoverLogs([]);
		setOldestTimestamp(null);
		setHasMore(true);
		fetchLogs(null, filters);
	}, [db, filters, mode]);

	const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
		const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
		setIsAtBottom(scrollHeight - scrollTop <= clientHeight + 200);
	};

	const changeFilter = (type: string, add: boolean) => {
		setFilters((prev) => (add ? [...prev, type] : prev.filter((filter) => filter !== type)));
	};

	const getFilteredLogs = () => {
		return roverlogs.filter((log) => filters.includes(log.type));
	};

	const getOlderLogs = () => {
		console.log("fetching older logs");
		fetchLogs(oldestTimestamp, filters);
	};

	return [
		getFilteredLogs(),
		filters,
		isAtBottom,
		mode,
		hasMore,
		setMode,
		changeFilter,
		handleScroll,
		getOlderLogs,
	] as const;
}

export default useRoverLogs;
