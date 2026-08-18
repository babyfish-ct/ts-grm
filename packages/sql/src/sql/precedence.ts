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

export const enum Precedence {

    ROOT       = 0,

    // or
    OR         = 10,

    // and
    AND        = 20,

    // =, <>, <, >, <=, >=, like, ilike, in, between
    COMPARISON = 30,

    // +, -, concat
    PLUS        = 40,

    // *, /, %
    TIMES   = 50,

    // unary-, not, is null, is not null, exists, not exists
    UNARY      = 60,

    // literal, column, parameter, 
    // function, case, subquery, native
    PRIMARY    = 70, 
}