import { ReferenceFetchType } from "@/schema/dto";
import { EntityProp } from "./entity_prop";
import { EntityPropOrder } from "./entity_prop_order";
import { Entity } from "./entity";

export type Dto = {

    readonly entity: Entity;
    
    readonly fields: ReadonlyArray<DtoField>;
};

export type DtoField = {

    readonly path: string;

    readonly entityPath: EntityProp | ReadonlyArray<EntityProp>;

    readonly dto: Dto | undefined;

    readonly fetchType: ReferenceFetchType | undefined;

    readonly orders: ReadonlyArray<EntityPropOrder> | undefined;

    readonly implicit: boolean;
};