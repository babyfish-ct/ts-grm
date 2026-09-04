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
import { AbstractEntityTable } from "./entity_table";
import { Predicate } from "@/dsl/expression";
import { StandardSchemaV1 } from "@standard-schema/spec";
import { OrderNullsType } from "@/schema/order";
import { AssociatedKeysFormulaProp, Dto, DtoField, FetchProp, InverseFetchProp, SqlFormulaProp, TsFormulaProp } from "./dto";
import { EntityPropOrder, toEntityPropOrders } from "./entity_prop_order";
import { ReferenceFetchType } from "@/schema/dto/api";
import { __TsFormulaMappingOptions } from "@/schema/dto/formula";
import { AbstractDtoContext, createDto, DtoContextFlags, finalPath, newDtoContext } from "./dto_context";
import { acceptsNullOrUndefined } from "./util";

export interface AbstractDtoMapping {

    readonly __mappingType: string;

    toFields(
        downcastTo: Entity | undefined
    ): DtoField | ReadonlyArray<DtoField>;
}

export type DtoBody = (ctx: AbstractDtoContext) => ReadonlyArray<AbstractDtoMapping>;

export type Filter = (table: AbstractEntityTable) => Predicate | undefined;

export class AllScalarsMapping implements AbstractDtoMapping {

    readonly __mappingType = 'ALL_SCALARS';

    private _props: ReadonlyArray<EntityProp> | undefined = undefined;

    constructor(
        private readonly _context: AbstractDtoContext,
        private readonly _excludedKeys: ReadonlyArray<string> | undefined
    ) {
        if (_context.declaredOnly) {
            throw new StateError(`"$allScalars" cannot be used in the scope of "$instanceOf"`);
        }
    }

    get props(): ReadonlyArray<EntityProp> {
        let props = this._props;
        if (props == null) {
            const allProps = Array.from(
                this._context!.$embeddedProp?.props?.values() 
                    ?? this._context!.$entity.allPropMap.values()
            );
            const ex = ExcludingContext.of(this._excludedKeys);
            this._props = props = allProps.filter(p => 
                p.referenceProp == null 
                && (p.scalarType != null || p.props != null) 
                && (ex == null || !ex.isMatched(p))
            );
        }
        return props;
    }

    exclude(
        ...keys: ReadonlyArray<string>
    ): AllScalarsMapping {
        return new AllScalarsMapping(this._context, keys);
    }

    toFields(
        downcastTo: Entity | undefined
    ): ReadonlyArray<DtoField> {
        const fields: Array<DtoField> = [];
        for (const prop of this.props) {
            fields.push(this._toField(prop, downcastTo));
        }
        return fields;
    }

    private _toField(
        prop: EntityProp,
        downcastTo: Entity | undefined
    ): DtoField {
        return {
            path: finalPath(prop.name),
            downcastTo,
            prop,
            bridgeProp: undefined,
            dto: this._toDto(prop),
            fetchType: undefined,
            predicateFn: undefined,
            orders: undefined,
            limit: undefined,
            recursiveDepth: undefined,
            nullable: prop.nullable,
            parameter: undefined,
            mapperFn: undefined
        };
    }

    private _toDto(prop: EntityProp): Dto | undefined {
        if (prop.props == null) {
            return undefined;
        }
        const fields = Array.from(prop.props.values()).map(p => this._toField(p, undefined));
        return {
            entity: this._context.$entity,
            fields
        }
    }
}

class ExcludingContext {

    private readonly _key: string | undefined

    private readonly _keys: Set<string> | undefined;

    private constructor(keys: string | ReadonlyArray<string>) {
        if (typeof keys === "string") {
            this._key = keys;
        } else if (keys.length == 1) {
            this._key = keys[0]!;
        } else {
            this._keys = new Set<string>(keys);
        }
    }

    static of(
        keys: string | ReadonlyArray<string> | undefined
    ): ExcludingContext | undefined {
        if (keys == null) {
            return undefined;
        }
        if (Array.isArray(keys) && keys.length === 0) {
            return undefined;
        }
        return new ExcludingContext(keys);
    }

    isMatched(prop: EntityProp): boolean {
        return this._keys != null
            ? this._keys.has(prop.name)
            : this._key === prop.name;
    }
}

export class FoldMapping implements AbstractDtoMapping {

    readonly __mappingType = 'FOLD';

