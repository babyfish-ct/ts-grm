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

import { ModelOrder, OrderNullsType } from "@/schema/order";
import { EntityProp } from "./entity_prop";
import { AnyModel } from "@/schema/model";
import { Entity } from "./entity";
import { ArgumentError } from "@/error/common";

export type EntityPropOrder = {
    readonly prop: EntityProp;
    readonly desc: boolean;
    readonly nulls: OrderNullsType;
};

export function toEntityPropOrders(
    entity: Entity,
    orders: ReadonlyArray<ModelOrder<AnyModel>>
): ReadonlyArray<EntityPropOrder> {
    const paths = new Set<string>();
    return orders.map(ord => {
        const path = typeof ord === "string"
            ? ord
            : ord.path;
        if (paths.has(path)) {
            throw new ArgumentError(`Duplicate path "${path}"`);
        }
        const desc = typeof ord === "string"
            ? false
            : (ord.desc ?? false);
        const nulls = typeof ord === "string"
            ? "UNSPECIFIED"
            : (ord.nulls ?? "UNSPECIFIED");
        const prop = entity.expandedPropMap.get(path);
        if (prop == null) {
            throw new ArgumentError(
                `There is no property "${path}" in the entity "${entity.name}"`
            );
        }
        const order: EntityPropOrder = {
            prop,
            desc,
            nulls
        };
        return order;
    });
}