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

import { PaginationStrategy } from "./deriver";
import { OracleDriver } from "./oracle_driver";

export class Oracle12Drivier extends OracleDriver {

    get name():string {
        return "Oracle12";
    }

    get paginationStrategy(): PaginationStrategy {
        return "STANDARD_OFFSET_FETCH";
    }
}