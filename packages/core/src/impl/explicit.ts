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

export enum ExplicitDataType {
    NONE = 0,
    BOOL = 1,
    INTEGER = 2,
    FLOAT = 3,
    STRING = 4,
    DATETIME = 5
}

export function mergeExplicitDataType(
    a: ExplicitDataType,
    b: ExplicitDataType
): ExplicitDataType {
    return a > b ? a : b;
}