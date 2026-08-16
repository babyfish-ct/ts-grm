import { PaginationStrategy } from "./deriver";
import { OracleDriver } from "./oracle_driver";

export class Oracle12Drivier extends OracleDriver {

    get paginationStrategy(): PaginationStrategy {
        return "STANDARD_OFFSET_FETCH";
    }
}