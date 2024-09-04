import React from "react";
import { useState, useEffect } from "react";
import * as ROSLIB from "roslib";

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
	const [filters, setFilters] = React.useState<string[]>([
		LogLevel.INFO,
		LogLevel.WARNING,
		LogLevel.ERROR,
	]);
	const [filteredLogs, setFilteredLogs] = React.useState<Log[]>([]);

	useEffect(() => {
		if (ros) {
			const listener = new ROSLIB.Topic({
				ros: ros,
				name: "/rosout",
				messageType: "rcl_interfaces/msg/Log",
			});

			
			listener.subscribe((message) => {
				setRoverLogs((prev) => [
					...prev,
					{
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
					},
				]);
			});
			
		}
	}, [ros]);

	const clearLogs = () => {
		setRoverLogs([])
	}

	const filterLogs = (types: string[]) => {
		if (types.length === 0) setFilteredLogs(roverlogs);
		else setFilteredLogs(roverlogs.filter((log) => types.includes(log.type)));
	};

	const changeFilter = (type: string, add: boolean) => {
		if (add) {
			if (!filters.includes(type)) setFilters([...filters, type]);
		} else {
			setFilters(filters.filter((filter) => filter !== type));
		}
	};

	useEffect(() => {
		filterLogs(filters);
	}, [filters, roverlogs]); // eslint-disable-line react-hooks/exhaustive-deps

	return [filteredLogs, filters, changeFilter] as const;
}

export default useRoverLogs;