    constructor(
        private readonly _context: AbstractDtoContext,
        private readonly _name: string,
        private readonly _body: DtoBody
    ) {}

    toFields(
        downcastTo: Entity | undefined
    ): ReadonlyArray<DtoField> {
        const dto = createDto(
            this._context,
            downcastTo,
            this._body,
            this._name
        )
        return dto.fields;
    }
}

export class FlatMapping implements AbstractDtoMapping {

    readonly __mappingType = 'FLAT';

    constructor(
        readonly _prop: EntityProp,
        private readonly _prefix: string,
        private readonly _context: AbstractDtoContext,
        private readonly _body: DtoBody,
        private readonly _filter: Filter | undefined,
        private readonly _fetchType: ReferenceFetchType,
        private readonly _ref: boolean
    ) {}
    
    static of(prop: EntityProp) {
        if (prop.associationType != "ONE_TO_ONE" && prop.associationType != "MANY_TO_ONE" && prop.props == null) {
            throw new ArgumentError(`The flated prop ${prop.toString()} is neither reference nor embedded`);
        }
        const context = prop.targetEntity != null
            ? newDtoContext(prop.targetEntity, DtoContextFlags.None)
            : newDtoContext(prop, DtoContextFlags.None);
        return new FlatMapping(
            prop,
            prop.name,
            context,
            c => [c.$allScalars],
            undefined,
            "LOAD",
            false
        );
    }

    static refOf(
        prop: EntityProp,
        body: DtoBody
    ) {
        const context = prop.targetEntity != null
            ? newDtoContext(prop.targetEntity, DtoContextFlags.Input)
            : newDtoContext(prop, DtoContextFlags.Input);
        return new FlatMapping(
            prop,
            prop.name,
            context,
            body,
            undefined,
            "LOAD",
            true
        );
    }

    prefix(prefix: string): FlatMapping {
        return new FlatMapping(this._prop, prefix, this._context, this._body, this._filter, this._fetchType, this._ref);
    }

    with(body: DtoBody): FlatMapping {
        return new FlatMapping(this._prop, this._prefix, this._context, body, this._filter, this._fetchType, this._ref);
    }

    filter(filter: Filter): FlatMapping {
        if (this._prop.targetEntity == null) {
            throw new StateError(`The flat mapping based on "${this._prop.toString()}" which is not reference does not support "filter"`);
        }
        return new FlatMapping(this._prop, this._prefix, this._context, this._body, filter, this._fetchType, this._ref);
    }

    fetch(fetchType: ReferenceFetchType): FlatMapping {
        if (this._prop.targetEntity == null) {
            throw new StateError(`The flat mapping based on "${this._prop.toString()}" which is not reference does not support "fetch"`);
        }
        return new FlatMapping(this._prop, this._prefix, this._context, this._body, this._filter, fetchType, this._ref);
    }

    toFields(
        downcastTo: Entity | undefined
    ): DtoField | ReadonlyArray<DtoField> {
        const ctx = newDtoContext(
            this._prop.props != null ? this._prop : this._prop.targetEntity!, 
            DtoContextFlags.None
        );
        const dto = createDto(
            ctx, 
            downcastTo,
            this._body,
            {
                prefix: this._prefix,
                reference: this._prop.targetEntity != null,
                nullable: this._prop.nullable || this._filter != null
            }
        );
        if (this._prop.props != null) {
            return dto.fields;
        }
        return {
            path: undefined,
            downcastTo,
            prop: this._prop,
            bridgeProp: undefined,
            dto,
            fetchType: this._fetchType,
            predicateFn: this._filter,
            orders: undefined,
            limit: undefined,
            recursiveDepth: undefined,
            nullable: this._prop.nullable,
            parameter: undefined,
            mapperFn: undefined
        };
    }
}

export class InstanceOfMapping implements AbstractDtoMapping {

    readonly __mappingType = "INSTANCE_OF";

    constructor(
        private readonly _downcastTo: Entity,
        private readonly _body: DtoBody
    ) {}

    toFields(
        _: Entity | undefined
    ): ReadonlyArray<DtoField> {
        const ctx = newDtoContext(this._downcastTo, DtoContextFlags.DeclaredOnly);
        const dto = createDto(
            ctx,
            this._downcastTo,
            this._body
        )
        return dto.fields;
    }
}

export class RecursiveMapping implements AbstractDtoMapping {

