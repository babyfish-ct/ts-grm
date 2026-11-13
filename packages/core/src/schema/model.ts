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
    __InheritanceModelCreator, 
    __MakeAllModelMembers, 
    __ModelContext, 
    __ModelCreator, 
    __ModelIdKey, 
    __ModelName, 
    __ModelSuperNames, 
    __ModifierType, 
    __RootModelContext
} from "./model_internal_types";

export const model: __ModelCreator<"NONE"> = modelCreator();

function modelCreator(): __ModelCreator<"NONE"> {

    function create<
        TName extends string, 
        TIdKey extends keyof __CtorMembers<TCtor> & string,
        TCtor extends __Ctor
    >(
        name: TName,
        idKey: TIdKey,
        ctor: TCtor,
        configurator?: (ctx: __RootModelContext<TIdKey, TCtor, "NONE">) => void
    ): Model<
        TName, 
        TIdKey, 
        TCtor, 
        __CtorMembers<TCtor>, 
        never, 
        any
    > {
        const ctx = new RootModelContextImpl<TIdKey, TCtor, "NONE">();
        if (configurator != null) {
            configurator(ctx);
        }
        return new ModelImpl(name, idKey, ctor, undefined, ctx.toModelOptions(), "NONE");
    }

    function absCreate<
        TName extends string, 
        TIdKey extends keyof __CtorMembers<TCtor> & string,
        TCtor extends __Ctor
    >(
        name: TName,
        idKey: TIdKey,
        ctor: TCtor,
        configurator?: (ctx: __RootModelContext<TIdKey, TCtor, "ABSTRACT">) => void
    ): Model<
        TName, 
        TIdKey, 
        TCtor, 
        __CtorMembers<TCtor>, 
        never, 
        any
    > {
        const ctx = new RootModelContextImpl<TIdKey, TCtor, "ABSTRACT">();
        if (configurator != null) {
            configurator(ctx);
        }
        return new ModelImpl(name, idKey, ctor, undefined, ctx.toModelOptions(), "ABSTRACT");
    }

    function opCreate<
        TName extends string, 
        TIdKey extends keyof __CtorMembers<TCtor> & string,
        TCtor extends __Ctor
    >(
        name: TName,
        idKey: TIdKey,
        ctor: TCtor,
        configurator?: (ctx: __RootModelContext<TIdKey, TCtor, "OPEN">) => void
    ): Model<
        TName, 
        TIdKey, 
        TCtor, 
        __CtorMembers<TCtor>, 
        never, 
        any
    > {
        const ctx = new RootModelContextImpl<TIdKey, TCtor, "OPEN">();
        if (configurator != null) {
            configurator(ctx);
        }
        return new ModelImpl(name, idKey, ctor, undefined, ctx.toModelOptions(), "OPEN");
    }

    function ext<
        TSuperModel extends AnyModel,
        TModifier extends __ModifierType
    >(
        superModel: TSuperModel,
        modifier: __ModifierType
    ): __InheritanceModelCreator<TSuperModel, any> {
        return <
            TName extends string, 
            TCtor extends __Ctor
        >(
            name: TName,
            ctor: TCtor,
            configurator?: (ctx: __ModelContext<__ModelIdKey<TSuperModel>, TCtor, TSuperModel, TModifier>) => void
        ): Model<
            TName, 
            __ModelIdKey<TSuperModel>, 
            TCtor, 
            __MakeAllModelMembers<TName, TCtor, TSuperModel>,
            __ModelName<TSuperModel> | __ModelSuperNames<TSuperModel>,
            any
        > => {
            const ctx = new ModelContextImpl<__ModelIdKey<TSuperModel>, TCtor, TSuperModel, TModifier>();
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

    create.abstract = absCreate;
    create.open = opCreate;
    create.extends = (superModel: AnyModel) => ext(superModel, "NONE");
    absCreate.extends = (superModel: AnyModel) => ext(superModel, "ABSTRACT");
    opCreate.extends = (superModel: AnyModel) => ext(superModel, "OPEN");
    return create as any as __ModelCreator<"NONE">;
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

export const TABLE_INHERIT = Symbol("<inherit>");

export const DISCRIMINATOR_VALUE_MODEL_NAME = Symbol("<modelName>");
