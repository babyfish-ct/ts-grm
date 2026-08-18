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

export { AbstractSyncPool } from "./abstract_sync_pool";
export type { TransactionManager } from "./transaction_manger";
export { AbstractTransactionManager } from "./abstract_transaction_manager";
export { SqliteTransactionManager } from "./sqlite_transaction_manager";
export { PostgresTransactionManager } from "./postgres_transaction_manager";
export { MySqlTransactionManager } from "./mysql_transaction_manager";
export { OracleTransactionManager } from "./oracle_transaction_manager";
export { SqlServerTransactionManager } from "./sqlserver_transaction_manager";
export type { 
    Executor, 
    Purpose, 
    QueryPurpose, 
    LoadAssociationPurpose, 
    LoadCalculatorPurpose, 
    LoadRecursiveTreePurpose, 
    LoadRecursiveTreeKeyPurpose, 
    LoadRecursiveTreeNodePurpose 
} from "./executor";
export { AbstractExecutorWrapper } from "./executor";