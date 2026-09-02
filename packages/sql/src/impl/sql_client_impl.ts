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

import { AnyFilter, SqlClientOptions } from "@/cfg";
import { Driver } from "@/driver/deriver";
import { SqlClientImplementor } from "@/sql_client";
import { 
    Criteria, 
    View, 
    Input,
    TypeOf, 
    AtLeastOne, 
    AnyModel,
    BaseModel,
    RootQueryProjection,
    RootQuery,
    MutableRootQuery,
    Table,
    BaseQuery,
    MutableBaseQuery,
    MutableSubQuery,
    ExpressionSubQuery,
    TupleSubQuery,
    BaseQueryProjection,
    SubQueryProjection,
    BaseQueryMapOf,
    AtomRootQuery,
    AtomExpressionSubQuery,
    AtomTupleSubQuery,
    AtomBaseQuery,
    AnyAssociationModel,
    Isolation,
    Propagation,
    TransactionOptions,
    Schema,
    FetchRangeOptions,
    FetchPageOptions,
    SaveOptions,
    Page,
    spi,
    dsl,
    err,
    __ModelOf,
    FindManyOptions,
    FetchedView,
    NumExpression
} from "@ts-grm/core";
import { MutableRootQueryImpl } from "./mutable_root_query_impl";
import { AtomRootQueryImpl } from "./atom_root_query_impl";
import { AbstractRootQueryProjection, AbstractSubQueryProjection, ExpressionSubQueryProjection, MapBaseQueryProjection } from "./query_projection";
import { AtomBaseQueryImpl } from "./atom_base_query_impl";
import { MutableBaseQueryImpl } from "./mutable_base_query_impl";
import { toTables } from "./utils";
import { MergedBaseQueryImpl, MergedDtSubQueryImpl, MergedExprSubQueryImpl, MergedNumSubQueryImpl, MergedRootQueryImpl, MergedStrSubQueryImpl, MergedTupleSubQueryImpl } from "./merged_query";
import { MutableSubQueryImpl } from "./mutable_sub_query_impl";
import { AtomDtSubQueryImpl, AtomNumSubQueryImpl, AtomStrSubQueryImpl, AtomExprSubQueryImpl, AtomTupleSubQueryImpl } from "./atom_sub_query_impl";
import { TableDef } from "./schema_def";
import { createSchema } from "./schema_creator";
import { Executor } from "@/transaction/executor";
import { toExpressionOrders } from "./expression_orders";
import { NoDataError, TooManyDataError } from "@/error/data_count_error";
import { Validator } from "./validator";

export class SqlClientImpl implements SqlClientImplementor {

    __type(): { sqlClient: undefined } {
        return { sqlClient: undefined }
    }

    private readonly _configuredFilterMap: Map<spi.Entity, ReadonlyArray<AnyFilter>>;

    private readonly _filterMap =
        new Map<spi.Entity, ReadonlyArray<AnyFilter>>();

    readonly strategy: spi.DatabaseStrategy;

    private _validated = false;

    constructor(
        readonly driver: Driver,
        readonly options: SqlClientOptions
    ) {
        this._configuredFilterMap = (options.filterManager as any)._toMap();
        this.strategy = {
            namingStrategy: options.strategy,
            keywordStrategy: driver
        };
    }

    async findOne<V extends View<any, any>>(
        view: V,
        criteria: Criteria<__ModelOf<V>>
    ): Promise<TypeOf<V>> {
        const q = this.createQuery(view.mapper.entity.model, (q, table) => {
            q.where(table.match(criteria));
            return q.select(table.fetch(view));
        });
        const rows = await q.fetchRange({
            limit: 2
        });
        switch (rows.length) {
            case 0:
                throw new NoDataError(`"fetchOne" does not accept empty result set`);
            case 1:
                return rows[0] as any;
            default:
                throw new TooManyDataError(`"fetchOne" does not accept multiple rows`);
        }
    }

    async findOneOrNull<
        V extends View<any, any>
    >(
        view: V,
        criteria: Criteria<__ModelOf<V>>
    ): Promise<TypeOf<V> | null> {
        const q = this.createQuery(view.mapper.entity.model, (q, table) => {
            q.where(table.match(criteria));
            return q.select(table.fetch(view));
        });
        const rows = await q.fetchRange({
            limit: 2
        });
        switch (rows.length) {
            case 0:
                return null;
            case 1:
                return rows[0] as any;
            default:
                throw new TooManyDataError(`"fetchOneOrNull" does not accept multiple rows`);
        }
    }

