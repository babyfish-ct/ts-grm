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

export type { Driver } from "./deriver";
export { SqliteDriver } from "./sqlite_driver";
export { PostgresDriver } from "./postgres_driver";
export { MySqlDriver } from "./mysql_driver";
export { OracleDriver } from "./oracle_driver";
export { Oracle12Drivier } from "./oracle12_driver";
export { SqlServerDriver } from "./sqlserver_driver";
export { SqlServer2012Driver } from "./sqlserver2012_driver";