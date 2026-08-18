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

import { StateError } from "@/error/common";

export function capitalize(str: string): string {
    if (str.length === 0) {
        return str;
    }
    const firstChar = String.fromCodePoint(str.codePointAt(0)!);
    const rest = str.slice(firstChar.length);
    return firstChar.toUpperCase() + rest;
}

export function acceptsNullOrUndefined(schema: any): boolean {
    const standard = schema['~standard'];
    if (!standard) {
        return false
    };
    const resNull = standard.validate(null);
    const resUndefined = standard.validate(undefined);
    if (resNull instanceof Promise || resUndefined instanceof Promise) {
        throw new StateError(
            `The StandardSchemaV1 used by model/DTO must support sync validate, not async. ` +
            `Vendor: ${standard.vendor || 'unknown'}`
        );
    }
    const allowsNull = !('issues' in resNull);
    const allowsUndefined = !('issues' in resUndefined);
    return allowsNull || allowsUndefined;
}
