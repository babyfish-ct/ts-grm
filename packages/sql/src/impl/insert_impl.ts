import { SqlClientImplementor } from "@/sql_client";
import { __MutatedMembers, __MutatedReturn, AnyAssociationModel, AnyModel, AtLeastOne, BaseModel, Insert, InsertResult, InsertResultWithData, ReturnedInsert, spi } from "@ts-grm/core";
import { executeInsert } from "./mutation_executor/execute_insert";
import { propsOf } from "./utils";

export class InsertImpl<
    TModel extends AnyModel | AnyAssociationModel
> implements Insert<TModel>, spi.InsertContract {

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        readonly model: TModel,
        readonly source: Iterable<spi.SourceRow> | BaseModel<any>,
        readonly bindings: ReadonlyArray<spi.InsertBinding> | ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp>
    ) {}

    async execute<
        TReturnKind extends "AFFECTED_ROW_COUNT" | "NOTHING" = "AFFECTED_ROW_COUNT"
    >(kind?: TReturnKind): Promise<any> {
        const result = await executeInsert(
            this._sqlClient,
            this.model,
            this.source,
            this.bindings,
            undefined,
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
        return new ReturnedInsertImpl(this._sqlClient, this.model, this.source, this.bindings, props);
    }

    get retunredProps(): ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp> | undefined {
        return undefined;
    }
}

export class ReturnedInsertImpl<
    TModel extends AnyModel | AnyAssociationModel,
    TKeys extends AtLeastOne<keyof __MutatedMembers<TModel>>
> implements ReturnedInsert<TModel, TKeys> {

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        readonly model: TModel,
        readonly source: Iterable<spi.SourceRow> | BaseModel<any>,
        readonly bindings: ReadonlyArray<spi.InsertBinding> | ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp>,
        readonly returnedProps: ReadonlyArray<spi.EntityProp> | ReadonlyArray<spi.AssociationProp> | undefined
    ) {}

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
            this._sqlClient,
            this.model,
            this.source,
            this.bindings,
            this.returnedProps,
            {
                returnNothing: false,
                nullAsUndefined: options?.nullAsUndefined ?? false
            }
        );
    }
}