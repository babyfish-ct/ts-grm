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

    executeUpdate(
        sql: string, 
        args: ReadonlyArray<Value>,
        purpose: Purpose
    ): Promise<number>;

    executeQuery(
        sql: string, 
        args: ReadonlyArray<Value>,
        purpose: Purpose
    ): Promise<DataRows>;

    executeQueries(
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

    executeUpdate(
        sql: string, 
        values: ReadonlyArray<Value>,
        purpose: Purpose
    ): Promise<number> {
        return this._raw.executeUpdate(sql, values, purpose);
    }

    executeQuery(
        sql: string, 
        values: ReadonlyArray<Value>,
        purpose: Purpose
    ): Promise<DataRows> {
        return this._raw.executeQuery(sql, values, purpose);
    }

    executeQueries(
        sql: string,
        binds: ReadonlyArray<ReadonlyArray<Value>>,
        purpose: Purpose
    ): Promise<ReadonlyArray<DataRows>> {
        return this._raw.executeQueries(sql, binds, purpose);
    }
}

export type Purpose = 
    QueryPurpose 
    | LoadAssociationPurpose 
    | LoadRecursiveTreePurpose
    | LoadRecursiveTreeKeyPurpose
    | LoadRecursiveTreeNodePurpose
    | LoadCalculatorPurpose
    | InsertPurpose;

export interface QueryPurpose {
    readonly kind: "QUERY"
};

export interface LoadAssociationPurpose {
    readonly kind: "LOAD_ASSOCIATION";
    readonly prop: spi.EntityProp;
};

export interface LoadRecursiveTreePurpose {
    readonly kind: "LOAD_RECURSIVE_TREE";
    readonly prop: spi.EntityProp;
};

export interface LoadRecursiveTreeKeyPurpose {
    readonly kind: "LOAD_RECURSIVE_TREE_KEY";
    readonly prop: spi.EntityProp;
};

export interface LoadRecursiveTreeNodePurpose {
    readonly kind: "LOAD_RECURSIVE_TREE_NODE";
    readonly prop: spi.EntityProp;
};

export interface LoadCalculatorPurpose {
    readonly kind: "LOAD_CALCULATOR";
    readonly prop: spi.EntityProp;
    readonly parameter: any;
};

export interface InsertPurpose {
    readonly kind: "INSERT";
}