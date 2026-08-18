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

import { AtLeastOne } from "@/dsl/utils";
import { Entity } from "../impl/entity";
import { ALL_MODEL_MAP, ModelImpl } from "../impl/model_impl";
import { AtLeastTwo } from "@/dsl/utils";
import { ArgumentError } from "@/error/common";
import path from "node:path";
import fs from "node:fs";
import { AnyModel } from "./model";

export class EntityManager {

    private _entities: ReadonlySet<Entity> | undefined = undefined;

    private constructor(
        private readonly _getter: () => Promise<ReadonlySet<Entity>>
    ) {}

    async entities(): Promise<ReadonlySet<Entity>> {
        let entities = this._entities;
        if (entities != null) {
            return entities;
        }
        this._entities = entities = await this._getter();
        return entities;
    }

    /**
     * EntityManager.of - Load model files
     * 
     * @param baseDir - Base directory for relative paths, the typical value is `__dirname`
     * @param modelPaths - Relative paths to model files (compiled JavaScript files)
     * 
     * IMPORTANT: 
     * - Model files must be pre-compiled to JavaScript
     * - Path aliases (@/) must be resolved by your build tool (tsc, swc, esbuild)
     * - Use compiled files from dist/ directory
     * 
     * @example
     * // First compile TypeScript models
     * // tsc --outDir dist
     * 
     * // Then load compiled models
     * EntityManager.of(__baseDir, './dist/models/user.js')
     */
    static of(
        baseDir: string,
        ...modelPaths: AtLeastOne<string>
    ): EntityManager {
        if (!fs.statSync(baseDir).isDirectory()) {
            throw new ArgumentError(`The baseDir "${baseDir}" is not a directory`);
        }
        const getter = async (): Promise<ReadonlySet<Entity>> => {
            const ctx: LoadingContext = {
                baseDir,
                visitedAbsPaths: new Set()
            }
            for (const path of modelPaths) {
                await EntityManager._load(path, ctx);
            }
            const entities = new Set<Entity>();
            for (const model of ALL_MODEL_MAP.values()) {
                EntityManager._add(Entity.of(model), entities);
            }
            return entities;
        };
        return new EntityManager(getter);
    }

    static combine(
        ...parts: AtLeastTwo<EntityManager | EntityManagerExclusivity | AnyModel | Entity>
    ): EntityManager {
        const getter = async (): Promise<ReadonlySet<Entity>> => {
            const rootEntities = new Set<Entity>();
            for (const part of parts) {
                if (part instanceof ModelImpl) {
                    rootEntities.add(Entity.of(part as AnyModel));
                } else if (part instanceof Entity) {
                    rootEntities.add(part);
                } else if (part instanceof EntityManager) {
                    for (const entity of await part.entities()) {
                        rootEntities.add(entity);
                    }
                }
            }
            for (const part of parts) {
                if (part instanceof EntityManagerExclusivity) {
                    for (const entity of await part.entityManager.entities()) {
                        rootEntities.delete(entity);
                    }
                }
            }
            const entities = new Set<Entity>();
            for (const rootEntity of rootEntities) {
                EntityManager._add(rootEntity, entities);
            }
            return entities;
        };
        return new EntityManager(getter);
    }

    private static _add(entity: Entity | undefined, entities: Set<Entity>) {
        if (entity == null || entities.has(entity)) {
            return;
        }
        entities.add(entity);
        EntityManager._add(entity.superEntity, entities);
        for (const prop of entity.declaredPropMap.values()) {
            EntityManager._add(prop.middleEntity?.entity, entities);
            EntityManager._add(prop.targetEntity, entities);
        }
    }

    filter(
        fn: (entity: Entity) => boolean
    ): EntityManager {
        const getter = async (): Promise<ReadonlySet<Entity>> => {
            const entities = new Set<Entity>();
            for (const entity of await this._getter()) {
                if (fn(entity)) {
                    entities.add(entity);
                }
            }
            return entities;
        };
        return new EntityManager(getter);
    }

    exclusive(): EntityManagerExclusivity {
        return new EntityManagerExclusivity(this);
    }

    private static async _load(
        relPath: string, 
        ctx: LoadingContext
    ): Promise<void> {
        if (!relPath.startsWith("./") && !relPath.startsWith("../")) {
            throw new ArgumentError(
                `Illegal path "${relPath}", it must be relative path which starts with "./" or "../"`
            );
        }
        const absPath = path.resolve(ctx.baseDir, relPath);
        if (!fs.existsSync(absPath)) {
            throw new ArgumentError(
                `Illegal path "${relPath}" which does not exists`
            );
        }
        await EntityManager._loadAbs(absPath, ctx);
    }

    private static async _loadAbs(
        absPath: string, ctx: LoadingContext
    ): Promise<void> {
        if (ctx.visitedAbsPaths.has(absPath)) {
            return;
        }
        ctx.visitedAbsPaths.add(absPath);
        const stat = fs.statSync(absPath);
        if (stat.isFile()) {
            if (absPath.endsWith(".js") || absPath.endsWith(".ts")) {
                await import(absPath);
            }
        } else if (stat.isDirectory()) {
            const entries = fs.readdirSync(absPath);
            for (const entry of entries) {
                await EntityManager._loadAbs(path.join(absPath, entry), ctx);
            }
        }
    }
}

class EntityManagerExclusivity {
    
    constructor(
        readonly entityManager: EntityManager
    ) {

    }
}

export type LoadingContext = {

    readonly baseDir: string;

    readonly visitedAbsPaths: Set<string>;
};