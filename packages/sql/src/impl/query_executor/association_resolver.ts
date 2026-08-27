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

import { SqlClientImplementor } from "@/sql_client";
import { 
    spi,
    dsl,
    err,
    AnyModel, 
    AtLeastTwo, 
    BaseModel,  
    EntityTable, 
    Expression, 
    ExpressionLike, 
    ExpressionOrder, 
    NumExpression, 
    Predicate, 
    RootQuery, 
    RootQuerySelectArrArgs, 
    SelectionLike, 
    View 
} from "@ts-grm/core";
import { RecursiveContext } from "./recursive_context";
import { AssociationBinding } from "./data";
import { DataRowReader } from "../data_row_reader";
import { buildStatement, explicitDataTypesOf } from "./sql_gen";
import { baseQuerySelectionMapArgs, capitalize, expressionsToAst, filterSourceRows, hashOf } from "./util";
import { resolveCalculators, resolveTsFormulas } from "./calculator_resolver";
import { JoinFetchData, JoinFetchExecutor } from "./join_fetch_executor";
import { ExplicitDataTypeArrayProvider } from "../numeric_type_array_provider";

export async function resolveAssociations(
    sqlClient: SqlClientImplementor,
    mapper: spi.DtoMapper,
    joinFetchMap: ReadonlyMap<spi.DtoMapperField, JoinFetchData> | undefined,
    sourceRows: ReadonlyArray<spi.DtoRow>,
    recursiveContext: RecursiveContext | undefined
): Promise<void> {
    for (const unresolvedField of mapper.unresolvedFields) {
        if (unresolvedField.prop.isEntityProp && (unresolvedField.prop as spi.EntityProp).calculationStrategy != null) {
            continue;
        }
        const joinFetchData = joinFetchMap?.get(unresolvedField);
        if (joinFetchData != null) {
            if (joinFetchData.dtoRows.length != 0) {
                resolveTargets(
                    sqlClient, 
                    unresolvedField.subMapper!, 
                    joinFetchData.dtoRows, 
                    joinFetchMap,
                    recursiveContext
                );
            }
        } else if (unresolvedField.subMapper != null || recursiveContext != null) {
            const filteredSourceRows = filterSourceRows(sourceRows, unresolvedField);
            if (filteredSourceRows.length !== 0) {
                await new AssociationResolver(
                    sqlClient, 
                    mapper, 
                    unresolvedField, 
                    filteredSourceRows, 
                    recursiveContext
                ).resolve();
            }
        }
    }
}

class AssociationResolver {

    private readonly _unresolvedField: spi.DtoMapperField;

    private readonly _targetMapper: spi.DtoMapper;

    private readonly _sourceDtoRowReader: spi.DtoRowReader;

    private readonly _targetDtoRowReader: spi.DtoRowReader;

    private readonly _isCollection: boolean;

    private readonly _batchSize: number;

    private readonly _isOptimizable: boolean;

    private readonly _optimizationIndices: ReadonlyArray<number> | undefined;

    private readonly _bindingMap = new Map<any, AssociationBinding>();

