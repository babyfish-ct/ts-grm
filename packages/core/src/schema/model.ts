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

export const model: __ModelCreator = modelImpl();

function modelImpl(): __ModelCreator {

    function create<
        TName extends string, 
        TIdKey extends keyof __CtorMembers<TCtor> & string,
        TCtor extends __Ctor
    >(
        name: TName,
        idKey: TIdKey,
        ctor: TCtor,
        configurator?: (ctx: __ModelContext<TCtor, never>) => void
    ): Model<TName, TIdKey, TCtor, __CtorMembers<TCtor>, never> {
        const ctx = new ModelContextImpl<TCtor, never>();
        if (configurator != null) {
            configurator(ctx);
        }
        return new ModelImpl(name, idKey, ctor, undefined, ctx.toModelOptions());
    }

    function ext<
        TSuperModel extends AnyModel
    >(
        superModel: TSuperModel
    ): __InheritanceModelCreator<TSuperModel> {
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
            __MakeAllModelMembers<TCtor, TSuperModel>,
            __ModelName<TSuperModel> | __ModelSuperNames<TSuperModel>
        > => {
            const ctx = new ModelContextImpl<TCtor, TSuperModel>();
            if (configurator != null) {
                configurator(ctx);
            }
            return new ModelImpl<
                TName, 
                __SuperIdKey<TSuperModel>, 
                TCtor, 
                __MakeAllModelMembers<TCtor, TSuperModel>,
                __ModelName<TSuperModel> | __ModelSuperNames<TSuperModel>
            >(
                name, 
                undefined, 
                ctor, 
                superModel,
                ctx.toModelOptions()
            );
        }
    }
    create.extends = ext;
    return create as any as __ModelCreator;
}

export interface Model<
    TName extends string, 
    TIdKey extends string = string,
    TCtor extends __Ctor = __Ctor,
    TAllMembers extends object = object,
    TSuperNames extends string | never = never
> {
    __type(): {
        model: [TName, TIdKey, TCtor, TAllMembers, TSuperNames] | true
    }
}

export type AnyModel = Model<any, any, any, any, any>;

export const TABLE_INHERIT = Symbol("<inherit>");

export const DISCRIMINATOR_VALUE_MODEL_NAME = Symbol("<modelName>");