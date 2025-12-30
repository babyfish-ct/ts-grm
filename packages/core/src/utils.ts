export type Prettify<T> = 
    T extends Array<infer U>
        ? Prettify<U>[]
        : T extends object
            ? { [K in keyof T & string]: Prettify<T[K]> }
            : T;

export type FilterNever<T> = {
  [K in keyof T as T[K] extends never ? never : K]: T[K]
};