    readonly __mappingType = "RECURSIVE";

    constructor(
        readonly prop: EntityProp,
        private readonly _alias: string,
        private readonly _filter: Filter | undefined,
        private readonly _orders: ReadonlyArray<EntityPropOrder> | undefined,
        private readonly _maxRows: number | undefined,
        private readonly _depth: number
    ) {}

    static of(prop: EntityProp): RecursiveMapping {
        return new RecursiveMapping(
            prop,
            prop.name,
            undefined,
            undefined,
            undefined,
            -1
        );
    }

    as(alias: string): RecursiveMapping {
        return new RecursiveMapping(
            this.prop,
            alias,
            this._filter,
            this._orders,
            this._maxRows,
            this._depth
        );
    }

    filter(filter: Filter): RecursiveMapping {
        return new RecursiveMapping(
            this.prop,
            this._alias,
            filter,
            this._orders,
            this._maxRows,
            this._depth
        );
    }

    sort(
        ...orders: ReadonlyArray<string | {
            readonly path: string;
            readonly desc: boolean;
            readonly nulls: OrderNullsType;
        }>
    ): RecursiveMapping {
        const associationType = this.prop.associationType;
        if (associationType != "ONE_TO_MANY" && associationType != "MANY_TO_MANY") {
            throw new StateError(
                `The "sort" operation is not supported because the current property "${
                    this.prop
                }" is not collection`
            );
        }
        return new RecursiveMapping(
            this.prop,
            this._alias,
            this._filter,
            toEntityPropOrders(this.prop.targetEntity!, orders),
            this._maxRows,
            this._depth
        );
    }

    limit(maxRows: number): RecursiveMapping {
        const associationType = this.prop.associationType;
        if (associationType != "ONE_TO_MANY" && associationType != "MANY_TO_MANY") {
            throw new StateError(
                `The "limit" operation is not supported because the current property "${
                    this.prop
                }" is not collection`
            );
        }
        return new RecursiveMapping(
            this.prop,
            this._alias,
            this._filter,
            this._orders,
            maxRows,
            this._depth
        );
    }

    depth(depth: number): RecursiveMapping {
        if (depth < 1) {
            throw new ArgumentError(`The recursive depth must be at least 1`);
        }
        return new RecursiveMapping(
            this.prop,
            this._alias,
            this._filter,
            this._orders,
            this._maxRows,
            depth
        );
    }

    toFields(
        downcastTo: Entity | undefined
    ): DtoField {
        const field: DtoField = {
            path: finalPath(this._alias),
            downcastTo: downcastTo,
            prop: this.prop,
            bridgeProp: undefined,
            dto: undefined,
            fetchType: undefined,
            predicateFn: this._filter,
            orders: this._orders ?? this.prop.orders,
            limit: this._maxRows,
            recursiveDepth: this._depth,
            nullable: this.prop.nullable,
            parameter: undefined,
            mapperFn: undefined
        };
        return field;
    }
}

export class ScalarLikeMapping implements AbstractDtoMapping {

    readonly __mappingType = "SCALAR_LIKE";

    constructor(
        private readonly _prop: FetchProp,
        private readonly _alias: string,
        readonly _parameter: any,
        readonly _output: ScalarLikeMapper | undefined,
        readonly _input: ScalarLikeMapper | undefined
    ) {}

    as(alias: string): ScalarLikeMapping {
        return new ScalarLikeMapping(
            this._prop,
            alias,
            this._output,
            this._input,
            this._parameter
        );
    }

    mapOutput(
        schema: StandardSchemaV1, 
        fn: (value: any) => any
    ): ScalarLikeMapping {
        return new ScalarLikeMapping(
            this._prop,
            this._alias,
            this._parameter,
            { schema, fn },
            undefined
        );
    }

    mapInput(
        schema: StandardSchemaV1, 
        fn: (value: any) => any
    ): ScalarLikeMapping {
        return new ScalarLikeMapping(
            this._prop,
            this._alias,
            this._parameter,
            undefined,
            { schema, fn }
        );
    }

