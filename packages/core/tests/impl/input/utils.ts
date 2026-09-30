import { InputRowCollection } from "@/impl/input/input_row_collection";

export function assignIds(
    collection: InputRowCollection,
    preIndices: ReadonlyArray<number>,
    scalarIndex: number,
    firstId: number
) {
    let c = collection;
    for (const preIndex of preIndices) {
        c = c.preCollections[preIndex]!;
    }
    let id = firstId;
    for (const row of c.rows) {
        row.set(scalarIndex, id++);
    }
}