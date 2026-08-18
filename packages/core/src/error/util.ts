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

export function makeErr(message: string | (() => Error)): never {
    if (typeof message === "string") {
        throw new StateError(message);
    }
    throw message();
}

export function dedent(strings: TemplateStringsArray, ...values: any[]): string {
    const str = strings.reduce((result, string, i) =>
        result + string + (values[i] || ''), '');
    
    const lines = str.split('\n');
    if (lines.length === 0) return '';
    
    const minIndent = lines
        .filter(line => line.trim().length > 0)
        .reduce((min, line) => {
            const indent = line.match(/^\s*/)?.[0].length || 0;
            return Math.min(min, indent);
        }, Infinity);
    
    return lines
        .map(line => line.slice(minIndent))
        .join('\n')
        .trim();
}