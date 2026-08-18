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

import { Entity } from "./entity";
import { EntityProp } from "./entity_prop";
import { Column, PropStorage } from "./storage";

export interface DatabaseStrategy {
    readonly namingStrategy: DatabaseNamingStrategy;
    readonly keywordStrategy: DatabaseKeywordStrategy;
}

export interface DatabaseNamingStrategy {

    tableName(entity: Entity): string;

    sequenceName(entity: Entity): string;

    columnName(prop: EntityProp): string;

    middleTableName(prop: EntityProp): string;

    middleTableThisRefColumnName(prop: EntityProp): string;

    middleTableTargetRefColumnName(prop: EntityProp): string;
}

export interface DatabaseKeywordStrategy {

    quoteIdentifier(value: string): string;
}

export class DefaultDatabaseNamingStrategy implements DatabaseNamingStrategy {

    constructor(private readonly lower: boolean) {}

    tableName(entity: Entity): string {
        return toSnakeCase(entity.name, this.lower);
    }

    sequenceName(entity: Entity): string {
        return `${
            toSnakeCase(entity.name, this.lower)
        }_${
            this.lower ? "id_seq" : "ID_SEQ"
        }`;
    }

    columnName(prop: EntityProp): string {
        return toSnakeCase(prop.name, this.lower);
    }

    middleTableName(prop: EntityProp): string {
        return `${
            toSnakeCase(prop.declaringEntity.name, this.lower)
        }_${
            toSnakeCase(prop.targetEntity!.name, this.lower)
        }_${
            this.lower ? "mapping" : "MAPPING"
        }`;
    }

    middleTableThisRefColumnName(prop: EntityProp): string {
        return `${
            toSnakeCase(prop.declaringEntity.name, this.lower)
        }_${
            toSnakeCase(prop.thisKeyProp!.name, this.lower)
        }`;
    }

    middleTableTargetRefColumnName(prop: EntityProp): string {
        return `${
            toSnakeCase(prop.targetEntity!.name, this.lower)
        }_${
            toSnakeCase(prop.targetKeyProp!.name, this.lower)
        }`;
    }
}

function toSnakeCase(text: string, lower: boolean): string {
    const replaced = text
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2');
    return lower ? replaced.toLowerCase() : replaced.toUpperCase();
}

export const UPPER_SNAKE_CASE_DATABASE_NAMING_STRATEGY = new DefaultDatabaseNamingStrategy(false);

export const LOWER_SNAKE_CASE_DATABASE_NAMING_STRATEGY = new DefaultDatabaseNamingStrategy(true);

export function isIllegal(storage: PropStorage) {
    switch (storage.kind) {
        case "COLUMN":
            return storage.name === "" || storage.referencedColumnName === "";
        case "COLUMNS":
            return storage.find(isIllegal) != null;
        case "MIDDLE_TABLE":
            return storage.name == "" 
                || storage.toThisColumns.find(isIllegal) != null 
                || storage.toTargetColumns.find(isIllegal) != null;
    }
}

export function fixColumnArr(
    columns: ReadonlyArray<Column>, 
    columnNameSupplier: () => string,
    referencedColumnNameSupplier: (c: Column) => string
): ReadonlyArray<Column> {
    return columns.map(c => fixColumn(
        c, 
        columnNameSupplier, 
        () => referencedColumnNameSupplier(c)
    ));
}

export function fixColumn(
    column: Column, 
    columnNameSupplier: () => string,
    referencedColumnNameSupplier: () => string
): Column {
    return {
        ...column,
        name: notEmpty(column.name, columnNameSupplier),
        referencedColumnName: notEmpty(column.referencedColumnName, referencedColumnNameSupplier)
    };
}

export function notEmpty<T extends string | undefined>(
    name: T,
    supplier: () => string
) {
    return name === "" ? supplier() : name;
}