    constructor(
        private _sqlClient: SqlClientImplementor,
        private readonly _sourceMapper: spi.DtoMapper,
        unresolvedField: spi.DtoMapperField,
        private readonly _sourceRows: ReadonlyArray<spi.DtoRow>,
        private readonly _recursiveContext: RecursiveContext | undefined
    ) {
        if (unresolvedField.subMapper != null) { // Association
            this._unresolvedField = unresolvedField;
            this._targetMapper = unresolvedField.subMapper!;
        } else { // Recursive
            this._unresolvedField = _sourceMapper.fields.find(f => f.prop === unresolvedField.prop)!;
            this._targetMapper = _sourceMapper;
        }
        this._sourceDtoRowReader = this._sourceMapper.dtoRowReader;
        this._targetDtoRowReader = this._targetMapper.dtoRowReader;
        const associationType = unresolvedField.prop.associationType;
        this._isCollection = associationType === "ONE_TO_MANY" || associationType === "MANY_TO_MANY";
        if (this._isCollection) {
            this._batchSize = _sqlClient.options.defaultListBatchSize;
        } else {
            this._batchSize = _sqlClient.options.defaultBatchSize;
        }
        this._isOptimizable = unresolvedField.optimizable && 
            _sqlClient.getFilters(unresolvedField.subMapper!.entity).length === 0;
        if (this._isOptimizable && this._keySpan > 1) {
            const indexMap = new Map<string, number>();
            let index = 0;
            if (unresolvedField.prop.referenceKeyProp != null) {
                for (const dependency of this._unresolvedField.dependencies!) {
                    indexMap.set(_sourceMapper.fields[dependency]!.prop.subPath, index++);
                }
            } else {
                for (const subPath of this._unresolvedField.prop!.targetKeyProp!.flattenScalarProps.keys()) {
                    indexMap.set(subPath, index++);
                }
            }
            const indices: Array<number> = [];
            for (const field of this._targetMapper.fields) {
                const index = indexMap.get(field.prop.subPath);
                if (index == null) {
                    throw new Error(`Internal bug: cannot find optimizaiton index for "${field.prop.toString()}"`);
                }
                indices.push(index);
            }
            this._optimizationIndices = indices;
        } else {
            this._optimizationIndices = undefined;
        }
    }

    private _dependencyArr(
        targetTable: any
    ): ReadonlyArray<Expression<any>> {
        const entityTable = targetTable as any as spi.AbstractEntityTable;
        if (this._unresolvedField.prop.referenceKeyProp != null) {
            const keyProps = this._unresolvedField.prop.targetKeyProp!.scalarProps!;
            return keyProps.map(p => entityTable.__expression(p)) as any;
        }
        return targetTable.__inverseAssociatedKeyArr(
            this._unresolvedField.prop.declaringEntity.model, 
            this._unresolvedField.prop.name
        );
    }

    private _keyExprArr(
        targetTable: any
    ): ReadonlyArray<Expression<any>> {
        let keyProps: ReadonlyArray<spi.EntityProp>;
        if (this._unresolvedField.prop.referenceKeyProp != null) {
            keyProps = this._unresolvedField.prop.referenceKeyProp.scalarProps!;
        } else {
            keyProps = (
                this._unresolvedField.prop.targetKeyProp 
                ?? this._unresolvedField.prop.targetEntity!.idProp
            ).scalarProps!;
        }
        const entityTable = targetTable as any as spi.AbstractEntityTable;
        return keyProps.map(p => entityTable.__expression(p)) as any;
    }

    private get _keyExplicitDataTypes(): ReadonlyArray<spi.ExplicitDataType> | undefined {
        let keyProps: ReadonlyArray<spi.EntityProp>;
        if (this._unresolvedField.prop.referenceKeyProp != null) {
            keyProps = this._unresolvedField.prop.referenceKeyProp.scalarProps!;
        } else {
            keyProps = (
                this._unresolvedField.prop.targetKeyProp 
                ?? this._unresolvedField.prop.targetEntity!.idProp
            ).scalarProps!;
        }
        let explicitDataTypes: Array<spi.ExplicitDataType> | undefined = undefined;
        let size = keyProps.length;
        for (let i = 0; i < size; i++) {
            const explicitDataType = keyProps[i]!.explicitDataType;
            if (explicitDataType != null) {
                if (explicitDataTypes == null) {
                    explicitDataTypes = Array.from({length: size}, () => spi.ExplicitDataType.NONE);
                }
                explicitDataTypes[i] = explicitDataType;
            }
        }
        return explicitDataTypes;
    }

    private get _keySpan(): number {
        return this._unresolvedField.dependencies!.length;
    }

    private get _targetKeySpan(): number {
        return (
            this._unresolvedField.prop.targetKeyProp 
            ?? this._unresolvedField.prop.targetEntity!.idProp
        ).span;
    }

