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
import { err, spi, View } from "@ts-grm/core";
import { filterSourceRows } from "./util";
import { CalculatorBinding } from "./data";
import { usingExplicitPurpose } from "./execute_query";

export function resolveTsFormulas(
    mapper: spi.DtoMapper,
    sourceRows: ReadonlyArray<spi.DtoRow>
): void {
    for (const sourceRow of sourceRows) {
        mapper.dtoRowReader.resolveTsFormulas(sourceRow);
    }
}

export async function resolveCalculators(
    sqlClient: SqlClientImplementor,
    mapper: spi.DtoMapper,
    sourceRows: ReadonlyArray<spi.DtoRow>
): Promise<void> {
    for (const unresolvedField of mapper.unresolvedFields) {
        if (unresolvedField.prop.isEntityProp) {
            const entityProp = unresolvedField.prop as spi.EntityProp;
            if (entityProp.calculationStrategy != null) {
                const filteredSourceRows = filterSourceRows(sourceRows, unresolvedField);
                if (filteredSourceRows.length !== 0) {
                    await usingExplicitPurpose({
                        kind: "LOAD_CALCULATOR",
                        prop: unresolvedField.prop as spi.EntityProp,
                        parameter: unresolvedField.parameter
                    }, async () => {
                        await new CalculatorResolver(
                            sqlClient,
                            mapper,
                            unresolvedField,
                            filteredSourceRows
                        ).resolve();
                    })
                }
            }
        }
    }
}

class CalculatorResolver {
    
    private _strategy: spi.CalculationStrategy;

    private _isCollection: boolean;

    private _bindingMap = new Map<any, CalculatorBinding>();

    constructor(
        private readonly _sqlClient: SqlClientImplementor,
        private readonly _sourceMapper: spi.DtoMapper,
        private readonly _unresolvedField: spi.DtoMapperField,
        sourceRows: ReadonlyArray<spi.DtoRow>
    ) {
        const entityProp = _unresolvedField.prop as spi.EntityProp;
        this._strategy = entityProp.calculationStrategy!
        this._isCollection = this._strategy.kind === "COLLECTION" || this._strategy.kind === "PARAMETERIZED_COLLECTION";
        const dtoRowReader = this._sourceMapper.dtoRowReader;
        const unresolvedFieldIndex = this._unresolvedField.index;
        for (const sourceRow of sourceRows) {
            const dependency = dtoRowReader.dependency(unresolvedFieldIndex, sourceRow);
            const hash = dtoRowReader.dependencyHash(unresolvedFieldIndex, dependency);
            let binding = this._bindingMap.get(hash);
            if (binding != null) {
                binding.sourceRows.push(sourceRow);
            } else {
                this._bindingMap.set(hash, {
                    dependency,
                    hash,
                    sourceRows: [sourceRow],
                    targetData: undefined
                })
            }
        }
    }

    async resolve(): Promise<void> {
        const dependencies: Array<any> = [];
        for (const binding of this._bindingMap.values()) {
            dependencies.push(binding.dependency);
        }
        const isCollection = this._isCollection;
        const batchSize = isCollection 
            ? this._sqlClient.options.defaultListBatchSize
            : this._sqlClient.options.defaultBatchSize;
        if (dependencies.length <= batchSize) {
            await this._resolveBatch(dependencies);
        } else {
            let start = 0;
            while (start < dependencies.length) {
                const end = Math.min(dependencies.length, start + batchSize);
                const batchDependencies = dependencies.slice(start, end);
                await this._resolveBatch(batchDependencies);
                start += batchSize;
            }
        }
        const required = 
            this._strategy.kind !== "COLLECTION" 
            && this._strategy.kind !== "PARAMETERIZED_COLLECTION"
            && !this._strategy.nullable;
        const unresolvedFieldIndex = this._unresolvedField.index;
        const dtoRowReader = this._sourceMapper.dtoRowReader;
        for (const binding of this._bindingMap.values()) {
            if (binding.targetData == null) {
                if (required) {
                    throw new err.StateError(
                        `Illegal calculator for the nonull-property "${
                            this._unresolvedField.prop.toString()
                        }", it returns does not returns nonnull value for the source key "${
                            binding.dependency
                        }"`
                    );
                }
                if (isCollection) {
                    for (const sourceRow of binding.sourceRows) {
                        dtoRowReader.resolve(unresolvedFieldIndex, sourceRow, []);
                    }
                }
            } else {
                for (const sourceRow of binding.sourceRows) {
                    dtoRowReader.resolve(unresolvedFieldIndex, sourceRow, binding.targetData);
                }
            }
        }
    }

    private async _resolveBatch(
        dependencies: ReadonlyArray<any>
    ): Promise<void> {
        const kind = this._strategy.kind;
        if (kind === "VALUE") {
            const tuples = await this._strategy.fn({
                sqlClient: this._sqlClient,
                keys: dependencies
            });
            this._processTuples(tuples);
        } else if (kind === "PARAMETERIZED_VALUE") {
            const tuples = await this._strategy.fn({
                sqlClient: this._sqlClient,
                keys: dependencies,
                parameter: this._unresolvedField.parameter
            });
            this._processTuples(tuples);
        } else if (kind === "REFERENCE" || kind === "COLLECTION") {
            const tuples = await this._strategy.fn({
                sqlClient: this._sqlClient,
                keys: dependencies,
                view: new View(this._unresolvedField.subMapper!)
            });
            this._processTuples(tuples);
        } else if (kind === "PARAMETERIZED_REFERENCE" || kind === "PARAMETERIZED_COLLECTION") {
            const tuples = await this._strategy.fn({
                sqlClient: this._sqlClient,
                keys: dependencies,
                parameter: this._unresolvedField.parameter,
                view: new View(this._unresolvedField.subMapper!)
            });
            this._processTuples(tuples);
        } else {
            throw new Error(`Unsuported calculator kind: ${kind}`);
        }
    }

    private _processTuples(
        tuples: ReadonlyArray<[any, any]>
    ) {
        const unresolvedFieldIndex = this._unresolvedField.index;
        const dtoRowReader = this._sourceMapper.dtoRowReader;
        const isCollection = this._isCollection;
        for (const tuple of tuples) {
            const hash = dtoRowReader.dependencyHash(unresolvedFieldIndex, tuple[0]);
            let binding = this._bindingMap.get(hash);
            if (binding == null) {
                throw new err.StateError(
                    `Illegal calculator for the property "${
                        this._unresolvedField.prop.toString()
                    }", it returns a tuple whose first value is ${
                        tuple[0]
                    } which does not exists in sourceKeys`
                );
            }
            if (binding.targetData != null) {
                if (isCollection) {
                    (binding.targetData as Array<any>).push(tuple[1]);
                } else {
                    throw new err.StateError(
                        `Illegal calculator for the property "${
                            this._unresolvedField.prop.toString()
                        }", duplicate values for source key ${tuple[0]}`
                    );
                }
            } else {
                if (isCollection) {
                    binding.targetData = [tuple[1]];
                } else {
                    binding.targetData = tuple[1];
                }
            }
        }
    }
}