    toFields(
        downcastTo: Entity | undefined
    ): DtoField | ReadonlyArray<DtoField> {
        return {
            path: finalPath(this._alias),
            downcastTo,
            prop: this._prop,
            bridgeProp: undefined,
            dto: undefined,
            fetchType: undefined,
            predicateFn: undefined,
            orders: undefined,
            limit: undefined,
            recursiveDepth: undefined,
            nullable: 
                this._prop instanceof EntityProp
                    ? this._prop.nullable
                : this._prop instanceof TsFormulaProp
                    ? acceptsNullOrUndefined(this._prop.formula.valueType)
                : this._prop instanceof SqlFormulaProp
                    ? acceptsNullOrUndefined(this._prop.formula.valueType)
                : false,
            parameter: this._parameter,
            mapperFn: this._output?.fn
        };
    }
}

export interface ScalarLikeMapper {
    readonly schema: StandardSchemaV1;
    readonly fn: MapperFn;
}

export type MapperFn = (value: any) => any;

export class EmbeddedMapping implements AbstractDtoMapping {

    readonly __mappingType = "EMBEDDED";

    constructor(
        private readonly _prop: EntityProp,
        private readonly _alias: string,
        private readonly _body: DtoBody
    ) {}

    as(alias: string): EmbeddedMapping {
        return new EmbeddedMapping(
            this._prop,
            alias,
            this._body
        );
    }

    with(body: DtoBody): EmbeddedMapping {
        return new EmbeddedMapping(
            this._prop,
            this._alias,
            body
        );
    }

    toFields(
        downcastTo: Entity | undefined
    ): DtoField | ReadonlyArray<DtoField> {
        const ctx = newDtoContext(this._prop, DtoContextFlags.None);
        const dto = createDto(ctx, downcastTo, this._body);
        return {
            path: finalPath(this._alias),
            downcastTo,
            prop: this._prop,
            bridgeProp: undefined,
            dto,
            fetchType: undefined,
            predicateFn: undefined,
            orders: undefined,
            limit: undefined,
            recursiveDepth: undefined,
            nullable: this._prop.nullable,
            parameter: undefined,
            mapperFn: undefined
        };
    }
}

export abstract class AssociationMapping implements AbstractDtoMapping {

    abstract readonly __mappingType: string;

    protected constructor(
        protected readonly _prop: EntityProp,
        protected readonly _alias: string,
        protected readonly _body: DtoBody,
        protected readonly _filter: Filter | undefined,
        protected readonly _ref: boolean
    ) {
    }

    protected get _directProp(): FetchProp {
        const middleEntity = this._prop.middleEntity;
        return middleEntity != null
            ? InverseFetchProp.of(middleEntity.joinThisProp)
            : this._prop;
    }

    protected get _bridgeProp(): EntityProp | undefined {
        return this._prop.middleEntity != null
            ? this._prop
            : undefined;
    }

    protected _createChildDto(
        _: Entity | undefined
    ): Dto {
        const middleEntity = this._prop.middleEntity;
        const ctx = middleEntity != null 
            ? newDtoContext(middleEntity.entity!, DtoContextFlags.None)
            : newDtoContext(this._prop.targetEntity!, DtoContextFlags.None);
        const body = middleEntity != null
            ? (c: AbstractDtoContext) => {
                const flat = c.$flat(middleEntity.joinTargetProp.name)
                    .prefix("")
                    .fetch("JOIN_LOW_OFFSET_ONLY")
                    .with(this._body);
                return this._filter == null 
                    ? [flat]
                    : [flat.filter(this._filter)];
            }
            : this._body;
        return createDto(ctx, undefined, body);
    }

    abstract toFields(
        downcastTo: Entity | undefined
    ): DtoField;
}

export class ReferenceMapping extends AssociationMapping {

    readonly __mappingType = "REFERENCE";

    private constructor(
        _prop: EntityProp,
        _alias: string,
        _body: DtoBody,
        _filter: Filter | undefined,
        _ref: boolean,
        private readonly _fetchType: ReferenceFetchType
    ) {
        super(_prop, _alias, _body, _filter, _ref);
    }

    static of(
        prop: EntityProp
    ) {
        return new ReferenceMapping(
            prop, 
            prop.name, 
            c => [c.$allScalars], 
            undefined, 
            false, 
            "LOAD"
        );
    }

    static refOf(
        prop: EntityProp,
        body: DtoBody
    ) {
        return new ReferenceMapping(
            prop, 
            prop.name, 
            body, 
            undefined, 
            true, 
            "LOAD"
        );
    }

    as(alias: string): ReferenceMapping {
        return new ReferenceMapping(
            this._prop,
            alias,
            this._body,
            this._filter,
            this._ref,
            this._fetchType
        );
    }

