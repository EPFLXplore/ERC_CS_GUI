import React, { useEffect, useMemo, useRef, useState } from "react";
import * as ROSLIB from "roslib";
import { AlertColor } from "@mui/material";
import styles from "./style.module.sass";

type ParameterKind = "boolean" | "number" | "string" | "json";

type ParameterEntry = {
	fullName: string;
	nodeName: string;
	paramName: string;
	kind: ParameterKind;
	liveValue: unknown;
	draft: string;
	dirty: boolean;
	error: string | null;
};

type ParameterMap = Record<string, ParameterEntry>;

const GET_PARAM_NAMES_FALLBACKS = [
	{ name: "/rosapi/get_param_names", serviceType: "rosapi_msgs/srv/GetParamNames" },
	{ name: "rosapi/get_param_names", serviceType: "rosapi_msgs/srv/GetParamNames" },
	{ name: "/get_param_names", serviceType: "rosapi_msgs/srv/GetParamNames" },
	{ name: "/rosapi/get_param_names", serviceType: "rosapi/GetParamNames" },
	{ name: "rosapi/get_param_names", serviceType: "rosapi/GetParamNames" },
	{ name: "/get_param_names", serviceType: "rosapi/GetParamNames" },
] as const;

const GET_PARAM_SERVICE = {
	name: "rosapi/get_param",
	serviceType: "rosapi_msgs/srv/GetParam",
};

const SET_PARAM_SERVICE = {
	name: "rosapi/set_param",
	serviceType: "rosapi_msgs/srv/SetParam",
};

const PARAM_DISCOVERY_RETRY_COUNT = 2;
const PARAM_DISCOVERY_RETRY_DELAY_MS = 450;
const PARAM_NAME_QUERY_TIMEOUT_MS = 5000;
const SERVICE_DISCOVERY_TIMEOUT_MS = 3500;
const LIST_PARAMETERS_PER_NODE_TIMEOUT_MS = 1200;
const PARAM_DISCOVERY_TOTAL_TIMEOUT_MS = 18000;
const PARAM_VALUE_REFRESH_CONCURRENCY = 4;
const LIST_PARAMETERS_SERVICE_SUFFIX = "/list_parameters";
const LIST_PARAMETERS_SERVICE_TYPES = [
	"rcl_interfaces/srv/ListParameters",
	"rcl_interfaces/ListParameters",
] as const;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
	return new Promise((resolve, reject) => {
		const timeoutId = setTimeout(() => {
			reject(new Error(`${label} timed out after ${timeoutMs}ms`));
		}, timeoutMs);

		promise
			.then((value) => {
				clearTimeout(timeoutId);
				resolve(value);
			})
			.catch((error) => {
				clearTimeout(timeoutId);
				reject(error);
			});
	});
}

function callService<RequestType, ResponseType>(
	ros: ROSLIB.Ros,
	serviceName: string,
	serviceType: string,
	request: RequestType
): Promise<ResponseType> {
	return new Promise((resolve, reject) => {
		const service = new ROSLIB.Service({
			ros,
			name: serviceName,
			serviceType,
		});

		service.callService(
			request as any,
			(response: unknown) => resolve(response as ResponseType),
			(error: unknown) => reject(new Error(String(error)))
		);
	});
}

function getParamsFromRos(ros: ROSLIB.Ros): Promise<string[]> {
	return new Promise((resolve, reject) => {
		ros.getParams(
			(params) => resolve(Array.isArray(params) ? params : []),
			(error) => reject(new Error(String(error)))
		);
	});
}

function getServicesFromRos(ros: ROSLIB.Ros): Promise<string[]> {
	return new Promise((resolve, reject) => {
		ros.getServices(
			(services) => resolve(Array.isArray(services) ? services : []),
			(error) => reject(new Error(String(error)))
		);
	});
}

function sleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, milliseconds);
	});
}

function normalizeServiceName(serviceName: string): string {
	return serviceName.startsWith("/") ? serviceName.slice(1) : serviceName;
}

