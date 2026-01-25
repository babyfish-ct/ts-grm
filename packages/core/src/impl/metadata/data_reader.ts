export interface DataReader {

    next(): boolean;

    get(col: number): any;
}