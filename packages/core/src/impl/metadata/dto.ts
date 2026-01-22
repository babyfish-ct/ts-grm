import { ReferenceFetchType } from "@/schema/dto";
import { EntityProp } from "./entity_prop";
import { EntityPropOrder } from "./entity_prop_order";
import { Entity } from "./entity";

export type Dto = {

    readonly entity: Entity | undefined;
    
    readonly fields: ReadonlyArray<DtoField>;
};

export type DtoField = {

    readonly path: string | ReadonlyArray<string> | undefined;

    readonly entityProp: EntityProp;

    readonly dto: Dto | undefined;

    readonly fetchType: ReferenceFetchType | undefined;

    readonly orders: ReadonlyArray<EntityPropOrder> | undefined;

    readonly recursiveDepth: number | undefined;

    readonly nullable: boolean;

    readonly dependency: Dto | undefined;
};