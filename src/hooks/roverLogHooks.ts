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

const getType = (type: number): string => {
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

	useEffect(() => {
		if (ros && db) {
			const listener = new ROSLIB.Topic({
				ros: ros,
				name: "/rosout",
				messageType: "rcl_interfaces/msg/Log",
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

				if (roverlogs.length >= PAGE_SIZE) {
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
		if (!db) return;
		const logs = (await db.getLogsByTimestamp(from, PAGE_SIZE, types)) as Log[];
		if (logs.length > 0) {
			setOldestTimestamp(logs[logs.length - 1].timestamp);
			setRoverLogs((prevLogs) => [...prevLogs, ...logs]);
		}
	};

	useEffect(() => {
		fetchLogs(null, filters);
	}, [db, filters]);

	const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
		const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
		if (scrollTop === 0 && oldestTimestamp) {
			fetchLogs(oldestTimestamp, filters);
		}
		setIsAtBottom(scrollHeight - scrollTop <= clientHeight + 10);
	};

	const changeFilter = (type: string, add: boolean) => {
		setFilters((prev) => (add ? [...prev, type] : prev.filter((filter) => filter !== type)));
	};

	const getFilteredLogs = () => {
		return roverlogs.filter((log) => filters.includes(log.type));
	};

	return [getFilteredLogs(), filters, isAtBottom, changeFilter, handleScroll] as const;
}

export default useRoverLogs;
