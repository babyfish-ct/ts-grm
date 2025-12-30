import { AssociatedProp, EmbeddedProp, ManyToOneProp, OneToOneProp, ScalarProp } from "./prop";

export function model<TName extends string, TCtor extends Ctor>(
    name: TName,
    ctor: TCtor,
    configurer?: (ctx: ModelContext<TCtor>) => void
) {
    return new Model(name, ctor);
}

export class Model<TName extends string, TCtor extends Ctor> {

    readonly $type: {
        model: [TName, TCtor] | undefined 
    } = { model: undefined };
    
    constructor(readonly name: TName, readonly ctor: TCtor) {}
}

export class ModelContext<TCtor extends Ctor> {
    
    readonly $type: {
        modelContext: TCtor | undefined
    } = {
        modelContext: undefined
    };

    unique(...paths : UniqueKeys<TCtor>[]) {

    }
}

export type Ctor = (new() => any) & { prototype: any };

export type ModelName<TModel extends Model<any, any>> =
    TModel extends Model<infer TName, any>
        ? TName
        : never;

export type ModelCtor<TModel extends Model<any, any>> =
    TModel extends Model<any, infer TCtor>
        ? TCtor
        : never;

export type ModelMembers<TModel extends Model<any, any>> =
    TModel extends Model<any, infer R>
        ? CtorMembers<R>
        : never;

export type CtorMembers<TCtor extends Ctor> =
    TCtor["prototype"];

export type FlattenMembers<TCtor extends Ctor> = {
    [K in keyof CtorMembers<TCtor>]: CtorMembers<TCtor>[K]
} & UnionToIntersection<DeepMembers<CtorMembers<TCtor>>>;

type DeepMembers<TCtorMembers, TPrefix extends string = ""> = 
    TCtorMembers extends object
        ? {
            [K in keyof TCtorMembers]: 
                K extends string
                    ? TCtorMembers[K] extends EmbeddedProp<infer E, any> 
                        ? DeepMembers<E, `${TPrefix}${K}.`> &
                            { [Key in `${TPrefix}${K}`]: TCtorMembers[K] }
                        : { [Key in `${TPrefix}${K}`]: TCtorMembers[K] }
                    : never
        }[keyof TCtorMembers]
        : never;

type UnionToIntersection<U> = 
    (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export type MappedByKeys<TModel extends Model<any, any>> =
    TModel extends Model<any, infer R>
        ? MappedByKeysImpl<CtorMembers<R>> & string :
        never;

type MappedByKeysImpl<TModelMembers> = { 
    [K in keyof TModelMembers]: 
        TModelMembers[K] extends AssociatedProp<any, any, "OWNING">
            ? K
            : never
}[keyof TModelMembers];

export type UniqueKeys<TCtor extends Ctor> =
    UniqueKeysImpl<FlattenMembers<TCtor>>;

type UniqueKeysImpl<TFlattenCtorMembers> = { 
    [K in keyof TFlattenCtorMembers]: 
        TFlattenCtorMembers[K] extends (
            ScalarProp<any, any> 
            | OneToOneProp<any, any, "OWNING", "REAL">
            | ManyToOneProp<any, any, "OWNING", "REAL">
        )
            ? K
            : never
}[keyof TFlattenCtorMembers];

export type OrderedKeys<TModel extends Model<any, any>> =
    OrderedKeysImpl<FlattenMembers<ModelCtor<TModel>>>;

type OrderedKeysImpl<TFlattenCtorMembers> = { 
    [K in keyof TFlattenCtorMembers]: 
        TFlattenCtorMembers[K] extends ScalarProp<any, any>
            ? K
            : never
}[keyof TFlattenCtorMembers];