    async findOneOrUndefined<
        V extends View<any, any>
    >(
        view: V,
        criteria: Criteria<__ModelOf<V>>
    ): Promise<TypeOf<V> | undefined> {
        const q = this.createQuery(view.mapper.entity.model, (q, table) => {
            q.where(table.match(criteria));
            return q.select(table.fetch(view));
        });
        const rows = await q.fetchRange({
            limit: 2
        });
        switch (rows.length) {
            case 0:
                return undefined;
            case 1:
                return rows[0] as any;
            default:
                throw new TooManyDataError(`"fetchOneOrUndefined" does not accept multiple rows`);
        }
    }

    findMany<V extends View<any, any>>(
        view: V,
        options: FindManyOptions<__ModelOf<V>>
    ): Promise<Array<TypeOf<V>>> {
        const q = this._createFindQuery(view, options);
        return q.fetchList();
    }

    findRange<V extends View<any, any>>(
        view: V,
        options: FindManyOptions<__ModelOf<V>> & FetchRangeOptions
    ): Promise<Array<TypeOf<V>>> {
        const q = this._createFindQuery(view, options as FindManyOptions<__ModelOf<V>>);
        return q.fetchRange({
            limit: options.limit,
            offset: options.offset
        });
    }

    findPage<V extends View<any, any>>(
        view: V,
        options: FindManyOptions<__ModelOf<V>> & FetchPageOptions
    ): Promise<Page<TypeOf<V>>> {
        const q = this._createFindQuery(view, options as FindManyOptions<__ModelOf<V>>);
        return q.fetchPage({
            pageSize: options.pageSize,
            pageNo: options.pageNo
        });
    }

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
    ): AtomRootQuery<TProjection> {
        const tables = toTables(args);
        const mutableQuery = new MutableRootQueryImpl(this, tables);
        const fnArgs: Array<any> = [ mutableQuery, ...tables ];
        const fn = args[args.length - 1] as Function;
        const projection = fn.apply(undefined, fnArgs) as AbstractRootQueryProjection<any>;
        const query = new AtomRootQueryImpl<TProjection>(mutableQuery, projection, undefined);
        if (projection.distinct) {
            return query.distinct();
        }
        return query;
    }

    isDirectAssociatedKey(
        expr: spi.PropExprContract
    ): boolean {
        const joinProp = expr.table.__joinOperation?.joinProp;
        if (joinProp == null || expr.table.__joinOperation!.isJoinPropInverse) {
            return false;
        }
        if (joinProp.targetKeyProp !== expr.prop.rootProp) {
            return false;
        }
        if (expr.table.__joinOperation!.isTargetFilterIgnored) {
            return true;
        }
        if (expr.table.__entity != null && this.getFilters(expr.table.__entity).length !== 0) {
            return false;
        }
        return true;
    }

    isDirectAssociatedField(
        field: spi.DtoMapperField
    ): boolean {
        const subMapper = field.subMapper;
        if (subMapper == null) {
            return true;
        }
        for (const childField of subMapper.fields) {
            const childProp = childField.prop.asEntityProp;
            if (childProp == null) {
                return false;
            }
            if (field.prop.targetKeyProp !== childProp.rootProp) {
                return false;
            }
        }
        if (this.getFilters(field.prop.targetEntity!).length !== 0) {
            return false;
        }
        return true;
    }

    getFilters(
        entity: spi.Entity
    ): ReadonlyArray<AnyFilter> {
        let filters = this._filterMap.get(entity);
        if (filters == null) {
            filters = this._createFilters(entity);
            this._filterMap.set(entity, filters);
        }
        return filters;
    }

    private _createFilters(
        entity: spi.Entity
    ): ReadonlyArray<AnyFilter> {
        const filters: Array<AnyFilter> = [];
        for (let e: spi.Entity | undefined = entity; 
            e != null; 
            e = e.superEntity) {
            const arr = this._configuredFilterMap?.get(e);
            if (arr != null) {
                filters.push(...arr);
            }
        }
        return filters;
    }

    execute<R>(
        options: Propagation | Isolation | number | Partial<TransactionOptions> | (() => Promise<R>),
        fn?: () => Promise<R>
    ): Promise<R> {
        let propagation: Propagation = "REQUIRED";
        let isolation: Isolation = "READ_COMMITTED";
        let timeout = 0;
        let func: () => Promise<R>;
        if (typeof options === "function") {
            func = options;
        } else {
            func = fn!; 
            if (typeof options === "string") {
                switch (options) {
                    case "READ_UNCOMMITTED":
                    case "READ_COMMITTED":
                    case "REPEATABLE_READ":
                    case "SERIALIZABLE":
                        isolation = options;
                        break;
                    default:
                        propagation = options;
                }
            } else {
                if (typeof options === "number") {
                    timeout = options;
                } else {
                    if (options.propagation != null) {
                        propagation = options.propagation;
                    }
                    if (options.isolation != null) {
                        isolation = options.isolation;
                    }
                    if (options.timeout != null) {
                        timeout = options.timeout;
                    }
                }
                if (timeout < 0) {
                    throw new err.ArgumentError(`The argument cannot be negative number, but it is ${timeout}`);
                }
            }
        }
        return this.driver.transactionManager.execute({propagation, isolation, timeout}, func);
    }

    async createSchema(): Promise<Schema> {
        const tableDefs = await createSchema(this);
        return new SchemaImpl(this, tableDefs);
    }

    get executor(): Executor {
        return this.options.executorCreator(this.driver.transactionManager.defaultExecutor);
    }

    private _createFindQuery<
        V extends View<any, any>
    >(
        view: V,
        options: FindManyOptions<__ModelOf<V>>
    ): RootQuery<RootQueryProjection<FetchedView<__ModelOf<V>, any>, "ONE">> {
        return this.createQuery(view.mapper.entity.model, (q, table) => {
            const criteria = options.criteria;
            if (criteria != null) {
                q.where(table.match(criteria));
            }
            const orders = options.orders;
            if (orders != null) {
                q.orderBy(...toExpressionOrders(table as any, orders as any));
            }
            return q.select(table.fetch(view));
        }) as any;
    }

    get isValidated(): boolean {
        return this._validated;
    }

    async validate(): Promise<void> {
        if (this._validated) {
            return;
        }
        if (this.options.entityManager != null) {
            const entities = await this.options.entityManager!.entities();
            const validator = new Validator(this.strategy);
            for (const entity of entities) {
                validator.validateEntity(entity);
            }
        }
        this._validated = true;
    }

    save<TInput extends Input<any, any, any>>(
        input: TInput,
        obj: TypeOf<TInput>,
        options?: SaveOptions<TInput>
    ): Promise<void>;

    save<TInput extends Input<any, any, any>>(
        input: TInput,
        arr: ReadonlyArray<TypeOf<TInput>>,
        options?: SaveOptions<TInput>
    ): Promise<void>;

    async save<TInput extends Input<any, any, any>>(
        _input: TInput,
        _data: TypeOf<TInput> | ReadonlyArray<TypeOf<TInput>>,
        _options?: SaveOptions<TInput>
    ): Promise<void> {
        throw new Error("UnsupportedOperation");
    }
}

