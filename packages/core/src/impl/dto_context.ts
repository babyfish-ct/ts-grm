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

import { Entity } from "./entity";
import { EntityProp } from "./entity_prop";
import { ArgumentError, StateError } from "@/error/common";
import { CodeWriter } from "./code_writer";
import { Dto, DtoField, SqlFormulaProp, TsFormulaProp, TypeNameProp } from "./dto";
import { capitalize } from "./util";
import { Path } from "./dto_mapper";
import { AnyModel } from "@/schema/model";
import { __SqlFormulaMappingOptions, __TsFormulaMappingOptions } from "@/schema/dto/formula";
import { 
    AbstractDtoMapping, 
    AllScalarsMapping, 
    AssociatedKeysMapping, 
    CalculatedAssociationMapping, 
    CollectionMapping, 
    DtoBody, 
    EmbeddedMapping, 
    FlatMapping, 
    FoldMapping, 
    InstanceOfMapping, 
    RecursiveMapping, 
    ReferenceKeyMapping, 
    ReferenceMapping, 
    ScalarLikeMapping 
} from "./dto_mapping";
import { SqlFormula, TsFormula } from "@/schema/computed";
import { dto } from "@/schema/dto/api";

export function newDtoContext(
    source: Entity |  EntityProp,
    declaredOnly: boolean
): AbstractDtoContext {
    const ctor = dtoContextCtor(source, declaredOnly);
    return new ctor(source, declaredOnly);
}

type DtoContextCtor = new(
    source: Entity | EntityProp,
    declaredOnly: boolean
) => AbstractDtoContext;

const dtoContextCtorMap = new Map<string, DtoContextCtor>();

function dtoContextCtor(
    source: Entity |  EntityProp,
    declaredOnly: boolean
): DtoContextCtor {
    const name = source instanceof Entity
        ? source.name
        : source.toString();
    const key = declaredOnly ? `declaredOnly(${name})` : name;
    let ctor = dtoContextCtorMap.get(key);
    if (ctor == null) {
        ctor = createDtoContextCtor(source, declaredOnly);
        dtoContextCtorMap.set(key, ctor);
    }
    return ctor;
}

export class AbstractDtoContext {

    private _allScalarsMapping: AllScalarsMapping | undefined = undefined;

    readonly $entity: Entity;

    readonly $embeddedProp: EntityProp | undefined;

    readonly $formula: FormulaCreator;

    constructor(
        source: Entity |  EntityProp,
        readonly declaredOnly: boolean,
    ) {
        if (source instanceof EntityProp) {
            this.$entity = source.declaringEntity;
            this.$embeddedProp = source;
        } else {
            this.$entity = source;
            this.$embeddedProp = undefined;
        }
        this.$formula = new FormulaCreator(this.$entity);
    }

    get $allScalars(): AllScalarsMapping {
        let mapping = this._allScalarsMapping;
        if (mapping == null) {
            this._allScalarsMapping = mapping = new AllScalarsMapping(this, undefined);
        }
        return mapping;
    }

    $fold(name: string, body: DtoBody): FoldMapping {
        return new FoldMapping(this, name, body);
    }

    $flat(key: string): FlatMapping {
        const prop = this._prop(key);
        return FlatMapping.of(prop);
    }

    $associatedKeys(key: string, alias: string): AssociatedKeysMapping {
        const prop = this._prop(key);
        return new AssociatedKeysMapping(
            prop, 
            alias, 
            prop.targetKeyProp!.props != null
                ? c => [c.$allScalars]
                : undefined
        );
    }

    $instanceOf(model: AnyModel, body: DtoBody): InstanceOfMapping {
        const downcastTo = Entity.of(model);
        if (!this.$entity.isAssignableFrom(downcastTo)) {
            throw new ArgumentError(`The argument "${downcastTo.name}" is not derived model of "${this.$entity.name}"`);
        }
        return new InstanceOfMapping(downcastTo, body);
    }

    $recursive(key: string): RecursiveMapping {
        const prop = this._prop(key);
        if (!prop.isRecursive) {
            throw new ArgumentError(`The property ${prop.toString()} is not recursive`);
        }
        return RecursiveMapping.of(prop);
    }