function getNodeNameFromListService(serviceName: string): string {
	if (serviceName.endsWith(LIST_PARAMETERS_SERVICE_SUFFIX)) {
		const nodeName = serviceName.slice(0, -LIST_PARAMETERS_SERVICE_SUFFIX.length);
		return nodeName.length > 0 ? nodeName : "/";
	}

	return serviceName;
}

async function callListParametersForService(ros: ROSLIB.Ros, serviceName: string): Promise<string[]> {
	for (const serviceType of LIST_PARAMETERS_SERVICE_TYPES) {
		try {
			const response = await withTimeout(
				callService<
					{ prefixes: string[]; depth: number },
					{ result?: { names?: string[] }; names?: string[] }
				>(ros, serviceName, serviceType, {
					prefixes: [],
					depth: 0,
				}),
				LIST_PARAMETERS_PER_NODE_TIMEOUT_MS,
				`list_parameters(${serviceName})`
			);

			const resultNames = response?.result?.names;
			const names: string[] = Array.isArray(resultNames)
				? resultNames
				: Array.isArray(response?.names)
					? response.names
					: [];

			return names;
		} catch {
			// Try the next list-parameters type alias.
		}
	}

	return [];
}

async function getParamNamesFromAliveNodes(ros: ROSLIB.Ros): Promise<string[]> {
	const services = await withTimeout(getServicesFromRos(ros), SERVICE_DISCOVERY_TIMEOUT_MS, "getServices");
	const listServices = Array.from(
		new Set(
			services.filter((serviceName) => {
				const normalizedName = normalizeServiceName(serviceName);
				return normalizedName.endsWith("list_parameters") && !normalizedName.startsWith("rosapi/");
			})
		)
	);

	if (listServices.length === 0) {
		return [];
	}

	const paramResults = await Promise.all(
		listServices.map(async (serviceName) => {
			const paramNames = await callListParametersForService(ros, serviceName);
			if (paramNames.length === 0) {
				return [] as string[];
			}

			const nodeName = getNodeNameFromListService(serviceName);
			return paramNames.map((paramName) => `${nodeName}:${paramName}`);
		})
	);

	return Array.from(new Set(paramResults.flat()));
}

async function getParamNames(ros: ROSLIB.Ros): Promise<string[]> {
	let namesFromRoslib: string[] = [];

	return withTimeout(
		(async () => {
			for (let attempt = 0; attempt < PARAM_DISCOVERY_RETRY_COUNT; attempt += 1) {
				try {
					const aliveNames = await getParamNamesFromAliveNodes(ros);
					if (aliveNames.length > 0) {
						return aliveNames;
					}
				} catch {
					// Continue to fallback methods.
				}

				try {
					namesFromRoslib = await withTimeout(
						getParamsFromRos(ros),
						PARAM_NAME_QUERY_TIMEOUT_MS,
						"getParams"
					);
					if (namesFromRoslib.length > 0) {
						return Array.from(new Set(namesFromRoslib));
					}
				} catch {
					// Fall through to static rosapi get_param_names fallback.
				}

				for (const fallback of GET_PARAM_NAMES_FALLBACKS) {
					try {
						const response = await withTimeout(
							callService<Record<string, never>, { names?: string[] }>(
								ros,
								fallback.name,
								fallback.serviceType,
								{}
							),
							PARAM_NAME_QUERY_TIMEOUT_MS,
							`callService(${fallback.name})`
						);

						const names = Array.isArray(response?.names) ? response.names : [];
						if (names.length > 0) {
							return Array.from(new Set(names));
						}
					} catch {
						// Try the next fallback.
					}
				}

				if (attempt < PARAM_DISCOVERY_RETRY_COUNT - 1) {
					await sleep(PARAM_DISCOVERY_RETRY_DELAY_MS);
				}
			}

			return Array.from(new Set(namesFromRoslib));
		})(),
		PARAM_DISCOVERY_TOTAL_TIMEOUT_MS,
		"parameter discovery"
	);
}

function parseParamName(fullName: string) {
	const separatorIndex = fullName.indexOf(":");

	if (separatorIndex === -1) {
		return {
			nodeName: "",
			paramName: fullName,
		};
	}

	return {
		nodeName: fullName.slice(0, separatorIndex),
		paramName: fullName.slice(separatorIndex + 1),
	};
}

