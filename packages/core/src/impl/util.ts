import { StateError } from "@/error/common";

export function makeErr(message: string): never {
    throw new StateError(message);
}