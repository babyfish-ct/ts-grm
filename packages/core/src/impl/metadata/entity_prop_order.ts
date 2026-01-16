import { OrderNullsType } from "@/schema/order";
import { EntityProp } from "./entity_prop";

export type EntityPropOrder = {
    readonly prop: EntityProp;
    readonly desc: boolean;
    readonly nulls: OrderNullsType;
};