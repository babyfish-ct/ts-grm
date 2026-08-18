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

import { ExpressionLike } from "@/dsl/expression";
import { ExpressionOrder } from "@/dsl/utils";
import { RootQuerySelection } from "@/dsl/root_query";
import { __TableLike } from "@/dsl/table_internal_types";
import { AbstractPred } from "./pred";
import { AbstractExpr } from "./expr";
import { AbstractTable } from "../abstract_table";
import { MergedQueryKind } from "./query_factory";
import { Node } from "./node";

export type QueryContract = AtomQueryContract | MergedQueryContract;

export interface AtomQueryContract extends Node {

    readonly level: "ROOT" | "SUB" | "BASE";

    readonly kind: "ATOM";

    readonly isDistinct: boolean;

    readonly tables: ReadonlyArray<AbstractTable>;

    readonly wherePred: AbstractPred | undefined;

    readonly orders: ReadonlyArray<ExpressionOrder>;

    readonly groupByExprs: ReadonlyArray<AbstractExpr<any>> | undefined;

    readonly havingPred: AbstractPred | undefined;

    readonly options: AtomQueryOptions;

    readonly projection: ProjectionContract;

    readonly isRecursive: boolean;

    readonly recursivePred: AbstractPred | undefined;
}

export interface MergedQueryContract extends Node {

    readonly level: "ROOT" | "SUB" | "BASE";

    readonly kind: MergedQueryKind;

    readonly queries: ReadonlyArray<QueryContract>;

    readonly isRecursive: boolean;

    readonly projection: ProjectionContract;
}

export type ProjectionContract = {
    readonly kind: "ROOT_SINGLE";
    readonly selection: RootQuerySelection<any>;
} | {
    readonly kind: "ROOT_ARRAY";
    readonly selections: ReadonlyArray<RootQuerySelection<any>>;
} | {
    readonly kind: "ROOT_MAP";
    readonly selections: { readonly [key: string]: RootQuerySelection<any> };
} | {
    kind: "SUB_SINGLE";
    readonly selection: ExpressionLike;
} | {
    kind: "SUB_ARRAY";
    readonly selections: ReadonlyArray<ExpressionLike>;
} | {
    kind: "BASE";
    args: { readonly [key: string]: ExpressionLike | __TableLike; }
};

export interface AtomQueryOptions {
    readonly countMode: boolean;
    readonly distinct: boolean;
    readonly limit: number;
    readonly offset: number;
};

export const defaultAtomQueryOptions: AtomQueryOptions = {
    countMode: false,
    distinct: false,
    limit: -1,
    offset: 0
};
