import { StateError } from "@/error/common";

export function makeErr(message: string | (() => Error)): never {
    if (typeof message === "string") {
        throw new StateError(message);
    }
    throw message();
}