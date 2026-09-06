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

import { ArgumentError, StateError } from "@/error/common";
import { AssociatedKeysFormulaProp, Dto, DtoField, FetchProp, SqlFormulaProp, TsFormulaProp, TypeNameProp } from "./dto";
import { Entity } from "./entity";
import { EntityProp} from "./entity_prop";
import { createDtoRowReader, DtoRowReader } from "./row_reader";
import { makeErr } from "@/error/util";
import { EntityPropOrder } from "./entity_prop_order";
import { Predicate } from "@/dsl/expression";
import { AbstractDtoContext, createDto, DtoContextFlags, finalKey, newDtoContext } from "./dto_context";
import { dto, ReferenceFetchType, View } from "@/schema/dto/api";
import { AbstractEntityTable } from "./entity_table";
import { DtoBody, MapperFn } from "./dto_mapping";
import { belongTo, fromDtoFields, Metadata, MetadataField } from "./metadata";

export function dtoMapper(
    dto: Dto, 
    input: boolean, 
    nullAsUndefined: boolean
): DtoMapper {
    const mapper = new Mapper(
        dto.entity ?? makeErr(() => new ArgumentError(`"dto.entity" must be specified`)), 
        input,
        nullAsUndefined,
        undefined,
        undefined
    );
    for (const field of dto.fields) {
        mapper.add(field);
    }
    return mapper.toDtoMapper();
}

export class DtoMapper {

    private _dtoRowReader: DtoRowReader | undefined = undefined;

    private _span: number | undefined = undefined;

    private _unresolvedFields: ReadonlyArray<DtoMapperField> | undefined = undefined;

    private _downcastEntities: ReadonlyArray<Entity> | undefined = undefined;

    private _typeNameIndex: number | undefined = undefined;

    private _hash: string | undefined = undefined;

    private _joinFetchFields: ReadonlyArray<DtoMapperField> | undefined;

    constructor(
        readonly entity: Entity,
        readonly input: boolean,
        readonly nullAsUndefined: boolean,
        readonly associatedProp: FetchProp | undefined,
        readonly bridgeProp: EntityProp | undefined,
        readonly fields: ReadonlyArray<DtoMapperField>
    ) {}

    get dtoRowReader(): DtoRowReader {
        let rowReader = this._dtoRowReader;
        if (rowReader == null) {
            this._dtoRowReader = rowReader = createDtoRowReader(this);
        }
        return rowReader;
    }

    get span(): number {
        let span = this._span;
        if (span == null) {
            span = 0;
            for (const field of this.fields) {
                const index = field.columnIndex;
                if (index != null) {
                    span++;
                }
            }
            this._span = span;
        }
        return span;
    }

    get unresolvedFields(): ReadonlyArray<DtoMapperField> {
        let unresolvedFields = this._unresolvedFields;
        if (unresolvedFields == null) {
            const arr: Array<DtoMapperField> = [];
            for (const field of this.fields) {
                if (field.dependencies != null) {
                    arr.push(field);
                }
            }
            this._unresolvedFields = unresolvedFields = arr;
        }
        return unresolvedFields;
    }

    get downcastEntities(): ReadonlyArray<Entity> | undefined {
        let downcastEntities = this._downcastEntities;
        if (downcastEntities == null) {
            const set = new Set<Entity>();
            for (const field of this.fields) {
                if (field.downcastTo != null) {
                    set.add(field.downcastTo);
                }
            }
            this._downcastEntities = downcastEntities = 
                set.size === 0
                    ? []
                    : [this.entity, ...Array.from(set)];
        }
        return downcastEntities.length === 0 ? undefined : downcastEntities;
    }

    get typeNameIndex(): number {
        let index = this._typeNameIndex;
        if (index == null) {
            this._typeNameIndex = index = 
                this.fields.findIndex(f => f.prop instanceof TypeNameProp);
        }
        return index;
    }

