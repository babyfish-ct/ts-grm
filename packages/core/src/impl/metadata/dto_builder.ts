import { ArgumentError, StateError } from "@/error/common";
import { Entity } from "./entity";
import { EntityProp } from "./entity_prop";
import { Dto, DtoField } from "./dto";
import { capitalize, makeErr } from "../util";

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
        const field: DtoField = this.field(prop, fn);
        if (prop.targetEntity != null) {
            const convertedField: DtoField = {
                ...field,
                dto: {
                    ...field.dto!!,
                    fields: field.dto?.fields.map(f => ({
                        ...f,
                        path: f.path != null
                            ? withFoldKey("..", withPrefix(prefix, f.path))
                            : undefined
                    })) as ReadonlyArray<DtoField>
                }
            };
            this.addField(convertedField);
        } else {
            for (const nestedField of field.dto!!.fields) {
                const convertedNestedField = {
                    ...nestedField,
                    path: nestedField.path != null 
                        ? withPrefix(prefix, nestedField.path)
                        : undefined
                }
                this.addField(convertedNestedField);
            }
        }
        this.lastPropName = undefined;
    }

    fold(key: string, fn: TypedDtoBuilderFn) {
        if (key === "") {
            throw new ArgumentError(`The key of "fold" function cannot be empty`);
        }
        const builder = new Proxy(
            new DtoBuilder(this.source),
            typedDtoBuilderHandler
        ) as any as TypedDtoBuilder;
        fn(builder);
        const dto = builder.__unwrap().build();
        const foldFields = dto.fields.map(f => {
            return {
                ...f,
                path: f.path != null 
                    ? withFoldKey(key, f.path)
                    : undefined
            };
        });
        for (const foldField of foldFields) {
            this.addField(foldField);
        }
        this.lastPropName = undefined;
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
        this.lastPropName = undefined;
    }

    remove(...aliases: string[]) {
        for (const alias of aliases) {
            const arr = this.fields;
            for (let i = arr.length - 1; i >= 0; --i) {
                if (isMatched(arr[i]!!, alias)) {
                    arr.splice(i, 1);
                }
            }
        }
        this.lastPropName = undefined;
    }

    $as(alias: string) {
        if (this.lastPropName == null) {
            throw new StateError(`"$as" function cannot be invoked because there is no last property`);
        }
        if (alias === "") {
            throw new ArgumentError(`The arugment of "$as" function cannot be empty`);
        }
        const arr = this.fields;
        const renamedFields: Array<DtoField> = [];
        for (let i = arr.length - 1; i >= 0; --i) {
            if (!isMatched(arr[i]!!, this.lastPropName)) {
                continue;
            }
            const field = arr.splice(i, 1)[0]!!;
            renamedFields.unshift(rename(field, alias));
        }
        for (const renamedField of renamedFields) {
            this.addField(renamedField);
        }
        this.lastPropName = alias;
    }

    build(): Dto {
        return {
            entity: this.source instanceof Entity
                ? this.source
                : undefined,
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
                entityProp: prop,
                dto: childDto,
                fetchType: undefined,
                orders: undefined,
                nullable: prop.nullable,
                dependency: undefined
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
                entityProp: prop,
                dto: childDto,
                fetchType: undefined,
                orders: undefined,
                nullable: prop.nullable,
                dependency: undefined
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
            entityProp: prop,
            dto: undefined,
            fetchType: undefined,
            orders: undefined,
            nullable: false,
            dependency: undefined
        };
    }

    private addField(field: DtoField) {
        if (field.path != null) {
            const key = typeof field.path === "string"
                ? field.path
                : field.path.join(".");
            if (this.addedPaths.has(key)) {
                throw new StateError(`Cannot add the DTO path "${field.path}"`);
            }
            this.addedPaths.add(key);
        }
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
                return (options: FlatOptions, fn?: TypedDtoBuilderFn) => {
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
                    target.fold(key, fn);
                    return receiver;
                }
            case "remove":
                return (...aliases: string[]) => {
                    target.remove(...aliases);
                    return receiver;
                }
            case "$as":
                return (alias: string) => {
                    target.$as(alias);
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
        return `${prefix}${capitalize(path)}`;
    }
    return [`${prefix}${capitalize(path[0]!!)}`, ...path.slice(1, path.length)];
}

function withFoldKey(
    key: string, 
    path: string | ReadonlyArray<string>
): ReadonlyArray<string> {
    if (typeof path === "string") {
        return [key, path];
    }
    return [key, ...path];
}

function isMatched(
    field: DtoField, 
    alias: string
): boolean {
    const path = field.path;
    if (path == null) {
        return false;
    }
    if (typeof path === "string") {
        return path === alias;
    }
    return path[0] === alias;
}

function rename(
    field: DtoField, 
    alias: string
): DtoField {
    const path = field.path;
    if (path == null) {
        return field;
    }
    const newPath = typeof path === "string"
        ? alias
        : [alias, ...path.slice(1, path.length)];
    return {
        ...field,
        path: newPath
    };
}