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

export type TargetRowMapData = {
    readonly getter: TargetRowMapGetter;
    map: Map<any, spi.DtoRow> | undefined;
};
export type TargetRowMapGetter = (keys: ReadonlyArray<any>) => Promise<Map<any, spi.DtoRow>>;

export type AssociationBinding = {
    readonly dependency: any;
    readonly sourceRows: Array<spi.DtoRow>;
    targetData: spi.DtoRow | ReadonlyArray<spi.DtoRow> | undefined;
    targetIdMap: Map<any, any> | undefined;
};

export type CalculatorBinding = {
    readonly dependency: any;
    readonly hash: any;
    readonly sourceRows: Array<spi.DtoRow>;
    targetData: any;
};