    get hash(): string {
        let hash = this._hash;
        if (hash == null) {
            this._hash = hash = 
                `${
                    this.entity.name
                }|${
                    this.nullAsUndefined
                }|${
                    this.associatedProp?.toString()
                }|(${
                    this.fields.map(f => fieldHash(f)).join(",")
                })`;
        }
        return hash;
    }

    get joinFetchFields(): ReadonlyArray<DtoMapperField> {
        let jfFields = this._joinFetchFields;
        if (jfFields == null) {
            this._joinFetchFields = jfFields = 
                this.fields.filter(field => field.fetchType != null && field.fetchType !== "LOAD");
        }
        return jfFields;
    }
}

export interface DtoMapperField {

    readonly index: number;

    readonly downcastTo: Entity | undefined;

    readonly prop: FetchProp;

    readonly parameter: any;

    readonly nullable: boolean;

    readonly bridgeProp: EntityProp | undefined;

    readonly paths: ReadonlyArray<Path>;

    readonly fetchType: ReferenceFetchType | undefined;

    readonly predicateFn: ((table: AbstractEntityTable) => Predicate | null | undefined) | undefined;

    readonly orders: ReadonlyArray<EntityPropOrder> | undefined;

    readonly limit: number | undefined;

    readonly subMapper: DtoMapper | undefined;

    readonly ref: boolean;

    readonly key: boolean;

    readonly recursiveDepth: number | undefined;

    readonly dependencies: ReadonlyArray<number> | undefined;

    readonly isDependent: boolean;

    readonly columnIndex: number | undefined;

    readonly optimizable: boolean;

    readonly mapperFn: MapperFn | undefined;
}

export type Path = string | ReadonlyArray<string>;

class Mapper implements Metadata {

    private readonly _fieldMap = new Map<string, MapperField | Array<MapperField>>();

    private _dependencyWriter: DepenencyWriter | undefined = undefined;

    private _dependencyReader: DependencyReader | undefined = undefined;

    constructor(
        readonly entity: Entity,
        readonly input: boolean,
        readonly nullAsUndefined: boolean,
        readonly associatedProp: FetchProp | undefined,
        readonly bridgeProp: EntityProp | undefined
    ) {}

    add(dtoField: DtoField) {
        this._add(dtoField, true);
    }
    
    private _add(dtoField: DtoField, mapPath: boolean) {
        
        if (dtoField.downcastTo != null) {
            this._addTypeNameField();
        }

        let dependencies: ReadonlyArray<MapperField> | undefined = undefined;

        this._dependencyWriter = { refs: [], parent: this._dependencyWriter };
        try {
            this._addImplicitFields(dtoField);
        } finally {
            if (this._dependencyWriter.refs!.length !== 0) {
                dependencies = this._dependencyWriter.refs;
            }
            this._dependencyWriter = this._dependencyWriter.parent;
        }

        this._dependencyReader = { refs: dependencies, parent: this._dependencyReader };
        try {
            this._addImpl(dtoField, mapPath);
        } finally {
            this._dependencyReader = this._dependencyReader?.parent;
        }
    }

    private _addImplicitFields(field: DtoField) {
        const prop = field.prop;
        const view = this._formulaDependencyView(prop);
        if (view != null) {
            for (const viewField of view.mapper.fields) {
                if (viewField.paths.length === 0) {
                    continue;
                }
                let dtoField = toDtoFields(viewField, false)[0]!;
                dtoField = {...dtoField, downcastTo: field.downcastTo};
                if (viewField.paths.length === 0) {
                    this._add(dtoField, false);
                } else {
                    for (const path of viewField.paths) {
                        const newPath = typeof path === "string"
                            ? [`<implicit:${prop.name}>`, path]
                            : [`<implicit:${prop.name}>`, ...path];
                        this._add({...dtoField, path: newPath}, true);
                    }
                }
            }
            return;
        }
        const referenceKeyProp = prop.referenceKeyProp;
        if (referenceKeyProp != null) {
            this._add(dtoField(field.downcastTo, referenceKeyProp, this.input), false);
        } else if (prop.targetEntity != null) {
            let keyProp = prop.thisKeyProp ?? prop.declaringEntity!.idProp;
            this._add(dtoField(field.downcastTo, keyProp, field.ref), false);
        }
    }

