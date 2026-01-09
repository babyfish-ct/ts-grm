export type ExpressionOrder = {
    __type(): { expressionOrder: undefined }
};

export type AtLeastOne<T> = [T, ...T[]];
export type AtLeastTwo<T> = [T, T, ...[]];
