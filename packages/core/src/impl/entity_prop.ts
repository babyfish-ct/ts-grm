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

import { __AssociationType, __PropContract } from "@/schema/prop_internal_types";
import { Entity } from "./entity";
import { PropError } from "@/error/metadata_error";
import { AnyModelImpl, ModelImpl } from "./model_impl";
import { dedent, makeErr } from "@/error/util";
import { EntityPropOrder, toEntityPropOrders } from "./entity_prop_order";
import { StateError } from "@/error/common";
import { isIllegal, fixColumn, fixColumnArr, notEmpty, DatabaseStrategy } from "./strategy";
import { Column, Columns, MiddelEntity, MiddleTable, PropStorage, StorageType } from "./storage";
import { ParameterizedTargetCalculator, ParameterizedValueCalculator, SqlFormulaFn, TargetCalculator, TsFormulaFn, ValueCalculator } from "@/schema/computed";
import { CascadeType } from "@/schema/join";
import { AnyModel } from "@/schema/model";
import { CalculationStrategy } from "./calculation_strategy";
import { acceptsNullOrUndefined } from "./util";
import { ScalarProvider, ScalarType } from "@/schema/scalar";
import { View } from "@/schema/dto/api";
import { __ForeignKeyData, __JoinColumnData, __Prop, __PropData } from "@/schema/prop_internal_behavior";
import { MapperFn } from "./dto_mapping";
import { NumericType } from "./numeric";

export class EntityProp {

    readonly nullable: boolean;

    readonly inputNonNull: boolean;

    private _rootProp: EntityProp | undefined = undefined;

    private _scalarType: ScalarType<any> | undefined = undefined;

    private _numericType = NumericType.NONE;

    readonly associationType: __AssociationType | undefined = undefined;

    private _span: number | undefined = undefined;

    private _props: ReadonlyMap<string, EntityProp> | undefined = undefined;

    private _flattenProps: ReadonlyMap<string, EntityProp> | undefined = undefined;

    private _flattenScalarProps: ReadonlyMap<string, EntityProp> | undefined = undefined;

    private _scalarProps: ReadonlyArray<EntityProp> | undefined = undefined;

    private _targetEntity: Entity | undefined = undefined;

    private _orders:  ReadonlyArray<EntityPropOrder> | undefined = undefined;

    private _mappedByProp: EntityProp | undefined = undefined;

    private _oppositeProp: EntityProp | undefined = undefined;

    private _phase = 0;

    private _thisKeyProp: EntityProp | undefined = undefined;

    private _targetKeyProp: EntityProp | undefined = undefined;

    private _referenceKeyProp: EntityProp | undefined = undefined;

    private _referenceProp: EntityProp | undefined = undefined;

    private _storageType: StorageType | undefined = undefined;

    private _baseStorage: PropStorage | null | undefined = undefined;

    private _storageResolver: DatabaseStrategy | undefined = undefined;

    private _storage: PropStorage | undefined = undefined;

    private _override = false;

    private _scalarIndex: number | undefined = undefined;

    private _middleEntity: MiddelEntity | undefined = undefined;

    private _middleEntityResolved = false;

    private _tsFormulaDependencyView: View<AnyModel, any> | undefined = undefined;

    private _tsFormulaDependencies: ReadonlyArray<EntityProp> | undefined = undefined;

    private _tsFormulaWithNullFn: TsFormulaFn<any, any> | undefined = undefined;

    private _tsFormulaWithUndefinedFn: TsFormulaFn<any, any> | undefined = undefined;

    private _tsFormulaResolved = false;

    private _sqlFormulaFn: SqlFormulaFn<AnyModel, any> | undefined = undefined;

    private _sqlFormulaResolved = false;

    private _calculationStrategy: CalculationStrategy | undefined = undefined; 

    private static readonly _EMPTY_PROP_MAP: ReadonlyMap<string, EntityProp> = 
        new Map<string, EntityProp>();

    constructor(
        readonly declaringEntity: Entity,
        readonly name: string,
        private readonly _data: __PropData,
        readonly parentProp: EntityProp | undefined
    ) {
        this.validateData();
        this.nullable = _data.nullity !== "NONNULL";
        this.inputNonNull = _data.nullity != "NULLABLE";   
        this._scalarType = _data.scalarType; 
        this._numericType = _data.numericType;
        this.associationType = _data.associationType;
        if (_data.props != null) {
            this._props = this._createProps(_data.props);
        } else {
            this._props = undefined;
        }
        if (_data.calculatorData != null) {
            const calculator = _data.calculatorData.calculator;
            const sourceEntity = (calculator.sourceModel() as AnyModelImpl).toUnresolvedEntity();
            const declaringEntity = this.declaringEntity;
            if (declaringEntity != sourceEntity && !declaringEntity.ancestors.has(sourceEntity)) {
                this.raise `The source model of calculator is "${
                    sourceEntity.name
                }" which is not the declaring entity "${
                    declaringEntity.name
                }" or its ancestor entity`;
            }
            if (calculator instanceof TargetCalculator) {
                this._targetEntity = (calculator.targetModel() as AnyModelImpl).toUnresolvedEntity();
            } else if (calculator instanceof ParameterizedTargetCalculator) {
                this._targetEntity = (calculator.targetModel() as AnyModelImpl).toUnresolvedEntity();
            } else {
                this._targetEntity = undefined;
            }
        } else if (_data.targetModelRef != null) {
            const targetModel: ModelImpl<any, any, any, any, any, any> =
                typeof _data.targetModelRef === "function"
                    ? _data.targetModelRef() as ModelImpl<any, any, any, any, any, any>
                    : _data.targetModelRef as ModelImpl<any, any, any, any, any, any>;
            if (targetModel == null) {
                this.raise `The associated model must be specified`
            }
            this._targetEntity = targetModel.toUnresolvedEntity();
        } else {
            this._targetEntity = undefined;
        }
        this._thisKeyProp = undefined;
        this._targetKeyProp = undefined;
    }

