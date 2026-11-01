import { migrateAcademy } from "../academy.js";
import { initial, validate, mergeStates } from "./state.js";
export class Database {
  constructor(notify = () => {}) {
    this.state = initial();
    this.notify = notify;
    this.db = null;
    this.channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel("erin-production-sync")
        : null;
    this.channel?.addEventListener("message", () => this.reload());
    this.onchange = () => {};
    this.serial = Promise.resolve();
  }
  async open() {
    try {
      this.db = await new Promise((resolve, reject) => {
        const r = indexedDB.open("erin-math-lab-production", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("snapshots");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.onblocked = () => reject(Error("blocked"));
      });
      const existing = await new Promise((resolve, reject) => {
        const request = this.db
          .transaction("snapshots", "readonly")
          .objectStore("snapshots")
          .get("current");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (existing) this.state = validate(existing);
      else await this.mutate((data) => validate(data));
      if (!this.state.academy || this.state.academy.rosterVersion !== 2)
        await this.mutate((d) => {
          migrateAcademy(d, Boolean(existing));
          validate(d);
        }, Boolean(existing));
      this.db.onversionchange = () => {
        this.db.close();
        this.db = null;
        this.notify("存储版本已更新，请导出后重新打开应用。");
      };
      return this.state;
    } catch {
      this.db = null;
      migrateAcademy(this.state, false);
      this.notify(
        "本地保存暂不可用。仍可练习，但离开可能丢失进度，请导出备份。",
      );
      return this.state;
    }
  }
  async reload() {
    if (!this.db) return;
    try {
      const tx = this.db.transaction("snapshots", "readonly"),
        r = tx.objectStore("snapshots").get("current");
      r.onsuccess = () => {
        if (r.result && r.result.revision > this.state.revision) {
          try {
            this.state = validate(r.result);
            this.onchange();
          } catch {
            this.notify(
              "另一页面的记录无法验证，已保留当前记录，请先导出备份。",
            );
          }
        }
      };
    } catch {
      this.notify("未能读取其他页面的更新，请先导出当前备份。");
    }
  }
  mutate(fn, backup = false) {
    const operation = () =>
      new Promise((resolve, reject) => {
        if (!this.db) {
          try {
            const d = structuredClone(this.state),
              result = fn(d);
            d.revision++;
            this.state = d;
            resolve(result);
          } catch (e) {
            reject(e);
          }
          return;
        }
        const tx = this.db.transaction("snapshots", "readwrite"),
          store = tx.objectStore("snapshots"),
          get = store.get("current");
        let next, result;
        get.onsuccess = () => {
          try {
            const previous = get.result || this.state;
            next = structuredClone(previous);
            if (backup) store.put(previous, "recovery");
            result = fn(next);
            next.revision = (previous.revision || 0) + 1;
            store.put(next, "current");
          } catch (e) {
            tx.abort();
            reject(e);
          }
        };
        tx.oncomplete = () => {
          this.state = next;
          this.channel?.postMessage({ revision: next.revision });
          resolve(result);
        };
        tx.onerror = tx.onabort = () => {
          const error = tx.error || Error("保存失败");
          if (
            next &&
            ["QuotaExceededError", "UnknownError", "SecurityError"].includes(
              error.name,
            )
          ) {
            this.db = null;
            this.state = next;
            this.notify(
              "存储空间不足或被禁用。现改为临时练习，请保持页面打开并导出备份。",
            );
            resolve(result);
          } else reject(error);
        };
      });
    this.serial = this.serial.then(operation, operation).catch((e) => {
      this.notify("这次操作未能保存。请保留页面并导出备份：" + e.message);
      throw e;
    });
    return this.serial;
  }
  async import(raw, replace = false) {
    const incoming = validate(raw);
    return this.mutate((data) => {
      const result = replace
        ? structuredClone(incoming)
        : mergeStates(data, incoming);
      migrateAcademy(result, true);
      Object.assign(data, result);
    }, true);
  }
  async recovery() {
    if (!this.db) return null;
    return new Promise((resolve) => {
      const r = this.db
        .transaction("snapshots")
        .objectStore("snapshots")
        .get("recovery");
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    });
  }
}
