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
import type { AbstractPred, CmpPred, NullityPred } from "./pred";
import type { CoalesceExpr } from "./coalesce_expr";
import { getInternalFactory, validateInValues } from "./internal_factory";
import { AbstractSelection } from "./selection";
import { Node } from "./node";
import { Visitor } from "./visitor";
import { ScalarProvider } from "@/schema/scalar";
import { ExpressionOrder } from "@/dsl/utils";
import { ExpressionSubQuery } from "@/dsl/sub_query";
import { NumericType } from "../numeric";

export abstract class AbstractExpr<T> extends AbstractSelection implements Node {

    __type(): {
        readonly selectionLike: true;
        readonly expressionLike: true;
        readonly expression: true;
        readonly anyExpression: true;
    } {
        return {
            selectionLike: true,
            expressionLike: true,
            expression: true,
            anyExpression: true
        };
    }

    asc(): ExpressionOrder {
        return getInternalFactory().createExprOrder(this, false);
    }
    
    desc(): ExpressionOrder {
        return getInternalFactory().createExprOrder(this, true);
    }

    eq(
        value: T | AbstractExpr<T>
    ): CmpPred {
        const factory = getInternalFactory();
        return factory.createCmpPred(
            "=", 
            this, 
            value instanceof AbstractExpr ? value :  factory.createLiteral(value)
        );
    }
    
    ne(
        value: T | AbstractExpr<T>
    ): CmpPred {
        const factory = getInternalFactory();
        return factory.createCmpPred(
            "<>", 
            this, 
            value instanceof AbstractExpr ? value :  factory.createLiteral(value)
        );
    }

    in(
        ...values: ReadonlyArray<T | AbstractExpr<T>>
    ): AbstractPred {
        validateInValues(values);
        const factory = getInternalFactory();
        switch (values.length) {
            case 0:
                return factory.createConstantPred(false);
            case 1:
                return factory.createCmpPred(
                    "=", 
                    this, 
                    values[0] instanceof AbstractExpr ? values[0] : factory.createLiteral(values[0])
                );
            default:
                return factory.createInCollectionPred(this, values, false);
        }
    }

    inSubQuery(
        subQuery: ExpressionSubQuery<AbstractExpr<T>>
    ): AbstractPred {
        return getInternalFactory().createInSubQueryPred(
            this,
            subQuery as any,
            false
        );
    }

    notIn(
        ...values: ReadonlyArray<T | AbstractExpr<T>>
    ): AbstractPred {
        validateInValues(values);
        const factory = getInternalFactory();
        switch (values.length) {
            case 0:
                return factory.createConstantPred(true);
            case 1:
                return factory.createCmpPred(
                    "<>", 
                    this, 
                    values[0] instanceof AbstractExpr ? values[0] : factory.createLiteral(values[0])
                );
            default:
                return factory.createInCollectionPred(this, values, true);
        }
    }

    notInSubQuery(
        subQuery: ExpressionSubQuery<AbstractExpr<T>>
    ): AbstractPred {
        return getInternalFactory().createInSubQueryPred(
            this,
            subQuery as any,
            true
        );
    }

    eqIf(
        value: T | null | undefined
    ): CmpPred | undefined {
        if (value == null) {
            return undefined;
        }
        const factory = getInternalFactory();
        return factory.createCmpPred(
            "=", 
            this, 
            factory.createLiteral(value)
        );
    }
    
    neIf(
        value: T | null | undefined
    ): CmpPred | undefined {
        if (value == null) {
            return undefined;
        }
        const factory = getInternalFactory();
        return factory.createCmpPred(
            "<>", 
            this, 
            factory.createLiteral(value)
        );
    }

    inIf(
        values: T[] | null | undefined
    ): AbstractPred | undefined {
        if (values == null) {
            return undefined;
        }
        validateInValues(values);
        const factory = getInternalFactory();
        if (values.length === 1) {
            return factory.createCmpPred(
                "=", 
                this, 
                factory.createLiteral(values[0])
            );
        }
        return factory.createInCollectionPred(this, values, false);
    }

    notInIf(
        values: T[] | null | never
    ): AbstractExpr<boolean> | undefined {
        if (values == null) {
            return undefined;
        }
        validateInValues(values);
        const factory = getInternalFactory();
        if (values.length === 1) {
            return factory.createCmpPred(
                "<>", 
                this, 
                factory.createLiteral(values[0])
            );
        }
        return factory.createInCollectionPred(this, values, true);
    }

    isNull(): NullityPred {
        return getInternalFactory().createNullityPred(this, false);
    }

    isNotNull(): NullityPred {
        return getInternalFactory().createNullityPred(this, true);
    }
    
