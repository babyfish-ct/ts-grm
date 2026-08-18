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

import { 
    spi,
    AnyModel, 
    AtLeastOne, 
    BaseModel, 
    BaseQuery, 
    BaseQueryMapOf, 
    BaseQueryProjection, 
    BaseQuerySelectMapArgs, 
    BaseTable, 
    dsl, 
    Predicate, 
    RecursiveMutableBaseQuery, 
    Table 
} from "@ts-grm/core";
import { toTables } from "./utils";
import { RecursiveMutableBaseQueryImpl } from "./recursive_mutable_base_query_impl";
import { MapBaseQueryProjection } from "./query_projection";
import { AtomBaseQueryImpl } from "./atom_base_query_impl";

export abstract class AbstractBaseQueryImpl<TProjection> 
implements spi.BaseQueryImplementor<TProjection> {

    abstract __type(): { 
        baseQuery: TProjection | true; 
    };

    get level(): "BASE" {
        return "BASE";
    }

    unionAllRecursively<
        const TModels extends AtLeastOne<AnyModel | BaseModel<any>>,
        const TPrev extends BaseTable<BaseQueryMapOf<TProjection>>
    >(
        ...args: [
            ...models: TModels,
            fnOptions: {
                readonly join: (
                    prev: TPrev, 
                    ...tables: {
                        [K in keyof TModels]: Table<TModels[K]>
                    } extends infer T ? T extends any[] ? T : never : never
                ) => Predicate,
                readonly query: (
                    q: RecursiveMutableBaseQuery<TProjection>,
                    ...tables: {
                        [K in keyof TModels]: Table<TModels[K]>
                    } extends infer T ? T extends any[] ? T : never : never
                ) => TProjection
            }
        ]
    ): BaseQuery<TProjection> {
        const prev = spi.createTypedBaseTable(this.toModel(true), "PREV") as any as BaseTable<BaseQueryMapOf<TProjection>>;
        const tables = toTables(args);
        const options = args[args.length - 1] as any;
        const join = options.join as Function;
        const query = options.query as Function;
        const predicate = join.apply(undefined, [ prev, ...tables ]) as Predicate;
        const mutableQuery = new RecursiveMutableBaseQueryImpl<TProjection>(prev, tables);
        const projection = query.apply(undefined, [ mutableQuery, ...tables ]) as MapBaseQueryProjection<BaseQueryMapOf<TProjection>>;
        const newQuery = new AtomBaseQueryImpl(mutableQuery, predicate as any, projection, undefined);
        return dsl.unionAll(this, newQuery);
    }

    abstract get args(): BaseQueryMapOf<TProjection>;

    toModel(
        isCte: boolean
    ): spi.BaseModelImplementor<BaseQueryMapOf<TProjection>> {
        return new BaseModelImpl(this as any, isCte);
    }
}

export class BaseModelImpl<T extends BaseQuerySelectMapArgs> implements spi.BaseModelImplementor<T> {

    __type(): {
        baseModel: T | true;
    } {
        return { baseModel: true };
    }

    readonly identifier: number = spi.allocateModelIdentifier();

    private readonly _args: T;

    constructor(
        private readonly _query: AbstractBaseQueryImpl<BaseQueryProjection<T>>,
        readonly __isCte: boolean
    ) {
        this._args = spi.withShadowAnchor(_query.args, this);
    }

    get __args(): T {
        return this._args;
    }

    get __isRecursive(): boolean {
        return (this._query as any as spi.QueryContract).isRecursive;
    }

    __toQuery(): spi.BaseQueryImplementor<BaseQueryProjection<T>> {
        return this._query;
    }
}