    private get _orderSpan(): number {
        return this._unresolvedField.orders?.length ?? 0;
    }

    private _orderExprArr(
        targetTable: any
    ): ReadonlyArray<Expression<any>> {
        const entityTable = targetTable as any as spi.AbstractEntityTable;
        const arr: Array<Expression<any>> = [];
        const orders = this._unresolvedField.orders;
        if (orders != null) {
            for (const order of orders) {
                arr.push(entityTable.__expression(order.prop));
            }
        };
        return arr;
    }

    private _orders(
        targetTable: any
    ): ReadonlyArray<ExpressionOrder> {
        const entityTable = targetTable as any as spi.AbstractEntityTable;
        const arr: Array<ExpressionOrder> = [];
        const orders = this._unresolvedField.orders;
        if (orders != null) {
            for (const order of orders) {
                arr.push(
                    new ExpressionOrder(
                        entityTable.__expression(order.prop),
                        order.desc,
                        order.nulls
                    )
                );
            }
        };
        return arr;
    }

    private _ordersByExprs(
        baseTable: any,
        offset: number
    ): ReadonlyArray<ExpressionOrder> {
        const orders: Array<ExpressionOrder> = [];
        for (const order of this._unresolvedField.orders!) {
            const item = baseTable[`_${offset + orders.length}`];
            if (item == null) {
                throw new err.StateError(`There is no item ${`_${offset + orders.length}`} from base table`);
            }
            orders.push(
                new ExpressionOrder(
                    item as Expression<any>,
                    order.desc,
                    order.nulls
                )
            )
        }
        return orders;
    }

    async resolve(): Promise<void> {
        const unresolvedFieldIndex = this._unresolvedField.index;
        const dtoRowReader = this._sourceDtoRowReader;
        const bindingMap = this._bindingMap;
        for (const sourceRow of this._sourceRows) {
            const dependency = dtoRowReader.dependency(unresolvedFieldIndex, sourceRow);
            if (dtoRowReader.dependencyNullable(unresolvedFieldIndex, dependency)) {
                continue;
            }
            const hash = dtoRowReader.dependencyHash(unresolvedFieldIndex, dependency);
            let binding = bindingMap.get(hash);
            if (binding != null) {
                binding.sourceRows.push(sourceRow);
                continue;
            }
            binding = {
                dependency,
                sourceRows: [sourceRow],
                targetData: undefined,
                targetIdMap: undefined
            };
            bindingMap.set(hash, binding);
        }
        await this._resolve(JoinFetchExecutor.of(this._sqlClient, this._unresolvedField.subMapper));
    }