    with(body: DtoBody): ReferenceMapping {
        return new ReferenceMapping(
            this._prop,
            this._alias,
            body,
            this._filter,
            this._ref,
            this._fetchType
        );
    }

    filter(filter: Filter): ReferenceMapping {
        return new ReferenceMapping(
            this._prop,
            this._alias,
            this._body,
            filter,
            this._ref,
            this._fetchType
        );
    }

    fetch(fetchType: ReferenceFetchType): ReferenceMapping {
        return new ReferenceMapping(
            this._prop,
            this._alias,
            this._body,
            this._filter,
            this._ref,
            fetchType
        );
    }

    toFields(
        downcastTo: Entity | undefined
    ): DtoField {
        const dto = this._createChildDto(downcastTo);
        return {
            path: finalPath(this._alias),
            downcastTo,
            prop: this._directProp,
            bridgeProp: this._bridgeProp,
            dto,
            fetchType: this._fetchType,
            predicateFn: this._filter,
            orders: undefined,
            limit: undefined,
            recursiveDepth: undefined,
            nullable: this._prop.nullable,
            parameter: undefined,
            mapperFn: undefined
        };
    }
}

export class CollectionMapping extends AssociationMapping {

    readonly __mappingType = "COLLECTION";

    private constructor(
        _prop: EntityProp,
        _alias: string,
        _body: DtoBody,
        _filter: Filter | undefined,
        _ref: boolean,
        private readonly _orders: ReadonlyArray<EntityPropOrder> | undefined,
        private readonly _maxRows: number | undefined
    ) {
        super(_prop, _alias, _body, _filter, _ref);
    }

    static of(
        prop: EntityProp
    ) {
        return new CollectionMapping(
            prop, 
            prop.name, 
            c => [c.$allScalars], 
            undefined, 
            false, 
            undefined, 
            undefined
        );
    }

    static refOf(
        prop: EntityProp,
        body: DtoBody
    ) {
        return new CollectionMapping(
            prop, 
            prop.name, 
            body, 
            undefined, 
            true, 
            undefined, 
            undefined
        );
    }

    as(alias: string): CollectionMapping {
        return new CollectionMapping(
            this._prop,
            alias,
            this._body,
            this._filter,
            this._ref,
            this._orders,
            this._maxRows
        );
    }

    with(body: DtoBody): CollectionMapping {
        return new CollectionMapping(
            this._prop,
            this._alias,
            body,
            this._filter,
            this._ref,
            this._orders,
            this._maxRows
        );
    }

    filter(filter: Filter): CollectionMapping {
        return new CollectionMapping(
            this._prop,
            this._alias,
            this._body,
            filter,
            this._ref,
            this._orders,
            this._maxRows
        );
    }

    sort(
        ...orders: ReadonlyArray<string | {
            readonly path: string;
            readonly desc: boolean;
            readonly nulls: OrderNullsType;
        }>
    ): CollectionMapping {
        const propOrders = toEntityPropOrders(this._prop.targetEntity!, orders);
        return new CollectionMapping(
            this._prop,
            this._alias,
            this._body,
            this._filter,
            this._ref,
            propOrders,
            this._maxRows
        );
    }

    limit(maxRows: number): CollectionMapping {
        if (this._prop.middleEntity != null) {
            throw new StateError(`Cannot set the limit of "${this._prop.toString()}" based on base table`);
        }
        return new CollectionMapping(
            this._prop,
            this._alias,
            this._body,
            this._filter,
            this._ref,
            this._orders,
            maxRows
        );
    }

    toFields(
        downcastTo: Entity | undefined
    ): DtoField {
        const dto = this._createChildDto(downcastTo);
        return {
            path: finalPath(this._alias),
            downcastTo,
            prop: this._directProp,
            bridgeProp: this._bridgeProp,
            dto,
            fetchType: undefined,
            predicateFn: this._filter,
            orders: this._orders ?? this._prop.orders,
            limit: this._maxRows,
            recursiveDepth: undefined,
            nullable: this._prop.nullable,
            parameter: undefined,
            mapperFn: undefined
        };
    }
}

export class ReferenceKeyMapping implements AbstractDtoMapping {

    readonly __mappingType = "COLLECTION";