    $parameterized(key: string, parameter: any): AbstractDtoMapping {
        const prop = this._prop(key);
        switch (prop.calculationStrategy?.kind) {
            case "PARAMETERIZED_VALUE":
                return new ScalarLikeMapping(prop, prop.name, parameter, undefined, undefined);
            case "PARAMETERIZED_REFERENCE":
            case "PARAMETERIZED_COLLECTION":
                return CalculatedAssociationMapping.of(prop, parameter);
                break;
            default:
                throw new ArgumentError(`The property "${prop.toString()}" is not parameterized property`);
        }
    }

    private _prop(key: string): EntityProp {
        if (this.$embeddedProp != null) {
            const prop = this.$embeddedProp.props!.get(key);
            if (prop == null) {
                throw new ArgumentError(`The is not property "${key}" in the embedded property "${this.$embeddedProp.toString()}"`);
            }
            return prop;
        }
        if (this.declaredOnly) {
            const prop = this.$entity.declaredPropMap.get(key);
            if (prop == null) {
                throw new ArgumentError(`There is no directly(ingnore inherited properties) property "${key}" in the entity "${this.$entity.name}"`);
            }
            return prop;
        }
        const prop = this.$entity.allPropMap.get(key);
        if (prop == null) {
            throw new ArgumentError(`There is no property "${key}" in the entity "${this.$entity.name}"`);
        }
        return prop;
    }
}

function createDtoContextCtor(
    source: Entity |  EntityProp,
    declaredOnly: boolean
): DtoContextCtor {
    if (declaredOnly && source instanceof EntityProp) {
        throw new ArgumentError("declaredOnly must be false when source is property");
    }
    const superCtor = !declaredOnly 
        && source instanceof Entity
        && source.superEntity
        ? dtoContextCtor(source.superEntity, false)
        : AbstractDtoContext
    return new DtoContextCtorCreator(source, superCtor).create();
}

class DtoContextCtorCreator {

    constructor(
        private readonly _source: Entity |  EntityProp,
        private readonly _superCtor: DtoContextCtor | undefined
    ) {}

    create(): DtoContextCtor {
        const writer = new CodeWriter();
        writer.code("return class ThisClass extends $baseClass").code(" ");
        writer.scope("CURLY_BRACKETS", () => {
            this._writeStaticFields(writer);
            this._writeConstructor(writer);
            this._writeProps(writer);
        });
        return new Function(
            "$baseClass", 
            "$source", 
            "$scalarLikeMapping",
            "$embeddedMapping",
            "$referenceMapping",
            "$collectionMapping",
            "$referenceKeyMapping",
            "$calculatedAssociationMapping",
            writer.toString()
        )(
            this._superCtor, 
            this._source,
            ScalarLikeMapping,
            EmbeddedMapping,
            ReferenceMapping,
            CollectionMapping,
            ReferenceKeyMapping,
            CalculatedAssociationMapping
        );
    }

    private _writeStaticFields(writer: CodeWriter) {
        if (this._source instanceof Entity) {
            for (const prop of this._source.declaredPropMap.values()) {
                if (this._isVisibleProp(prop)) {
                    writer
                        .code(`static ${this._propName(prop)} = $source.allPropMap.get("${prop.name}")`)
                        .newLine(";");
                }
            }
        } else {
            for (const prop of this._source.props!.values()) {
                writer
                    .code(`static ${this._propName(prop)} = $source.props.get("${prop.name}")`)
                    .newLine(";");
            }
        }
    }

    private _propName(prop: EntityProp): string {
        return `_${prop.name}`;
    }

    private _writeConstructor(writer: CodeWriter) {
        const declaredOnly = this._source instanceof Entity
            ? this._source.superEntity != null && this._superCtor == null
            : false;
        writer.code("constructor(newSource) ").scope("CURLY_BRACKETS", () => {
            writer.code(`super(newSource ?? $source, ${declaredOnly})`).newLine(";");
        }).newLine();
    }

