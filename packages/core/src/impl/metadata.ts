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

import { Dto, DtoField, FetchProp } from "./dto";
import { Path } from "./dto_mapper";

export interface Metadata {

    readonly fields: Iterable<MetadataField>;
}

export interface MetadataField {

    readonly prop: FetchProp;

    readonly fullPaths: ReadonlySetLike<string>;

    readonly subMetadata: Metadata | undefined;
}

export interface ReadonlySetLike<E> extends Iterable<E> {

    has(element: E): boolean;

    readonly size: number;
}

export function fromDtoFields(
    dtoFields: ReadonlyArray<DtoField>
): ReadonlyArray<MetadataField> {
    const metadataFields: Array<MetadataField> = [];
    for (const dtoField of dtoFields) {
        collectMetadataField(undefined, dtoField, metadataFields);
    }
    return metadataFields;
}

function collectMetadataField(
    prefix: string | undefined,
    dtoField: DtoField,
    metadataFields: Array<MetadataField>
) {
    if (dtoField.prop.asEntityProp?.props != null) {
        for (const subField of dtoField.dto!.fields) {
            collectMetadataField(fullPath(prefix, dtoField.path), subField, metadataFields);
        }
        return;
    }
    const metadataField: MetadataField = {
        prop: dtoField.prop,
        fullPaths: new AtMostOneSet(fullPath(prefix, dtoField.path)),
        subMetadata: fromDto(dtoField.dto)
    };
    metadataFields.push(metadataField);
}

function fromDto(
    dto: Dto | undefined
): Metadata | undefined {
    if (dto == null) {
        return undefined;
    }
    const metadataFields: Array<MetadataField> = [];
    for (const field of dto.fields) {
        collectMetadataField(undefined, field, metadataFields);
    }
    return {
        fields: metadataFields
    };
}

function fullPath(
    prefix: string | undefined,
    path: Path | undefined
): string | undefined {
    if (typeof path === "string") {
        return prefix != null ? `${prefix}/${path}` : path;
    }
    if (Array.isArray(path)) {
        return prefix != null ? `${prefix}/${path.join("/")}` : path.join("/");
    }
    return undefined;
}

class AtMostOneSet<E> implements ReadonlySetLike<E> {

    constructor(
        private readonly _element: E | undefined
    ) {}

    *[Symbol.iterator](): Iterator<E> {
        if (this._element != null) {
            yield this._element;
        }
    }

    has(element: E): boolean {
        return this._element === element;
    }

    get size(): number {
        return this._element != null ? 1 : 0;
    }
}

export function belongTo(
    iterable1: Iterable<MetadataField>,
    iterable2: Iterable<MetadataField>
): boolean {
    for (const field1 of iterable1) {
        if (field1.fullPaths.size === 0) {
            continue;
        }
        let matched = false;
        __outer_loop__: for (const field2 of iterable2) {
            if (field1.prop === field2.prop) {
                for (const fullPath1 of field1.fullPaths) {
                    if (field2.fullPaths.has(fullPath1)) {
                        if (field1.subMetadata == null || belongTo(field1.subMetadata.fields, field2.subMetadata!.fields)) {
                            matched = true;
                            break __outer_loop__;
                        }
                    }
                }
            }
        }
        if (!matched) {
            return false;
        }
    }
    return true;
}
