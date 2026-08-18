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

export type { NodeRender, NodeRenderContext } from "./node_render";
export { AbstractDriver } from "./abstract_drivier";
export { SqliteNodeRender } from "./sqlite_driver";
export { PostgresNodeRender } from "./postgres_driver";
export { MySqlNodeRender } from "./mysql_driver";
export { OracleNodeRender } from "./oracle_driver";
export { SqlServerNodeRender } from "./sqlserver_driver";