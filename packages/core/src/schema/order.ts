import { AnyModel, OrderedKeys } from "@/schema/model";

export type JoinColumn = {
    columnName?: string,
    referenceProp?: string | undefined
};

export type Order<TModel extends AnyModel> = 
    OrderedKeys<TModel> 
    | {
        readonly path: OrderedKeys<TModel>, 
        readonly desc: boolean
    };