function parseLiveValue(value: unknown) {
	if (typeof value !== "string") {
		return value;
	}

	try {
		return JSON.parse(value);
	} catch {
		return value;
	}
}

function detectKind(value: unknown): ParameterKind {
	if (typeof value === "boolean") {
		return "boolean";
	}

	if (typeof value === "number") {
		return "number";
	}

	if (typeof value === "string") {
		return "string";
	}

	return "json";
}

function formatDraftValue(value: unknown, kind: ParameterKind) {
	if (kind === "boolean") {
		return value ? "true" : "false";
	}

	if (kind === "string") {
		return value === null || value === undefined ? "" : String(value);
	}

	if (kind === "number") {
		return value === null || value === undefined ? "" : String(value);
	}

	try {
		return JSON.stringify(value, null, 2) ?? "";
	} catch {
		return String(value ?? "");
	}
}

function stringifyPreviewValue(value: unknown) {
	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}

	if (value === null || value === undefined) {
		return "null";
	}

	try {
		return JSON.stringify(value, null, 2) ?? "";
	} catch {
		return String(value);
	}
}

async function fetchParameterValue(ros: ROSLIB.Ros, fullName: string) {
	const valueResponse = await withTimeout(
		callService<{ name: string; default_value: string }, { value?: string }>(ros, GET_PARAM_SERVICE.name, GET_PARAM_SERVICE.serviceType, {
			name: fullName,
			default_value: "",
		}),
		PARAM_NAME_QUERY_TIMEOUT_MS,
		`get_param(${fullName})`
	);

	return parseLiveValue(valueResponse?.value);
}

function coerceDraftValue(draft: string, kind: ParameterKind) {
	if (kind === "boolean") {
		return draft === "true";
	}

	if (kind === "number") {
		const numericValue = Number(draft);
		if (Number.isNaN(numericValue)) {
			throw new Error("Invalid numeric value");
		}
		return numericValue;
	}

	if (kind === "string") {
		return draft;
	}

	return JSON.parse(draft);
}