    private async _resolve(
        joinFetchExecutor: JoinFetchExecutor | undefined
    ): Promise<void> {
        const dependencies: Array<any> = [];
        for (const binding of this._bindingMap.values()) {
            dependencies.push(binding.dependency);
        }
        const recursiveContexts: Array<RecursiveContext> = [];
        if (dependencies.length <= this._batchSize || this._recursiveContext != null) {
            const recursiveContext = await this._resolveBatch(dependencies, joinFetchExecutor);
            if (recursiveContext != null) {
                recursiveContexts.push(recursiveContext);
            }
        } else {
            let start = 0;
            while (start < dependencies.length) {
                const end = Math.min(dependencies.length, start + this._batchSize);
                const batchDependencies = dependencies.slice(start, end);
                const recursiveContext = await this._resolveBatch(batchDependencies, joinFetchExecutor);
                if (recursiveContext != null) {
                    recursiveContexts.push(recursiveContext);
                }
                start += this._batchSize;
            }
        }
        const recursiveContext = RecursiveContext.merge(recursiveContexts);
        const unresolvedFieldIndex = this._unresolvedField.index;
        const sourceDtoRowReader = this._sourceDtoRowReader;
        const targetRows: Array<spi.DtoRow> = [];
        let targetRowMap = this._byTargetKey ? await recursiveContext?.targetRowMap() : undefined;
        for (const binding of this._bindingMap.values()) {
            const targetData = binding.targetData;
            const targetIdMap = binding.targetIdMap;
            let value: any;
            if (this._isCollection) {
                if (targetData == null && targetIdMap == null) {
                    if ((this._recursiveContext?.isBound ?? false)) {
                        value = this._sourceMapper.nullAsUndefined ? undefined : null;
                    } else {
                        value = [];
                    }
                } else if(this._byTargetKey) {
                    const arr = [];
                    for (const targetId of targetIdMap!.values()) {
                        const targetRow = targetRowMap!.get(targetId);
                        if (targetRow != null) {
                            arr.push(targetRow.dto);
                            targetRows.push(targetRow);
                        }
                        value = arr;
                    }
                } else if (Array.isArray(targetData)) {
                    value = targetData.map(row => row.dto);
                    targetRows.push(...targetData);
                } else {
                    value = [(targetData as spi.DtoRow).dto];
                    targetRows.push(targetData as spi.DtoRow);
                }
            } else {
                if (targetData == null) {
                    value = this._sourceMapper.nullAsUndefined ? undefined : null;
                } else if (Array.isArray(targetData)) {
                    const arr = targetData as ReadonlyArray<spi.DtoRow>;
                    throw new err.StateError(
                        `Cannot resolve the assocaition property "${
                            this._unresolvedField.prop.toString()
                        }", it is reference but there are ${
                            arr.length
                        } associated objects`
                    );
                } else {
                    value = (targetData as spi.DtoRow).dto;
                    targetRows.push(targetData as spi.DtoRow);
                }
            }
            for (const sourceRow of binding.sourceRows) {
                sourceDtoRowReader.resolve(
                    unresolvedFieldIndex, 
                    sourceRow, 
                    value
                );
            }
        }
        await resolveTargets(
            this._sqlClient, 
            this._targetMapper, 
            targetRows, 
            joinFetchExecutor?.joinFetchMap, 
            recursiveContext
        );
    }

    private async _resolveBatch(
        dependencies: ReadonlyArray<any>,
        joinFetchExecutor: JoinFetchExecutor | undefined
    ): Promise<RecursiveContext | undefined> {
        if (dependencies.length == 0) {
            return undefined;
        }
        const [keyRowReader, valueRowReader, recursiveContext] = await this._createRowReaders(dependencies);
        return this._readRows(keyRowReader, valueRowReader, joinFetchExecutor, recursiveContext);
    }

    private async _createRowReaders(
        dependencies: ReadonlyArray<any>
    ): Promise<[DataRowReader, DataRowReader, RecursiveContext | undefined]> {
        if (this._isOptimizable) {
            return this._createOptimizedRowReaders(dependencies);
        }
        const view = new View<AnyModel, any>(this._unresolvedField.subMapper!);
        let keyRowReader: DataRowReader;
        let recursiveContext = this._recursiveContext;
        if (recursiveContext != null) {
            keyRowReader = recursiveContext.toKeyRowReader();
        } else {
            const isRecursive = this._unresolvedField.recursiveDepth != null;
            const query = isRecursive
                ? this._createRecursiveQuery(dependencies, view)
                : this._createQuery(dependencies, view);
            const [sql, args] = buildStatement(this._sqlClient, query, undefined);
            const dataRows = await this._sqlClient.executor.executeStatement(sql, args, {
                kind: isRecursive 
                    ? (this._byTargetKey ? "LOAD_RECURSIVE_TREE_KEY" : "LOAD_RECURSIVE_TREE")
                    : "LOAD_ASSOCIATION",
                prop: this._unresolvedField.prop as spi.EntityProp
            });
            if (isRecursive && recursiveContext == null) {
                recursiveContext = new RecursiveContext(
                    dataRows, 
                    this._keySpan, 
                    this._byTargetKey ? this._targetKeySpan : view.mapper.span, 
                    this._byTargetKey ? this._orderSpan : 0,
                    (query as any as ExplicitDataTypeArrayProvider).explicitDataTypes,
                    this._byTargetKey 
                        ? { 
                            getter: async(ids: ReadonlyArray<any>) => this._targetRowMap(ids, view), 
                            map: undefined 
                        }
                        : undefined,
                    this._unresolvedField.recursiveDepth, 
                    0
                );
            }
            keyRowReader = recursiveContext?.toKeyRowReader() 
                ?? DataRowReader.of(
                    dataRows, 
                    (query as any as ExplicitDataTypeArrayProvider).explicitDataTypes
                );
        }
        const valueRowReader = keyRowReader.offset(this._keySpan);
        return [keyRowReader, valueRowReader, recursiveContext];
    }

