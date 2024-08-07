import { useEffect, useRef } from "react";
import BackButton from "../../components/Controls/BackButton";
import Background from "../../components/Background";
import styles from "./style.module.sass";
import LogFilter from "../../components/Controls/LogFilter";
import { Themes } from "../../utils/themes";
import useRosBridge from "../../hooks/rosbridgeHooks";
import useRoverLogs, { LogLevel } from "../../hooks/roverLogHooks";
import { Tooltip, tooltipClasses } from "@mui/material";

const Logs = () => {
	const bottomRef = useRef<HTMLDivElement | null>(null);

	// Show a snackbar with a message and a severity
	// Severity can be "error", "warning", "info" or "success"
	const showSnackbar = (severity: string, message: string) => {};

	const [ros] = useRosBridge(showSnackbar);
	const [roverlogs, filters, changeFilter] = useRoverLogs(ros);

	useEffect(() => {
		// 👇️ scroll to bottom every time messages change
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [roverlogs]);

	const getColorType = (type: string) => {
		switch (type) {
			case LogLevel.INFO:
				return styles.Info;
			case LogLevel.WARNING:
				return styles.Warning;
			case LogLevel.ERROR:
				return styles.Error;
			default:
				return styles.Data;
		}
	};

	return (
		<div className="page center">
			<Background />
			<BackButton />
			<div className={styles.TabContainer}>
				<div className={styles.TabContent}>
					<div className={styles.LogFilters}>
						<LogFilter
							name="Info"
							active={filters.some((log) => log === LogLevel.INFO)}
							color={Themes.GREY}
							onActivate={() => {
								changeFilter(LogLevel.INFO, true);
							}}
							onDisactivate={() => {
								changeFilter(LogLevel.INFO, false);
							}}
						/>
						<LogFilter
							name="Data"
							active={filters.some((log) => log === LogLevel.DATA)}
							color={Themes.BROWN}
							onActivate={() => {
								changeFilter(LogLevel.DATA, true);
							}}
							onDisactivate={() => {
								changeFilter(LogLevel.DATA, false);
							}}
						/>
						<LogFilter
							name="Warning"
							active={filters.some((log) => log === LogLevel.WARNING)}
							color={Themes.ORANGE}
							onActivate={() => {
								changeFilter(LogLevel.WARNING, true);
							}}
							onDisactivate={() => {
								changeFilter(LogLevel.WARNING, false);
							}}
						/>
						<LogFilter
							name="Error"
							active={filters.some((log) => log === LogLevel.ERROR)}
							color={Themes.RED}
							onActivate={() => {
								changeFilter(LogLevel.ERROR, true);
							}}
							onDisactivate={() => {
								changeFilter(LogLevel.WARNING, false);
							}}
						/>
					</div>
					<div className={styles.Logs}>
						{roverlogs.map((log) => (
							<Tooltip
								title={log.file + " - line " + log.line}
								enterDelay={1000}
								slotProps={{
									popper: {
										sx: {
											[`&.${tooltipClasses.popper}[data-popper-placement*="bottom"] .${tooltipClasses.tooltip}`]:
												{
													marginTop: "0px",
													maxWidth: 800,
												},
										},
									},
								}}
							>
								<div className={styles.Log}>
									<div className={styles.LogTime}>[{log.node}]</div>
									<div className={`${styles.LogType} ${getColorType(log.type)}`}>
										{log.type}
									</div>
									<div className={styles.LogMessage}>{log.message}</div>
								</div>
							</Tooltip>
						))}
						<div ref={bottomRef}></div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Logs;
