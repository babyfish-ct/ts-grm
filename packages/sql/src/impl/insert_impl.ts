import { SqlClientImplementor } from "@/sql_client";
import { __MutatedMembers, __MutatedReturn, AnyAssociationModel, AnyModel, AtLeastOne, BaseModel, Insert, InsertResult, InsertResultWithData, ReturnedInsert, spi } from "@ts-grm/core";
import { executeInsert } from "./mutation_executor/execute_insert";
import { propsOf } from "./utils";
import { BaseModelImpl } from "./abstract_base_query_impl";

export class InsertImpl<
    TModel extends AnyModel | AnyAssociationModel
> implements Insert<TModel>, spi.InsertContract, spi.Node {

    constructor(
        readonly sqlClient: SqlClientImplementor,
        readonly model: TModel,
        readonly source: Iterable<spi.SourceRow> | BaseModel<any>,
        readonly bindings: ReadonlyArray<spi.InsertBinding> | ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp>,
        readonly sourceTable: spi.AbstractTable | undefined
    ) {}

    get kind(): "BY_VALUES" | "BY_BASE_MODEL" {
        return this.source instanceof BaseModelImpl
            ? "BY_BASE_MODEL"
            : "BY_VALUES";
    }

    get entity(): spi.Entity | spi.AssociationEntity {
        return entityOf(this.model);
    }

    async execute<
        TReturnKind extends "AFFECTED_ROW_COUNT" | "NOTHING" = "AFFECTED_ROW_COUNT"
    >(kind?: TReturnKind): Promise<any> {
        const result = await executeInsert(
            this.sqlClient,
            this,
            {
                returnNothing: kind === "NOTHING",
                nullAsUndefined: false
            }
        );
        if (kind === "NOTHING") {
            return;
        }
        return result as InsertResult;
    }

    returning<
        const TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
    >(
        ...keys: TKeys
    ): ReturnedInsert<TModel, TKeys> {
        const props = propsOf(this.model, keys as ReadonlyArray<string>);
        return new ReturnedInsertImpl(this.sqlClient, this.model, this.source, this.bindings, props, this.sourceTable);
    }

    get returnedProps(): ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp> | undefined {
        return undefined;
    }

    accept(visitor: spi.Visitor) {
        visitor.visitInsert(this);
    }
}

export class ReturnedInsertImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> implements ReturnedInsert<TModel, TKeys>, spi.InsertContract, spi.Node {

    constructor(
        readonly sqlClient: SqlClientImplementor,
        readonly model: TModel,
        readonly source: Iterable<spi.SourceRow> | BaseModel<any>,
        readonly bindings: ReadonlyArray<spi.InsertBinding> | ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp>,
        readonly returnedProps: ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp>,
        readonly sourceTable: spi.AbstractTable | undefined
    ) {}

    get kind(): "BY_VALUES" | "BY_BASE_MODEL" {
        return this.source instanceof BaseModelImpl
            ? "BY_BASE_MODEL"
            : "BY_VALUES";
    }

    get entity(): spi.Entity | spi.AssociationEntity {
        return (this.model as any).__type().associationModel != null
            ? spi.AssociationEntity.of(this.model as AnyAssociationModel)
            : spi.Entity.of(this.model as AnyModel);
    }

    execute<
        TNullAsUndefined extends boolean = false
    >(
        options?: {
            readonly nullAsUndefined: TNullAsUndefined
        }
    ): Promise<
        TKeys["length"] extends 1
            ? InsertResultWithData<
                __MutatedReturn<__MutatedMembers<TModel>[TKeys[0]], TNullAsUndefined> 
            >
            : InsertResultWithData<{
                -readonly [K in keyof TKeys]: __MutatedReturn<__MutatedMembers<TModel>[TKeys[K]], TNullAsUndefined> 
            }>
    > {
        return executeInsert(
            this.sqlClient,
            this,
            {
                returnNothing: false,
                nullAsUndefined: options?.nullAsUndefined ?? false
            }
        );
    }

    accept(visitor: spi.Visitor) {
        visitor.visitInsert(this);
    }
}

export function entityOf(
    model: AnyModel | AnyAssociationModel
): spi.Entity | spi.AssociationEntity {
    return (model as any).__type().associationModel != null
        ? spi.AssociationEntity.of(model as AnyAssociationModel)
        : spi.Entity.of(model as AnyModel);
}