class QueryFactoryImpl implements spi.QueryFactory {
    
    createAtomSubQuery<
        const TModels extends AtLeastOne<AnyModel | BaseModel<any> | AnyAssociationModel>,
        TProjection extends SubQueryProjection<any, any> | void
    >(
        ...args: [
            ...models: TModels,
            fn: (
                q: MutableSubQuery,
                ...tables: {
                    [K in keyof TModels]: Table<TModels[K]>
                } extends infer T ? T extends any[] ? T : never : never
            ) => TProjection
        ]
    ): TProjection extends SubQueryProjection<infer T, infer Kind>
        ? Kind extends "EXPRESSION"
            ? AtomExpressionSubQuery<T>
            : AtomTupleSubQuery<T>
        : TProjection extends void
            ? AtomExpressionSubQuery<NumExpression<number>>
        : never {
        const tables = toTables(args);
        const mutableQuery = new MutableSubQueryImpl(tables);
        const fnArgs: Array<any> = [ mutableQuery, ...tables ];
        const fn = args[args.length - 1] as Function;
        const projection = fn.apply(undefined, fnArgs) as AbstractSubQueryProjection<TProjection, any>;
        if (projection == null) {
            return new AtomNumSubQueryImpl(
                mutableQuery, 
                new ExpressionSubQueryProjection(dsl.constant(1), false), 
                undefined
            ) as any;
        }
        let query: any;
        if (projection.kind === "SUB_ARRAY") {
            query = new AtomTupleSubQueryImpl(mutableQuery, projection, undefined) as any;
        } else {
            const selection = (projection as ExpressionSubQueryProjection<any>).selection;
            if (selection instanceof spi.AbstractDtExpr) {
                query = new AtomDtSubQueryImpl(mutableQuery, projection, undefined) as any;
            } else if (selection instanceof spi.AbstractStrExpr) {
                query = new AtomStrSubQueryImpl(mutableQuery, projection, undefined) as any;
            } else if (selection instanceof spi.AbstractNumExpr) {
                query = new AtomNumSubQueryImpl(mutableQuery, projection, undefined) as any;
            } else {
                query = new AtomExprSubQueryImpl(mutableQuery, projection, undefined) as any;
            }
        }
        if (projection.distinct) {
            return query.distinct();
        }
        return query;
    }
        