    private _readRows(
        keyRowReader: DataRowReader,
        valueRowReader: DataRowReader,
        joinFetchExecutor: JoinFetchExecutor | undefined,
        recursiveContext: RecursiveContext | undefined
    ): RecursiveContext | undefined {
        const sourceDtoRowReader = this._sourceDtoRowReader;
        const targetDtoRowReader = this._targetDtoRowReader;
        while (keyRowReader.next()) {
            const key = keyRowReader.get(0, this._keySpan);
            const binding = this._bindingMap.get(sourceDtoRowReader.dependencyHash(this._unresolvedField.index, key))
            if (binding == null) {
                continue;
            }
            const row = this._byTargetKey 
                ? valueRowReader.get(0, this._targetKeySpan)
                : targetDtoRowReader.read(binding.sourceRows, valueRowReader);
            if (this._byTargetKey) {
                let map = binding.targetIdMap;
                if (map == null) {
                    binding.targetIdMap = map = new Map();
                }
                map.set(hashOf(row), row);
            } else if (binding.targetData == null) {
                binding.targetData = row;
            } else if (!this._isCollection) {
                // Do nothing
            } else if (!Array.isArray(binding.targetData)) {
                binding.targetData = [binding.targetData as spi.DtoRow, row];
            } else {
                binding.targetData.push(row);
            }
            joinFetchExecutor?.execute(row, valueRowReader);
        }
        return recursiveContext;
    }

    private async _createOptimizedRowReaders(
        dependencies: ReadonlyArray<any>
    ): Promise<[DataRowReader, DataRowReader, RecursiveContext | undefined]> {
        const prop = this._unresolvedField.prop as spi.EntityProp;
        const referenceKeyProp = prop.referenceKeyProp;
        if (referenceKeyProp != null) {
            const keyRowReader = DataRowReader.of(
                this._keySpan > 1
                    ? dependencies
                    : dependencies.map(v => [v]),
                this._keyExplicitDataTypes
            );
            return [
                keyRowReader, 
                keyRowReader.mapColIndices(this._optimizationIndices), 
                undefined
            ];
        }
        const model = dsl.associationModel(this._sourceMapper.entity.model, prop.name);
        const sourceKeyProp = prop.thisKeyProp ?? prop.declaringEntity.idProp;
        const targetKeyProp = prop.targetKeyProp ?? prop.targetEntity!.idProp;
        const query = this._sqlClient.createQuery(model, (q, association) => {
            const sourceKey = 
                sourceKeyProp.props == null
                    ? (association as any)[`source${capitalize(sourceKeyProp.name)}`]
                    : (association as any)[`source${capitalize(sourceKeyProp.name)}`]();
            const targetKey = 
                targetKeyProp.props == null
                    ? (association as any)[`target${capitalize(targetKeyProp.name)}`]
                    : (association as any)[`target${capitalize(targetKeyProp.name)}`]();
            const sourceExprs = spi.AbstractEntityTable.expandExprArr(sourceKey, sourceKeyProp);
            let targetExprs = spi.AbstractEntityTable.expandExprArr(targetKey, targetKeyProp);
            if (this._optimizationIndices != null) {
                targetExprs = this._optimizationIndices.map(i => targetExprs[i]!);
            }
            const selections = [...sourceExprs, ...targetExprs] as any as RootQuerySelectArrArgs;
            q.where(expressionsToAst(sourceExprs).in(...dependencies));
            return q.select(...selections);
        });
        const [sql, args] = buildStatement(this._sqlClient, query, undefined);
        const dataRows = await this._sqlClient.executor.executeStatement(sql, args, {
            kind: "LOAD_ASSOCIATION",
            prop: this._unresolvedField.prop as spi.EntityProp
        });
        const keyRowReader = DataRowReader.of(dataRows, explicitDataTypesOf(query, false));
        return [
            keyRowReader, 
            keyRowReader.offset(this._keySpan), 
            undefined
        ];
    }

