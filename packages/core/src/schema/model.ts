import { createEntity } from "@/impl/metadata/entity";
import { AssociatedProp, ManyToManyProp, ManyToOneProp, OneToOneProp, ScalarProp } from "@/schema/prop";
import { FlattenMembers } from "@/utils";

export const model: ModelCreator = modelImpl();

function modelImpl(): ModelCreator {

    function create<
        TName extends string, 
        TIdKey extends keyof CtorMembers<TCtor> & string,
        TCtor extends Ctor
    >(
        name: TName,
        idKey: TIdKey,
        ctor: TCtor,
        configurer?: (ctx: ModelContext<TCtor>) => void
    ): Model<TName, TIdKey, TCtor, CtorMembers<TCtor>, never> {
        return createEntity(name, idKey, ctor, undefined) as 
            Model<TName, TIdKey, TCtor, CtorMembers<TCtor>, never>;
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
            createEntity(name, undefined, ctor, superModel) as 
                Model<
                    TName, 
                    SuperIdKey<TSuperModel>, 
                    TCtor, 
                    MakeAllModelMembers<TCtor, TSuperModel>,
                    ModelName<TSuperModel> | ModelSuperNames<TSuperModel>
                >;
    }
    create.extends = ext;
    return create as any as ModelCreator;
}

type ModelCreator = {
    
    <
        TName extends string, 
        TIdKey extends keyof CtorMembers<TCtor> & string,
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

export interface Model<
    TName extends string, 
    TIdKey extends string,
    TCtor extends Ctor,
    TAllMemembers extends object,
    TSuperNames extends string | never
> {

    __type(): {
        model: [TName, TIdKey, TCtor, TAllMemembers, TSuperNames] | undefined 
    };

    readonly name: string;
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

export interface Ctor {
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

export type Extends<
    TModel1 extends AnyModel,
    TModel2 extends AnyModel
> =
    ModelName<TModel1> extends ModelName<TModel2>
        ? true
        : IsDerivedModelOf<TModel1, TModel2>;

export type IsDerivedModelOf<
    TModel1 extends AnyModel,
    TModel2 extends AnyModel
> = ModelSuperNames<TModel1> extends never
            ? false
            : ModelName<TModel2> extends ModelSuperNames<TModel1>
                ? true
                : false;