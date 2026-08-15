import { ExpressionLike, Predicate } from "@/dsl/expression";
import { TupleSubQuery } from "@/dsl/sub_query";
import { ExprTuple, ExprTupleMatchable, NullitylessExpressions } from "@/dsl/tuple";
import { AtLeastTwo } from "@/dsl/utils";
import { Node } from "./node";
import { AbstractPred, ConstantPred } from "./pred";
import { AbstractExpr } from "./expr";
import { Visitor } from "./visitor";
import { getInternalFactory } from "./internal_factory";
import { QueryContract } from "./query";
import { ScalarProvider } from "@/schema/scalar";
import { StateError } from "@/error/common";

export class ExprTupleImpl<
    TExpressions extends AtLeastTwo<ExpressionLike>
> implements ExprTuple<TExpressions>, Node, TupleContract {

    __type(): { exprTuple: TExpressions | true } {
        return { exprTuple: true };
    }

    constructor(
        readonly exprs: ReadonlyArray<AbstractExpr<any>>
    ) {}

    eq(tuple: ExprTupleMatchable<TExpressions>): Predicate {
        return new TupleCmpPred("=", this, toTuple(tuple)) as Predicate;
    }

    ne(tuple: ExprTupleMatchable<TExpressions>): Predicate {
        return new TupleCmpPred("<>", this, toTuple(tuple)) as Predicate;
    }

    in(...tuples: ReadonlyArray<ExprTupleMatchable<TExpressions>>): Predicate {
        switch (tuples.length) {
            case 0:
                return ConstantPred.FALSE as Predicate;
            case 1:
                return new TupleCmpPred(
                    "=",
                    this,
                    toTuple(tuples[0]!)
                ) as Predicate;
            default:
                return new TupleInCollectionPred(
                    this, 
                    tuples.map(tuple => toTuple(tuple)),
                    false
                ) as Predicate;
        }
    }

    inSubQuery(subQuery: TupleSubQuery<NullitylessExpressions<TExpressions>>): Predicate {
        return new TupleInSubQueryPred(
            this,
            subQuery as any,
            false
        ) as Predicate;
    }

    notIn(...tuples: ReadonlyArray<ExprTupleMatchable<TExpressions>>): Predicate {
        switch (tuples.length) {
            case 0:
                return ConstantPred.FALSE as Predicate;
            case 1:
                return new TupleCmpPred(
                    "<>",
                    this,
                    toTuple(tuples[0]!)
                ) as Predicate;
            default:    
                return new TupleInCollectionPred(
                    this, 
                    tuples.map(tuple => toTuple(tuple)),
                    true
                ) as Predicate;
        }
    }

    notInSubQuery(subQuery: TupleSubQuery<NullitylessExpressions<TExpressions>>): Predicate {
        return new TupleInSubQueryPred(
            this,
            subQuery as any,
            true
        ) as Predicate;
    }

    accept(visitor: Visitor): void {
        visitor.visitTuple(this);
    }
}

export interface TupleContract extends Node {

    readonly exprs: ReadonlyArray<AbstractExpr<any>>;
}

export function toTuple<
    TExpressions extends AtLeastTwo<ExpressionLike> 
>(
    matchable: ExprTupleMatchable<TExpressions>
): ExprTupleImpl<TExpressions> {
    if (!Array.isArray(matchable)) {
        return matchable as ExprTupleImpl<TExpressions>;
    }
    const arr = matchable.map((v: any) => {
        if (v instanceof AbstractExpr) {
            return v;
        }
        return getInternalFactory().createLiteral(v);
    });
    return new ExprTupleImpl<TExpressions>(arr);
}

export class TupleCmpPred extends AbstractPred {

    private _providers: ReadonlyArray<ScalarProvider<any, any> | undefined> | undefined = undefined;

    constructor(
        readonly op: "=" | "<>",
        readonly leftTuple: TupleContract,
        readonly rightTuple: TupleContract
    ) {
        super();
    }

    negative(): AbstractPred {
        return new TupleCmpPred(
            this.op === "=" ? "<>" : "=",
            this.leftTuple,
            this.rightTuple
        );
    }

    accept(visitor: Visitor): void {
        visitor.visitTupleCmpPred(this);
    }

    get providers(): ReadonlyArray<ScalarProvider<any, any> | undefined> | undefined {
        let providers = this._providers;
        if (providers == null) {
            const arr1 = createProviders(this.leftTuple);
            const arr2 = createProviders(this.rightTuple);
            this._providers = providers = mergeProviders(arr1, arr2) ?? [];
        }
        return providers.length === 0 ? undefined : providers;
    }
}

export class TupleInCollectionPred extends AbstractPred {

    private _providers: ReadonlyArray<ScalarProvider<any, any> | undefined> | undefined = undefined;

    constructor(
        readonly tuple: TupleContract,
        readonly tuples: ReadonlyArray<TupleContract>,
        readonly neg: boolean = false
    ) {
        super();
    }

    negative(): AbstractPred {
        return new TupleInCollectionPred(
            this.tuple,
            this.tuples,
            !this.neg
        );
    }

    accept(visitor: Visitor): void {
        visitor.visitTupleInCollectionPred(this);
    }

    get providers(): ReadonlyArray<ScalarProvider<any, any> | undefined> | undefined {
        let providers = this._providers;
        if (providers == null) {
            this._providers = providers = createProviders(this.tuple) ?? [];
        }
        return providers.length === 0 ? undefined : providers;
    }
}

function createProviders(
    tuple: TupleContract
): Array<ScalarProvider<any, any> | undefined> | undefined {
    const span = tuple.exprs.length;
    let providers: Array<ScalarProvider<any, any> | undefined> | undefined = undefined;
    for (let i = 0; i < span; i++) {
        const expr = tuple.exprs[i]!;
        const provider = expr.scalarProvider;
        if (provider != null && providers == null) {
            providers = [];
        }
        if (providers != null) {
            providers[i] = provider;
        }
    }
    return providers;
}

function mergeProviders(
    arr1: Array<ScalarProvider<any, any> | undefined> | undefined,
    arr2: Array<ScalarProvider<any, any> | undefined> | undefined
): Array<ScalarProvider<any, any> | undefined> | undefined {
    if (arr1 == null) {
        return arr2;
    }
    if (arr2 == null) {
        return arr1;
    }
    const span = arr1.length;
    for (let i = 0; i < span; i++) {
        const sp1 = arr1[i];
        const sp2 = arr2[i];
        if (sp1 == null) {
            arr1[i] = sp2;
        } else if (sp2 == null) {
        } else if (sp1 !== sp2) {
            throw new StateError(
                `Illegal tuple comparison expression, the scalar providers of left[${i}] and right[${i}] are not same`
            );
        }
    }
    return arr1;
}

export class TupleInSubQueryPred extends AbstractPred {

    constructor(
        readonly tuple: TupleContract,
        readonly subQuery: QueryContract,
        readonly neg: boolean = false
    ) {
        super();
    }

    negative(): AbstractPred {
        return new TupleInSubQueryPred(
            this.tuple,
            this.subQuery,
            !this.neg
        );
    }

    accept(visitor: Visitor): void {
        visitor.visitTupleInSubQueryPred(this);
    }
}