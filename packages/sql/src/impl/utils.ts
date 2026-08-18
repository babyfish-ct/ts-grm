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

import { AnyModel, spi } from "@ts-grm/core";
import { BaseModelImpl } from "./abstract_base_query_impl";

export function toTables(
    args: ReadonlyArray<any>
): ReadonlyArray<spi.AbstractTable> {
    const tables: Array<spi.AbstractTable> = [];
    for (let i = 0; i < args.length - 1; i++) {
        const model = args[i];
        const table = model instanceof BaseModelImpl
            ? spi.createTypedBaseTable(model, undefined)
            : spi.Entity.of(model as AnyModel).table(undefined);
        tables.push(table);
    }
    return tables;
}
