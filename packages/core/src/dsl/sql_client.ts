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

import { AtLeastOne } from "./utils";
import { BaseModel } from "./base_query";
import { AtomRootQuery, MutableRootQuery, RootQueryProjection } from "./root_query";
import { Table } from "./table";
import { Criteria } from "./criteria";
import { AnyModel } from "@/schema/model";
import { AnyAssociationModel } from "./association";
import { Page } from "./page";
import { Input, TypeOf, View } from "@/schema/dto/api";
import { __ModelOf } from "@/schema/dto/internal_types";
import { ModelOrder } from "@/schema/order";
import { __AffectRowsResult, __AssociatedSaveModeOptions, __DissociationOptions } from "@/index_internal";
import { SaveManyWithViewResult, SaveOneWithViewResult, SaveOptions, SaveResult, SaveWithViewOptions } from "./mutation";

export interface SqlClient {

    __type(): { sqlClient: undefined };

    findOne<V extends View<any, any>>(
        view: V,
        criteria: Criteria<__ModelOf<V>>
    ): Promise<TypeOf<V>>;

    findOneOrNull<
        V extends View<any, any>
    >(
        view: V,
        criteria: Criteria<__ModelOf<V>>
    ): Promise<TypeOf<V> | null>;

    findOneOrUndefined<
        V extends View<any, any>
    >(
        view: V,
        criteria: Criteria<__ModelOf<V>>
    ): Promise<TypeOf<V> | undefined>;

    findMany<V extends View<any, any>>(
        view: V,
        options: FindManyOptions<__ModelOf<V>>
    ): Promise<Array<TypeOf<V>>>;

    findRange<V extends View<any, any>>(
        view: V,
        options: FindRangeOptions<__ModelOf<V>>
    ): Promise<Array<TypeOf<V>>>;

    findPage<V extends View<any, any>>(
        view: V,
        options: FindPageOptions<__ModelOf<V>>
    ): Promise<Page<TypeOf<V>>>;

    createQuery<
        const TModels extends AtLeastOne<AnyModel | BaseModel<any> | AnyAssociationModel>,
        TProjection extends RootQueryProjection<any>
    >(
        ...args: [
            ...symbols: TModels,
            fn: (
                q: MutableRootQuery,
                ...tables: {
                    [K in keyof TModels]: Table<TModels[K]>
                } extends infer T ? T extends any[] ? T : never : never
            ) => TProjection
        ]
    ): AtomRootQuery<TProjection>;

    execute<R>(
        fn: () => Promise<R>
    ): Promise<R>;

    execute<R>(
        propagation: Propagation,
        fn: () => Promise<R>
    ): Promise<R>;

    execute<R>(
        isolation: Isolation,
        fn: () => Promise<R>
    ): Promise<R>;

    execute<R>(
        timeout: number,
        fn: () => Promise<R>
    ): Promise<R>;

    execute<R>(
        options: Partial<TransactionOptions>,
        fn: () => Promise<R>
    ): Promise<R>;

    save<TInput extends Input<any, any, any>>(
        input: TInput,
        obj: TypeOf<TInput>,
        options?: SaveOptions<TInput>
    ): Promise<SaveResult<TInput>>;

    save<TInput extends Input<any, any, any>>(
        input: TInput,
        arr: ReadonlyArray<TypeOf<TInput>>,
        options?: SaveOptions<TInput>
    ): Promise<SaveResult<TInput>>;

    save<
        TInput extends Input<any, any, any>,
        TView extends View<__ModelOf<TInput>, any>
    >(
        input: TInput,
        obj: TypeOf<TInput>,
        options?: SaveWithViewOptions<TInput, TView>
    ): Promise<SaveOneWithViewResult<TInput, TView>>;

    save<
        TInput extends Input<any, any, any>,
        TView extends View<__ModelOf<TInput>, any>
    >(
        input: TInput,
        arr: ReadonlyArray<TypeOf<TInput>>,
        options?: SaveWithViewOptions<TInput, TView>
    ): Promise<SaveManyWithViewResult<TInput, TView>>;

    createSchema(): Promise<Schema>;
}

export type Propagation =
    "REQUIRED"
    | "REQUIRES_NEW"
    | "NOT_SUPPORTED"
    | "NEVER"
    | "MANDATORY"
    | "NESTED";

export type Isolation =
    "READ_UNCOMMITTED" 
    | "READ_COMMITTED" 
    | "REPEATABLE_READ"
    | "SERIALIZABLE";

export type TransactionOptions =
    {
        readonly propagation: Propagation;
        readonly isolation: Isolation;
        readonly timeout: number;
    };

export interface Schema {

    readonly creationSqlArray: ReadonlyArray<string>;

    readonly deletionSqlArray: ReadonlyArray<string>;

    execute(): Promise<void>;

    toString(): string;
}

export interface FindManyOptions<TModel extends AnyModel> {

    readonly criteria?: Criteria<TModel>;

    readonly orders?: ModelOrder<TModel> | ReadonlyArray<ModelOrder<TModel>>;
}

export interface FindRangeOptions<TModel extends AnyModel> extends FindManyOptions<TModel> {

    readonly limit: number;

    readonly offset?: number;
}

export interface FindPageOptions<TModel extends AnyModel> extends FindManyOptions<TModel> {

    readonly pageSize: number;

    readonly pageNo?: number;
}

