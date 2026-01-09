import { count } from "./aggregate";
import { and, not, or } from "./expression";
import { num } from "./native";
import { all, any, exists, notExists, subQuery } from "./sub-query";

export const dsl = {
    subQuery,
    count,
    and,
    or,
    not,
    all,
    any,
    exists,
    notExists,
    native: {
        num
    }
};