    private _formulaDependencyView(
        prop: FetchProp
    ): View<any, any> | undefined {
        if (prop instanceof EntityProp) {
            return prop.tsFormulaDependencyView;
        }
        if (prop instanceof TsFormulaProp) {
            const formula = prop.formula;
            return formula.dependency();
        }
        if (prop instanceof AssociatedKeysFormulaProp) {
            return dto.view(prop.declaringEntity.model, c => [
                (c[prop.prop.name] as any).with((c: any) => [
                    withBody(c[prop.prop.targetKeyProp!.name], prop.targetIdBody)
                ])
            ]);
        }
        return undefined;
    }

    private _addImpl(dtoField: DtoField, mapPath: boolean) {
        let field: MapperField | undefined = undefined;
        if (dtoField.dto == null || dtoField.prop.targetEntity != null) {
            field = this._field(dtoField);
            if (mapPath) {
                field.path(dtoField.path);
            }
            if (this._dependencyWriter != null) {
                this._dependencyWriter.refs.push(field);
                field.setDependent();
            }
        }
        if (dtoField.dto != null) {
            if (field != null) { // Association
                for (const subDtoField of dtoField.dto.fields) {
                    field.subMetadata!._add(subDtoField, mapPath);
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

    private _addTypeNameField() {
        for (const cachedValue of this._fieldMap.values()) {
            if (Array.isArray(cachedValue)) {
                for (const field of cachedValue) {
                    if (field.prop instanceof TypeNameProp) {
                        return;
                    }
                }
            } else {
                if (cachedValue.prop instanceof TypeNameProp) {
                    return;
                }
            }
        }
        const field: DtoField = {
            path: "__typename",
            downcastTo: undefined,
            prop: new TypeNameProp(
                this.entity,
                this.entity.tableSettings.discriminator?.name,
                this.entity.tableSettings.discriminator == null ? this.entity.name : undefined
            ),
            bridgeProp: undefined,
            dto: undefined,
            ref: false,
            key: false,
            fetchType: undefined,
            predicateFn: undefined,
            orders: undefined,
            limit: undefined,
            recursiveDepth: undefined,
            nullable: false,
            parameter: undefined,
            mapperFn: undefined
        };
        this._add(field, true);
    }

    private _field(dtoField: DtoField): MapperField {
        const key = dtoFieldKey(dtoField);
        let cachedValue = this._fieldMap.get(key);
        if (cachedValue != null) {
            const arr = Array.isArray(cachedValue)
                ? cachedValue
                : [cachedValue];
            for (const field of arr) {
                if (field.prop === dtoField.prop
                    && field.bridgeProp != dtoField.bridgeProp) {
                    throw new StateError(
                        `The property "${
                            (field.bridgeProp ?? field.prop).toString()
                        }" and "${
                            (dtoField.bridgeProp ?? field.prop).toString()
                        }" cannot be fetched together`
                    );
                }
                if (isMergeableField(field, dtoField)) {
                    return field;
                }
            }
        }
        const field = new MapperField(
            this.input,
            this.nullAsUndefined,
            dtoField.downcastTo,
            dtoField.prop, 
            dtoField.fetchType,
            dtoField.predicateFn,
            dtoField.orders,
            dtoField.limit,
            dtoField.parameter,
            dtoField.mapperFn,
            dtoField.nullable,
            dtoField.bridgeProp,
            dtoField.recursiveDepth,
            this._dependencyReader?.refs,
            dtoField.ref,
            dtoField.key
        );
        if (cachedValue == null) {
            this._fieldMap.set(key, field);
        } else {
            if (this.input) {
                throw new StateError(
                    `Input DTO for "${
                        this.entity.name
                    }" does not accept duplicated fields based on "${
                        dtoField.prop.toString()
                    }"`
                );
            }
            this._fieldMap.set(
                key, 
                Array.isArray(cachedValue)
                    ? [...cachedValue, field]
                    : [cachedValue, field]
            );
        }
        return field;
    }

    toDtoMapper(): DtoMapper {
        const fields = this._finalFields().map(f => f.toDtoMapperField());
        this._handleRecursiveFields(fields);
        return new DtoMapper(
            this.entity,
            this.input,
            this.nullAsUndefined,
            this.associatedProp,
            this.bridgeProp,
            fields
        );
    }

    private _finalFields(): ReadonlyArray<MapperField> {
        const fields: Array<MapperField> = [];
        const joinFetchFields: Array<MapperField> = [];
        for (const cachedValue of this._fieldMap.values()) {
            if (Array.isArray(cachedValue)) {
                for (const mf of cachedValue) {
                    (mf.fetchType === "JOIN_LOW_OFFSET_ONLY" ? joinFetchFields : fields).push(mf);
                }
            } else {
                (cachedValue.fetchType === "JOIN_LOW_OFFSET_ONLY" ? joinFetchFields : fields).push(cachedValue);
            }
        }
        fields.push(...joinFetchFields);
        const fieldCount = fields.length;
        let columnIndex = 0;
        for (let i = 0; i < fieldCount; i++) {
            columnIndex = fields[i]!.setColumns(i, columnIndex);
        }
        return fields;
    }

    private _handleRecursiveFields(
        fields: Array<DtoMapperField>
    ) {
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i]!;
            if (field.recursiveDepth == null) {
                continue;
            }
            fields[i] = {
                ...field,
                subMapper: this._makeRecursiveSubMapper(field, fields)
            }
        }
    }

    private _makeRecursiveSubMapper(
        recursiveField: DtoMapperField,
        fields: ReadonlyArray<DtoMapperField>
    ): DtoMapper {
        const usedArr: boolean[] = new Array(fields.length).fill(false);
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i]!;
            if (field.downcastTo != null ||
                field.prop.declaringEntity.isAssignableFrom(recursiveField.prop.declaringEntity)
            ) {
                if (field === recursiveField) {
                    Mapper.useField(i, fields, usedArr);
                } else if (field.recursiveDepth == null && field.paths.length != 0) {
                    Mapper.useField(i, fields, usedArr);
                }
            }
        }
        const newFields: Array<DtoMapperField> = [];
        let indexDelta = 0;
        let columnIndexDelta = 0;
        let dependencyDeltaMap = new Map<number, number>();
        for (let i = 0; i < fields.length; i++) {
            const field = fields[i]!;
            if (!usedArr[i]) {
                indexDelta--;
                if (field.columnIndex != null) {
                    columnIndexDelta--;
                }
                for (let next = i + 1; next < fields.length; next++) {
                    const delta = dependencyDeltaMap.get(next) ?? 0;
                    dependencyDeltaMap.set(next, delta - 1);
                }
                continue;
            }
            const newField: DtoMapperField = {
                ...field,
                recursiveDepth: undefined,
                index: field.index + indexDelta,
                columnIndex: field.columnIndex != null
                    ? field.columnIndex + columnIndexDelta 
                    : undefined,
                dependencies: field.dependencies?.map(i => i + (dependencyDeltaMap.get(i) ?? 0))
            };
            newFields.push(newField);
        }
        return new DtoMapper(
            recursiveField.prop.targetEntity!,
            this.input,
            this.nullAsUndefined,
            recursiveField.prop,
            recursiveField.bridgeProp,
            newFields
        );
    }

