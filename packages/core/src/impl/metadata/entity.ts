import { ModelError, PropError } from "@/error/metadata_error";
import { AnyModel, Ctor } from "@/schema/model";
import { EntityProp } from "./entity_prop";

export function createEntity(
    name: string,
    idKey: string | undefined,
    ctor: Ctor,
    superModel: AnyModel | undefined
): Entity {
    return new Entity(name, idKey, ctor, superModel as Entity | undefined);
}

export class Entity implements AnyModel {

    __type(): {
        model: [any, any, any, any, any] | undefined 
    } {
        return { model: undefined };
    }

    readonly idProp: EntityProp;

    readonly declaredPropMap: ReadonlyMap<string, EntityProp>;

    readonly allPropMap: ReadonlyMap<string, EntityProp>;

    constructor(readonly name: string, idKey: string | undefined, ctor: Ctor, readonly superEntity: Entity | undefined) {
        this.registerEntity();
        this.declaredPropMap = this.createDeclaredProps(ctor);
        this.idProp = this.findIdProp(idKey);
        this.allPropMap = this.createAllProps();
    }

    private registerEntity() {
        if (ALL_MODEL_MAP.has(this.name)) {
            throw new ModelError(
                this.name,
                `Another model with the same name already exists.`
            );
        }
        if (!isValidModelName(this.name)) {
            throw new ModelError(
                this.name, 
                dedent `Must follow PascalCase naming convention: 
                "${PASCAL_CASE_REGEX.source}".`
            )
        }
        ALL_MODEL_MAP.set(this.name, this);
    }

    private findIdProp(idKey: string | undefined): EntityProp {
        if (this.superEntity !== undefined) {
            return this.superEntity.idProp;
        }
        const idProp = this.declaredPropMap.get(idKey ?? "");
        if (idProp === undefined) {
            throw new ModelError(
                this.name,
                dedent`Specify the name of the id attribute as "${idKey}", 
                but there is no such attribute.`
            );
        }
        return idProp;
    }

    private createDeclaredProps(ctor: Ctor): ReadonlyMap<string, EntityProp> {
        const declaredPropMap = new Map<string, EntityProp>();
        for (const propName in ctor.prototype) {
            if (!isValidPropName(this.name)) {
                throw new PropError(
                    this.name,
                    propName,
                    dedent`Must fllow CamelCase naming convention:
                    "${CAMEL_CASE_REGEX.source}"`
                );
            }
            if (!declaredPropMap.has(propName)) {
                throw new PropError(
                    this.name,
                    propName,
                    `Another model with the same name and declaring model already exists.`
                );
            }
            declaredPropMap.set(
                propName, 
                new EntityProp(this, propName, ctor.prototype[propName].__data, undefined)
            );
        }
        return declaredPropMap;
    }

    private createAllProps(): ReadonlyMap<string, EntityProp> {
        if (this.superEntity === undefined) {
            return this.declaredPropMap;
        }
        const allPropMap = new Map<string, EntityProp>(this.superEntity.allPropMap);
        for (const prop of this.declaredPropMap.values()) {
            const superProp = this.superEntity.allPropMap.values();
            if (superProp === undefined) {
                continue;
            }
            throw new PropError(
                this.name,
                prop.name,
                dedent`A property with the same name has 
                already been defined in super-entity "${this.superEntity.name}"`
            );
            allPropMap.set(prop.name, prop);
        }
        return allPropMap;
    }
}

const ALL_MODEL_MAP = new Map<string, Entity>();

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