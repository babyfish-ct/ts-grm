import { StateError } from "@/error/common";

export function makeErr(message: string | (() => Error)): never {
    if (typeof message === "string") {
        throw new StateError(message);
    }
    throw message();
}

export function capitalize(str: string): string {
    if (str.length === 0) {
        return str;
    }
    const firstChar = String.fromCodePoint(str.codePointAt(0)!);
    const rest = str.slice(firstChar.length);
    return firstChar.toUpperCase() + rest;
}