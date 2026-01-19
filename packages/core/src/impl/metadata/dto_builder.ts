import { ArgumentError, StateError } from "@/error/common";
import { Entity } from "./entity";
import { EntityProp } from "./entity_prop";
import { Dto, DtoField } from "./dto";
import { makeErr } from "../util";

export function createTypedDtoBuilder(entity: Entity): TypedDtoBuilder {
    const builder = new DtoBuilder(entity);
    return new Proxy(builder, typedDtoBuilderHandler) as any as TypedDtoBuilder;
}

interface TypedDtoBuilder {
    __unwrap(): DtoBuilder
}

type TypedDtoBuilderFn = (builder: TypedDtoBuilder) => TypedDtoBuilder;

class DtoBuilder {

    private readonly fields: Array<DtoField> = [];

    private readonly addedPaths = new Set<string>();

    private lastPropName: string | undefined = undefined;

    constructor(
        private readonly source: Entity | EntityProp
    ) {}

    prop(name: string): EntityProp {
        if (this.source instanceof Entity) {
            return this.source.allPropMap.get(name) ?? makeErr(() => 
                new ArgumentError(`No property "${name}" in model "${this.source.name}"`)
            );
        }
        return this.source.props?.get(name) ?? makeErr(() =>
            new ArgumentError(`No property "${name}" in embeded path "${this.source.toString()}"`)
        );
    }

    add(prop: EntityProp, fn?: TypedDtoBuilderFn) {
        const field = this.field(prop, fn);
        this.addField(field);
        this.lastPropName = prop.name;
    }

    flat(prefix: string, prop: EntityProp, fn?: TypedDtoBuilderFn) {
        if (prop.props == null 
            && prop.associationType !== "ONE_TO_ONE" 
            && prop.associationType !== "MANY_TO_ONE"
        ) {
            throw new ArgumentError(`Cannot flat the property "${prop.toString()}" 
            because it is neither reference nor embedded property`);
        }
        const field: DtoField = {
            ...this.field(prop, fn),
            implicit: true
        };
        for (const nestedField of field.dto!!.fields) {
            const flattedField: DtoField = {
                ...nestedField,
                path: withPrefix(prefix, nestedField.path),
                bridgePath: prop.targetEntity != null ? prop.name : undefined,
                nullable: prop.nullable || nestedField.nullable
            };
            if (prop.targetEntity != null) {
                this.addField(flattedField);
            }
        }
        this.addField(field);
        this.lastPropName = undefined;
    }

    fold(key: string, prop: EntityProp, fn?: TypedDtoBuilderFn) {
        const field = this.field(prop, fn);
        this.addField(field);
        this.lastPropName = key;
    }

    allScalars() {
        const propMap = this.source instanceof Entity
            ? this.source.allPropMap
            : this.source.props ?? makeErr("Internal bug");
        for (const prop of propMap.values()) {
            if (prop.scalarType != null || prop.props != null) {
                this.add(prop);
            }
        }
    }

    remove(alias: string) {
        const arr = this.fields;
        for (let i = arr.length - 1; i >= 0; --i) {
            const path = arr[i]!!.path;
            const match = typeof path === "string"
                ? path === alias 
                : path[0] === alias;
            if (match) {
                arr.splice(i, 1);
            }
        }
    }

    build(): Dto {
        return {
            entity: this.source instanceof Entity
                ? this.source
                : this.source.declaringEntity,
            fields: this.fields
        };
    }

    private field(
        prop: EntityProp, 
        fn?: TypedDtoBuilderFn
    ): DtoField {
        if (prop.targetEntity != null) {
            if (fn == null) {
                throw new ArgumentError(`Cannot add association property 
                    "${prop.toString()}" without child DTO lambda`);
            }
            const childBuilder = createTypedDtoBuilder(prop.targetEntity);
            fn(childBuilder);
            const childDto = childBuilder.__unwrap().build();
            return {
                path: prop.name,
                entityPath: prop,
                dto: childDto,
                fetchType: undefined,
                orders: undefined,
                nullable: prop.nullable,
                implicit: false,
                bridgePath: undefined
            };
        }
        if (prop.props != null) {
            const childBuilder = new Proxy(
                new DtoBuilder(prop),
                typedDtoBuilderHandler
            ) as any as TypedDtoBuilder;
            (fn ?? ($ => ($ as any).allScalars()))(childBuilder);
            const childDto = childBuilder.__unwrap().build();
            return {
                path: prop.name,
                entityPath: prop,
                dto: childDto,
                fetchType: undefined,
                orders: undefined,
                nullable: prop.nullable,
                implicit: false,
                bridgePath: undefined
            };
        }
        if (fn != null) {
            throw new ArgumentError(
                `Child DTO cannnot be specified for "${prop.toString()}" 
                which is neither associated nor embeded property`
            );
        }
        return {
            path: prop.name,
            entityPath: prop,
            dto: undefined,
            fetchType: undefined,
            orders: undefined,
            nullable: false,
            implicit: false,
            bridgePath: undefined
        };
    }

    private addField(field: DtoField) {
        const key = typeof field.path === "string"
            ? field.path
            : field.path.join(".");
        if (this.addedPaths.has(key)) {
            throw new StateError(`Cannot add the DTO path "${field.path}"`);
        }
        this.addedPaths.add(key);
        this.fields.push(field);
    }
}

const typedDtoBuilderHandler: ProxyHandler<DtoBuilder> = {
    get: (target: DtoBuilder, prop: string | symbol, receiver: any) => {
        if (typeof prop === 'symbol') {
            return Reflect.get(target, prop);
        }
        switch (prop) {
            case "__unwrap":
                return () => {
                    return target;
                };
            case "allScalars":
                return () => {
                    target.allScalars();
                    return receiver;
                }
            case "flat":
                return (options: FlatOptions, fn: TypedDtoBuilderFn) => {
                    const prop = typeof options === "string"
                        ? options 
                        : options.prop;
                    const prefix = typeof options === "string"
                        ? prop
                        : options.prefix ?? prop;
                    target.flat(prefix, target.prop(prop), fn);
                    return receiver;
                }
            case "fold":
                return (key: string, fn: TypedDtoBuilderFn) => {
                    target.fold(key, target.prop(prop), fn);
                    return receiver;
                }
            case "remove":
                return (alias: string) => {
                    target.remove(alias);
                    return receiver;
                }
            default:
                if (prop in target) {
                    return Reflect.get(target, prop);
                }
                const entityProp = target.prop(prop);
                if (entityProp.props != null || entityProp.targetEntity != null) {
                    return (fn?: TypedDtoBuilderFn) => {
                        target.add(entityProp, fn);
                        return receiver;
                    }
                }
                target.add(entityProp);
                return receiver;
        }
    }
};

type FlatOptions = string | { 
    readonly prop: string;
    readonly prefix?: string
};

function withPrefix(
    prefix: string, 
    path: string | ReadonlyArray<string>
): string | ReadonlyArray<string> {
    if (prefix === "") {
        return path;
    }
    if (typeof path === "string") {
        return [prefix, path];
    }
    return [prefix, ...path];
}