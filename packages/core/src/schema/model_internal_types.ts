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

import { __FlattenMembers } from "@/auxiliary_types";
import { DatabaseIdentifier } from "./database_identifier";
import { __AssociatedPropContract, __AssociationType, __EmbeddedPropContract, __ManyToManyPropContract, __ManyToOnePropContract, __OneToOnePropContract, __ScalarPropContract } from "./prop_internal_types";
import { AnyModel, DISCRIMINATOR_VALUE_MODEL_NAME, Model, TABLE_INHERIT } from "./model";

export interface __ModelCreator<TAbstract extends boolean> {
    
    <
        TName extends string, 
        TIdKey extends keyof __CtorMembers<TCtor> & string,
        TCtor extends __Ctor
    >(
        name: TName,
        idKey: TIdKey,
        ctor: TCtor,
        configurator?: (ctx: __ModelContext<TCtor, never>) => void
    ): Model<
        TName, 
        TIdKey, 
        TCtor, 
        __Decl<TName, TCtor, never>, 
        never, 
        TAbstract
    >;

    readonly abstract: __ModelCreator<true>;

    extends<
        TSuperModel extends AnyModel
    >(
        superModel: TSuperModel
    ): __InheritanceModelCreator<TSuperModel, TAbstract>;
};

export type __InheritanceModelCreator<
    TSuperModel extends AnyModel,
    TAbstract extends boolean
> = {
    
    <
        TName extends string, 
        TCtor extends __Ctor
    >(
        name: __OtherString<TName, __ModelName<TSuperModel> | __ModelSuperNames<TSuperModel>>,
        ctor: TCtor,
        configurator?: (ctx: __ModelContext<TCtor, TSuperModel>) => void
    ): Model<
        TName, 
        __SuperIdKey<TSuperModel>, 
        TCtor, 
        __MakeAllModelMembers<TName, TCtor, TSuperModel>,
        __ModelName<TSuperModel> | __ModelSuperNames<TSuperModel>,
        TAbstract
    >;
};

export type __OtherString<T extends string, X extends string> =
    T extends X
        ? never
        : T;

export interface __ModelContext<TCtor extends __Ctor, TSuperModel extends AnyModel | never> {
    
    __type(): { modelContext: TCtor | true };

    table(options: __TableOptions<TSuperModel>): this;

    unique(...paths : __UniqueKeys<__CtorMembers<TCtor>>[]): this;
}

export type __SuperIdKey<TSuperModel extends AnyModel> =
    TSuperModel extends Model<any, infer IdKey, any, any, any, any>
        ? IdKey
        : never;

export interface __Ctor {
    new (): any;
    readonly prototype: {
        readonly [key: string]: any 
    };
}

export type __ModelName<TModel extends AnyModel> =
    TModel extends Model<infer TName, any, any, any, any, any>
        ? TName
        : never;

export type __ModelIdKey<TModel extends AnyModel> =
    TModel extends Model<any, infer TId, any, any, any, any>
        ? TId
        : never;

export type __ModelSuperNames<TModel extends AnyModel> =
    TModel extends Model<any, any, any, any, infer TSuperNames, any>
        ? TSuperNames
        : never;

export type __ModelCtor<TModel extends AnyModel> =
    TModel extends Model<any, any, infer TCtor, any, any, any>
        ? TCtor
        : never;

export type __DeclaredModelMembers<TModel extends AnyModel> =
    TModel extends Model<any, any, infer TCtor, any, any, any>
        ? __CtorMembers<TCtor>
        : never;

export type __AllModelMembers<TModel extends AnyModel> =
    TModel extends Model<any, any, any, infer TAllMembers, any, any>
        ? TAllMembers
        : never;

export type __DeclaringModelName<TProp> =
    TProp extends __DeclaringArware<infer DeclaringModelName, any>
        ? DeclaringModelName
        : never;

export type __SuperDeclaringModelNames<TProp> =
    TProp extends __DeclaringArware<any, infer SuperDeclaringModelNames>
        ? SuperDeclaringModelNames
        : never;

