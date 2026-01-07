import { Expression } from "./expression";

class Native {

    number(sql: string): Expression<number> {
        throw new Error();
    }
}

export const native = new Native();