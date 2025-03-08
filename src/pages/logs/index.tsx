import { useEffect, useRef } from "react";
import BackButton from "../../components/Controls/BackButton";
import Background from "../../components/ui/Background";
import styles from "./style.module.sass";
import LogFilter from "../../components/Controls/LogFilter";
import { Themes } from "../../data/themes.type";
import useRosBridge from "../../hooks/rosbridgeHooks";
import useRoverLogs, { LogLevel } from "../../hooks/roverLogHooks";
import { Tooltip, tooltipClasses } from "@mui/material";
import useAlert from "../../hooks/alertHooks";
import AlertSnackbar from "../../components/ui/Snackbar";
import InfiniteScroll from "react-infinite-scroll-component";

const Logs = () => {
	const bottomRef = useRef<HTMLDivElement | null>(null);
	const [snackbar, showSnackbar] = useAlert();
	const [ros] = useRosBridge(showSnackbar);
	const [
		roverlogs,
		filters,
		isAtBottom,
		mode,
		hasMore,
		setMode,
		changeFilter,
		handleScroll,
		getOlderLogs,
	] = useRoverLogs(ros);

	useEffect(() => {
		if (!isAtBottom) return;

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
		<div className="page center" style={{ overflow: "hidden" }}>
			<Background />
			<BackButton />
			<div className={styles.TabContainer}>
				<div className={styles.TabContent}>
					<AlertSnackbar alertMessage={snackbar} />
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
								changeFilter(LogLevel.ERROR, false);
							}}
						/>
						<LogFilter
							name="All"
							active={mode === "all"}
							color={Themes.GREY}
							onActivate={() => {
								setMode("all");
							}}
							onDisactivate={() => {}}
						/>
						<LogFilter
							name="NAV"
							active={mode === "nav"}
							color={Themes.GREY}
							onActivate={() => {
								setMode("nav");
							}}
							onDisactivate={() => {}}
						/>
						<LogFilter
							name="HD"
							active={mode === "hd"}
							color={Themes.GREY}
							onActivate={() => {
								setMode("hd");
							}}
							onDisactivate={() => {}}
						/>
						<LogFilter
							name="CS"
							active={mode === "cs"}
							color={Themes.GREY}
							onActivate={() => {
								setMode("cs");
							}}
							onDisactivate={() => {}}
						/>
						<LogFilter
							name="SC"
							active={mode === "sc"}
							color={Themes.GREY}
							onActivate={() => {
								setMode("sc");
							}}
							onDisactivate={() => {}}
						/>
					</div>
					<div
						id="scrollableDiv"
						className={styles.Logs}
						onScroll={handleScroll}
						style={{ display: "flex", flexDirection: "column-reverse", height: "100%" }}
					>
						<InfiniteScroll
							dataLength={roverlogs.length}
							inverse={true}
							next={() => {
								console.log("fetching more logs");
								getOlderLogs();
							}}
							hasMore={hasMore}
							loader={<h4>Loading...</h4>}
							scrollableTarget="scrollableDiv"
							style={{ display: "flex", flexDirection: "column", height: "100%" }}
						>
							{roverlogs.reverse().map((log) => (
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
										<div
											className={`${styles.LogType} ${getColorType(
												log.type
											)}`}
										>
											{log.type}
										</div>
										<div className={styles.LogMessage}>{log.message}</div>
									</div>
								</Tooltip>
							))}
							<div ref={bottomRef}></div>
						</InfiniteScroll>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Logs;
