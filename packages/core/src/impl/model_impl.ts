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
import { Entity } from "@/impl/entity";
import { __Ctor, __CtorMembers, __IdGenerator, __InheritanceType, __ModelContext, __ModifierType, __RootModelContext, __TableOptions, __UniqueKeys } from "@/schema/model_internal_types";
import { ModelContract } from "./model_contract";
import { AnyModel, Model } from "@/schema/model";

export class ModelImpl<
    TName extends string, 
    TIdKey extends string,
    TCtor extends __Ctor,
    TAllMembers extends object,
    TSuperNames extends string | never,
    TModifier extends __ModifierType
> implements Model<
    TName,
    TIdKey,
    TCtor,
    TAllMembers,
    TSuperNames,
    TModifier
>, ModelContract {

    readonly identifier: number = allocateModelIdentifier();

    readonly modifier: __ModifierType;

    private _entity: Entity | undefined;

    private _derivedModels: Set<AnyModelImpl> | undefined;

    __type(): {
        model: [TName, TIdKey, TCtor, TAllMembers, TSuperNames, TModifier] | true
    } {
        return { model: true };
    }

    constructor(
        readonly name: TName,
        readonly idKey: TIdKey | undefined,
        readonly ctor: TCtor,
        readonly superModel: AnyModel | undefined,
        readonly options: ModelOptions,
        modifier: TModifier
    ) {
        if (superModel != null) {
            const superModifier = (superModel as AnyModelImpl).modifier;
            this.modifier = 
                modifier === "ABSTRACT" || modifier === "ABSTRACT_BY_NUM"
                    ? superModifier === "OPEN_BY_NUM" || superModifier == "ABSTRACT_BY_NUM"
                        ? "ABSTRACT_BY_NUM"
                        : "ABSTRACT"
                : modifier === "OPEN" || modifier === "OPEN_BY_NUM"
                    ? superModifier === "OPEN_BY_NUM" || superModifier == "ABSTRACT_BY_NUM"
                        ? "OPEN_BY_NUM"
                        : "OPEN"
                : modifier
        } else {
            this.modifier = modifier;
        }
        if (ALL_MODEL_MAP.has(name)) {
            throw new StateError(`Duplicate models with same name: "${name}"`);
        }
        ALL_MODEL_MAP.set(name, this);
        if (superModel != null) {
            const superImpl = superModel as ModelImpl<any, any, any, any, any, any>;
            let derivedModels = superImpl._derivedModels;
            if (derivedModels == null) {
                superImpl._derivedModels = derivedModels = new Set();
            }
            derivedModels.add(this);
        }
    }

    toEntity(): Entity {
        return this.toUnresolvedEntity().resolve(2);
    }

    toUnresolvedEntity(): Entity {
        let entity = this._entity;
        if (entity === undefined) {
            this._entity = entity = new Entity(
                this.name,
                this.idKey,
                this.ctor,
                this,
                this.options
            );
        }
        return entity;
    }

    get derivedModels(): ReadonlySet<AnyModelImpl> | undefined {
        return this._derivedModels as any;
    }
}

export type AnyModelImpl = ModelImpl<any, any, any, any, any, any>;

export type ModelOptions = {
    readonly sharedTable: boolean;
    readonly tableOptions: __TableOptions<any, any, any> | undefined;
    readonly uniqueConstraints: ReadonlyArray<ReadonlyArray<string>>;
    readonly idGenerator: __IdGenerator<any> | undefined;
};

export class ModelContextImpl<
    TIdKey extends string, 
    TCtor extends __Ctor, 
    TSuperModel extends AnyModel | never,
    TModifier extends __ModifierType,
    TInheritanceType extends __InheritanceType
> implements __ModelContext<TIdKey, TCtor, TSuperModel, TModifier, TInheritanceType> {

    protected readonly _sharedTable: boolean;

    protected _tableOptions: __TableOptions<TSuperModel, TModifier, TInheritanceType> | undefined = undefined;

    protected readonly _uniqueConstraints: Array<ReadonlyArray<string>> = [];

    private readonly _uniqueKeySet = new Set<string>();

    constructor(
        inheritanceType: __InheritanceType
    ) {
        this._sharedTable = inheritanceType === "SHARED_TABLE";
    }
    
    __type(): { modelContext: TCtor | true } {
        return { modelContext: true };
    }

    table(options: __TableOptions<TSuperModel, TModifier, TInheritanceType>): this {
        this._tableOptions = options;
        return this;
    }

    unique(...paths : __UniqueKeys<TIdKey, __CtorMembers<TCtor>>[]): this {
        this._uniqueConstraints.push(paths);
        return this;
    }

    _validateUnique(paths: ReadonlyArray<string>) {
        const arr = [...paths].sort();
        for (let i = 1; i < arr.length; i++) {
            if (arr[i - 1] === arr[i]) {
                throw new ArgumentError(`Duplicated property path "${arr[i]}"`);
            }
        }
        const key = arr.join(",");
        if (this._uniqueKeySet.has(key)) {
            throw new ArgumentError(`Duplicated unique constraints [${paths.join(", ")}]`);
        }
        this._uniqueKeySet.add(key);
    }

    toModelOptions(): ModelOptions {
        return {
            sharedTable: this._sharedTable,
            tableOptions: this._tableOptions as __TableOptions<any, any, any>,
            uniqueConstraints: this._uniqueConstraints,
            idGenerator: undefined
        };
    }
}

export class RootModelContextImpl<
    TIdKey extends string, 
    TCtor extends __Ctor,
    TModifier extends __ModifierType
> extends ModelContextImpl<TIdKey, TCtor, never, TModifier, "INDIVIDUAL_TABLE"> 
implements __RootModelContext<TIdKey, TCtor, TModifier> {

    private _idGenerator: __IdGenerator<__CtorMembers<TCtor>[TIdKey]> | undefined = undefined;

    constructor() {
        super("INDIVIDUAL_TABLE");
    }

    __type(): { modelContext: TCtor | true; rootModelContext: true } {
        return { modelContext: true, rootModelContext: true };
    }

    id(idGenerator: __IdGenerator<__CtorMembers<TCtor>[TIdKey]>): this {
        this._idGenerator = idGenerator;
        return this;
    }

    override toModelOptions(): ModelOptions {
        return {
            sharedTable: this._sharedTable,
            tableOptions: this._tableOptions as __TableOptions<any, any, any>,
            uniqueConstraints: this._uniqueConstraints,
            idGenerator: this._idGenerator
        };
    }
}

let _nextModelIdentifier = 0;

export function allocateModelIdentifier(): number {
    return ++_nextModelIdentifier;
}

export const ALL_MODEL_MAP = new Map<string, AnyModelImpl>();
