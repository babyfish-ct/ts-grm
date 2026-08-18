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
import { Column, Composite, Scope } from "./fragment";
import { RealTable } from "./real_table";

export function addTypeMatch(
    table: RealTable,
    currentEntity: spi.Entity | undefined,
    castToEntity: spi.Entity,
    createColumn: (realTable: RealTable, columnName: string) => Column,
    negative: boolean,
    composite: Composite
): void {
    const values = castToEntity.discriminatorValues;
    if (values.length == 0) {
        composite.add(negative ? "1 = 1" : "1 = 0");
    } else {
        const tableSettings = (currentEntity ?? table.symbol.__entity!).tableSettings;
        composite.add(
            createColumn(
                table, 
                tableSettings.discriminator!.name
            )
        )
        if (values.length === 1) {
            composite.add(negative ? "<>" : " = ");
            if (tableSettings.discriminator!.type === "string") {
                composite.add(`'${values[0]}'`);
            } else {
                composite.add(values[0]!.toString());
            }
        } else {
            composite.add(negative ? "not in" : " in");
            const valueScope = new Scope("VALUES", false);
            if (tableSettings.discriminator!.type === "string") {
                for (const value of values) {
                    valueScope.separator().add(`'${value}'`);
                }
            } else {
                for (const value of values) {
                    valueScope.separator().add(value.toString());
                }
            }
            composite.add(valueScope);
        }
    }
}