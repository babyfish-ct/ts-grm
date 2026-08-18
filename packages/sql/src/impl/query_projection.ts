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

import { BaseQuerySelectMapArgs, ExpressionLike, RootQueryProjection, RootQuerySelection, spi, SubQueryProjection } from "@ts-grm/core";

export abstract class AbstractQueryProjection {
    abstract readonly kind: string;
    abstract readonly distinct: boolean;
}

export abstract class AbstractRootQueryProjection<T, TKind = "ONE" | "ARRAY" | "MAP"> 
extends AbstractQueryProjection
implements RootQueryProjection<T, TKind> {

    __type(): {selectedProjection: [T, TKind] | true; } {
        return { selectedProjection: true };
    }

    static of(arr: any[], distinct: boolean): AbstractRootQueryProjection<any, any> {
        if (arr.length > 1) {
            return new ArrRootQueryProjection(arr as ReadonlyArray<RootQuerySelection<any>>, distinct);
        }
        const arg = arr[0];
        if (arg instanceof spi.AbstractSelection) {
            return new ValRootQueryProjection(arg as RootQuerySelection<any>, distinct);
        }
        return new MapRootQueryProjection(arg as { readonly [key:string]: RootQuerySelection<any> }, distinct);
    }
}

export class ValRootQueryProjection<T> extends AbstractRootQueryProjection<T, "ONE"> {

    get kind(): "ROOT_SINGLE" {
        return "ROOT_SINGLE";
    }

    constructor(
        readonly selection: RootQuerySelection<T>,
        readonly distinct: boolean
    ) {
        super();
    }
}

export class ArrRootQueryProjection<T> extends AbstractRootQueryProjection<T, "ARRAY"> {

    get kind(): "ROOT_ARRAY" {
        return "ROOT_ARRAY";
    }

    constructor(
        readonly selections: ReadonlyArray<RootQuerySelection<any>>,
        readonly distinct: boolean
    ) {
        super();
    }
}

export class MapRootQueryProjection<T> extends AbstractRootQueryProjection<T, "MAP"> {

    get kind(): "ROOT_MAP" {
        return "ROOT_MAP";
    }

    constructor(
        readonly selections: { readonly [key: string]: RootQuerySelection<any> },
        readonly distinct: boolean
    ) {
        super();
    }
}

export abstract class AbstractSubQueryProjection<T, TKind extends "EXPRESSION" | "TUPLE"> 
extends AbstractQueryProjection
implements SubQueryProjection<T, TKind> {

    __type(): { subQueryProjection: [T, TKind] | true; } {
        return { subQueryProjection: true };
    }

    static of(arr: any, distinct: boolean): AbstractSubQueryProjection<any, any> {
        if (arr.length > 1) {
            return new TupleSubQueryProjection(arr as ReadonlyArray<ExpressionLike>, distinct);
        }
        return new ExpressionSubQueryProjection(arr[0] as ExpressionLike, distinct);
    }
}

export class ExpressionSubQueryProjection<T extends ExpressionLike> extends AbstractSubQueryProjection<T, "EXPRESSION"> {

    get kind(): "SUB_SINGLE" {
        return "SUB_SINGLE";
    }

    constructor(
        readonly selection: T,
        readonly distinct: boolean
    ) {
        super();
    }
}

export class TupleSubQueryProjection<T extends ReadonlyArray<ExpressionLike>> extends AbstractSubQueryProjection<T, "TUPLE"> {

    get kind(): "SUB_ARRAY" {
        return "SUB_ARRAY";
    }

    constructor(
        readonly selections: T,
        readonly distinct: boolean
    ) {
        super();
    }
}

export class MapBaseQueryProjection<T extends BaseQuerySelectMapArgs> extends AbstractQueryProjection {

    __type(): { baseQueryProjection: T | true } {
        return { baseQueryProjection: true };
    }

    get kind(): "BASE" {
        return "BASE";
    }

    constructor(
        readonly args: T,
        readonly distinct: boolean
    ) {
        super();
    }
}