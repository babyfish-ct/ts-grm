import { AssociatedProp, EmbeddedProp, ManyToManyProp, ManyToOneProp, OneToOneProp, Prop, ReferenceProp, ScalarProp } from "@/schema/prop";

export const model: ModelCreator = modelImpl();

function modelImpl(): ModelCreator {

    function create<
        TName extends string, 
        TIdKey extends keyof CtorMembers<TCtor>,
        TCtor extends Ctor
    >(
        name: TName,
        idKey: TIdKey,
        ctor: TCtor,
        configurer?: (ctx: ModelContext<TCtor>) => void
    ): Model<TName, TIdKey, TCtor, undefined, never> {
        return new Model(name, idKey, ctor, undefined);
    }

    function ext<
        TSuperModel extends Model<any, any, any, any, any>
    >(
        superModel: TSuperModel
    ): InheritanceModelCreator<TSuperModel> {
        return <
            TName extends string, 
            TCtor extends Ctor
        >(
            name: TName,
            ctor: TCtor,
            configurer?: (ctx: ModelContext<TCtor>) => void
        ): Model<
            TName, 
            SuperIdKey<TSuperModel>, 
            TCtor, 
            TSuperModel, 
            ModelName<TSuperModel> | ModelSuperNames<TSuperModel>
        > =>
            new Model(name, superModel.idKey, ctor, superModel);
    }
    create.extends = ext;
    return create as any as ModelCreator;
}

type ModelCreator = {
    
    <
        TName extends string, 
        TIdKey extends keyof CtorMembers<TCtor>,
        TCtor extends Ctor
    >(
        name: TName,
        idKey: TIdKey,
        ctor: TCtor,
        configurer?: (ctx: ModelContext<TCtor>) => void
    ): Model<TName, TIdKey, TCtor, undefined, never>;

    extends<
        TSuperModel extends Model<any, any, any, any, any>
    >(
        superModel: TSuperModel
    ): InheritanceModelCreator<TSuperModel>;
};

type InheritanceModelCreator<
    TSuperModel extends Model<any, any, any, any, any>
> = {
    
    <
        TName extends string, 
        TCtor extends Ctor
    >(
        name: OtherString<TName, ModelName<TSuperModel> | ModelSuperNames<TSuperModel>>,
        ctor: TCtor,
        configurer?: (ctx: ModelContext<TCtor>) => void
    ): Model<
        TName, 
        SuperIdKey<TSuperModel>, 
        TCtor, 
        TSuperModel,
        ModelName<TSuperModel> | ModelSuperNames<TSuperModel>
    >;
};

type OtherString<T extends string, X extends string> =
    T extends X
        ? never
        : T;

export class Model<
    TName extends string, 
    TIdKey extends keyof CtorMembers<TCtor>,
    TCtor extends Ctor,
    TSuperModel extends Model<any, any, any, any, any> | undefined,
    TSuperNames extends string | never
> {

    readonly $type: {
        model: [TName, TIdKey, TCtor, TSuperModel, TSuperNames] | undefined 
    } = { model: undefined };
    
    constructor(
        readonly name: TName, 
        readonly idKey: TIdKey,
        readonly ctor: TCtor,
        readonly superModel: TSuperModel | undefined
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

type Inheritance<TSuperModel extends Model<any, any, any, any, any>> = {
    superModel: TSuperModel;
    discriminatorColumnName: string;
};

type SuperIdKey<TSuperModel extends Model<any, any, any, any, any>> =
    TSuperModel extends Model<any, infer R, any, any, any>
        ? R
        : never;

interface Ctor {
    new (): any;
    readonly prototype: {
        readonly [key: string]: any 
    };
}

export type ModelName<TModel extends Model<any, any, any, any, any>> =
    TModel extends Model<infer TName, any, any, any, any>
        ? TName
        : never;

export type ModelSuperNames<TModel extends Model<any, any, any, any, any>> =
    TModel extends Model<any, any, any, any, infer R>
        ? R
        : never;

export type ModelCtor<TModel extends Model<any, any, any, any, any>> =
    TModel extends Model<any, any, infer TCtor, any, any>
        ? TCtor
        : never;

export type ModelMembers<TModel extends Model<any, any, any, any, any>> =
    TModel extends Model<any, any, infer R, any, any>
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

export type OneToOneMappedByKeys<TModel extends Model<any, any, any, any, any>> =
    TModel extends Model<any, any, infer R, any, any>
        ? MappedByKeysImpl<
            CtorMembers<R>, 
            OneToOneProp<any, any, "OWNING", any>
        > & string :
        never;

export type OneToManyMappedByKeys<TModel extends Model<any, any, any, any, any>> =
    TModel extends Model<any, any, infer R, any, any>
        ? MappedByKeysImpl<
            CtorMembers<R>, 
            ManyToOneProp<any, any, "OWNING", any>
        > & string :
        never;

export type ManyToManyMappedByKeys<TModel extends Model<any, any, any, any, any>> =
    TModel extends Model<any, any, infer R, any, any>
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

export type OrderedKeys<TModel extends Model<any, any, any, any, any>> =
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