    get isEntityProp(): true {
        return true;
    }

    get asEntityProp(): EntityProp {
        return this;
    }

    get isMiddleTableProp(): false {
        return false;
    }

    get rootProp(): EntityProp {
        let rootProp = this._rootProp;
        if (rootProp == null) {
            this._rootProp = rootProp = this.parentProp?.rootProp ?? this;
        }
        return rootProp;
    }

    get scalarType(): ScalarType<any> | undefined {
        return this._scalarType;
    }

    get numericType(): NumericType {
        return this._numericType;
    }

    get props(): ReadonlyMap<string, EntityProp> | undefined {
        return this._props;
    }

    get flattenProps(): ReadonlyMap<string, EntityProp> {
        let flattenProps = this._flattenProps;
        if (flattenProps == null) {
            if (this.props == null) {
                this._flattenProps = flattenProps = EntityProp._EMPTY_PROP_MAP;
            } else {
                const map = new Map<string, EntityProp>();
                EntityProp._collectFlattenProps(this, undefined, map);
                this._flattenProps = flattenProps = map;
            }
        }
        return flattenProps;
    }

    get flattenScalarProps(): ReadonlyMap<string, EntityProp> {
        let flattenScalarProps = this._flattenScalarProps;
        if (flattenScalarProps == null) {
            if (this.props == null) {
                this._flattenScalarProps = flattenScalarProps = EntityProp._EMPTY_PROP_MAP;
            } else {
                const map = new Map<string, EntityProp>();
                for (const [key, value] of this.flattenProps.entries()) {
                    if (value.scalarType != null) {
                        map.set(key, value);
                    }
                }
                this._flattenScalarProps = flattenScalarProps = map;
            }
        }
        return flattenScalarProps;
    }

    get scalarProps(): ReadonlyArray<EntityProp> | undefined {
        let scalarProps = this._scalarProps;
        if (scalarProps == null) {
            if (this.scalarType != null) {
                scalarProps = [this];
            } else if (this.props != null) {
                scalarProps = Array.from(this.flattenScalarProps.values());
            } else {
                scalarProps = [];
            }
            this._scalarProps = scalarProps;
        }
        return scalarProps.length === 0 ? undefined : scalarProps;
    }

    get scalarIndex(): number {
        let scalarIndex = this._scalarIndex;
        if (scalarIndex != null) {
            return scalarIndex;
        }
        if (this.scalarType == null) {
            scalarIndex = -1;
        } else {
            scalarIndex = 0;
            for (const prop of this.rootProp.flattenScalarProps.values()) {
                if (this == prop) {
                    break;
                }
                scalarIndex++;
            }
        }
        return this._scalarIndex = scalarIndex;
    }

    get targetEntity(): Entity | undefined {
        return this._targetEntity?.resolve(2);
    }

    get mappedByProp(): EntityProp | undefined {
        this.declaringEntity.resolve(2);
        return this._mappedByProp;
    }

    get oppositeProp(): EntityProp | undefined {
        this.declaringEntity.resolve(2);
        return this._oppositeProp;
    }

    get orders(): ReadonlyArray<EntityPropOrder> {
        this.declaringEntity.resolve(2);
        return this._orders ?? 
            makeErr(`The orders of ${this.toString()} 
                is not initialized`);
    }

    get referenceKeyProp(): EntityProp | undefined {
        return this._referenceKeyProp;
    }

    get referenceProp(): EntityProp | undefined {
        return this._referenceProp;
    }

    get referencedTargetKeyPropName(): string | undefined {
        if (this._data.mappedBy != null) {
            return undefined;
        }
        if (this.associationType === "MANY_TO_ONE" || this.associationType === "ONE_TO_ONE") {
            return this._data.joinColumns?.keyProp ?? this._targetEntity?.idKey;
        }
    }

    get span(): number {
        let span = this._span;
        if (span == null) {
            this._span = span = this._calcSpan();
        }
        return span;
    }

    private _calcSpan(): number {
        if (this.associationType != null) {
            return 0;
        }
        if (this.thisKeyProp == null && this.targetKeyProp != null) {
            return this.targetKeyProp.span;
        }
        if (this._props != null) {
            let span = 0;
            for (const subProp of this._props.values()) {
                span += subProp.span;
            }
            return span;
        }
        if (this._scalarType != null) {
            return 1;
        }
        return 0;
    }

    get isRecursive(): boolean {
        for (let targetEntity = this.targetEntity; targetEntity != null; targetEntity = targetEntity.superEntity) {
            if (targetEntity === this.declaringEntity) {
                return true;
            }
        }
        return false;
    }

    get thisKeyProp(): EntityProp | undefined {
        this.resolve(2);
        return this._thisKeyProp;
    }

    get targetKeyProp(): EntityProp | undefined {
        this.resolve(2);
        return this._targetKeyProp;
    }

    get cascadeType(): CascadeType {
        return this._data.joinTable?.joinTarget?.cascade 
            ?? this._data.joinColumns?.cascade 
            ?? "NONE";
    }

    get backCascascadeType(): CascadeType {
        return this._data.joinTable?.joinThis?.cascade
            ?? "NONE";
    }

    get tsFormulaDependencyView(): View<AnyModel, any> | undefined {
        this._resolveTsFormula();
        return this._tsFormulaDependencyView;
    }
    
    getTsFormulaFn(nullAsUndefined: boolean): TsFormulaFn<any, any> | undefined {
        this._resolveTsFormula();
        return nullAsUndefined ? this._tsFormulaWithUndefinedFn : this._tsFormulaWithNullFn;
    }

