import { AnyModel, OrderedKeys } from "@/schema/model";

export type ModelOrder<TModel extends AnyModel> = 
    OrderedKeys<TModel> 
    | {
        readonly path: OrderedKeys<TModel>;
        readonly desc?: boolean;
        readonly nulls?: OrderNullsType;
    };

export type OrderNullsType = "UNSPECIFIED" | "FIRST" | "LAST";