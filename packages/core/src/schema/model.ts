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

import { ModelContextImpl, ModelImpl } from "@/impl/model_impl";
import { 
    __Ctor, 
    __CtorMembers, 
    __InheritanceModelCreator, 
    __MakeAllModelMembers, 
    __ModelContext, 
    __ModelCreator, 
    __ModelName, 
    __ModelSuperNames, 
    __SuperIdKey 
} from "./model_internal_types";

export const model: __ModelCreator<false> = modelCreator();

function modelCreator(): __ModelCreator<false> {

    function create<
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
        __CtorMembers<TCtor>, 
        never, 
        any
    > {
        const ctx = new ModelContextImpl<TCtor, never>();
        if (configurator != null) {
            configurator(ctx);
        }
        return new ModelImpl(name, idKey, ctor, undefined, ctx.toModelOptions(), false);
    }

    function absCreate<
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
        __CtorMembers<TCtor>, 
        never, 
        any
    > {
        const ctx = new ModelContextImpl<TCtor, never>();
        if (configurator != null) {
            configurator(ctx);
        }
        return new ModelImpl(name, idKey, ctor, undefined, ctx.toModelOptions(), true);
    }

    function ext<
        TSuperModel extends AnyModel
    >(
        superModel: TSuperModel
    ): __InheritanceModelCreator<TSuperModel, any> {
        return <
            TName extends string, 
            TCtor extends __Ctor
        >(
            name: TName,
            ctor: TCtor,
            configurator?: (ctx: __ModelContext<TCtor, TSuperModel>) => void
        ): Model<
            TName, 
            __SuperIdKey<TSuperModel>, 
            TCtor, 
            __MakeAllModelMembers<TName, TCtor, TSuperModel>,
            __ModelName<TSuperModel> | __ModelSuperNames<TSuperModel>,
            any
        > => {
            const ctx = new ModelContextImpl<TCtor, TSuperModel>();
            if (configurator != null) {
                configurator(ctx);
            }
            return new ModelImpl<
                TName, 
                __SuperIdKey<TSuperModel>, 
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
                false
            );
        }
    }

    function absExt<
        TSuperModel extends AnyModel
    >(
        superModel: TSuperModel
    ): __InheritanceModelCreator<TSuperModel, any> {
        return <
            TName extends string, 
            TCtor extends __Ctor
        >(
            name: TName,
            ctor: TCtor,
            configurator?: (ctx: __ModelContext<TCtor, TSuperModel>) => void
        ): Model<
            TName, 
            __SuperIdKey<TSuperModel>, 
            TCtor, 
            __MakeAllModelMembers<TName, TCtor, TSuperModel>,
            __ModelName<TSuperModel> | __ModelSuperNames<TSuperModel>,
            any
        > => {
            const ctx = new ModelContextImpl<TCtor, TSuperModel>();
            if (configurator != null) {
                configurator(ctx);
            }
            return new ModelImpl<
                TName, 
                __SuperIdKey<TSuperModel>, 
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
                false
            );
        }
    }

    create.abstract = absCreate;
    create.extends = ext;
    absCreate.extends = absExt;
    return create as any as __ModelCreator<false>;
}

export interface Model<
    TName extends string, 
    TIdKey extends string,
    TCtor extends __Ctor,
    TAllMembers extends object,
    TSuperNames extends string | never,
    TAbstract extends boolean
> {
    __type(): {
        model: [TName, TIdKey, TCtor, TAllMembers, TSuperNames, TAbstract] | true
    }
}

export type AnyModel = Model<any, any, any, any, any, any>;

export const TABLE_INHERIT = Symbol("<inherit>");

export const DISCRIMINATOR_VALUE_MODEL_NAME = Symbol("<modelName>");