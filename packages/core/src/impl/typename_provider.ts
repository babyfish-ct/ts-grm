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

import { ScalarProvider } from "@/schema/scalar";
import { Entity } from "./entity";

export function createTypeNameProvider(
    entity: Entity
): ScalarProvider<any, any> | undefined {
    const discriminator = entity.tableSettings.discriminator;
    if (discriminator == null) {
        return undefined;
    }
    
}