    createAtomBaseQuery<
        const TModels extends AtLeastOne<AnyModel | BaseModel<any> | AnyAssociationModel>,
        TProjection extends BaseQueryProjection<any>
    >(
        ...args: [
            ...models: TModels,
            fn: (
                q: MutableBaseQuery,
                ...tables: {
                    [K in keyof TModels]: Table<TModels[K]>
                } extends infer T ? T extends any[] ? T : never : never
            ) => TProjection
        ]
    ): AtomBaseQuery<TProjection> {
        const tables = toTables(args);
        const mutableQuery = new MutableBaseQueryImpl(tables);
        const fnArgs: Array<any> = [ mutableQuery, ...tables ];
        const fn = args[args.length - 1] as Function;
        const projection = fn.apply(undefined, fnArgs) as MapBaseQueryProjection<BaseQueryMapOf<TProjection>>;
        const query = new AtomBaseQueryImpl(mutableQuery, undefined, projection, undefined);
        if (projection.distinct) {
            return query.distinct();
        }
        return query;
    }

    createMergedRootQuery<TProjection extends RootQueryProjection<any>>(
        kind: spi.MergedQueryKind, 
        queries: ReadonlyArray<RootQuery<TProjection>>
    ): RootQuery<TProjection> {
        return new MergedRootQueryImpl(kind, queries as any);
    }

    createMergedExpressionSubQuery<TProjection>(
        kind: spi.MergedQueryKind, 
        queries: ReadonlyArray<ExpressionSubQuery<TProjection>>
    ): ExpressionSubQuery<TProjection> {
        if (queries instanceof spi.AbstractDtExpr) {
            return new MergedDtSubQueryImpl(kind, queries as any) as any;
        }
        if (queries instanceof spi.AbstractStrExpr) {
            return new MergedStrSubQueryImpl(kind, queries as any) as any;
        }
        if (queries instanceof spi.AbstractNumExpr) {
            return new MergedNumSubQueryImpl(kind, queries as any) as any;
        }
        return new MergedExprSubQueryImpl(kind, queries as any) as any;
    }

    createMergedTupleSubQuery<TProjection>(
        kind: spi.MergedQueryKind, 
        queries: ReadonlyArray<TupleSubQuery<TProjection>>
    ): TupleSubQuery<TProjection> {
        return new MergedTupleSubQueryImpl(kind, queries as any) as any;
    }

    createMergedBaseQuery<TProjection>(
        kind: spi.MergedQueryKind, 
        queries: ReadonlyArray<BaseQuery<TProjection>>
    ): BaseQuery<TProjection> {
        return new MergedBaseQueryImpl(kind, queries as any);
    }
}

const queryFactory = new QueryFactoryImpl();

spi.setQueryFactory(queryFactory);

class SchemaImpl implements Schema {

    private _creationSqlArray: ReadonlyArray<string> | undefined = undefined;

    private _deletionSqlArray: ReadonlyArray<string> | undefined = undefined;

    private _str: string | undefined = undefined;

    constructor(
        readonly sqlClient: SqlClientImplementor,
        readonly tableDefs: ReadonlyArray<TableDef>
    ) {}

    get creationSqlArray(): ReadonlyArray<string> {
        let array = this._creationSqlArray;
        if (array == null) {
            this._creationSqlArray = array = this.getCreationSqlArray();
        }
        return array;
    }

    get deletionSqlArray(): ReadonlyArray<string> {
        let array = this._deletionSqlArray;
        if (array == null) {
            this._deletionSqlArray = array = this.getDeletionSqlArray();
        }
        return array;
    }
    
    private getCreationSqlArray(): ReadonlyArray<string> {
        const arr: Array<string> = [];
        for (const tableDef of this.tableDefs) {
            const sqlArr = tableDef.toCreationStatements(this.sqlClient.driver);
            arr.push(...sqlArr);
        }
        return arr;     
    }

    private getDeletionSqlArray(): ReadonlyArray<string> {
        const arr: Array<string> = [];
        const size = this.tableDefs.length;
        for (let i = size - 1; i >= 0; --i) {
            const sqlArr = this.tableDefs[i]!.toDeletionStatements(this.sqlClient.driver);
            arr.push(...sqlArr);
        }
        return arr;     
    }

    execute(): Promise<void> {
        return this.sqlClient.driver.transactionManager.executeReadonly(async () => {
            for (const sql of this.deletionSqlArray) {
                await this.sqlClient.executor.execute(sql);
            }
            for (const sql of this.creationSqlArray) {
                await this.sqlClient.executor.execute(sql);
            }
        });
    }

    toString(): string {
        let str = this._str;
        if (str == null) {
            const arr: Array<string> = [...this.deletionSqlArray, ...this.creationSqlArray, ""];
            this._str = str = arr.join(";\n\n");
        }
        return str;
    }
}