function ParametersModal({
	ros,
	onClose,
	snackBar,
}: {
	ros: ROSLIB.Ros | null;
	onClose: () => void;
	snackBar: (sev: AlertColor, mes: string) => void;
}) {
	const [parameters, setParameters] = useState<ParameterMap>({});
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [statusMessage, setStatusMessage] = useState("Load parameter names to begin editing.");
	const refreshTokenRef = useRef(0);
	const parametersRef = useRef<ParameterMap>({});

	useEffect(() => {
		parametersRef.current = parameters;
	}, [parameters]);

	useEffect(() => {
		return () => {
			refreshTokenRef.current += 1;
		};
	}, []);

	const groupedParameters = useMemo(() => {
		const grouped = new Map<string, ParameterEntry[]>();

		Object.values(parameters)
			.slice()
			.sort((left, right) => left.fullName.localeCompare(right.fullName))
			.forEach((entry) => {
				const key = entry.nodeName || "Global";
				const currentGroup = grouped.get(key) ?? [];
				currentGroup.push(entry);
				grouped.set(key, currentGroup);
			});

		return grouped;
	}, [parameters]);

	const populateParameterValues = async (ros: ROSLIB.Ros, names: string[], requestToken: number) => {
		const queue = [...names];

		const worker = async () => {
			while (queue.length > 0) {
				const fullName = queue.shift();
				if (!fullName) {
					continue;
				}

				if (requestToken !== refreshTokenRef.current) {
					return;
				}

				try {
					const liveValue = await fetchParameterValue(ros, fullName);
					const kind = detectKind(liveValue);

					setParameters((current) => {
						const entry = current[fullName];
						if (!entry || requestToken !== refreshTokenRef.current) {
							return current;
						}

						return {
							...current,
							[fullName]: {
								...entry,
								kind,
								liveValue,
								draft: entry.dirty ? entry.draft : formatDraftValue(liveValue, kind),
								error: null,
							},
						};
					});
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);

					setParameters((current) => {
						const entry = current[fullName];
						if (!entry || requestToken !== refreshTokenRef.current) {
							return current;
						}

						return {
							...current,
							[fullName]: {
								...entry,
								error: `Read failed: ${message}`,
							},
						};
					});
				}
			}
		};

		await Promise.all(Array.from({ length: Math.min(PARAM_VALUE_REFRESH_CONCURRENCY, names.length) }, () => worker()));
	};

	const refreshParameters = async () => {
		if (!ros) {
			snackBar("error", "ROS connection not available.");
			return;
		}

		const requestToken = ++refreshTokenRef.current;
		setIsRefreshing(true);
		setStatusMessage("Refreshing parameter list...");

		try {
			const names = await getParamNames(ros);
			const previousParameters = parametersRef.current;

			if (names.length === 0 && Object.keys(previousParameters).length > 0) {
				if (requestToken === refreshTokenRef.current) {
					setStatusMessage("Refresh returned 0 parameters. Keeping previous list (likely transient rosapi discovery issue).");
					snackBar("warning", "Refresh returned 0 parameters. Keeping previous list.");
				}
				return;
			}

			const refreshedEntries = await Promise.all(
				names.map(async (fullName) => {
					const { nodeName, paramName } = parseParamName(fullName);
					const previousEntry = previousParameters[fullName];
					return [
						fullName,
						{
							fullName,
							nodeName,
							paramName,
							kind: previousEntry?.kind ?? "json",
							liveValue: previousEntry?.liveValue ?? null,
							draft: previousEntry?.dirty ? previousEntry.draft : formatDraftValue(previousEntry?.liveValue ?? null, previousEntry?.kind ?? "json"),
							dirty: previousEntry?.dirty ?? false,
							error: null,
						},
					] as const;
				})
			);

			if (requestToken !== refreshTokenRef.current) {
				return;
			}

			setParameters(Object.fromEntries(refreshedEntries));
			setStatusMessage(`Loaded ${refreshedEntries.length} parameter names. Loading values in background...`);
			snackBar("success", `Loaded ${refreshedEntries.length} parameter names.`);
			void populateParameterValues(ros, names, requestToken);
		} catch (error) {
			if (requestToken === refreshTokenRef.current) {
				const message = error instanceof Error ? error.message : String(error);
				setStatusMessage(message);
				snackBar("error", message);
			}
		} finally {
			if (requestToken === refreshTokenRef.current) {
				setIsRefreshing(false);
			}
		}
	};

	const updateDraft = (fullName: string, draft: string) => {
		setParameters((current) => {
			const entry = current[fullName];
			if (!entry) {
				return current;
			}

			return {
				...current,
				[fullName]: {
					...entry,
					draft,
					dirty: true,
					error: null,
				},
			};
		});
	};

	const saveParameters = async () => {
		if (!ros) {
			snackBar("error", "ROS connection not available.");
			return;
		}

		const dirtyEntries = Object.values(parametersRef.current).filter((entry) => entry.dirty);

		if (dirtyEntries.length === 0) {
			snackBar("info", "No parameter changes to save.");
			return;
		}

		const requestToken = ++refreshTokenRef.current;
		setIsSaving(true);
		setStatusMessage(`Saving ${dirtyEntries.length} parameter changes...`);

		const results = await Promise.allSettled(
			dirtyEntries.map(async (entry) => {
				const typedValue = coerceDraftValue(entry.draft, entry.kind);
				const response = await callService<
					{ name: string; value: string },
					{ successful?: boolean; success?: boolean; reason?: string }
				>(ros, SET_PARAM_SERVICE.name, SET_PARAM_SERVICE.serviceType, {
					name: entry.fullName,
					value: JSON.stringify(typedValue),
				});

				if (response?.successful === false || response?.success === false) {
					throw new Error(response?.reason || "Parameter update rejected");
				}

				return {
					fullName: entry.fullName,
					typedValue,
				};
			})
		);

		if (requestToken !== refreshTokenRef.current) {
			return;
		}

		setParameters((current) => {
			const nextParameters = { ...current };
			let savedCount = 0;

			results.forEach((result, index) => {
				const entry = dirtyEntries[index];

				if (result.status === "fulfilled") {
					savedCount += 1;
					const savedEntry = nextParameters[entry.fullName];
					nextParameters[entry.fullName] = {
						...savedEntry,
						liveValue: result.value.typedValue,
						draft: formatDraftValue(result.value.typedValue, savedEntry.kind),
						dirty: false,
						error: null,
					};
				} else {
					const errorMessage = result.reason instanceof Error ? result.reason.message : String(result.reason);
					nextParameters[entry.fullName] = {
						...nextParameters[entry.fullName],
						error: errorMessage,
					};
				}
			});

			setStatusMessage(`Saved ${savedCount}/${dirtyEntries.length} parameters.`);
			snackBar("success", `Saved ${savedCount}/${dirtyEntries.length} parameters.`);
			return nextParameters;
		});

		setIsSaving(false);
	};

	useEffect(() => {
		if (ros) {
			void refreshParameters();
		}
		// The modal is mounted only while open, so refreshing on mount keeps the panel in sync.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ros]);

	return (
		<div className={styles.Background} onClick={onClose}>
			<div className={styles.Modal} onClick={(event) => event.stopPropagation()}>
				<div className={styles.ModalHeader}>
					<h1>Runtime Parameters</h1>
					<p>{statusMessage}</p>
				</div>

				<div className={styles.ModalContent}>
					<div className={styles.Toolbar}>
						<button type="button" className={styles.SecondaryColor} onClick={refreshParameters} disabled={isRefreshing}>
							{isRefreshing ? "Refreshing..." : "Refresh"}
						</button>
						<button type="button" className={styles.PrimaryColor} onClick={saveParameters} disabled={isSaving}>
							{isSaving ? "Saving..." : "Save Changes"}
						</button>
					</div>

					{groupedParameters.size === 0 ? (
						<div className={styles.EmptyState}>
							<p>No parameters loaded yet.</p>
							<p>Use refresh to query rosapi and populate the editable list.</p>
						</div>
					) : (
						Array.from(groupedParameters.entries()).map(([nodeName, entries]) => (
							<section key={nodeName} className={styles.NodeSection}>
								<div className={styles.NodeHeader}>
									<h2>{nodeName}</h2>
									<span>{entries.length} parameter{entries.length === 1 ? "" : "s"}</span>
								</div>

								<div className={styles.ParameterGrid}>
									{entries.map((entry) => (
										<div key={entry.fullName} className={styles.ParameterCard}>
											<div className={styles.ParameterHeader}>
												<div>
													<h3>{entry.paramName}</h3>
													<p>{entry.fullName}</p>
												</div>
												<div className={styles.Badges}>
													<span className={`${styles.TypeBadge} ${styles[`Type${entry.kind}`]}`}>{entry.kind}</span>
													{entry.dirty ? <span className={styles.DirtyBadge}>edited</span> : null}
												</div>
											</div>

											<div className={styles.ParameterEditor}>
												{entry.kind === "boolean" ? (
													<label className={styles.CheckboxRow}>
														<input
															type="checkbox"
															checked={entry.draft === "true"}
															onChange={(event) => updateDraft(entry.fullName, event.target.checked ? "true" : "false")}
														/>
														<span>Enabled</span>
													</label>
												) : entry.kind === "number" ? (
													<input
														type="number"
														step="any"
														value={entry.draft}
														onChange={(event) => updateDraft(entry.fullName, event.target.value)}
														className={styles.Input}
													/>
												) : entry.kind === "string" ? (
													<input
														type="text"
														value={entry.draft}
														onChange={(event) => updateDraft(entry.fullName, event.target.value)}
														className={styles.Input}
													/>
												) : (
													<textarea
														value={entry.draft}
														onChange={(event) => updateDraft(entry.fullName, event.target.value)}
														className={styles.Textarea}
													/>
												)}

												<div className={styles.LiveValue}>
													<span>Current</span>
													<pre>{stringifyPreviewValue(entry.liveValue)}</pre>
												</div>

												{entry.error ? <div className={styles.Error}>{entry.error}</div> : null}
											</div>
										</div>
									))}
								</div>
							</section>
						))
					)}
				</div>

				<div className={styles.ModalFooter}>
					<button type="button" className={styles.SecondaryColor} onClick={onClose}>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}

export default ParametersModal;