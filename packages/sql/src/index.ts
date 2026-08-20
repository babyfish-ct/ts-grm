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

export { newSqlClient } from "./sql_client";
export { sqlerr } from "./error";
export type { SqlClientOptions, Filter, AnyFilter } from "./cfg";
export { FilterManager } from "./cfg";
export { 
    SqliteDriver, 
    PostgresDriver, 
    MySqlDriver, 
    OracleDriver, 
    Oracle12Drivier, 
    SqlServerDriver, 
    SqlServer2012Driver 
} from "./driver";
export { 
    OraclePool,
    SqlServerPool 
} from "./transaction";

export * as spi from "./index_spi";