export type __MakeAllModelMembers<TName extends string, TCtor extends __Ctor, TSuperModel extends AnyModel | undefined> =
    TSuperModel extends never 
        ? __Decl<TName, TCtor, never>
        : TSuperModel extends Model<any, any, any, infer SuperMembers, infer SuperNames, any>
            ? __All<
                SuperMembers, 
                __Decl<TName, TCtor, SuperNames>
            >
            : never;

export type __Decl<TName extends string, TCtor extends __Ctor, TSuperModelNames extends string | never> =
    { 
        readonly [K in keyof __CtorMembers<TCtor>]: 
            __MakeDeclaringArware<
                __CtorMembers<TCtor>[K],
                TName, 
                TSuperModelNames
            >
    };

export type __MakeDeclaringArware<
    TProp, 
    TDeclaring extends string, 
    TSuperDeclaringModelNames extends string | never
> =
    TProp extends __EmbeddedPropContract<infer Props, infer Nullity, infer FlattenProps>
        ? __EmbeddedPropContract<
            {
                readonly [K in keyof Props]: __MakeDeclaringArware<
                    Props[K], 
                    TDeclaring, 
                    TSuperDeclaringModelNames
                >
            },
            Nullity,
            FlattenProps
        > & __DeclaringArware<TDeclaring, TSuperDeclaringModelNames>
        : TProp & __DeclaringArware<TDeclaring, TSuperDeclaringModelNames>;

type __All<Map1, Map2> = 
    {
        [K in keyof Map1 | keyof Map2]: K extends keyof Map1 
            ? Map1[K] 
            : K extends keyof Map2 
                ? Map2[K] 
                : never;
    };

export type __CtorMembers<TCtor extends __Ctor> =
    TCtor["prototype"];

export interface __DeclaringArware<
    TDeclaringModelName extends string,
    TSuperModelNames extends string | never
> {
    readonly declaringModelName: TDeclaringModelName;
    readonly superModelName: TSuperModelNames;
}

export type __OneToOneMappedByKeys<TModel extends AnyModel> =
    TModel extends Model<any, any, infer TCtor, any, any, any>
        ? __ExpectedKeysImpl<
            __CtorMembers<TCtor>, 
            __OneToOnePropContract<any, any, "OWNING", any, any, any>
        > & string :
        never;

export type __OneToManyMappedByKeys<TModel extends AnyModel> =
    TModel extends Model<any, any, infer TCtor, any, any, any>
        ? __ExpectedKeysImpl<
            __CtorMembers<TCtor>, 
            __ManyToOnePropContract<any, any, "OWNING", any, any, any>
        > & string :
        never;

export type __ManyToManyMappedByKeys<TModel extends AnyModel> =
    TModel extends Model<any, any, infer TCtor, any, any, any>
        ? __ExpectedKeysImpl<
            __CtorMembers<TCtor>, 
            __ManyToManyPropContract<any, "OWNING", any, any, any>
        > & string :
        never;

export type __MiddleEntityJoinThisKeys<
    TModel extends AnyModel, 
    TAssociationType extends __AssociationType
> =
    TModel extends Model<any, any, infer TCtor, any, any, any>
        ? __ExpectedKeysImpl<
            __CtorMembers<TCtor>, 
            TAssociationType extends "ONE_TO_ONE"
                ? __OneToOnePropContract<any, any, "OWNING", any, any, any>
            : TAssociationType extends "ONE_TO_MANY"
                ? __OneToOnePropContract<any, any, "OWNING", any, any, any>
            : __ManyToOnePropContract<any, any, "OWNING", any, any, any>
        > & string :
        never;

export type __MiddleEntityJoinTargetKeys<
    TMiddleModel extends AnyModel,
    TTargetModel extends AnyModel,
    TAssociationType extends __AssociationType
> = TMiddleModel extends Model<any, any, infer TCtor, any, any, any>
        ? __ExpectedKeysImpl<
            __CtorMembers<TCtor>, 
            TAssociationType extends "ONE_TO_ONE"
                ? __OneToOnePropContract<TTargetModel, any, "OWNING", any, any, any>
            : TAssociationType extends "MANY_TO_ONE"
                ? __OneToOnePropContract<TTargetModel, any, "OWNING", any, any, any>
            : __ManyToOnePropContract<TTargetModel, any, "OWNING", any, any, any>
        > & string :
        never;

