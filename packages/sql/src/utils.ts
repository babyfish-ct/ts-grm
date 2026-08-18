/*
 * ts-grm is a pure TypeScript database ORM built on type-level programming.
 * 
 * Design principles:
 * - Zero code generation, pure TypeScript type inference
 * - No entity object instantiation — maps database rows directly to DTOs
 * - No runtime reflection — performance on par with handwritten SQL
 * - Full type safety, full SQL features
 * - Like GraphQL, clients can query exact shape of data they need
 * - Like the inversed GraphQL, clients can save exact shape of data they need
 * 
 * @author 陈涛 (Chen Tao)
 */

import { EntityManager } from "@ts-grm/core";
import { FilterManager } from "./cfg";

export type DeepPartial<T> = 
    T extends object
        ? {
            [P in keyof T]?: DeepPartial<T[P]>;
        }
        : T;

export function merge<T>(
    value: DeepPartial<T>, 
    defaultValue: T
): T {
    if (value == null) {
        return defaultValue;
    }
    if (CLASSES.has(value.constructor)) {
        return value as T;
    }
    if (typeof value !== "object") {
        return value as T;
    }
    const mergedObj = { ...value } as any;
    for (const key in defaultValue) {
        mergedObj[key] = merge(mergedObj[key], defaultValue[key]);
    }
    return mergedObj as T;
}

const CLASSES = new Set<any>([
    FilterManager,
    EntityManager
]);