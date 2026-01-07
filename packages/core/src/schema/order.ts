import { AnyModel, OrderedKeys } from "@/schema/model";

export type JoinColumn = {
    columnName?: string,
    referenceProp?: string | undefined
};

export type ModelOrder<TModel extends AnyModel> = 
    OrderedKeys<TModel> 
    | {
        readonly path: OrderedKeys<TModel>, 
        readonly desc: boolean
    };