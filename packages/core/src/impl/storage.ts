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

export type StorageType = "NONE" 
    | Column["kind"] 
    | Columns["kind"] 
    | MiddleTable["kind"]
    | MiddelEntity["kind"];

export type PropStorage = 
    Column 
    | Columns 
    | MiddleTable
    | MiddelEntity;

export type Column = {
    readonly kind: "COLUMN";
    readonly name: string;
    readonly referencedProp: EntityProp | undefined;
    readonly referencedColumnName: string | undefined;
};

export type Columns = {
    readonly kind: "COLUMNS"
} & ReadonlyArray<Column>;

export type MiddleTable = {
    readonly kind: "MIDDLE_TABLE";
    readonly name: string;
    readonly toThisColumns: ReadonlyArray<Column>;
    readonly toTargetColumns: ReadonlyArray<Column>;
}

export type MiddelEntity = {
    readonly kind: "MIDDLE_ENTITY";
    readonly entity: Entity;
    readonly joinThisProp: EntityProp;
    readonly joinTargetProp: EntityProp;
};
