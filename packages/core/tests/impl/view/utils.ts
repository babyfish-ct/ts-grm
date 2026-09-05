import { DataReader } from "@/impl/data_reader";
import { DtoMapper } from "@/impl/dto_mapper";
import { buildShape, Shape } from "@/impl/shape";

export function mapperJson(mapper: DtoMapper): any {
    const json = {
        entity: mapper.entity.name,
        associatedProp: mapper.associatedProp?.toString(),
        fields: mapper.fields.map(f => {
            return {
                prop: f.prop.toString(),
                parameter: f.parameter,
                paths: f.paths,
                subMapper: f.subMapper != null
                    ? mapperJson(f.subMapper)
                    : undefined,
                ref: f.ref ? true : undefined,
                key: f.key ? true : undefined,
                recursiveDepth: f.recursiveDepth,
                dependencies: f.dependencies,
                isDependent: f.isDependent ? true : undefined,
                columnIndex: f.columnIndex,
                downcastTo: f.downcastTo?.name
            };
        })
    } as any;
    return removeUndefinedValues(json);
}

function removeUndefinedValues(o: any): any {
    if (typeof o !== "object") {
        return o;
    }
    if (Array.isArray(o)) {
        return o.map(e => removeUndefinedValues(e));
    }
    const proto = Object.getPrototypeOf(o);
    if (proto !== null && proto !== Object.prototype) {
        return o;
    }
    const n = {} as any;
    for (const k in o) {
        const v = removeUndefinedValues(o[k]);
        if (v !== undefined) {
            n[k] = v;
        }
    }
    return n;
}

export function shapeJson(mapper: DtoMapper): any {
    const shape = buildShape(mapper);
    return _shapeJson(shape);
}

function _shapeJson(shape: Shape): any {
    let obj: { [key:string]: any } = {};
    for (const key in shape) {
        if (key === "__implicit") {
            obj[key] = _shapeJson(shape[key] as Shape);
            continue;
        }
        const value = shape[key]!;
        if (value.targetKind === "REFERENCE") {
            obj[key] = { __ref: _shapeJson(value.targetShape!) }; 
            if (value.recursiveDepth != null) {
                obj[key].__recursive = 1;
            }
        } else if (value.targetKind === "COLLECTION") {
            obj[key] = { __array: _shapeJson(value.targetShape!) }; 
            if (value.recursiveDepth != null) {
                obj[key].__recursive = 1;
            }
        } else if (value.targetShape != null) {
            obj[key] = _shapeJson(value.targetShape!);
        } else if (value.columnIndex != null) {
            obj[key] = value.columnIndex;
        } else {
            obj[key] = undefined;
        }
    }
    return obj;
}

export function makeReader(...args: any[]): DataReader {
    return new class implements DataReader {
        get(index: number): any {
            return args[index];
        }
    }
}