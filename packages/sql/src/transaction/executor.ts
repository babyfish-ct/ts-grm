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

import { DataRows } from "@/impl/data_row_reader";
import { Value } from "@/sql/fragment";
import { spi } from "@ts-grm/core";

export interface Executor {

    execute(sql: string): Promise<void>;

    executeStatement(
        sql: string, 
        args: ReadonlyArray<Value>,
        purpose: Purpose
    ): Promise<DataRows>;

    executeStatements(
        sql: string,
        binds: ReadonlyArray<ReadonlyArray<Value>>,
        purpose: Purpose
    ): Promise<ReadonlyArray<DataRows>>;
}

export abstract class AbstractExecutorWrapper implements Executor {

    constructor(
        private readonly _raw: Executor
    ) {}

    execute(sql: string): Promise<void> {
        return this._raw.execute(sql);
    }

    executeStatement(
        sql: string, 
        values: ReadonlyArray<Value>,
        purpose: Purpose
    ): Promise<DataRows> {
        return this._raw.executeStatement(sql, values, purpose);
    }

    executeStatements(
        sql: string,
        binds: ReadonlyArray<ReadonlyArray<Value>>,
        purpose: Purpose
    ): Promise<ReadonlyArray<DataRows>> {
        return this._raw.executeStatements(sql, binds, purpose);
    }
}

export type Purpose = 
    QueryPurpose 
    | LoadAssociationPurpose 
    | LoadRecursiveTreePurpose
    | LoadRecursiveTreeKeyPurpose
    | LoadRecursiveTreeNodePurpose
    | LoadCalculatorPurpose;

export type QueryPurpose = {
    readonly kind: "QUERY"
};

export type LoadAssociationPurpose = {
    readonly kind: "LOAD_ASSOCIATION",
    readonly prop: spi.EntityProp
};

export type LoadRecursiveTreePurpose = {
    readonly kind: "LOAD_RECURSIVE_TREE",
    readonly prop: spi.EntityProp
};

export type LoadRecursiveTreeKeyPurpose = {
    kind: "LOAD_RECURSIVE_TREE_KEY",
    prop: spi.EntityProp
};

export type LoadRecursiveTreeNodePurpose = {
    readonly kind: "LOAD_RECURSIVE_TREE_NODE",
    readonly prop: spi.EntityProp
};

export type LoadCalculatorPurpose = {
    readonly kind: "LOAD_CALCULATOR",
    readonly prop: spi.EntityProp,
    readonly parameter: any
};