    get calculationStrategy(): CalculationStrategy | undefined {
        let strategy = this._calculationStrategy;
        if (strategy == null) {
            const calculatorData = this._data.calculatorData;
            if (calculatorData != null) {
                const sourceModel = calculatorData.calculator.sourceModel();
                if (sourceModel !== this.declaringEntity.model) {
                    this.raise `The source model of the calculator is not the current model "${this.declaringEntity.name}"`;
                }
                const sourceKeyPropName = calculatorData.calculator.sourceKeyPropName ?? this.declaringEntity.idProp.name;
                const sourceKeyProp = this.declaringEntity.expandedPropMap.get(sourceKeyPropName);
                if (sourceKeyProp == null) {
                    this.raise `The sourceKeyPropName of the calculator is "${
                        sourceKeyPropName
                    }" which is not a property which is not a property of the current model "${
                        this.declaringEntity.name
                    }"`;
                    return;
                }
                if (sourceKeyProp.scalarProps == null) {
                    this.raise `The sourceKeyProp of the calculator is "${
                        sourceKeyProp.toString()
                    }" which is not scalar or emebedded property`;
                }
                switch (calculatorData.kind) {
                    case "VALUE":
                        if (calculatorData.parameterType != null) {
                            const calculator = calculatorData.calculator as ParameterizedValueCalculator<any, any>;
                            strategy = {
                                kind: "PARAMETERIZED_VALUE",
                                sourceKeyProp,
                                parameterType: calculatorData.parameterType,
                                nullable: acceptsNullOrUndefined(calculator.valueType),
                                fn: calculator.fn
                            };
                        } else {
                            const calculator = calculatorData.calculator as ValueCalculator<any>;
                            strategy = {
                                kind: "VALUE",
                                sourceKeyProp,
                                parameterType: undefined,
                                nullable: acceptsNullOrUndefined(calculator.valueType),
                                fn: calculator.fn
                            };
                        }
                        break;
                    case "NONNULL_REFERENCE":
                    case "NULLABLE_REFERENCE":
                        if (calculatorData.parameterType != null) {
                            strategy = {
                                kind: "PARAMETERIZED_REFERENCE",
                                sourceKeyProp,
                                parameterType: calculatorData.parameterType,
                                nullable: calculatorData.kind == "NULLABLE_REFERENCE",
                                fn: (calculatorData.calculator as ParameterizedTargetCalculator<any, any>).fn
                            };
                        } else {
                            strategy = {
                                kind: "REFERENCE",
                                sourceKeyProp,
                                parameterType: undefined,
                                nullable: calculatorData.kind == "NULLABLE_REFERENCE",
                                fn: (calculatorData.calculator as TargetCalculator<any>).fn
                            };
                        }
                        break;
                    case "COLLECTION":
                        if (calculatorData.parameterType != null) {
                            strategy = {
                                kind: "PARAMETERIZED_COLLECTION",
                                sourceKeyProp,
                                parameterType: calculatorData.parameterType,
                                fn: (calculatorData.calculator as ParameterizedTargetCalculator<any, any>).fn
                            };
                        } else {
                            strategy = {
                                kind: "COLLECTION",
                                sourceKeyProp,
                                parameterType: undefined,
                                fn: (calculatorData.calculator as TargetCalculator<any>).fn
                            };
                        }
                        break;
                }
                this._calculationStrategy = strategy;
            }
        }
        return strategy;
    }

    private _resolveTsFormula() {
        if (this._tsFormulaResolved) {
            return;
        }
        const formulaData = this._data.formulaData;
        if (formulaData?.kind === "TS") {    
            let  dependencyView = formulaData.formula.dependency();
            if (dependencyView == null || dependencyView.mapper.entity !== this.declaringEntity) {
                this.raise `The typescript formula property must base on the view DTO of current entity "${this.declaringEntity.name}"`;
            }
            for (const field of dependencyView.mapper.fields) {
                for (const path of field.paths) {
                    if (path === "..") {
                        this.raise `The dependency view for the typescript formula property cannot has flat members`;
                    }
                    break;
                }
            }
            this._tsFormulaDependencyView = dependencyView;
            const fn = formulaData.formula.fn;
            this._tsFormulaWithNullFn = v => v != null ? fn(v) : null;
            this._tsFormulaWithUndefinedFn = v => v != null ? fn(v) : undefined;
        }
        this._tsFormulaResolved = true;
    }

    get tsFormulaDependencies(): ReadonlyArray<EntityProp> {
        return this._getFormulaDependencies(new Set());
    }

    private _getFormulaDependencies(
        usedDependencies: Set<EntityProp>
    ): ReadonlyArray<EntityProp> {
        let dependencies = this._tsFormulaDependencies;
        if (dependencies == null) {
            const view = this.tsFormulaDependencyView;
            if (view == null) {
                dependencies = [];
            } else {
                if (usedDependencies.has(this)) {
                    this.raise `Formula dependency circle`
                }
                const arr: Array<EntityProp> = [];
                for (const field of view.mapper.fields) {
                    const prop = field.prop as EntityProp;
                    if (prop._data.calculatorData != null) {
                        this.raise `Cannot depends on calculation property "${prop.toString()}"`;
                    }
                    usedDependencies.add(prop);
                    arr.push(prop);
                    prop._getFormulaDependencies(usedDependencies);
                }
                dependencies = arr;
            }
            this._tsFormulaDependencies = dependencies;
        }
        return dependencies;
    }

    get sqlFormulaFn(): SqlFormulaFn<AnyModel, any> | undefined {
        if (this._sqlFormulaResolved) {
            return this._sqlFormulaFn;
        }
        const formulaData = this._data.formulaData;
        if (formulaData?.kind === "SQL") {
            const sourceModel = formulaData.formula.sourceModel();
            if (sourceModel !== this.declaringEntity.model) {
                this.raise `The SQL formula property must base on the current entity "${this.declaringEntity.name}"`;
            }
            this._sqlFormulaFn = formulaData.formula.fn;
        }
        this._sqlFormulaResolved = true;
        return this._sqlFormulaFn;
    }