    private _createQuery(
        dependencies: ReadonlyArray<any>, 
        view: View<AnyModel, any>
    ): RootQuery<any> {
        const model = this._unresolvedField.subMapper!.entity.model;
        const predicateFn = this._unresolvedField.predicateFn;
        const limit = this._unresolvedField.limit;
        if (limit == null) {
            return this._sqlClient.createQuery(model, (q, target) => {
                const dependencyArr = this._dependencyArr(target);
                q.where(expressionsToAst(dependencyArr).in(...dependencies));  
                if (predicateFn != null) {
                    q.where(predicateFn(target as any as spi.AbstractEntityTable));
                }
                if (this._isCollection) {
                    q.orderBy(...this._orders(target));
                }
                const selections = [...dependencyArr, target.fetch(view)] as any as RootQuerySelectArrArgs;
                return q.select(...selections);
            });
        }
        const baseModel = dsl.derivedModel(
            dsl.baseQuery(model, (q, target) => {
                const dependencyArr = this._dependencyArr(target);
                q.where(expressionsToAst(dependencyArr).in(...dependencies));  
                if (predicateFn != null) {
                    q.where(predicateFn(target as any as spi.AbstractEntityTable));
                }
                const orders = this._orders(target);
                q.orderBy(...this._orders(target));
                return q.select(
                    baseQuerySelectionMapArgs(
                        dependencyArr,
                        this._byTargetKey 
                            ? this._keyExprArr(target)
                            : { target },
                        { rank: this._rankExpr(dependencyArr, orders) }
                    )
                );
            })
        );
        return this._sqlClient.createQuery(baseModel, (q, base) => {
            q.where((base as any).rank.lte(limit));
            q.orderBy(...this._orders(base.target));
            const keyExpressions: Array<ExpressionLike> = [];
            for (let i = 0; i < this._keySpan; i++) {
                keyExpressions.push((base as any)[`_${i}`]);
            }
            const selections = [
                ...keyExpressions, 
                ...(this._byTargetKey ? this._keyExprArr(base.target) : [(base.target as EntityTable<AnyModel>).fetch(view)])
            ] as any as RootQuerySelectArrArgs;
            return q.select(...selections);
        });
    }