    constructor(
        private readonly _prop: EntityProp,
        private readonly _alias: string,
        private readonly _body: DtoBody | undefined
    ) {}

    as(alias: string): ReferenceKeyMapping {
        return new ReferenceKeyMapping(this._prop, alias, this._body);
    }

    with(body: DtoBody): ReferenceKeyMapping {
        if (this._prop.props == null) {
            throw new StateError(`Cannot set the body of "${this._prop.toString()}" which is not embedded property`)
        }
        return new ReferenceKeyMapping(this._prop, this._alias, body);
    }

    toFields(
        downcastTo: Entity | undefined
    ): DtoField {
        const dto = 
            this._body != null 
                ? createDto(
                    newDtoContext(this._prop, DtoContextFlags.None), 
                    undefined, 
                    this._body
                ) 
                : undefined;
        return {
            path: finalPath(this._alias),
            downcastTo,
            prop: this._prop,
            bridgeProp: undefined,
            dto,
            fetchType: undefined,
            predicateFn: undefined,
            orders: undefined,
            limit: undefined,
            recursiveDepth: undefined,
            nullable: this._prop.nullable,
            parameter: undefined,
            mapperFn: undefined
        };
    }
}

export class AssociatedKeysMapping implements AbstractDtoMapping {

    readonly __mappingType = "COLLECTION";

    constructor(
        private readonly _prop: EntityProp,
        private readonly _alias: string,
        private readonly _body: DtoBody | undefined
    ) {}

    with(body: DtoBody): AssociatedKeysMapping {
        if (this._prop.targetKeyProp!.props == null) {
            throw new StateError(`Cannot set the body of "${this._prop.targetKeyProp!.toString()}" which is not embedded property`)
        }
        return new AssociatedKeysMapping(this._prop, this._alias, body);
    }

    toFields(downcastTo: Entity | undefined): DtoField {
        return {
            path: finalPath(this._alias),
            downcastTo,
            prop: new AssociatedKeysFormulaProp(this._prop.declaringEntity, this._alias, this._prop, this._body),
            bridgeProp: undefined,
            dto: undefined,
            fetchType: undefined,
            predicateFn: undefined,
            orders: undefined,
            limit: undefined,
            recursiveDepth: undefined,
            nullable: this._prop.nullable,
            parameter: undefined,
            mapperFn: undefined
        };
    }
}

export class CalculatedAssociationMapping implements AbstractDtoMapping {

    get __mappingType(): string {
        return CalculatedAssociationMapping._mappingType(this._prop);
    }

    constructor(    
        private readonly _prop: EntityProp,
        private readonly _alias: string,
        private readonly _parameter: any,
        private readonly _body: any
    ) {}

    static of(prop: EntityProp, parameter: any): CalculatedAssociationMapping {
        const body: DtoBody = c => [c.$allScalars];
        return new CalculatedAssociationMapping(
            prop,
            prop.name,
            parameter,
            body
        );
    }

    private static _mappingType(prop: EntityProp): string {
        switch (prop.calculationStrategy?.kind) {
            case "REFERENCE":
            case "PARAMETERIZED_REFERENCE":
                return "CALCULATED_REFERENCE";
            case "COLLECTION":
            case "PARAMETERIZED_COLLECTION":
                return "CALCULATED_COLLECTION";
            default:
                throw new ArgumentError(`Illegal calculation stratey: ${prop.calculationStrategy?.kind}`);
        }
    }

    as(alias: string): CalculatedAssociationMapping {
        return new CalculatedAssociationMapping(
            this._prop,
            alias,
            this._parameter,
            this._body
        );
    }

    with(body: DtoBody): CalculatedAssociationMapping {
        return new CalculatedAssociationMapping(
            this._prop,
            this._alias,
            this._parameter,
            body
        );
    }

    toFields(
        downcastTo: Entity | undefined
    ): DtoField {
        const ctx = newDtoContext(this._prop.targetEntity!, DtoContextFlags.None);
        const dto = createDto(ctx, undefined, this._body);
        const field: DtoField = {
            path: finalPath(this._alias),
            downcastTo,
            prop: this._prop,
            bridgeProp: undefined,
            dto,
            fetchType: undefined,
            predicateFn: undefined,
            orders: undefined,
            limit: undefined,
            recursiveDepth: undefined,
            nullable: this._prop.nullable,
            parameter: this._parameter,
            mapperFn: undefined
        };
        return field;
    }
}