    get isFormula(): boolean {
        return this._data.formulaData != null;
    }

    private validateData() {
        if (this._data!.formulaData != null) {
            this._validateFormulaData();
        } else if (this._data!.associationType == null) {
            this._validateSimpleData();
        } else {
            this._validateAssociationData();
        }
    }

    private _validateFormulaData() {
        const formulaData = this._data.formulaData!;
        switch (formulaData.kind) {
            case "SQL":
                const sourceModel = formulaData.formula.sourceModel();
                if (sourceModel !== this.declaringEntity.model) {
                    this.raise `The "sqlFormula" bases on the wrong model "${
                        (sourceModel as AnyModelImpl).name
                    }", it must base on the current model "${this.declaringEntity.name}".`;
                }
                break;
        }
    }

    private _validateSimpleData() {
        const data = this._data;
        if (data.joinColumns != null) {
            this.raise `The "joinColumns" cannot be specified for non-association property.`;
        }
        if (data.joinTable != null) {
            this.raise `The "joinTable" cannot be specified for non-association property.`;
        }
        if (data.orders != null) {
            this.raise `The "orders" cannot be specified for non-association property.`;
        }
        if (data.targetModelRef != null) {
            this.raise `The "targetModel" cannot be specified for non-association property.`;
        }
        if (data.mappedBy != null) {
            this.raise `The "mappedBy" cannot be specified for non-association property.`;
        }
        if (data.scalarType == null && 
            data.props == null && 
            data.formulaData == null && 
            data.calculatorData == null &&
            data.reference == null) {
            this.raise `Either "scalarType", "props", "formulaData", "calculatorData", or "reference" 
            must be specified for non-association property.`;
        }
        if (data.scalarType != null && data.props != null) {
            this.raise `Both "scalarType" and "props" cannot be specified 
            simultaneously for non-association property.`;
        }
    }

    private _validateAssociationData() {
        const data = this._data!;
        if (data.associationType !== "ONE_TO_ONE" &&
            data.associationType !== "ONE_TO_MANY" &&
            data.associationType !== "MANY_TO_ONE" &&
            data.associationType !== "MANY_TO_MANY"
        ) {
            this.raise `The association type must be 
            "ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_ONE", or "MANY_TO_MANY".`
        }
        if (data.scalarType != null) {
            this.raise `The "scalarType" cannot be specified for association property.`;
        }
        if (data.props != null) {
            this.raise `The "props" cannot be specified for association property.`;
        }
        if (data.columnName != null) {
            this.raise `The "columnName" for association property cannot be specified; 
            please specify either joinColumns or joinTable.`;
        }
        if (data.formulaData != null) {
            this.raise `The "formulaData" for association property cannot be specified; 
            please specify either joinColumns or joinTable.`;
        }
        if (data.joinColumns != null && data.joinTable != null) {
            this.raise `Both "joinColumns" and "joinTable" cannot be specified 
            simultaneously for association property.`;
        }
        if (data.joinColumns != null && data.mappedBy != null) {
            this.raise `Both "joinColumns" and "mappedBy" cannot be specified 
            simultaneously for association property.`;
        }
        if (data.joinTable != null && data.mappedBy != null) {
            this.raise `Both "joinTable" and "mappedBy" cannot be specified 
            simultaneously for association property.`;
        }
        if (data.orders != null && 
            data.associationType !== "ONE_TO_MANY" && 
            data.associationType !== "MANY_TO_MANY"
        ) {
            this.raise `"orders" can only be specified for 
            one-to-many or many-to-one property.`;
        }
    }

    resolve(phase: number) {
        const max = Math.max(Math.min(phase, 2), 0);
        for (let i = this._phase + 1; i <= max; i++) {
            this._resolve(i);
        }
    }

    private _resolve(phase: number) { 
        if (this._phase >= phase) {
            return;
        }
        if (phase === 1) {
            this._targetEntity?.resolve(1);
        }
        if (phase === 2) {
            this._initOrders();
            this._initMappedBy();
        }
        this._resolveTarget(phase);
        if (phase === 2) {
            this._resolveTargetKeyProps();
            this._resolveReferenceKeyProp();
            this._validateTargetModelRef();
        }
    }

    private _initOrders() {
        if (this._data.orders == null) {
            this._orders = [];
            const subProps = this._props;
            if (subProps != null) {
                for (const subProp of subProps.values()) {
                    subProp._initOrders();
                }
            }
        } else {
            const targetEntity = this._targetEntity!;
            this._orders = toEntityPropOrders(targetEntity, this._data.orders);
        }
    }

    private _initMappedBy() {
        if (this._data.mappedBy == null || this._mappedByProp != null) {
            return;
        }
        const prop = this._targetEntity?.expandedPropMap.get(this._data.mappedBy);
        if (prop == null) {
            throw this.raise `Illegal mappedBy "${this._data.mappedBy}" 
            which does not exists in target model ${this._targetEntity?.name}`
        }
        if (prop._targetEntity !== this.declaringEntity) {
            this.raise `Illegal mappedBy property 
            "${prop?.declaringEntity.name}.${prop?.name}", 
            its target model is not this model`
        }
        prop._resolve(2);
        this._mappedByProp = prop;
        this._oppositeProp = prop;
        prop!._oppositeProp = this;
    }

    private _resolveTarget(phase: number) {
        this._targetEntity?.resolve(phase);
    }