export type __ExpectedKeysImpl<
    TModelMembers, 
    TExpectedProp extends __AssociatedPropContract<any, any, "OWNING", any, any, any>
> = 
    TModelMembers extends object 
        ? { 
            [K in keyof TModelMembers]: 
                TModelMembers[K] extends TExpectedProp
                    ? K
                    : never
        }[keyof TModelMembers] :
        never;

export type __CalculatorSourceKeys<
    TModelMembers
> =
    TModelMembers extends object 
    ? { 
        [K in keyof TModelMembers]: 
            TModelMembers[K] extends __ScalarPropContract<any, any, any>
                ? K
            : TModelMembers[K] extends __EmbeddedPropContract<any, any, any>
                ? K
            : never
    }[keyof TModelMembers] :
    never;

export type __TableOptions<TSuperModel extends AnyModel | never> = 
    DatabaseIdentifier<string> | {
        readonly name?: typeof TABLE_INHERIT
            | DatabaseIdentifier<string>
            | __IdRemappedTable<TSuperModel>;
        readonly discriminatorValue?: 
            | typeof DISCRIMINATOR_VALUE_MODEL_NAME
            | string
            | number;
        readonly discriminator?: string | {
            readonly name: string;
            readonly type?: "string" | "number"
        };
    };

export type __IdRemappedTable<TSuperModel extends AnyModel | never> = 
    TSuperModel extends AnyModel
        ? {
            readonly value?: DatabaseIdentifier<string>;
            readonly idMapping?: __AllModelMembers<TSuperModel>[__ModelIdKey<TSuperModel>] extends __EmbeddedPropContract<any, any, infer R>
                ? { readonly [K in keyof R]: DatabaseIdentifier<string> }
                : DatabaseIdentifier<string>
        }
        : never;

export type __UniqueKeys<TMembers extends object> =
    __UniqueKeysImpl<__FlattenMembers<TMembers>>;

export type __UniqueKeysImpl<TFlattenCtorMembers> = 
    TFlattenCtorMembers extends object
        ? { 
            [K in keyof TFlattenCtorMembers]: 
                TFlattenCtorMembers[K] extends (
                    __ScalarPropContract<any, any, any> 
                    | __OneToOnePropContract<any, any, "OWNING", false, any, any>
                    | __ManyToOnePropContract<any, any, "OWNING", false, any, any>
                )
                    ? K
                    : never
        }[keyof TFlattenCtorMembers]
        : never;

export type __OrderedKeys<TModel extends AnyModel> =
    __OrderedKeysImpl<__FlattenMembers<__AllModelMembers<TModel>>>;

export type __OrderedKeysImpl<TFlattenCtorMembers extends object> = 
    { 
        [K in keyof TFlattenCtorMembers]: 
            TFlattenCtorMembers[K] extends __ScalarPropContract<any, any, any>
                ? K
                : never
    }[keyof TFlattenCtorMembers];

export type __OptionalModelKey<TModel extends AnyModel> = 
    ((keyof __AllModelMembers<TModel>) & string) | "";

export type __RequiredModelKey<
    TModel extends AnyModel, 
    TKey extends __OptionalModelKey<TModel>
> =
    TKey extends ""
        ? __ModelIdKey<TModel> & string
        : TKey;

export type __Extends<
    TModel1 extends AnyModel,
    TModel2 extends AnyModel
> =
    __ModelName<TModel1> extends __ModelName<TModel2>
        ? true
        : __IsDerivedModelOf<TModel1, TModel2>;

export type __IsDerivedModelOf<
    TModel1 extends AnyModel,
    TModel2 extends AnyModel
> = __ModelSuperNames<TModel1> extends never
            ? false
            : __ModelName<TModel2> extends __ModelSuperNames<TModel1>
                ? true
                : false;

export type __DerivedModel<
    TDerivedModel extends AnyModel,
    TSuperModel extends AnyModel
> = __IsDerivedModelOf<TDerivedModel, TSuperModel> extends true
    ? TDerivedModel :
    never;
