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

import { spi } from "@ts-grm/core";

let _insertedSourceBaseQuery: spi.AtomQueryContract | undefined = undefined;

export function usingInsertedSourceBaseQuery(
    baseQuery: spi.AtomQueryContract | undefined,
    fn: () => void
) {
    const old = _insertedSourceBaseQuery;
    _insertedSourceBaseQuery = baseQuery;
    try {
        fn();
    } finally {
        _insertedSourceBaseQuery = old;
    }
}

export function insertedSourceBaseQuery(): spi.AtomQueryContract | undefined {
    return _insertedSourceBaseQuery;
}