    private _resolveTargetKeyProps() {
        if (this._data.calculatorData?.calculator != null) {
            this._thisKeyProp = this._data.calculatorData.calculator.sourceKeyPropName != null
                ? this.declaringEntity.prop(this._data.calculatorData.calculator.sourceKeyPropName)
                : this.declaringEntity.idProp;
        }
        if (this._middleEntity != null) {
            this._thisKeyProp = this._middleEntity.joinThisProp.targetKeyProp;
            this._targetKeyProp = this._middleEntity.joinTargetProp.targetKeyProp;
            return;
        }
        if (this._mappedByProp != null) {
            this._thisKeyProp = this._mappedByProp._targetKeyProp;
            this._targetKeyProp = this._mappedByProp._thisKeyProp;
            return;
        }
        if (this._referenceProp != null) {
            this._referenceProp._resolve(2);
            this._targetKeyProp = this.referenceProp!._targetKeyProp;
            return;
        }
        const joinTable = this._data.joinTable;
        const joinColumns = this._data.joinColumns;
        if (joinTable != null || this.associationType === "MANY_TO_MANY") {
            if (joinTable?.joinThis?.keyProp != null) {
                this._thisKeyProp = this.declaringEntity.prop(joinTable.joinThis.keyProp);
            } else {
                this._thisKeyProp = this.declaringEntity.idProp;
            }
            if (joinTable?.joinTarget?.keyProp != null) {
                this._targetKeyProp = this.targetEntity!.prop(joinTable.joinTarget.keyProp);
            } else {
                this._targetKeyProp = this.targetEntity!.idProp;
            }
        } else if (joinColumns != null || this.associationType === "ONE_TO_ONE" || this.associationType == "MANY_TO_ONE") {
            if (joinColumns?.keyProp) {
                this._targetKeyProp = this.targetEntity!.prop(joinColumns.keyProp);
            } else {
                this._targetKeyProp = this.targetEntity!.idProp;
            }
        }
    }

    private _resolveReferenceKeyProp() {
        const referenceProp = this._referenceProp;
        if (referenceProp == null) {
            return;
        }
        this._scalarType = referenceProp.targetKeyProp!.scalarType;
        this._numericType = referenceProp.targetKeyProp!.numericType;
        this._props = EntityProp._redirectSubPropMap(this, referenceProp.targetKeyProp!._props);
    }

    private _validateTargetModelRef() {
        let targetEntity = this.targetEntity;
        if (targetEntity == null) {
            return;
        }
        let isRecursive = false;
        for (let te = this.targetEntity; te != null; te = te.superEntity) {
            if (te === this.declaringEntity) {
                isRecursive = true;
                break;
            }
        }
        if (!isRecursive && typeof this._data.targetModelRef === "function") {
            this.raise `Lambda argument can only be used for recursive assocaitions, please specify the target model directly`;
        }
    }

    // @ts-ignore
    private _setReferenceProp(prop: EntityProp) {
        if (this._referenceProp != null || prop._referenceKeyProp != null) {
            throw new StateError("Internal bug: cannot set reference prop");
        }
        this._referenceProp = prop;
        prop._referenceKeyProp = this;
    }

    private raise(strings: TemplateStringsArray, ...values: any[]): never {
        throw new PropError(
            this.declaringEntity.name,
            this.name,
            dedent(strings, ...values)
        );
    }

    private _createProps(
        props: Record<string, __PropContract<any, any>>
    ): ReadonlyMap<string, EntityProp> {
        const resultMap = new Map<string, EntityProp>();
        for (const key in props) {
            const prop = props[key] as __Prop<any, any>;
            if (prop == null) {
                continue;
            }
            if (prop.__data.associationType != null) {
                this.raise `The internal property of an embedded property 
                    cannot be association property.`;
            }
            resultMap.set(key, new EntityProp(this.declaringEntity, key, prop.__data, this));
        }
        return resultMap;
    }

    toJSON(): any {
        return this.toString();
    }

    get path(): string {
        const subPath = this.subPath;
        return subPath === "" 
            ? this.rootProp.name 
            : `${this.rootProp.name}.${subPath}`;
    }

    get subPath(): string {
        if (this.parentProp == null) {
            return "";
        }
        const parentSubPath = this.parentProp.subPath;
        if (parentSubPath === "") {
            return this.name;
        }
        return `${parentSubPath}.${this.name}`;
    }

    sub(subPath: string): EntityProp {
        if (subPath === "") {
            return this;
        }
        const parts = subPath.split(".");
        let prop: EntityProp = this.referenceKeyProp ?? this;
        for (const part of parts) {
            prop = prop._props?.get(part) 
                ?? makeErr(`Illegal subPath "${subPath}" for "${this.toString()}"`);
        }
        return prop;
    }

    toString(): string {
        return this.parentProp != null
            ? `${this.parentProp.toString()}.${this.name}`
            : `${this.declaringEntity.name}.${this.name}`;
    }

    private _clone(): EntityProp {
        return Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    }
    
    private static _redirectSubPropMap(
        prop: EntityProp,
        propMap: ReadonlyMap<string, EntityProp> | undefined
    ) : ReadonlyMap<string, EntityProp> | undefined {
        if (propMap == null) {
            return undefined;
        }
        const newMap = new Map<string, EntityProp>();
        for (const [key, value] of propMap.entries()) {
            const newValue = value._clone();
            (newValue as any).declaringEntity = prop.declaringEntity;
            (newValue as any).parentProp = prop;
            newValue._props = EntityProp._redirectSubPropMap(newValue, newValue._props);
            newMap.set(key, newValue);
        }
        return newMap;
    }

    // @ts-ignore
    private _redirectAsIdProp(
        declaringEntity: Entity,
        idMapping: string | Record<string, string> | undefined
    ): EntityProp {
        return EntityProp._redirectIdProp(this, declaringEntity, idMapping);
    }