    coalesce(
        values: ReadonlyArray<T | AbstractExpr<T>>
    ): CoalesceExpr<T> {
        const factory = getInternalFactory();
        const arr = values.map(value => {
            if (value == null) {
                throw new ArgumentError("coalesce does not accept null/undefined value");
            }
            if (value instanceof AbstractExpr) {
                return value;
            }
            return factory.createLiteral(value);
        });
        return factory.createCoalesceExpr(this, arr);
    }

    asNonNull(): this {
        return this;
    }

    get isValueExpr(): boolean {
        return false;
    }

    get isPropExpr(): boolean {
        return false;
    }

    abstract accept(visitor: Visitor): void;

    get scalarProvider(): ScalarProvider<any, any> | undefined {
        return undefined;
    }

    get numericType(): NumericType {
        return NumericType.NONE;
    }
}

export abstract class AbstractCmpExpr<T> extends AbstractExpr<T> {

    __type(): { 
        readonly selectionLike: true;
        readonly expressionLike: true;
        readonly expression: true;
        readonly anyExpression: true;
        readonly cmpExpression: true;
    } {
        return {
            selectionLike: true,
            expressionLike: true,
            expression: true,
            anyExpression: true,
            cmpExpression: true
        };
    }

    lt(
        value: T | AbstractCmpExpr<T>
    ): CmpPred {
        const factory = getInternalFactory();
        return factory.createCmpPred(
            "<", 
            this, 
            value instanceof AbstractExpr ? value :  factory.createLiteral(value)
        );
    }
    
    lte(
        value: T | AbstractCmpExpr<T>
    ): CmpPred {
        const factory = getInternalFactory();
        return factory.createCmpPred(
            "<=", 
            this, 
            value instanceof AbstractExpr ? value :  factory.createLiteral(value)
        );
    }
    
    gt(
        value: T | AbstractCmpExpr<T>
    ): CmpPred {
        const factory = getInternalFactory();
        return factory.createCmpPred(
            ">", 
            this, 
            value instanceof AbstractExpr ? value :  factory.createLiteral(value)
        );
    }
    
    gte(
        value: T | AbstractCmpExpr<T>
    ): CmpPred {
        const factory = getInternalFactory();
        return factory.createCmpPred(
            ">=", 
            this, 
            value instanceof AbstractExpr ? value : factory.createLiteral(value)
        );
    }

    between(
        min: T | AbstractCmpExpr<T>,
        max: T | AbstractCmpExpr<T>
    ): AbstractPred {
        const factory = getInternalFactory();
        return factory.createBetweenPred(
            this,
            min instanceof AbstractCmpExpr ? min : factory.createLiteral(min),
            max instanceof AbstractCmpExpr ? max : factory.createLiteral(max)
        ); 
    }
    
    ltIf(
        value: T | null | undefined
    ): CmpPred | undefined {
        if (value == null) {
            return undefined;
        }
        const factory = getInternalFactory();
        return factory.createCmpPred(
            "<", 
            this, 
            factory.createLiteral(value)
        );
    }
    
    lteIf(
        value: T | null | undefined
    ): CmpPred | undefined {
        if (value == null) {
            return undefined;
        }
        const factory = getInternalFactory();
        return factory.createCmpPred(
            "<=", 
            this, 
            factory.createLiteral(value)
        );
    }
    
    gtIf(
        value: T | null | undefined
    ): CmpPred | undefined {
        if (value == null) {
            return undefined;
        }
        const factory = getInternalFactory();
        return factory.createCmpPred(
            ">", 
            this, 
            factory.createLiteral(value)
        );
    }
    
    gteIf(
        value: T | null | undefined
    ): CmpPred | undefined {
        if (value == null) {
            return undefined;
        }
        const factory = getInternalFactory();
        return factory.createCmpPred(
            ">=", 
            this, 
            factory.createLiteral(value)
        );
    }

    betweenIf(
        min: T | null | undefined,
        max: T | null | undefined
    ): AbstractPred | undefined {
        if (min == null || max == null) {
            return undefined;
        }
        if (min == null) {
            return this.lte(max);
        }
        if (max == null) {
            return this.gte(min);
        }
        const factory = getInternalFactory();
        return factory.createBetweenPred(
            this,
            factory.createLiteral(min),
            factory.createLiteral(max)
        );
    }

    override coalesce(
        values: ReadonlyArray<T | AbstractCmpExpr<T>>
    ): CoalesceExpr<T> {
        const factory = getInternalFactory();
        const arr = values.map(value => {
            if (value == null) {
                // throw new ArgumentError("coalesce does not accept null/undefined value");
            }
            if (value instanceof AbstractExpr) {
                return value;
            }
            return factory.createLiteral(value) as AbstractCmpExpr<T>;
        });
        return factory.createCoalesceExpr(this, arr);
    }
}
