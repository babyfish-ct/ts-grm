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

import { Composite } from "@/sql/fragment";
import { SqlClientImplementor } from "@/sql_client";
import { spi } from "@ts-grm/core";
import { SqlBuilder } from "@/sql/sql_builder";

export function buildInsertStatement(
    sqlClient: SqlClientImplementor,
    insert: spi.InsertContract
): [string, ReadonlyArray<any>] {
    const composite = Composite.of(insert, sqlClient, undefined, false)
    const builder = SqlBuilder.of(sqlClient);
    composite.into(builder);
    const [sql, argumentMap] = builder.build();
    const args = Array.from(argumentMap.values());
    return [sql, args];
}