    private static _redirectIdProp(
        prop: EntityProp,
        declaringEntity: Entity,
        idMapping: string | Record<string, string> | undefined
    ): EntityProp {
        const newProp = prop._clone();
        newProp._override = true;
        (newProp as any).declaringEntity = declaringEntity;
        if (newProp._props == null) {
            if (idMapping != null) {
                newProp._storage = newProp._baseStorage = {
                    kind: "COLUMN",
                    name: prop.parentProp == null 
                        ? (idMapping as string) ?? ""
                        : (idMapping as Record<string, string>)[prop.subPath]
                            ?? makeErr(`The column of ${prop.toString()} must be overridden too`),
                    referencedProp: undefined,
                    referencedColumnName: undefined
                };
            }
        } else {
            const newMap = new Map<string, EntityProp>();
            const columns: Array<Column> = [];
            for (const subProp of newProp._props.values()) {
                const newSubProp = EntityProp._redirectIdProp(subProp, declaringEntity, idMapping);
                newMap.set(newSubProp.name, newSubProp);
                if (idMapping != null) {
                    const subStorage = newSubProp._baseStorage!;
                    if (subStorage.kind === "COLUMN") {
                        columns.push(subStorage);
                    } else {
                        columns.push(...subStorage as Columns);
                    }
                }
            }
            (columns as any).kind = "COLUMNS";
            newProp._storage = newProp._baseStorage = columns as any as Columns;
            newProp._props = newMap;
        }
        return newProp;
    }

    get isOverride(): boolean {
        return this._override;
    }

    get storageType(): StorageType {
        let storageType = this._storageType;
        if (storageType == null) {
            if (this.middleEntity != null) {
                storageType = "MIDDLE_ENTITY";
            } else {
                const baseStorage = this._getBaseStorage();
                if (baseStorage != null) {
                    storageType = baseStorage.kind;
                } else if (this._referenceKeyProp != null) {
                    storageType = this._referenceKeyProp._getBaseStorage()?.kind ?? "NONE";
                } else if (this._mappedByProp != null) {
                    const baseStorage = this._mappedByProp._getBaseStorage();
                    if (baseStorage?.kind === "MIDDLE_TABLE") {
                        storageType = "MIDDLE_TABLE";
                    } else {
                        storageType = "NONE";
                    }
                } else {
                    storageType = "NONE";
                }
            }
            this._storageType = storageType;
        }
        return storageType;
    }

    toStorage(strategy: DatabaseStrategy): PropStorage | undefined {
        if (this._storageResolver?.namingStrategy === strategy.namingStrategy
            && this._storageResolver?.keywordStrategy === strategy.keywordStrategy) {
            return this._storage;
        }
        if (this._data.mappedBy != null) {
            const mappedBy = this._mappedByProp!;
            if (mappedBy._data.joinEntity != null) {
                this._storage = this.middleEntity;
            } else {
                const mappedByStorage = mappedBy.toStorage(strategy);
                if (mappedByStorage == null) {
                    this._storage = undefined;
                } else if (mappedByStorage.kind === "MIDDLE_TABLE") {
                    this._storage = {
                        ...mappedByStorage,
                        toThisColumns: mappedByStorage.toTargetColumns,
                        toTargetColumns: mappedByStorage.toThisColumns
                    };
                } else {
                    this._storage = undefined;
                }
            }
        } else if (this._data.joinEntity != null) {
            this._storage = this._getBaseStorage();
        } else if (this.referenceKeyProp != null) {
            this._storage = this.referenceKeyProp.toStorage(strategy);
        } else if (this.parentProp != null) {
            const rootColumns = this.rootProp.toStorage(strategy) as Columns;
            if (this.props == null) {
                this._storage = rootColumns[this.scalarIndex];
            } else {
                const arr: Array<Column> = [];
                for (const subProp of this.flattenScalarProps.values()) {
                    arr.push(rootColumns[subProp.scalarIndex]!);
                }
                (arr as any).kind = "COLUMNS";
                this._storage = arr as any as Columns;
            }
        } else {
            const baseStorage = this._getBaseStorage();
            if (baseStorage != null) {
                this._storage = this._createStorage(baseStorage, strategy);
            }
        }
        this._storageResolver = strategy;
        return this._storage;
    }

    private _createStorage(
        baseStorage: PropStorage, 
        strategy: DatabaseStrategy
    ): PropStorage {
        if (!isIllegal(baseStorage)) {
            return baseStorage;
        }
        if (baseStorage.kind === "COLUMN") {
            return fixColumn(
                    baseStorage, 
                    () => strategy.keywordStrategy.quoteIdentifier(
                        strategy.namingStrategy.columnName(this)
                    ), 
                    () => strategy.keywordStrategy.quoteIdentifier(
                        (baseStorage.referencedProp!.toStorage(strategy) as Column).name
                    )
                );
        }
        if (baseStorage.kind === "COLUMNS") {
            let columns: ReadonlyArray<Column>;
            if (this.referenceKeyProp == null && this.referenceProp == null) {
                const arr: Array<Column> = [];
                const baseColumns = baseStorage as Columns;
                for (const prop of this._props!.values()) {
                    if (prop._props != null) {
                        const storage = prop._createStorage(prop._getBaseStorage()!, strategy);
                        if (storage.kind === "COLUMN") {
                            arr.push(storage);
                        } else {
                            arr.push(...storage as Columns);
                        }
                    } else {
                        arr.push(
                            fixColumn(
                                baseColumns[arr.length]!,
                                () => strategy.keywordStrategy.quoteIdentifier(
                                    strategy.namingStrategy.columnName(prop)
                                ),
                                () => strategy.keywordStrategy.quoteIdentifier(
                                    (baseColumns[arr.length]!.referencedProp?.toStorage(strategy) as Column).name
                                )
                            )
                        );
                    }
                }
                columns = arr;
            } else {
                columns = fixColumnArr(
                    baseStorage,
                    () => strategy.keywordStrategy.quoteIdentifier(
                        strategy.namingStrategy.columnName(this)
                    ),
                    c => strategy.keywordStrategy.quoteIdentifier(
                        (c.referencedProp!.toStorage(strategy) as Column).name
                    )
                );
            }
            (columns as any).kind = "COLUMNS";
            return columns as any as Columns;
        }
        if (baseStorage.kind === "MIDDLE_TABLE") {
            return {
                kind: "MIDDLE_TABLE",
                name: notEmpty(baseStorage.name, () => strategy.namingStrategy.middleTableName(this)),
                toThisColumns: fixColumnArr(
                    baseStorage.toThisColumns,
                    () => strategy.keywordStrategy.quoteIdentifier(
                        strategy.namingStrategy.middleTableThisRefColumnName(this)
                    ), 
                    c => strategy.keywordStrategy.quoteIdentifier(
                        (c.referencedProp!.toStorage(strategy) as Column).name
                    )
                ),
                toTargetColumns: fixColumnArr(
                    baseStorage.toTargetColumns,
                    () => strategy.keywordStrategy.quoteIdentifier(
                        strategy.namingStrategy.middleTableTargetRefColumnName(this)
                    ), 
                    c => strategy.keywordStrategy.quoteIdentifier(
                        (c.referencedProp!.toStorage(strategy) as Column).name
                    )
                ),
            };
        }
        return baseStorage;
    }

