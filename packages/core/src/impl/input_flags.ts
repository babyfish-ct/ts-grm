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

export enum InputFlags {
    None = 0,
    Ref = 1 << 0,
    Key = 1 << 1,
    RefAsKey = 1 << 2,
    BackRefAsKey = 1 << 3,
    NonInsertable = 1 << 4,
    NonUpdateable = 1 << 5,
    NonWritable = NonInsertable | NonUpdateable
}