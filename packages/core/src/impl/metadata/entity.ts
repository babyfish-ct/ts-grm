import { ModelError, PropError } from "@/error/metadata_error";
import { AnyModel, Ctor } from "@/schema/model";
import { EntityProp } from "./entity_prop";
import { ModelImpl } from "@/impl/metadata/model_impl";
import { dedent } from "@/error/util";
import { capitalize, makeErr } from "../util";

export class Entity {

    readonly superEntity: Entity | undefined;

    private _phase = 0;

    private _idProp: EntityProp | undefined = undefined;

    private _declaredPropMap: ReadonlyMap<string, EntityProp> | undefined = undefined;

    private _allPropMap: ReadonlyMap<string, EntityProp> | undefined = undefined;

    private _expanedPropMap: ReadonlyMap<string, EntityProp> | undefined = undefined;

    static of(model: AnyModel): Entity {
        return (model as ModelImpl<any, any, any, any, any>).toEntity()
    }

    constructor(
        readonly name: string, 
        private _idKey: string | undefined, 
        private _ctor: Ctor, 
        superModel?: AnyModel
    ) {
        if (!isValidModelName(name)) {
            throw new ModelError(
                name,
                dedent`Must fllow PascalCase naming convention:
                "${CAMEL_CASE_REGEX.source}"`
            )
        }
        this.superEntity = superModel !== undefined
            ? Entity.of(superModel)
            : undefined;
    }

    get idKey(): string {
        return this.superEntity?.idKey ?? this._idKey ?? 
            makeErr("Internal bug");
    }

    get idProp(): EntityProp {
        this.resolve(1);
        return this._idProp!;
    }

    get declaredPropMap(): ReadonlyMap<string, EntityProp> {
        this.resolve(1)
        return this._declaredPropMap ?? 
            makeErr(`The declaredPropMap of ${this.name} is not initialized`);
    }

    get allPropMap(): ReadonlyMap<string, EntityProp> {
        this.resolve(1);
        return this._allPropMap ?? 
            makeErr(`The allPropMap of ${this.name} is not initialized`);
    }

    get expanedPropMap(): ReadonlyMap<string, EntityProp> {
        this.resolve(1);
        return this._expanedPropMap ?? 
            makeErr(`The expandedPropMap of ${this.name} is not initialized`);
    }

    prop(name: string): EntityProp {
        return this.expanedPropMap.get(name) ?? 
            makeErr(`There is no property "${name}" in the model "${this.name}"`);
    }

    resolve(phase: number): this {
        const max = Math.min(Math.max(0, phase), 2);
        for (let i = this._phase + 1; i <= max; i++) {
            this._resolve(i);
        }
        return this;
    }

    private _resolve(phase: number) {
        this.superEntity?.resolve(phase);
        if (this._phase >= phase) {
            return;
        }

        const oldPhase = this._phase;
        this._phase = phase;
        try {
            switch (phase) {
                case 1:
                    this._declaredPropMap = this._createDeclaredProps();
                    this._idProp = this._findIdProp();
                    this._allPropMap = this._createAllProps();
                    this._expanedPropMap = this._expandProps();
                    break;
                case 2:
                    for (const prop of this.declaredPropMap.values()) {
                        prop.resolve(1);
                    }
                    for (const prop of this.declaredPropMap.values()) {
                        prop.resolve(2);
                    }
                    this._addExpandedReferencedTargetKeyProps();
                    break;
            }
        } catch (err) {
            this._phase = oldPhase;
            throw err;
        }
    }

    private _createDeclaredProps(): ReadonlyMap<string, EntityProp> {
        const declaredPropMap = new Map<string, EntityProp>();
        const instance = new this._ctor();
        for (const propName in instance) {
            if (!isValidPropName(propName)) {
                throw new PropError(
                    this.name,
                    propName,
                    dedent `Must fllow CamelCase naming convention:
                    "${CAMEL_CASE_REGEX.source}"`
                );
            }
            if (declaredPropMap.has(propName)) {
                throw new PropError(
                    this.name,
                    propName,
                    `Another model with the same name and declaring model already exists.`
                );
            }
            declaredPropMap.set(
                propName, 
                new EntityProp(this, propName, instance[propName].__data, undefined)
            );
        }
        this._collectReferenceKeyProps(declaredPropMap);
        return declaredPropMap;
    }

