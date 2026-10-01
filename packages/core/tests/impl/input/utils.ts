import { InputRowCollection } from "@/impl/input/input_row_collection";

export function assignIds(
    collection: InputRowCollection,
    indices: ReadonlyArray<number | {
        readonly post: boolean,
        readonly value: number;
    }>,
    scalarIndex: number,
    firstId: number
) {
    let c = collection;
    for (const index of indices) {
        if (typeof index === "number") {
            c = c.preCollections[index]!;
        } else if (index.post) {
            c = c.postCollections[index.value]!;
        } else {
            c = c.preCollections[index.value]!;
        }
    }
    let id = firstId;
    for (const row of c.rows) {
        row.set(scalarIndex, id++);
    }
}