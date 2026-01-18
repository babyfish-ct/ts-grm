import { ArgumentError } from "@/error/common";
import { makeErr } from "../util";
import { Entity } from "./entity";
import { EntityProp } from "./entity_prop";

class DtoBuilder {

    constructor(readonly entity: Entity, private readonly embededPrefix?: string) {

    }

    add(prop: EntityProp) {
        if (prop.props != null || prop.targetEntity != null) {
            console.log('add method', prop.name);
        } else {
            console.log('add field', prop.name);
        }
    }

    remove(alias: string) {

    }
}

const handler: ProxyHandler<DtoBuilder> = {
    get: (target: DtoBuilder, prop: string | symbol, receiver: any) => {
        if (typeof prop === 'symbol') {
            return Reflect.get(target, prop);
        }
        if (prop in target) {
            return Reflect.get(target, prop);
        }
        const entityProp = target.entity.allPropMap.get(prop) ??
            makeErr(() => new ArgumentError(
                `There is no property "${prop}" in model "${target.entity.name}"`
            ));
        if (entityProp.props != null || entityProp.targetEntity != null) {
            return () => {
                target.add(entityProp);
                return receiver;
            }
        }
        target.add(entityProp);
        return receiver;
    }
};

export function createDtoBuilder(entity: Entity, embededPrefix?: string): any {
    const target = new DtoBuilder(entity, embededPrefix);
    return new Proxy(target, handler);
}