    private _writeProps(writer: CodeWriter) {
        if (this._source instanceof Entity) {
            for (const prop of this._source.declaredPropMap.values()) {
                if (this._isVisibleProp(prop)) {
                    this._writeProp(prop, writer);
                }
            }
        } else {
            for (const prop of this._source.props!.values()) {
                this._writeProp(prop, writer);
            }
        }
    }

    private _writeProp(prop: EntityProp, writer: CodeWriter) {
        writer.code("get ").code(prop.name).code("() ").scope("CURLY_BRACKETS", () => {
            if (prop.referenceProp != null) {
                if (prop.props != null) {
                    writer 
                        .code(
                            `return new $referenceKeyMapping(ThisClass.${
                                this._propName(prop)
                            }, "${
                                prop.name
                            }", c => [c.$allScalars])`
                        )
                        .newLine(";");
                } else {
                        writer 
                        .code(
                            `return new $referenceKeyMapping(ThisClass.${
                                this._propName(prop)
                            }, "${
                                prop.name
                            }", undefined)`
                        )
                        .newLine(";");
                }
            } else if (prop.scalarType != null || prop.isFormula) {
                writer
                    .code(
                        `return new $scalarLikeMapping(ThisClass.${
                            this._propName(prop)
                        }, "${
                            prop.name
                        }", undefined, undefined, undefined)`
                    )
                    .newLine(";");
            } else if (prop.props != null) {
                writer 
                    .code(
                        `return new $embeddedMapping(ThisClass.${
                            this._propName(prop)
                        }, "${
                            prop.name
                        }", c => [c.$allScalars])`
                    )
                    .newLine(";");
            } else if (prop.associationType === "ONE_TO_ONE" || prop.associationType === "MANY_TO_ONE") {
                writer 
                    .code(
                        `return new $referenceMapping(ThisClass.${
                            this._propName(prop)
                        }, "${
                            prop.name
                        }", c => [c.$allScalars], undefined, undefined)`
                    )
                    .newLine(";");
            } else if (prop.associationType === "ONE_TO_MANY" || prop.associationType === "MANY_TO_MANY") {
                writer 
                    .code(
                        `return new $collectionMapping(ThisClass.${
                            this._propName(prop)
                        }, "${
                            prop.name
                        }", c => [c.$allScalars], undefined, undefined, undefined)`
                    )
                    .newLine(";");
            } else if (prop.calculationStrategy != null) {
                switch (prop.calculationStrategy.kind) {
                    case "VALUE":
                        writer
                            .code(
                                `return new $scalarLikeMapping(ThisClass.${
                                    this._propName(prop)
                                }, "${
                                    prop.name
                                }", undefined, undefined, undefined)`
                            )
                            .newLine(";");
                            break;
                    case "REFERENCE":
                        writer
                            .code(
                                `return $calculatedAssociationMapping.of(ThisClass.${
                                    this._propName(prop)
                                }, undefined)`
                            )
                            .newLine(";");
                            break;
                    case "COLLECTION":
                        writer
                            .code(
                                `return $calculatedAssociationMapping.of(ThisClass.${
                                    this._propName(prop)
                                }, undefined)`
                            )
                            .newLine(";");
                            break;
                }
            }
        }).newLine();
    }

    private _isVisibleProp(prop: EntityProp): boolean {
        switch (prop.calculationStrategy?.kind) {
            case "PARAMETERIZED_VALUE":
            case "PARAMETERIZED_REFERENCE":
            case "PARAMETERIZED_COLLECTION":
                return false;
            default:
                return true;
        }
    }
}

class PathContext {

    constructor(
        readonly parent: PathContext | undefined,
        readonly op: PathOp | undefined
    ) {}

    finalPath(path: Path | undefined): Path | undefined {
        if (path == null || this.op == null) {
            return path;
        }
        const arr = typeof path === "string"
                ? [path]
                : [...path];
        for (let ctx: PathContext | undefined = this; ctx != null && ctx.op != null; ctx = ctx.parent) {
            const index = arr.findIndex(name => name !== "..");
            const op = ctx.op;
            if (typeof op === "string") {
                arr.splice(index, 0, op);
            } else {
                const prefix = op.prefix;
                if (prefix !== "") {
                    arr[index] = `${prefix}${capitalize(arr[index]!)}`;
                }
                if (op.reference) {
                    arr.splice(index, 0, "..");
                }
            }
        }
        if (arr.length === 1) {
            return arr[0]!;
        }
        return arr;
    }
}

