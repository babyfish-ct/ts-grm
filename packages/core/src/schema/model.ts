import { AssociatedProp, EmbeddedProp, ManyToManyProp, ManyToOneProp, OneToOneProp, Prop, ReferenceProp, ScalarProp } from "@/schema/prop";

export function model<
    TName extends string, 
    TIdKey extends keyof CtorMembers<TCtor>,
    TCtor extends Ctor
>(
    name: TName,
    idKey: TIdKey,
    ctor: TCtor,
    configurer?: (ctx: ModelContext<TCtor>) => void
) {
    return new Model(name, idKey, ctor);
}

export class Model<
    TName extends string, 
    TIdKey extends keyof CtorMembers<TCtor>,
    TCtor extends Ctor
> {

    readonly $type: {
        model: [TName, TIdKey, TCtor] | undefined 
    } = { model: undefined };
    
    constructor(
        readonly name: TName, 
        readonly idKey: TIdKey,
        readonly ctor: TCtor
    ) {}
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

interface Ctor {
    new (): any;
    readonly prototype: {
        readonly [key: string]: any 
    };
}

export type ModelName<TModel extends Model<any, any, any>> =
    TModel extends Model<infer TName, any, any>
        ? TName
        : never;

export type ModelCtor<TModel extends Model<any, any, any>> =
    TModel extends Model<any, any, infer TCtor>
        ? TCtor
        : never;

export type ModelMembers<TModel extends Model<any, any, any>> =
    TModel extends Model<any, any, infer R>
        ? CtorMembers<R>
        : never;

export type CtorMembers<TCtor extends Ctor> =
    TCtor["prototype"];

export type FlattenMembers<TCtor extends Ctor> = 
    TCtor extends object
        ? {
            [K in keyof CtorMembers<TCtor>]: CtorMembers<TCtor>[K]
        } & UnionToIntersection<DeepMembers<CtorMembers<TCtor>>>
        : never;

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

export type OneToOneMappedByKeys<TModel extends Model<any, any, any>> =
    TModel extends Model<any, any, infer R>
        ? MappedByKeysImpl<
            CtorMembers<R>, 
            OneToOneProp<any, any, "OWNING", any>
        > & string :
        never;

export type OneToManyMappedByKeys<TModel extends Model<any, any, any>> =
    TModel extends Model<any, any, infer R>
        ? MappedByKeysImpl<
            CtorMembers<R>, 
            ManyToOneProp<any, any, "OWNING", any>
        > & string :
        never;

export type ManyToManyMappedByKeys<TModel extends Model<any, any, any>> =
    TModel extends Model<any, any, infer R>
        ? MappedByKeysImpl<
            CtorMembers<R>, 
            ManyToManyProp<any, any, "OWNING">
        > & string :
        never;

type MappedByKeysImpl<TModelMembers, TExpectedProp extends AssociatedProp<any, any, "OWNING">> = 
    TModelMembers extends object 
        ? { 
            [K in keyof TModelMembers]: 
                TModelMembers[K] extends TExpectedProp
                    ? K
                    : never
        }[keyof TModelMembers] :
        never;

export type UniqueKeys<TCtor extends Ctor> =
    UniqueKeysImpl<FlattenMembers<TCtor>>;

type UniqueKeysImpl<TFlattenCtorMembers> = 
    TFlattenCtorMembers extends object
        ? { 
            [K in keyof TFlattenCtorMembers]: 
                TFlattenCtorMembers[K] extends (
                    ScalarProp<any, any> 
                    | OneToOneProp<any, any, "OWNING", "REAL">
                    | ManyToOneProp<any, any, "OWNING", "REAL">
                )
                    ? K
                    : never
        }[keyof TFlattenCtorMembers]
        : never;

export type OrderedKeys<TModel extends Model<any, any, any>> =
    OrderedKeysImpl<FlattenMembers<ModelCtor<TModel>>>;

type OrderedKeysImpl<TFlattenCtorMembers> = 
    TFlattenCtorMembers extends object
        ? { 
            [K in keyof TFlattenCtorMembers]: 
                TFlattenCtorMembers[K] extends ScalarProp<any, any>
                    ? K
                    : never
        }[keyof TFlattenCtorMembers]
        : never;