    private _collectReferenceKeyProps(map: Map<string, EntityProp>) {
        const newProps: Array<EntityProp> = [];
        for (const prop of map.values()) {
            const referencedTargetKeyPropName = prop.referencedTargetKeyPropName;
            if (referencedTargetKeyPropName == null) {
                continue;
            }
            const newPropName = `${prop.name}${capitalize(referencedTargetKeyPropName)}`
            if (map.has(newPropName)) {
                throw new ModelError(
                    this.name,
                    dedent `The association "${prop.toString()}" has foreign key, 
                    so the associated id property "${newPropName}" 
                    will be defined automatically, you cannot define 
                    "${newPropName}" mannually`
                );
            }
            const referenceKeyProp = new EntityProp(this, newPropName, {
                nullity: prop.nullable 
                    ? prop.inputNonNull
                        ? "INPUT_NONNULL"
                        : "NULLABLE"
                    : "NONNULL",
                scalarType: undefined,
                props: undefined,
                targetModel: undefined,
                associationType: undefined,
                columnName: undefined,
                joinColumns: undefined,
                joinTable: undefined,
                mappedBy: undefined,
                orders: undefined,
                reference: prop.name
            }, undefined);
            (referenceKeyProp as any)._setReferenceProp(prop);
            newProps.push(referenceKeyProp);
        }
        for (const prop of newProps) {
            map.set(prop.name, prop);
        }
    }

    private _findIdProp(): EntityProp {
        if (this.superEntity !== undefined) {
            return this.superEntity.idProp;
        }
        const idProp = this.declaredPropMap.get(this._idKey ?? "");
        if (idProp === undefined) {
            throw new ModelError(
                this.name,
                dedent`Specify the name of the id attribute as "${this._idKey}", 
                but there is no such attribute.`
            );
        }
        return idProp;
    }

    private _createAllProps(): ReadonlyMap<string, EntityProp> {
        if (this.superEntity === undefined) {
            return this.declaredPropMap;
        }
        const allPropMap = new Map<string, EntityProp>(this.superEntity.allPropMap);
        for (const prop of this.declaredPropMap.values()) {
            const superProp = this.superEntity.allPropMap.get(prop.name);
            if (superProp !== undefined) {
                throw new PropError(
                    this.name,
                    prop.name,
                    dedent`A property with the same name has 
                    already been defined in super-entity "${this.superEntity.name}"`
                );
            }
            allPropMap.set(prop.name, prop);
        }
        return allPropMap;
    }

    private _expandProps(): ReadonlyMap<string, EntityProp> {
        let expendedPropMap: Map<string, EntityProp> | undefined = undefined;
        for (const prop of this.allPropMap.values()) {
            if (prop.props !== undefined) {
                expendedPropMap = new Map<string, EntityProp>(this.allPropMap);
            }
            prop.collectDeeperProps(expendedPropMap!);
        }
        return expendedPropMap !== undefined ? expendedPropMap : this.allPropMap;
    }

    private _addExpandedReferencedTargetKeyProps() {
        for (const prop of this.allPropMap.values()) {
            const targetKeyProp = prop.referencedTargetKeyProp;
            if (targetKeyProp != null && targetKeyProp.props !== undefined) {
                const map = new Map<string, EntityProp>();
                targetKeyProp.collectDeeperProps(map);
                const offset = targetKeyProp.name.length;
                for (const [key, value] of map.entries()) {
                    const newKey = `${prop.name}${key.substring(offset)}`;
                    (this._expanedPropMap as Map<string, EntityProp>).set(newKey, value);
                }
            }
        }
    }

    toJSON(): any {
        return {
            entity: true,
            name: this.name
        }
    }
}

const PASCAL_CASE_REGEX = /^[A-Z][A-Za-z\d]*$/;
function isValidModelName(name: string): boolean {
  return typeof name === 'string' && 
         name.length > 0 && 
         PASCAL_CASE_REGEX.test(name);
}

const CAMEL_CASE_REGEX = /^[a-z][A-Za-z\d]*$/;
function isValidPropName(name: string): boolean {
    return typeof name === 'string' && 
         name.length > 0 && 
         CAMEL_CASE_REGEX.test(name);
}