    private _getBaseStorage(): PropStorage | undefined {
        let baseStorage = this._baseStorage;
        if (baseStorage === undefined) {
            baseStorage = this._createBaseStorage();
            this._baseStorage = baseStorage ?? null;
        }
        return baseStorage !== null ? baseStorage : undefined;
    }

    private _createBaseStorage(): PropStorage | undefined {
        if (this._data.calculatorData != null) {
            return undefined;
        }
        if (this._data.joinEntity != null) {
            return this.middleEntity;
        } else if (this.scalarType != null) {
            if (this.referenceProp != null) {
                const targetKeyProp = this.referenceProp.targetKeyProp;
                return {
                    kind: "COLUMN",
                    name: this._data.columnName ?? "",
                    referencedProp: targetKeyProp,
                    referencedColumnName: (targetKeyProp?._getBaseStorage() as Column).name
                };
            }
            return {
                kind: "COLUMN",
                name: this._data.columnName ?? "",
                referencedProp: undefined,
                referencedColumnName: undefined
            };
        }
        if (this._data.mappedBy != null) {
            return undefined;
        }
        const joinTable = this._data.joinTable;
        if (joinTable != null || this.associationType === "MANY_TO_MANY") {
            const tableName = joinTable?.name ?? "";
            const toThisColumns: Array<Column> = [];
            const toTargetColumns: Array<Column> = [];
            this._collectJoinColumns(
                joinTable?.joinThis?.columns, 
                "joinTable.joinThis.columns", 
                this.thisKeyProp!, 
                toThisColumns
            );
            this._collectJoinColumns(
                joinTable?.joinTarget?.columns,
                "joinTable.joinTarget.columns",
                this.targetKeyProp!,
                toTargetColumns
            );
            const middleTable: MiddleTable = {
                kind: "MIDDLE_TABLE",
                name: tableName,
                toThisColumns,
                toTargetColumns
            };
            return middleTable;
        }
        if (this.associationType != null) {
            return undefined;
        }
        const columns: Array<Column> = [];
        const referencedTargetKeyProp = this._targetKeyProp;
        if (referencedTargetKeyProp != null) {
            this._collectJoinColumns(
                this._referenceProp!._data.joinColumns?.columns,
                "joinColumns",
                this._targetKeyProp!,
                columns
            );
            if (columns.length === 1) {
                return columns[0];
            }
        } else if (this._props != null) {
            for (const subProp of this._props.values()) {
                const subStorage = subProp._getBaseStorage() as Column | Columns;
                if (subStorage.kind === "COLUMNS") {
                    columns.push(...subStorage);
                } else {
                    columns.push(subStorage as Column);
                }
            }
        }
        (columns as any).kind = "COLUMNS";
        return columns as any as Columns;
    }

    get middleEntity(): MiddelEntity | undefined {
        if (this._middleEntityResolved) {
            return this._middleEntity;
        }
        let middleEntity: MiddelEntity | undefined;
        if (this._mappedByProp != null) {
            middleEntity = this._mappedByProp.middleEntity;
            if (middleEntity != null) {
                middleEntity = {
                    ...middleEntity,
                    joinThisProp: middleEntity.joinTargetProp,
                    joinTargetProp: middleEntity.joinThisProp
                };
            }
        } else {
            middleEntity = this._createMiddleEntity();
        }
        this._middleEntity = middleEntity;
        this._middleEntityResolved = true;
        return middleEntity;
    }