let currentPathContext: PathContext | undefined = undefined;

export function createDto(
    ctx: AbstractDtoContext,
    downloadTo: Entity | undefined,
    body: any,
    op?: PathOp
): Dto {
    currentPathContext = new PathContext(currentPathContext, op);
    try {
        const mappings = body(ctx);
        const factory = new DtoFactory(ctx.$entity, downloadTo);
        for (const mapping of mappings) {
            factory.addMapping(mapping as AbstractDtoMapping);
        }
        return factory.create();
    } finally {
        currentPathContext = currentPathContext.parent;
    }
}

export function finalPath(
    path: Path | undefined
): Path | undefined {
    return currentPathContext?.finalPath(path);
}

export class DtoFactory {

    private readonly _fields: Array<DtoField> = [];

    constructor(
        private readonly _source: Entity | EntityProp,
        private readonly _downcastTo: Entity | undefined
    ) {}

    addMapping(mapping: AbstractDtoMapping) {
        if (mapping instanceof InstanceOfMapping) {
            this._addTypeName();
        } else if (mapping instanceof RecursiveMapping) {
            for (const field of this._fields) {
                if (field.prop === mapping.prop) {
                    throw new StateError(
                        `Cannot fetch the property ${mapping.prop.toString()} recursively 
                        because annother dto field fetches the association unrecursively`
                    );
                }
            }
        }
        const fields = mapping.toFields(this._downcastTo);
        if (Array.isArray(fields)) {
            this._fields.push(...fields);
        } else {
            this._fields.push(fields as DtoField);
        }
    }

    create(): Dto {  
        return {
            entity: this._source instanceof Entity
                ? this._source
                : this._source.rootProp.declaringEntity,
            fields: this._fields
        };
    }

    private _addTypeName() {
        if (!(this._source instanceof Entity)) {
            throw new StateError("Only entity dto accept the typename");
        }
        for (const field of this._fields) {
            if (field.prop instanceof TypeNameProp) {
                return;
            }
        }
        const entity = this._source;
        const field: DtoField = {
            path: currentPathContext!.finalPath("__typename"),
            downcastTo: undefined,
            prop: new TypeNameProp(
                entity,
                entity.tableSettings.discriminator?.name,
                entity.tableSettings.discriminator == null ? entity.name : undefined
            ),
            bridgeProp: undefined,
            dto: undefined,
            fetchType: undefined,
            predicateFn: undefined,
            orders: undefined,
            limit: undefined,
            recursiveDepth: undefined,
            nullable: false,
            parameter: undefined,
            mapperFn: undefined
        };
        this._fields.push(field);
    }
}

type PathOp = 
    string | {
        readonly prefix: string;
        readonly nullable: boolean;
        readonly reference: boolean;
    };

class FormulaCreator {

    constructor(
        private readonly _entity: Entity
    ) {
    }

    ts(
        options: __TsFormulaMappingOptions<any, any, any, any, any, any, any> 
    ): ScalarLikeMapping {
        const formula = TsFormula.of({
            valueType: options.valueType,
            dependency: () => dto.view(this._entity.model, c => options.dependency(c)),
            fn: options.fn
        });
        return new ScalarLikeMapping(
            new TsFormulaProp(this._entity, options.alias, formula),
            options.alias,
            undefined,
            undefined,
            undefined
        );
    }

    sql(
        options: __SqlFormulaMappingOptions<any, any, any>
    ): ScalarLikeMapping {
        const formula = SqlFormula.of({
            valueType: options.valueType,
            sourceModel: () => this._entity.model,
            fn: options.fn
        });
        return new ScalarLikeMapping(
            new SqlFormulaProp(this._entity, options.alias, formula),
            options.alias,
            undefined,
            undefined,
            undefined
        );
    }
}