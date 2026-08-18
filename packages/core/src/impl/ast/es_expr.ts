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

import { ArgumentError } from "@/error/common";
import { AbstractExpr } from "./expr";
import { getInternalFactory } from "./internal_factory";
import type { CoalesceEsExpr } from "./coalesce_expr";
import { EsOpPred } from "./pred";

export abstract class AbstractEsExpr<T extends string> extends AbstractExpr<T> {

    override coalesce(
        values: ReadonlyArray<T | AbstractEsExpr<T>>
    ): CoalesceEsExpr<T> {
        const arr = values.map(value => {
            if (value == null) {
                throw new ArgumentError("coalesce does not accept null/undefined value");
            }
            if (value instanceof AbstractEsExpr) {
                return value;
            }
            return getInternalFactory().createLiteral(value, "AS_ENUM_SET");
        });
        return getInternalFactory().createCoalesceEsExpr(this, arr);
    }

    containsAny(...values: ReadonlyArray<T>): EsOpPred {
        return new EsOpPred("CONTAINS_ANY", this, values);
    }

    notContainsAny(...values: ReadonlyArray<T>): EsOpPred {
        return new EsOpPred("NOT_CONTAINS_ANY", this, values);
    }

    containsAll(...values: ReadonlyArray<T>): EsOpPred {
        return new EsOpPred("CONTAINS_ALL", this, values);
    }

    notContainsAll(...values: ReadonlyArray<T>): EsOpPred {
        return new EsOpPred("NOT_CONTAINS_ALL", this, values);
    }
}