    private _createMiddleEntity(): MiddelEntity | undefined {
        const joinEntity = this._data.joinEntity;
        if (joinEntity == null) {
            return undefined;
        }
        const entity = Entity.of(joinEntity.model);
        const joinThisProp = entity.prop(joinEntity.joinThisProp);
        if (joinThisProp.targetEntity !== this.declaringEntity) {
            throw new PropError(
                this.declaringEntity.name,
                this.name,
                `The target entity of joinThisProp "${
                    joinThisProp.toString()
                }" must be "${this.declaringEntity.name}"`
            );
        }
        const joinTargetProp = entity.prop(joinEntity.joinTargetProp);
        if (joinTargetProp.targetEntity !== this.targetEntity) {
            throw new PropError(
                this.declaringEntity.name,
                this.name,
                `The target entity of joinTargetProp "${
                    joinThisProp.toString()
                }" must be "${this.targetEntity!.name}"`
            );
        }
        const joinThisAssociationType: __AssociationType = 
            this.associationType === "ONE_TO_MANY" || this.associationType === "ONE_TO_ONE"
                ? "ONE_TO_ONE"
                : "MANY_TO_ONE";
        const joinTargetAssociationType: __AssociationType = 
            this.associationType === "MANY_TO_ONE" || this.associationType === "ONE_TO_ONE"
                ? "ONE_TO_ONE"
                : "MANY_TO_ONE";
        if (joinThisProp.associationType !== joinThisAssociationType) {
            throw new PropError(
                this.declaringEntity.name,
                this.name,
                `The association type of joinThisProp "${
                    joinThisProp.toString()
                }" must be "${joinThisAssociationType}"`
            );
        }
        if (joinTargetProp.associationType !== joinTargetAssociationType) {
            throw new PropError(
                this.declaringEntity.name,
                this.name,
                `The association type of joinTargetProp "${
                    joinThisProp.toString()
                }" must be "${joinTargetAssociationType}"`
            );
        }
        if (joinThisProp._data.mappedBy != null) {
            throw new PropError(
                this.declaringEntity.name,
                this.name,
                `The joinThisProp "${
                    joinThisProp.toString()
                }" cannot be inverse property(with "mappedBy")`
            );
        }
        if (joinTargetProp._data.mappedBy != null) {
            throw new PropError(
                this.declaringEntity.name,
                this.name,
                `The joinTargetProp "${
                    joinThisProp.toString()
                }" cannot be inverse property(with "mappedBy")`
            );
        }
        return {
            kind: "MIDDLE_ENTITY",
            entity,
            joinThisProp,
            joinTargetProp
        };
    }

    private _collectJoinColumns(
        joinColumns: ReadonlyArray<__JoinColumnData> | undefined,
        joinColumnsName: string,
        targetKeyProp: EntityProp,
        columns: Array<Column>
    ): void {
        if (joinColumns == null || joinColumns.length === 0) {
            if (targetKeyProp._props != null) {
                throw new PropError(
                    this.declaringEntity.name,
                    this.name,
                    `The "${joinColumnsName}" must be explicitly specified when the foreign key has multiple-columns`
                );
            }
            const column: Column = {
                kind: "COLUMN",
                name: "",
                referencedProp: targetKeyProp,
                referencedColumnName: (targetKeyProp._getBaseStorage() as Column).name
            };
            columns.push(column);
            return;
        }

        if (joinColumns.length !== targetKeyProp.span) {
            throw new PropError(
                this.declaringEntity.name,
                this.name,
                `The size of "${joinColumnsName}" must be ${targetKeyProp.span}`
            );
        }

        if (targetKeyProp._props == null) {
            if (joinColumns[0]!.referencedSubPath != null) {
                throw new PropError(
                    this.declaringEntity.name,
                    this.name,
                    `The referencedSubPath of "${joinColumnsName}[0]" cannot be specified when the foreign key is single-column`
                );
            }
            const column: Column = {
                kind: "COLUMN",
                name: typeof joinColumns[0]! === "string"
                    ? joinColumns[0]!
                    : joinColumns[0]!.columnName,
                referencedProp: targetKeyProp,
                referencedColumnName: (targetKeyProp._getBaseStorage() as Column).name
            };
            columns.push(column);
            return;
        }

        const joinColumnMap = new Map<string, __JoinColumnData>();
        for (const joinColumn of joinColumns) {
            if (joinColumn.columnName === "") {
                throw new PropError(
                    this.declaringEntity.name,
                    this.name,
                    `The columnName of each element of "${joinColumnsName}" must be specified when the foreign key has multiple-columns`
                );
            }
            if (joinColumn.referencedSubPath == null) {
                throw new PropError(
                    this.declaringEntity.name,
                    this.name,
                    `The referencedSubPath of each element of "${joinColumnsName}" must be specified when the foreign key has multiple-columns`
                );
            }
            if (!targetKeyProp.flattenScalarProps.has(joinColumn.referencedSubPath)) {
                throw new PropError(
                    this.declaringEntity.name,
                    this.name,
                    `The referencedSubPath "${joinColumn.referencedSubPath}" of "${joinColumnsName}" is illegal`
                );
            }
            joinColumnMap.set(joinColumn.referencedSubPath, joinColumn);
        }
        for (const [k, prop] of targetKeyProp.flattenScalarProps.entries()) {
            const joinColumn = joinColumnMap.get(k);
            if (joinColumn == null) {
                throw new PropError(
                    this.declaringEntity.name,
                    this.name,
                    `The target key sub property "${prop.toString()}" of "${joinColumnsName}" is not referenced by any join column`
                );
            }
            const column: Column = {
                kind: "COLUMN",
                name: joinColumn.columnName,
                referencedProp: prop,
                referencedColumnName: (prop._getBaseStorage() as Column).name
            };
            columns.push(column);
        }
    }

    private static _collectFlattenProps(
        prop: EntityProp,
        prefix: string | undefined, 
        outputPropMap: Map<string, EntityProp>
    ) {
        if (prefix == null) {
            outputPropMap.set("", prop);
        } else {
            outputPropMap.set(`${prefix}${prop.name}`, prop);
        }
        if (prop.props != null) {
            const subPrefix = prefix == null ? "" : `${prefix}${prop.name}.`;
            for (const subProp of prop.props.values()) {
                EntityProp._collectFlattenProps(subProp, subPrefix, outputPropMap);
            }
        }
    }

    get outputFn(): MapperFn | undefined {
        return this._data.scalarProvider?.toValue;
    }

    get inputFn(): MapperFn | undefined {
        return this._data.scalarProvider?.toSql;
    }

    get scalarProvider(): ScalarProvider<any, any> | undefined {
        return this._data.scalarProvider;
    }
}
