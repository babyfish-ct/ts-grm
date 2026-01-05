import { AssociatedProp, ManyToManyProp, ManyToOneProp, OneToOneProp, ScalarProp } from "@/schema/prop";
import { FlattenMembers } from "@/utils";

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
    ): Model<TName, TIdKey, TCtor, CtorMembers<TCtor>, never> {
        return new Model(name, idKey, ctor, undefined);
    }

    function ext<
        TSuperModel extends AnyModel
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
            MakeAllModelMembers<TCtor, TSuperModel>,
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
    ): Model<TName, TIdKey, TCtor, CtorMembers<TCtor>, never>;

    extends<
        TSuperModel extends AnyModel
    >(
        superModel: TSuperModel
    ): InheritanceModelCreator<TSuperModel>;
};

type InheritanceModelCreator<
    TSuperModel extends AnyModel
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
        MakeAllModelMembers<TCtor, TSuperModel>,
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
    TAllMemembers extends object,
    TSuperNames extends string | never
> {

    readonly $type: {
        model: [TName, TIdKey, TCtor, TAllMemembers, TSuperNames] | undefined 
    } = { model: undefined };
    
    constructor(
        readonly name: TName, 
        readonly idKey: TIdKey,
        readonly ctor: TCtor,
        readonly superModel: AnyModel | undefined
    ) {}
}

export type AnyModel = Model<any, any, any, any, any>;

export class ModelContext<TCtor extends Ctor> {
    
    readonly $type: {
        modelContext: TCtor | undefined
    } = {
        modelContext: undefined
    };

    unique(...paths : UniqueKeys<CtorMembers<TCtor>>[]) {

    }
}

type SuperIdKey<TSuperModel extends AnyModel> =
    TSuperModel extends Model<any, infer IdKey, any, any, any>
        ? IdKey
        : never;

interface Ctor {
    new (): any;
    readonly prototype: {
        readonly [key: string]: any 
    };
}

export type ModelName<TModel extends AnyModel> =
    TModel extends Model<infer TName, any, any, any, any>
        ? TName
        : never;

export type ModelIdKey<TModel extends AnyModel> =
    TModel extends Model<any, infer TId, any, any, any>
        ? TId
        : never;

export type ModelSuperNames<TModel extends AnyModel> =
    TModel extends Model<any, any, any, any, infer TSuperNames>
        ? TSuperNames
        : never;

export type ModelCtor<TModel extends AnyModel> =
    TModel extends Model<any, any, infer TCtor, any, any>
        ? TCtor
        : never;

export type DeclaredModelMembers<TModel extends AnyModel> =
    TModel extends Model<any, any, infer TCtor, any, any>
        ? CtorMembers<TCtor>
        : never;

export type AllModelMembers<TModel extends AnyModel> =
    TModel extends Model<any, any, any, infer TAllMemembers, any>
        ? TAllMemembers
        : never;

type MakeAllModelMembers<TCtor extends Ctor, TSuperModel extends AnyModel | undefined> =
    TSuperModel extends undefined 
        ? CtorMembers<TCtor>
        : TSuperModel extends Model<any, any, any, infer TAllMembers, any>
            ? TAllMembers & CtorMembers<TCtor>
            : never;

export type CtorMembers<TCtor extends Ctor> =
    TCtor["prototype"];

export type OneToOneMappedByKeys<TModel extends AnyModel> =
    TModel extends Model<any, any, infer TCtor, any, any>
        ? MappedByKeysImpl<
            CtorMembers<TCtor>, 
            OneToOneProp<any, any, "OWNING", any>
        > & string :
        never;

export type OneToManyMappedByKeys<TModel extends AnyModel> =
    TModel extends Model<any, any, infer TCtor, any, any>
        ? MappedByKeysImpl<
            CtorMembers<TCtor>, 
            ManyToOneProp<any, any, "OWNING", any>
        > & string :
        never;

export type ManyToManyMappedByKeys<TModel extends AnyModel> =
    TModel extends Model<any, any, infer TCtor, any, any>
        ? MappedByKeysImpl<
            CtorMembers<TCtor>, 
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

export type UniqueKeys<TMembers extends object> =
    UniqueKeysImpl<FlattenMembers<TMembers>>;

type UniqueKeysImpl<TFlattenCtorMembers> = 
    TFlattenCtorMembers extends object
        ? { 
            [K in keyof TFlattenCtorMembers]: 
                TFlattenCtorMembers[K] extends (
                    ScalarProp<any, any> 
                    | OneToOneProp<any, any, "OWNING", ReferenceKey<any>>
                    | ManyToOneProp<any, any, "OWNING", ReferenceKey<any>>
                )
                    ? K
                    : never
        }[keyof TFlattenCtorMembers]
        : never;

export type OrderedKeys<TModel extends AnyModel> =
    OrderedKeysImpl<FlattenMembers<AllModelMembers<TModel>>>;

type OrderedKeysImpl<TFlattenCtorMembers extends object> = 
    { 
        [K in keyof TFlattenCtorMembers]: 
            TFlattenCtorMembers[K] extends ScalarProp<any, any>
                ? K
                : never
    }[keyof TFlattenCtorMembers];

export type ReferenceKey<TModel extends AnyModel> = 
    (keyof AllModelMembers<TModel>) & string;