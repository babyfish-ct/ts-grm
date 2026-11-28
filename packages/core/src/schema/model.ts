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

import { ModelContextImpl, ModelImpl, RootModelContextImpl } from "@/impl/model_impl";
import { 
    __Ctor, 
    __CtorMembers, 
    __InheritanceType, 
    __InheritedModelCreator, 
    __MakeAllModelMembers, 
    __ModelContext, 
    __ModelCreator, 
    __ModelIdKey, 
    __ModelName, 
    __ModelSuperNames, 
    __ModifierType, 
    __RootModelContext
} from "./model_internal_types";

export const model: __ModelCreator = modelCreator();

function modelCreator(): __ModelCreator {

    type Creator<
        TModifier extends __ModifierType
    > = <
        TName extends string, 
        TIdKey extends keyof __CtorMembers<TCtor> & string,
        TCtor extends __Ctor
    >(
        name: TName,
        idKey: TIdKey,
        ctor: TCtor,
        configurator?: (ctx: __RootModelContext<TIdKey, TCtor, TModifier>) => void
    ) => Model<
        TName, 
        TIdKey, 
        TCtor, 
        __CtorMembers<TCtor>, 
        never, 
        TModifier
    >;
    function makeCreator<
        TModifier extends __ModifierType
    >(
        modifier: TModifier
    ): Creator<TModifier> {
        const creator: Creator<TModifier> =
            <
                TName extends string, 
                TIdKey extends keyof __CtorMembers<TCtor> & string,
                TCtor extends __Ctor
            >(
                name: TName,
                idKey: TIdKey,
                ctor: TCtor,
                configurator?: (ctx: __RootModelContext<TIdKey, TCtor, TModifier>) => void
            ) => {
                const ctx = new RootModelContextImpl<TIdKey, TCtor, TModifier>();
                if (configurator != null) {
                    configurator(ctx);
                }
                return new ModelImpl(name, idKey, ctor, undefined, ctx.toModelOptions(), modifier);
            };
        return creator;
    }

    function ext<
        TSuperModel extends AnyModel,
        TInheritanceType extends __InheritanceType,
        TModifier extends __ModifierType
    >(
        superModel: TSuperModel,
        inheritanceType: TInheritanceType,
        modifier: __ModifierType,
    ): __InheritedModelCreator<TSuperModel, any, any> {
        return <
            TName extends string, 
            TCtor extends __Ctor
        >(
            name: TName,
            ctor: TCtor,
            configurator?: (ctx: __ModelContext<__ModelIdKey<TSuperModel>, TCtor, TSuperModel, TModifier, any>) => void
        ): Model<
            TName, 
            __ModelIdKey<TSuperModel>, 
            TCtor, 
            __MakeAllModelMembers<TName, TCtor, TSuperModel>,
            __ModelName<TSuperModel> | __ModelSuperNames<TSuperModel>,
            any
        > => {
            const ctx = new ModelContextImpl<
                __ModelIdKey<TSuperModel>, 
                TCtor, 
                TSuperModel, 
                TModifier, 
                TInheritanceType
            >(inheritanceType);
            if (configurator != null) {
                configurator(ctx);
            }
            return new ModelImpl<
                TName, 
                __ModelIdKey<TSuperModel>, 
                TCtor, 
                __MakeAllModelMembers<TName, TCtor, TSuperModel>,
                __ModelName<TSuperModel> | __ModelSuperNames<TSuperModel>,
                any
            >(
                name, 
                undefined, 
                ctor, 
                superModel,
                ctx.toModelOptions(),
                modifier
            );
        }
    }

    const create = makeCreator("NONE");
    const absCreate = makeCreator("ABSTRACT");
    const opCreate = makeCreator("OPEN");
    const absByNumCreate = makeCreator("ABSTRACT_BY_NUM");
    const opByNumCreate = makeCreator("OPEN_BY_NUM");
    const absBy = (by: "STRING" | "NUMBER") => by === "NUMBER" 
            ? absByNumCreate 
            : absCreate;
    const opBy = (by: "STRING" | "NUMBER") => by === "NUMBER" 
            ? opByNumCreate 
            : opCreate;
    (create as any).abstract = absCreate;
    (create as any).open = opCreate;
    (absCreate as any).discriminatedBy = absBy;
    (absByNumCreate as any).discriminatedBy = absBy;
    (opCreate as any).discriminatedBy = opBy;
    (opByNumCreate as any).discriminatedBy = opBy;
    (create as any).extends = 
        (superModel: AnyModel, inheritanceType: __InheritanceType | undefined) => 
            ext(superModel, inheritanceType ?? "INDIVIDUAL_TABLE", "NONE");
    (absCreate as any).extends = 
        (superModel: AnyModel, inheritanceType: __InheritanceType | undefined) => 
            ext(superModel, inheritanceType ?? "INDIVIDUAL_TABLE", "ABSTRACT");
    (absByNumCreate as any).extends = 
        (superModel: AnyModel, inheritanceType: __InheritanceType | undefined) => 
            ext(superModel, inheritanceType ?? "INDIVIDUAL_TABLE", "ABSTRACT_BY_NUM");
    (opCreate as any).extends = 
        (superModel: AnyModel, inheritanceType: __InheritanceType | undefined) => 
            ext(superModel, inheritanceType ?? "INDIVIDUAL_TABLE", "OPEN");
    (opByNumCreate as any).extends = 
        (superModel: AnyModel, inheritanceType: __InheritanceType | undefined) => 
            ext(superModel, inheritanceType ?? "INDIVIDUAL_TABLE", "ABSTRACT_BY_NUM");
    return create as any as __ModelCreator;
}

export interface Model<
    TName extends string, 
    TIdKey extends string,
    TCtor extends __Ctor,
    TAllMembers extends object,
    TSuperNames extends string | never,
    TModifier extends __ModifierType
> {
    __type(): {
        model: [TName, TIdKey, TCtor, TAllMembers, TSuperNames, TModifier] | true
    }
}

export type AnyModel = Model<any, any, any, any, any, any>;

export type UserIdGenerator<T> = () => T;

export const DISCRIMINATOR_VALUE_MODEL_NAME = Symbol("<modelName>");
