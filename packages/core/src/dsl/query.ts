import { Expression } from "./expression";

export interface Query<T> {
    
    __type(): {
        query: T | undefined;
    };
}

export interface RootQuery<T> extends Query<T> {

    __type(): {
        query: T | undefined;
        rootQuery: T | undefined;
    };
}

export interface SubQuery<T> extends Query<T> {

    __type(): {
        query: T | undefined;
        subQuery: T | undefined;
    };
}

export interface BaseQuery<T> extends Query<T> {

    __type(): {
        query: T | undefined;
        baseQuery: T | undefined;
    };
}

export function select(selection: Selection) {

}

export type Selection =
    SelectedView<any, any> |
    Expression<any>;

export type SelectedTypeOf<TSelection extends Selection> =
    TSelection extends SelectedView<any, infer R>
        ? R
    : TSelection extends Expression<infer R>
        ? R
    : never;

export interface SelectedView<TName extends string, X> {

    __type(): {
        selectedView: [TName, X] | undefined
    };
};
