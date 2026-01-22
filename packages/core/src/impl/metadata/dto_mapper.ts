import { ArgumentError } from "@/error/common";
import { makeErr } from "../util";
import { Dto, DtoField } from "./dto";
import { Entity } from "./entity";
import { EntityProp } from "./entity_prop";

export function dtoMapper(dto: Dto): DtoMapper {
    const mapper = new Mapper(
        dto.entity ?? makeErr(() => new ArgumentError(`"dto.entity" must be specified`)), 
        undefined
    );
    for (const field of dto.fields) {
        mapper.add(field);
    }
    return mapper.toDtoMapper();
}

export type DtoMapper = {

    readonly entity: Entity;

    readonly associatedProp: EntityProp | undefined;

    readonly fields: ReadonlyArray<DtoMapperField>;
}

export type DtoMapperField = {

    readonly prop: EntityProp;

    readonly paths: ReadonlyArray<Path>;

    readonly subMapper: DtoMapper | undefined;

    readonly recursiveDepth: number | undefined;
}

export type Path = string | ReadonlyArray<string>;

class Mapper {

    private fieldMap = new Map<string, MapperField>();

    constructor(
        readonly entity: Entity,
        readonly associatedProp: EntityProp | undefined
    ) {}

    add(dtoField: DtoField) {
        this.addImplicitFields(dtoField.entityProp);
        let field: MapperField | undefined = undefined;
        if (dtoField.dto == null || dtoField.entityProp.targetEntity != null) {
            field = this._field(dtoField);
            field.path(dtoField.path);
        }
        if (dtoField.dto != null) {
            if (field != null) { // Association
                for (const subDtoField of dtoField.dto.fields) {
                    field.subMapper!!.add(subDtoField);
                }
            } else { // Embedded
                for (const subDtoField of dtoField.dto.fields) {
                    this.add({
                        ...subDtoField,
                        path: embeddedPath(dtoField.path, subDtoField.path)
                    });
                }
            }
        }
    }

    addImplicitFields(prop: EntityProp) {
        const referenceKeyProp = prop.referenceKeyProp;
        if (referenceKeyProp != null) {
            const newDtoField: DtoField = {
                entityProp: referenceKeyProp,
                path: undefined,
                dto: undefined,
                fetchType: undefined,
                orders: undefined,
                recursiveDepth: undefined,
                nullable: referenceKeyProp.nullable,
                dependency: undefined
            };
            this._field(newDtoField);
        } else if (prop.targetEntity != null) {
            let keyProp = prop.declaringEntity.idProp;
            // TODO
            const newDtoField: DtoField = {
                entityProp: keyProp,
                path: undefined,
                dto: undefined,
                fetchType: undefined,
                orders: undefined,
                recursiveDepth: undefined,
                nullable: keyProp.nullable,
                dependency: undefined
            };
            this._field(newDtoField);
        }
    }

    private _field(dtoField: DtoField) {
        const key = dtoFieldKey(dtoField);
        let field = this.fieldMap.get(key);
        if (field == null) {
            field = new MapperField(dtoField.entityProp, dtoField.recursiveDepth);
            this.fieldMap.set(key, field);
        }
        return field;
    }

    toDtoMapper(): DtoMapper {
        return {
            entity: this.entity,
            associatedProp: this.associatedProp,
            fields: Array.from(this.fieldMap.values()).map(f => f.toDtoMapperField())
        };
    }
};

class MapperField {

    readonly subMapper : Mapper | undefined;

    private paths = new Set<string>();

    constructor(
        readonly prop: EntityProp,
        readonly recursiveDepth: number | undefined
    ) {
        if (prop.targetEntity == null || recursiveDepth != null) {
            this.subMapper = undefined;
        } else {
            this.subMapper = new Mapper(prop.targetEntity, prop);
        }
    }

    path(path: string | ReadonlyArray<string> | undefined) {
        if (path != null) {
            const str = typeof path === "string"
                ? path
                : path.join("/");
            this.paths.add(str);
        }
    }

    toDtoMapperField(): DtoMapperField {
        const paths = Array.from(this.paths).map(path => {
            const parts = path.split('/');
            return parts.length === 1
                ? parts[0]!!
                : parts;
        });
        return {
            prop: this.prop,
            paths,
            subMapper: this.subMapper?.toDtoMapper(),
            recursiveDepth: this.recursiveDepth
        };
    }
}

function dtoFieldKey(field: DtoField): string {
    let key = field.entityProp.toString();
    if (field.orders != null) {
        key += JSON.stringify(field.orders);
    }
    return key;
}

function embeddedPath(
    path1: string | ReadonlyArray<string> | undefined,
    path2: string | ReadonlyArray<string> | undefined
): ReadonlyArray<string> | undefined {
    if (path1 == null || path2 == null) {
        return undefined;
    }
    const arr1 = typeof path1 === "string" ? [path1] : path1;
    const arr2 = typeof path2 === "string" ? [path2] : path2;
    return [...arr1, ...arr2];
}