import { PaginationStrategy } from "./deriver";
import { SqlServerDriver } from "./sqlserver_driver";

export class SqlServer2012Driver extends SqlServerDriver {

    get paginationStrategy(): PaginationStrategy {
        return "STANDARD_OFFSET_FETCH";
    }
}