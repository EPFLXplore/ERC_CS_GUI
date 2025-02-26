import { Log } from "../../hooks/roverLogHooks";

class Database {
	webDB: IDBDatabase | undefined;

	init(name: string) {
		return new Promise((resolve, reject) => {
			const request = indexedDB.open(name, 1);
			request.onerror = () => {
				reject(request.error);
			};
			request.onsuccess = () => {
				resolve(request.result);
			};
			request.onupgradeneeded = () => {
				const db = request.result;

				// Create an object store named "logs" to store logs
				const objStore = db.createObjectStore("logs", {
					keyPath: "id",
					autoIncrement: true,
				});

				// Add an index to the "logs" object store to search by timestamp
				objStore.createIndex("timestamp", "timestamp", { unique: false });

				this.webDB = db;

				resolve(db);
			};
		});
	}

	addLog(log: Log) {
		return new Promise((resolve, reject) => {
			if (!this.webDB) {
				resolve(new Error("Database not initialized"));
				return;
			}

			const transaction = this.webDB.transaction("logs", "readwrite");
			const store = transaction.objectStore("logs");
			const request = store.add(log);
			request.onerror = () => {
				reject(request.error);
			};
			request.onsuccess = () => {
				resolve(request.result);
			};
		});
	}

	getLogs(from: number, to: number, types: string[]) {
		return new Promise((resolve, reject) => {
			if (!this.webDB) {
				reject(new Error("Database not initialized"));
				return;
			}

			const transaction = this.webDB.transaction("logs", "readonly");
			const store = transaction.objectStore("logs");
			const index = store.index("timestamp");
			const request = index.openCursor(IDBKeyRange.bound(from, to), "prev");
			const logs: Log[] = [];
			request.onerror = () => {
				reject(request.error);
			};
			request.onsuccess = () => {
				const cursor = request.result;
				if (cursor) {
					if (types.length === 0 || types.includes(cursor.value.type)) {
						logs.push(cursor.value);
					}
					cursor.continue();
				} else {
					resolve(logs);
				}
			};
		});
	}

	getLogsByIndex(offset: number, limit: number) {
		return new Promise((resolve, reject) => {
			if (!this.webDB) {
				reject(new Error("Database not initialized"));
				return;
			}

			const transaction = this.webDB.transaction("logs", "readonly");
			const store = transaction.objectStore("logs");
			const request = store.openCursor(null, "prev");
			const logs: Log[] = [];
			let index = 0;

			request.onerror = () => {
				reject(request.error);
			};
			request.onsuccess = () => {
				const cursor = request.result;
				if (cursor && index < offset + limit) {
					if (index >= offset) {
						logs.push(cursor.value);
					}
					index++;
					cursor.continue();
				} else {
					resolve(logs);
				}
			};
		});
	}

	getLogsByTimestamp(from: number | null, limit: number, types: string[]) {
		return new Promise((resolve, reject) => {
			if (!this.webDB) {
				reject(new Error("Database not initialized"));
				return;
			}

			const transaction = this.webDB.transaction("logs", "readonly");
			const store = transaction.objectStore("logs");
			const index = store.index("timestamp");

			// If `from` is null, get the most recent logs
			const range = from ? IDBKeyRange.upperBound(from) : null;
			const request = index.openCursor(range, "prev");

			const logs: Log[] = [];
			let count = 0;

			request.onerror = () => reject(request.error);
			request.onsuccess = () => {
				const cursor = request.result;
				if (
					cursor &&
					count < limit &&
					(types.length === 0 || types.includes(cursor.value.type))
				) {
					logs.push(cursor.value);
					count++;
					cursor.continue();
				} else {
					resolve(logs);
				}
			};
		});
	}
}

export default Database;
