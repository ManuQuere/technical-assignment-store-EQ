import { JSONObject, JSONValue } from "./json-types";

export type Permission = "r" | "w" | "rw" | "none";

export interface IStore {
  defaultPolicy: Permission;
  allowedToRead(key: string): boolean;
  allowedToWrite(key: string): boolean;
  read(path: string): any;
  write(path: string, value: JSONValue): JSONValue | IStore;
  writeEntries(entries: JSONObject): void;
  entries(): JSONObject;
}

export function Restrict(restriction?: string): any {
  // We overwrite property methods depending on decorator's param restriction
  return function (target: any, propertyKey: string) {
    let value: string;
    const getter = function () {
      switch (restriction) {
        case "r":
          return value;
        case "rw":
          return value;
        default:
          return null;
      }
    };
    const setter = function (newValue: string) {
      switch (restriction) {
        case "w":
          return (value = newValue);
        case "rw":
          return (value = newValue);
        default:
          Object.defineProperty(target, "writeErrors", {
            value: "No write access",
          });
      }
    };

    Object.defineProperty(target, propertyKey, { get: getter, set: setter });
  };
}

export class Store implements IStore {
  [key: string]: any;
  defaultPolicy: Permission = "rw";

  allowedToRead = (key: string): boolean => {
    // If the getter returns null, then the property cannot be read.
    return this[key] !== null;
  };

  allowedToWrite(key: string): boolean {
    // If the property doesn't exist, or if it is possible to set, then it's allowed to write
    if (this[key] === undefined) {
      return true;
    } else if (this[key].set("")) {
      return true;
    } else {
      return false;
    }
  }

  read(path: string): string | undefined {
    if (!this.allowedToRead(path)) throw new Error("No read access");

    return this[path];
  }

  write(path: string, value: JSONValue): JSONValue | IStore {
    if (!this.allowedToWrite(path)) throw new Error("No write access");

    // If the property doesn't exist at all, we create a new entry to the instance.
    if (this[path] === undefined) {
      this.writeEntries({ [path]: value });
      return this;
    }
    return (this[path] = value);
  }

  writeEntries(entries: JSONObject): void {
    Object.assign(this, entries);
  }

  entries(): JSONObject {
    const entries: Record<string, string>[] = [];
    Object.keys(this).forEach((key) => {
      entries.push({ [key]: this[key] });
    });
    return { entries };
  }

  // Attempt for a recursive function to access the given path in a nested object
  private recursivelyReadObjectEntry(
    object: Record<string, string>,
    current: string,
    remainingPath?: string
  ) {
    if (object[current] === undefined) {
      return { current, remainingPath };
    } else if (remainingPath && remainingPath.length > 0) {
      const next = remainingPath.split(":")[0];
      remainingPath = remainingPath.slice(remainingPath.indexOf(":") + 1);
      this.recursivelyNavigateObjectEntry(object[current], next, remainingPath);
    } else {
      return object[current];
    }
  }
}
