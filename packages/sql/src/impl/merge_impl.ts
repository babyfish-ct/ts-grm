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

import { SqlClientImplementor } from "@/sql_client";
import { 
    __MutatedMembers, 
    __MutatedReturn, 
    __MutatedReturnKey, 
    AnyAssociationModel, 
    AnyModel, 
    AtLeastOne, 
    BaseModel, 
    err, 
    ImportResult, 
    ImportResultWithData, 
    INSERTED_FLAG, 
    Merge, 
    ReturnedMerge, 
    spi
} from "@ts-grm/core";
import { BaseModelImpl } from "./abstract_base_query_impl";
import { executeMerge } from "./mutation_executor/execute_merge";
import { returnedPropsOf } from "./utils";

export class MergeImpl<
    TModel extends AnyModel | AnyAssociationModel
> implements Merge<
    TModel
>, spi.MergeContract, spi.Node {

    constructor(
        readonly sqlClient: SqlClientImplementor,
        readonly model: AnyModel | AnyAssociationModel,
        readonly source: Iterable<spi.SourceRow> | BaseModel<any>,
        readonly valueProps: ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp> | undefined,
        readonly table: spi.AbstractTable,
        readonly sourceTable: spi.AbstractTable,
        readonly condition: spi.AbstractPred,
        readonly matchedBindings: ReadonlyArray<spi.Binding> | undefined,
        readonly unmatchedBindings: ReadonlyArray<spi.Binding> | undefined
    ) {
        if (matchedBindings == null && unmatchedBindings == null) {
            throw new err.ArgumentError(
                `Illegal merge statement, neither matched behavior not unmatched behavior is specified`
            );
        }
    }

    get kind(): "BY_VALUES" | "BY_BASE_MODEL" {
        return this.source instanceof BaseModelImpl
            ? "BY_BASE_MODEL"
            : "BY_VALUES";
    }

    async execute(
        options?: {
            readonly nullAsUndefined?: boolean
        }
    ): Promise<any> {
        const result = await executeMerge(
            this.sqlClient,
            this,
            {
                nullAsUndefined: options?.nullAsUndefined ?? false
            }
        );
        return result as ImportResult;
    }

    returning<
        const TKeys extends AtLeastOne<__MutatedReturnKey<TModel>>
    >(
        ...keys: TKeys
    ): ReturnedMerge<TModel, TKeys> {
        if (keys.length < 1) {
            throw new err.ArgumentError(`The function "returning" must accept at least one key`);
        }
        const returnedProps = returnedPropsOf(this.model, keys as ReadonlyArray<string | typeof INSERTED_FLAG>);
        return new ReturnedMergeImpl(
            this.sqlClient,
            this.source,
            this.valueProps,
            this.table,
            this.sourceTable,
            this.condition,
            this.matchedBindings,
            this.unmatchedBindings,
            returnedProps
        );
    }

    get returnedProps(): ReadonlyArray<spi.EntityProp | spi.AssociationProp | typeof INSERTED_FLAG> | undefined {
        return undefined;
    }

    accept(visitor: spi.Visitor) {
        visitor.visitMerge(this);
    }
}

class ReturnedMergeImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<__MutatedReturnKey<TModel>>
> implements ReturnedMerge<
    TModel,
    TKeys
>, spi.MergeContract, spi.Node {

    constructor(
        readonly sqlClient: SqlClientImplementor,
        readonly source: Iterable<spi.SourceRow> | BaseModel<any>,
        readonly valueProps: ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp> | undefined,
        readonly table: spi.AbstractTable,
        readonly sourceTable: spi.AbstractTable,
        readonly condition: spi.AbstractPred,
        readonly matchedBindings: ReadonlyArray<spi.Binding> | undefined,
        readonly unmatchedBindings: ReadonlyArray<spi.Binding> | undefined,
        readonly returnedProps: ReadonlyArray<spi.EntityProp | spi.AssociationProp | typeof INSERTED_FLAG> | undefined
    ) {}

    get kind(): "BY_VALUES" | "BY_BASE_MODEL" {
        return this.source instanceof BaseModelImpl
            ? "BY_BASE_MODEL"
            : "BY_VALUES";
    }

    async execute<
        TNullAsUndefined extends boolean = false
    >(
        options?: {
            readonly nullAsUndefined: TNullAsUndefined
        }
    ): Promise<
        TKeys["length"] extends 1
            ? ImportResultWithData<
                __MutatedReturn<TModel, TKeys[0], TNullAsUndefined> 
            >
            : ImportResultWithData<{
                -readonly [K in keyof TKeys]: __MutatedReturn<TModel, TKeys[K], TNullAsUndefined> 
            }>
    > {
        const result = await executeMerge(
            this.sqlClient,
            this,
            {
                nullAsUndefined: options?.nullAsUndefined ?? false
            }
        );
        return result as any;
    }

    accept(visitor: spi.Visitor) {
        visitor.visitMerge(this);
    }
}