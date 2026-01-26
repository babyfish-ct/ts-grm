import { ArgumentError } from "@/error/common";
import { makeErr } from "../util";
import { Dto, DtoField } from "./dto";
import { Entity } from "./entity";
import { EntityProp } from "./entity_prop";
import { dtoField } from "./dto_builder";
import { createRowMapper, RowMapper } from "./row_mapper";

export function dtoMapper(dto: Dto, nullAsUndefined: boolean): DtoMapper {
    const mapper = new Mapper(
        dto.entity ?? makeErr(() => new ArgumentError(`"dto.entity" must be specified`)), 
        nullAsUndefined,
        undefined
    );
    for (const field of dto.fields) {
        mapper.add(field);
    }
    return mapper.toDtoMapper();
}

export class DtoMapper {

    private _rowMapper: RowMapper | undefined = undefined;

    constructor(
        readonly entity: Entity,
        readonly nullAsUndefined: boolean,
        readonly associatedProp: EntityProp | undefined,
        readonly fields: ReadonlyArray<DtoMapperField>
    ) {}

    get rowMapper(): RowMapper {
        let rowMapper = this._rowMapper;
        if (rowMapper == null) {
            this._rowMapper = rowMapper = createRowMapper(this);
        }
        return rowMapper;
    }
}

export type DtoMapperField = {

    readonly prop: EntityProp;

    readonly paths: ReadonlyArray<Path>;

    readonly subMapper: DtoMapper | undefined;

    readonly recursiveDepth: number | undefined;

    readonly dependencies: ReadonlyArray<number> | undefined;

    readonly isDependent: boolean;
}

export type Path = string | ReadonlyArray<string>;

class Mapper {

    private fieldMap = new Map<string, MapperField>();

    private dependencyWriter: DepenencyWriter | undefined = undefined;

    private dependencyReader: DependencyReader | undefined = undefined;

    constructor(
        readonly entity: Entity,
        readonly nullAsUndefined: boolean,
        readonly associatedProp: EntityProp | undefined
    ) {}

    add(dtoField: DtoField) {
        this._add(dtoField, true);
    }
    
    private _add(dtoField: DtoField, mapPath: boolean) {
        
        let dependencies: ReadonlyArray<number> | undefined = undefined;

        this.dependencyWriter = { indices: [], parent: this.dependencyWriter };
        try {
            this._addImplicitFields(dtoField.entityProp);
        } finally {
            if (this.dependencyWriter.indices!.length !== 0) {
                dependencies = this.dependencyWriter.indices;
            }
            this.dependencyWriter = this.dependencyWriter.parent;
        }

        this.dependencyReader = { indices: dependencies, parent: this.dependencyReader };
        try {
            this._addImpl(dtoField, mapPath);
        } finally {
            this.dependencyReader = this.dependencyReader?.parent;
        }
    }

    private _addImplicitFields(prop: EntityProp) {
        const referenceKeyProp = prop.referenceKeyProp;
        if (referenceKeyProp != null) {
            this._addImpl(dtoField(referenceKeyProp), false);
        } else if (prop.targetEntity != null) {
            let keyProp = prop.declaringEntity.idProp;
            // TODO: backProp may not be id property
            this._addImpl(dtoField(keyProp), false);
        }
    }

    private _addImpl(dtoField: DtoField, mapPath: boolean) {
        let field: MapperField | undefined = undefined;
        if (dtoField.dto == null || dtoField.entityProp.targetEntity != null) {
            field = this._field(dtoField);
            if (mapPath) {
                field.path(dtoField.path);
            }
            if (this.dependencyWriter != null) {
                this.dependencyWriter.indices.push(field.index);
                field.setDependent();
            }
        }
        if (dtoField.dto != null) {
            if (field != null) { // Association
                for (const subDtoField of dtoField.dto.fields) {
                    field.subMapper!._add(subDtoField, mapPath);
                }
            } else { // Embedded
                for (const subDtoField of dtoField.dto.fields) {
                    this._add({
                        ...subDtoField,
                        path: embeddedPath(dtoField.path, subDtoField.path)
                    }, mapPath);
                }
            }
        }
    }

    private _field(dtoField: DtoField) {
        const key = dtoFieldKey(dtoField);
        let field = this.fieldMap.get(key);
        if (field == null) {
            field = new MapperField(
                this.nullAsUndefined,
                this.fieldMap.size, 
                dtoField.entityProp, 
                dtoField.recursiveDepth,
                this.dependencyReader?.indices
            );
            this.fieldMap.set(key, field);
        }
        return field;
    }

    toDtoMapper(): DtoMapper {
        return new DtoMapper(
            this.entity,
            this.nullAsUndefined,
            this.associatedProp,
            Array.from(this.fieldMap.values()).map(f => f.toDtoMapperField())
        );
    }
};

class MapperField {

    readonly subMapper : Mapper | undefined;

    private paths = new Set<string>();

    private isDependent = false;

    constructor(
        nullAsUndefined: boolean,
        readonly index: number,
        readonly prop: EntityProp,
        readonly recursiveDepth: number | undefined,
        readonly dependencies: ReadonlyArray<number> | undefined
    ) {
        if (prop.targetEntity == null || recursiveDepth != null) {
            this.subMapper = undefined;
        } else {
            this.subMapper = new Mapper(prop.targetEntity, nullAsUndefined, prop);
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

    setDependent() {
        this.isDependent = true;
    }

    toDtoMapperField(): DtoMapperField {
        const paths = Array.from(this.paths).map(path => {
            const parts = path.split('/');
            return parts.length === 1
                ? parts[0]!
                : parts;
        });
        return {
            prop: this.prop,
            paths,
            subMapper: this.subMapper?.toDtoMapper(),
            recursiveDepth: this.recursiveDepth,
            dependencies: this.dependencies,
            isDependent: this.isDependent
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
type DepenencyWriter = {
    indices: Array<number>;
    parent: DepenencyWriter | undefined;
}

type DependencyReader = {
    indices: ReadonlyArray<number> | undefined;
    parent: DependencyReader | undefined;
}