    private _createRecursiveQuery(
        dependencies: ReadonlyArray<any>, 
        view: View<AnyModel, any>
    ): RootQuery<any> {
        const model = this._unresolvedField.subMapper!.entity.model;
        const predicateFn = this._unresolvedField.predicateFn;
        const baseModel = dsl.cteModel(
            dsl.baseQuery(model, (q, target) => {
                const dependencyArr = this._dependencyArr(target) as any;
                q.where((expressionsToAst(dependencyArr)).in(...dependencies));
                if (predicateFn != null) {
                    q.where(predicateFn(target as any as spi.AbstractEntityTable));
                }
                return q.select(
                    baseQuerySelectionMapArgs(
                        dependencyArr, 
                        this._byTargetKey
                            ? this._keyExprArr(target)
                            : { target }, 
                        this._byTargetKey
                            ? this._orderExprArr(target)
                            : undefined,
                        { depth: dsl.constant(0) }
                    )
                );
            }).unionAllRecursively(model, {
                join: (prev, target) => { 
                    const dependencyArr = this._dependencyArr(target) as any;
                    let keyProps: ReadonlyArray<spi.EntityProp>;
                    if (this._unresolvedField.prop.referenceKeyProp != null) {
                        keyProps = this._unresolvedField.prop.referenceKeyProp.scalarProps!;
                    } else {
                        keyProps = (
                            this._unresolvedField.prop.targetKeyProp 
                            ?? this._unresolvedField.prop.targetEntity!.idProp
                        ).scalarProps!;
                    }
                    const prevExpressions = keyProps.map((keyProp, index) => 
                        this._byTargetKey
                            ? prev[`_${this._keySpan + index}`] as Expression<any>
                            : (prev.target as any as spi.AbstractEntityTable).__expression(keyProp)
                    );
                    return expressionsToAst(dependencyArr).eq(expressionsToAst(prevExpressions)) as Predicate;
                },
                query: (q, target) => {
                    const dependencyArr = this._dependencyArr(target) as any;
                    if (predicateFn != null) {
                        q.where(predicateFn(target as any as spi.AbstractEntityTable));
                    }
                    return q.select(
                        baseQuerySelectionMapArgs(
                            dependencyArr, 
                            this._byTargetKey
                                ? this._keyExprArr(target)
                                : { target }, 
                            this._byTargetKey
                                ? this._orderExprArr(target)
                                : undefined,
                            { depth: (q.prev.depth as NumExpression<number>).plus(dsl.constant(1)) }
                        )
                    );
                }
            })
        );
        const limitedBaseModel = this._limitBaseModel(baseModel);
        return this._sqlClient.createQuery(limitedBaseModel, (q, base: any) => {
            if (baseModel === limitedBaseModel && this._unresolvedField.recursiveDepth != -1) {
                q.where((base as any).depth.lt(this._unresolvedField.recursiveDepth!));
            }
            if (this._unresolvedField.limit != null) {
                q.where((base as any).rank.lte(this._unresolvedField.limit))
            }
            if (this._isCollection) {
                const orders = this._byTargetKey 
                    ? this._ordersByExprs(base, this._keySpan + this._targetKeySpan)
                    : this._orders(base.target);
                if (orders.length !== 0) {
                    q.orderBy(...[(base as any).depth.asc(), ...orders]);
                }
            }
            const keyExpressions: Array<ExpressionLike> = [];
            for (let i = 0; i < this._keySpan; i++) {
                keyExpressions.push((base as any)[`_${i}`]);
            }
            const valueExpressions: Array<ExpressionLike> = [];
            if (this._byTargetKey) {
                for (let i = 0; i < this._targetKeySpan; i++) {
                    valueExpressions.push((base as any)[`_${keyExpressions.length + valueExpressions.length}`]);
                }
            }
            const orderExpressions: Array<ExpressionLike> = [];
            if (this._byTargetKey) {
                for (let i = 0; i < this._orderSpan; i++) {
                    orderExpressions.push((base as any)[`_${keyExpressions.length + valueExpressions.length + orderExpressions.length}`]);
                }
            }
            const selections = [
                ...keyExpressions, 
                ...(this._byTargetKey ? valueExpressions : [(base.target as EntityTable<AnyModel>).fetch(view)]),
                ...orderExpressions,
                base.depth
            ] as any as RootQuerySelectArrArgs;
            return q.select(...selections);
        });
    }

    private get _byTargetKey(): boolean {
        if (this._unresolvedField.recursiveDepth != null && this._unresolvedField.limit != null) {
            /*
             * Current technical limitations:
             *
             * The table exported by another base query cannot be exported again 
             */
            return true;
        }
        return this._recursiveContext?.targetKeyOnly ?? (
            this._unresolvedField.recursiveDepth != null && 
            this._unresolvedField.prop.associationType === "MANY_TO_MANY"
        );
    }

