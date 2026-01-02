import { Model, OrderedKeys } from "@/schema/model";

export type JoinColumn = {
    columnName?: string,
    referenceProp?: string | undefined,
    cascade?: CascaseType | undefined;
};

export type CascaseType = "NONE" | "UPDATE" | "DELETE" | "GRM_DELETE";

export type Order<TModel extends Model<any, any, any, any, any>> = 
    OrderedKeys<TModel> 
    | {
        readonly path: OrderedKeys<TModel>, 
        readonly desc: boolean
    };