    private static useField(
        index: number, 
        fields: ReadonlyArray<DtoMapperField>, 
        usedArr: Array<boolean>
    ) {
        if (usedArr[index]) {
            return true;
        }
        usedArr[index] = true;
        const dependencies = fields[index]!.dependencies;
        if (dependencies != null) {
            for (const dependency of dependencies) {
                Mapper.useField(dependency, fields, usedArr)
            }
        }
    }

    lessThan(props: ReadonlyArray<EntityProp>): boolean {
        for (const cachedValue of this._fieldMap.values()) {
            if (Array.isArray(cachedValue)) {
                for (const field of cachedValue) {
                    if (!shapeLessThan(props, field)) {
                        return false;
                    }
                }
            } else if (!shapeLessThan(props, cachedValue)) {
                return false;
            }
        }
        return true;
    }

    get fields(): Iterable<MetadataField> {
        const fieldMap = this._fieldMap;
        return new class implements Iterable<MetadataField> {
            *[Symbol.iterator](): Iterator<MetadataField> {
                for (const cachedValue of fieldMap.values()) {
                    if (Array.isArray(cachedValue)) {
                        yield *cachedValue;
                    } else {
                        yield cachedValue;
                    }
                }
            }
        };
    }
};

class MapperField implements MetadataField {