    private async _targetRowMap(
        keys: ReadonlyArray<any>, 
        view: View<AnyModel, any>
    ): Promise<Map<any, spi.DtoRow>> {
        const map = new Map<any, spi.DtoRow>();
        if (keys.length === 0) {
            return map;
        }
        const keyMap = new Map<string, string>();
        for (const key of keys) {
            keyMap.set(hashOf(key), key);
        }
        const distinctKeys = Array.from(keyMap.values());
        const query = this._sqlClient.createQuery(this._targetMapper.entity.model, (q, target) => {
            const idExprArr = this._keyExprArr(target);
            q.where(expressionsToAst(idExprArr).in(...distinctKeys));
            const selections = [...idExprArr, target.fetch(view)] as any as AtLeastTwo<SelectionLike>;
            return q.select(...selections);
        });
        const [sql, args] = buildStatement(this._sqlClient, query, undefined);
        const dataRows = await this._sqlClient.executor.executeStatement(sql, args, {
            kind: "LOAD_RECURSIVE_TREE_NODE",
            prop: this._unresolvedField.prop as spi.EntityProp
        });
        const keySpan = this._keySpan;
        const keyReader = DataRowReader.of(dataRows, explicitDataTypesOf(query, false));
        const valueReader = keyReader.offset(keySpan);
        const dtoReader = this._targetDtoRowReader;
        while (keyReader.next()) {
            const key = keyReader.get(0, keySpan);
            const value = dtoReader.read(undefined, valueReader);
            map.set(hashOf(key), value);
        }
        return map;
    }

    private _rankExpr(
        dependencyArr: ReadonlyArray<Expression<any>>,
        orders: ReadonlyArray<ExpressionOrder>
    ): Expression<number> {
        if (orders.length === 0) {
            throw new err.StateError(
                `For fetching collection elements of "${
                    this._unresolvedField.prop.toString()
                }" with a quantity limit specified via the "$limit" method, the feild must have sorting configuration, whether it's the default order of entity field or the order after DTO field overriding.`
            );
        }
        return dsl.native.num `row_number() over(partition by ${dependencyArr} order by ${orders})`
    }

    private _limitBaseModel<
        TBaseModel extends BaseModel<any>
    >(
        baseModel: TBaseModel
    ) : TBaseModel {
        const limit = this._unresolvedField.limit;
        if (limit == null) {
            return baseModel;
        }
        return dsl.derivedModel(
            dsl.baseQuery(baseModel, (q, base) => {
                if (this._unresolvedField.recursiveDepth != -1) {
                    q.where(base.depth.lt(this._unresolvedField.recursiveDepth!));
                }
                const arr: Array<Expression<any>> = [];
                const dependencyArr: Array<Expression<any>> = [];
                for (let i = 0; i < this._keySpan; i++) {
                    const selection = (base as any)[`_${arr.length}`];
                    arr.push(selection);
                    dependencyArr.push(selection);
                }
                for (let i = 0; i < this._targetKeySpan; i++) {
                    arr.push((base as any)[`_${arr.length}`]);
                }
                const orders = this._ordersByExprs(base, arr.length);
                if (this._byTargetKey) {
                    for (let i = 0; i < this._orderSpan; i++) {
                        arr.push((base as any)[`_${arr.length}`]);
                    }
                }
                return q.select(
                    baseQuerySelectionMapArgs(
                        arr, 
                        {
                            depth: base.depth,
                            rank: this._rankExpr(dependencyArr, orders)
                        }
                    )
                );
            })
        ) as TBaseModel;
    }
}

async function resolveTargets(
    sqlClient: SqlClientImplementor,
    targetMapper: spi.DtoMapper,
    targetRows: ReadonlyArray<spi.DtoRow>,
    joinFetchMap: ReadonlyMap<spi.DtoMapperField, JoinFetchData> | undefined,
    recursiveContext: RecursiveContext | undefined
) {
    if (targetRows.length !== 0) {
        await resolveAssociations(
            sqlClient, 
            targetMapper, 
            joinFetchMap,
            targetRows, 
            recursiveContext?.toDeeperContext()
        );
        resolveTsFormulas(targetMapper, targetRows);
        await resolveCalculators(
            sqlClient, 
            targetMapper, 
            targetRows
        );
    }
}