    readonly subMetadata : Mapper | undefined;

    private _paths: Array<Path> = [];

    private _fullPaths = new Set<string>();

    private isDependent = false;

    private _index: number = -1;

    private _columnIndex: number | undefined = undefined;

    constructor(
        input: boolean,
        nullAsUndefined: boolean,
        readonly downcastTo: Entity | undefined,
        readonly prop: FetchProp,
        readonly fetchType: ReferenceFetchType | undefined,
        readonly predicateFn: ((table: AbstractEntityTable) => Predicate | null | undefined) | undefined,
        readonly orders: ReadonlyArray<EntityPropOrder> | undefined,
        readonly limit: number | undefined,
        readonly parameter: any,
        readonly mapperFn: MapperFn | undefined,
        readonly nullable: boolean,
        readonly bridgeProp: EntityProp | undefined,
        readonly recursiveDepth: number | undefined,
        readonly dependencies: ReadonlyArray<MapperField> | undefined,
        readonly ref: boolean,
        readonly key: boolean
    ) {
        if (prop.targetEntity == null || recursiveDepth != null) {
            this.subMetadata = undefined;
        } else {
            this.subMetadata = new Mapper(prop.targetEntity, input, nullAsUndefined, prop, bridgeProp);
        }
    }

    path(path: string | ReadonlyArray<string> | undefined) {
        if (path != null) {
            const str = typeof path === "string"
                ? path
                : path.join("/");
            if (!this._fullPaths.has(str)) {
                this._fullPaths.add(str);
                this._paths.push(path);
            }
        }
    }

    setDependent() {
        this.isDependent = true;
    }

    setColumns(index: number, columnIndex: number): number {
        this._index = index;
        if (this._hasColumn()) {
            this._columnIndex = columnIndex++;
        }
        return columnIndex;
    }

    toDtoMapperField(): DtoMapperField {
        const paths = this._paths;
        const subMapper = this.subMetadata?.toDtoMapper();
        if (subMapper != null) {
            this._validateFetchType(subMapper);
        }
        return {
            index: this._index,
            downcastTo: this.downcastTo,
            prop: this.prop,
            parameter: this.parameter,
            bridgeProp: this.bridgeProp,
            nullable: this.nullable,
            paths,
            subMapper,
            ref: this.ref,
            key: this.key,
            fetchType: this.fetchType,
            predicateFn: this.predicateFn,
            orders: this.orders,
            limit: this.limit,
            recursiveDepth: this.recursiveDepth,
            dependencies: this.dependencies?.map(ref => ref._index),
            isDependent: this.isDependent,
            columnIndex: this._columnIndex,
            optimizable: this.isOptimizable(),
            mapperFn: this.mapperFn
        };
    }

    private isOptimizable(): boolean {
        if (this.subMetadata == null) {
            return false;
        }
        if (this.predicateFn != null) {
            return false;
        }
        if (this.orders != null && this.orders.length !== 0) {
            return false;
        }
        if (this.bridgeProp != null) {
            const targetKeyProp = this.bridgeProp.targetKeyProp ?? this.bridgeProp.targetEntity!.idProp;
            return this.subMetadata.lessThan(targetKeyProp.scalarProps!);
        }
        if (!this.prop.isEntityProp) {
            return false;
        }
        const entityProp = this.prop as EntityProp;
        if (entityProp.associationType === null) {
            return false;
        }
        if (entityProp.storageType === "NONE") {
            return false;
        }
        const targetKeyProp = entityProp.targetKeyProp ?? entityProp.targetEntity!.idProp;
        return this.subMetadata.lessThan(targetKeyProp.scalarProps!);
    }

    private _hasColumn(): boolean {
        if (this.dependencies != null) {
            return false;
        }
        if (this.prop instanceof TypeNameProp) {
            const typedNameProp = this.prop as TypeNameProp;
            return typedNameProp.columName != null;
        }
        return true;
    }

    private _validateFetchType(subMapper: DtoMapper) {
        if (this.fetchType == null || this.fetchType === "LOAD") {
            return;
        }
        const prop = this.prop.asEntityProp;
        if (prop == null || !prop.nullable) {
            return;
        }
        for (const deeperField of subMapper.fields) {
            if (deeperField.downcastTo != null) {
                continue;
            }
            if (deeperField.columnIndex == null) {
                continue;
            }
            const deeperProp = deeperField.prop.asEntityProp;
            if (deeperProp != null && !deeperProp.nullable) {
                return;
            }
        }
        throw new StateError(
            `Illegal fetch for nullable association "${
                prop.toString()
            }", the reference fetch type is "${
                this.fetchType
            }" so that at least one non-null and non-derived property is required in associated DTO`
        );
    }

    get fullPaths(): ReadonlySet<string> {
        return this._fullPaths;
    }
}

function dtoFieldKey(field: DtoField): string {
    let key = field.prop.toString();
    if (field.predicateFn != null) {
        key += `\x1Ff:${field.predicateFn.toString()}`;
    }
    if (field.orders != null && field.orders.length !== 0) {
        key += `\x1Fo:${JSON.stringify(field.orders)}`;
    }
    if (field.limit != null) {
        key += `\x1Fl:${field.limit}`
    }
    if (field.parameter != null) {
        key += `\x1Fp:${JSON.stringify(field.parameter)}`;
    }
    if (field.mapperFn != null) {
        key += `\x1Fm:${field.mapperFn.toString()}`;
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
    refs: Array<MapperField>;
    parent: DepenencyWriter | undefined;
}

type DependencyReader = {
    refs: ReadonlyArray<MapperField> | undefined;
    parent: DependencyReader | undefined;
}

function toDto(
    mapper: DtoMapper
): Dto {
    const dtoFields: Array<DtoField> = [];
    for (const field of mapper.fields) {
        dtoFields.push(...toDtoFields(field, true));
    }
    return {
        entity: mapper.entity,
        fields: dtoFields
    };
}

function toDtoFields(
    field: DtoMapperField,
    assignPath: boolean
): ReadonlyArray<DtoField> {
    const dtoField: DtoField = {
        path: undefined,
        downcastTo: field.downcastTo,
        prop: field.prop,
        bridgeProp: field.bridgeProp,
        dto: field.subMapper != null ? toDto(field.subMapper) : undefined,
        ref: field.ref,
        key: field.key,        
        fetchType: field.fetchType,
        predicateFn: field.predicateFn,
        orders: field.orders,
        limit: field.limit,
        recursiveDepth: field.recursiveDepth,
        nullable: field.nullable,
        parameter: field.parameter,
        mapperFn: field.mapperFn
    };
    if (field.paths.length === 0 || !assignPath) {
        return [dtoField];
    }
    return field.paths.map(path => {
        return { ...dtoField, path };
    });
}

function fieldHash(field: DtoMapperField): string {
    return `${
        field.downcastTo?.name ?? ""
    }|${
        field.prop.name
    }|${
        field.bridgeProp?.name ?? ""
    }|${
        field.paths.map(path => typeof path === "string" ? path : `(${path.join(",")})`).join(",")
    }|${
        field.subMapper != null ? `(${field.subMapper.hash})` : ""
    }|${
        field.recursiveDepth ?? ""
    }|${
        field.mapperFn != null
    }|${
        field.prop instanceof TsFormulaProp 
            ? "1" 
        : field.prop instanceof SqlFormulaProp
            ? "2"
        : ""
    }`;
}

function dtoField(
    downcastTo: Entity | undefined,
    prop: EntityProp,
    ref: boolean
): DtoField {
    if (prop.props != null) {
        const ctx = newDtoContext(prop, DtoContextFlags.None);
        const childDto = createDto(ctx, downcastTo, (c: AbstractDtoContext) => [c.$allScalars]);
        return {
            path: prop.name,
            downcastTo,
            prop: prop,
            bridgeProp: undefined,
            dto: childDto,
            ref,
            key: finalKey(),
            fetchType: undefined,
            predicateFn: undefined,
            orders: prop.orders,
            limit: undefined,
            recursiveDepth: undefined,
            nullable: prop.nullable,
            parameter: undefined,
            mapperFn: undefined
        };
    }
    return {
        path: prop.name,
        downcastTo,
        prop: prop,
        bridgeProp: undefined,
        dto: undefined,
        ref,
        key: finalKey(),
        fetchType: undefined,
        predicateFn: undefined,
        orders: prop.orders,
        limit: undefined,
        recursiveDepth: undefined,
        nullable: false,
        parameter: undefined,
        mapperFn: undefined
    };
}

function withBody(mapping: any, body: DtoBody | undefined) {
    if (body == null) {
        return mapping;
    }
    return mapping.with(body);
}

function shapeLessThan(
    props: ReadonlyArray<EntityProp>, 
    field: MapperField
): boolean {
    if (!field.prop.isEntityProp) {
        return false;
    }
    const fieldPropPath = (field.prop as EntityProp).path;
    let matched = false;
    for (const prop of props) {
        const scalarProps = prop.scalarProps;
        if (scalarProps == null) {
            throw new ArgumentError(`The argument contains "${prop.toString()}" which is not scalar props`);
        }
        if (scalarProps.findIndex(p => p.path === fieldPropPath) !== -1) {
            matched = true;
            break;
        }
    }
    if (!matched) {
        return false;
    }
    return true;
}

function isMergeableField(
    oldField: MapperField,
    newField: DtoField
): boolean {
    if (oldField.subMetadata == null) {
        return true;
    }
    const oldLevel = pathLevelOf(oldField);
    const newLevel = pathLevelOf(newField);
    if (oldLevel === PathLevel.None || newLevel === PathLevel.None) {
        return true;
    }
    if (oldLevel === PathLevel.Normal && newLevel === PathLevel.Normal) {
        const newFields = fromDtoFields(newField.dto!.fields);
        return belongTo(oldField.subMetadata.fields, newFields) 
            && belongTo(newFields, oldField.subMetadata.fields);
    }
    if (oldLevel === PathLevel.Implicit) {
        return belongTo(oldField.subMetadata.fields, fromDtoFields(newField.dto!.fields));
    }
    if (newLevel === PathLevel.Implicit) {
        return belongTo(fromDtoFields(newField.dto!.fields), oldField.subMetadata.fields);
    }
    return false;
}

const enum PathLevel {
    None = 0,
    Implicit = 1,
    Normal = 2
};

function pathLevelOf(
    field: MapperField | DtoField
): PathLevel {
    if (field instanceof MapperField) {
        let level = PathLevel.None;
        for (const path of field.fullPaths) {
            if (path.startsWith("<implicit:")) {
                level = level > PathLevel.Implicit ? level : PathLevel.Implicit;
            } else {
                level = level > PathLevel.Normal ? level : PathLevel.Normal;
            }
        }
        return level;
    }
    let level = PathLevel.None;
    if (typeof field.path === "string") {
        if (field.path.startsWith("<implicit:")) {
            level = level > PathLevel.Implicit ? level : PathLevel.Implicit;
        } else {
            level = level > PathLevel.Normal ? level : PathLevel.Normal;
        }
    } else if (field.path != null) {
        for (const path of field.path) {
            if (path.startsWith("<implicit:")) {
                level = level > PathLevel.Implicit ? level : PathLevel.Implicit;
            } else {
                level = level > PathLevel.Normal ? level : PathLevel.Normal;
            }
        }
    }
    return level;
}
