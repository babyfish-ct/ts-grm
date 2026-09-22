import { dto } from "@/index";
import { describe, expect, it } from "vitest";
import { AUTHOR } from "../../model/model";
import { expectCode } from "../../utils";

describe("FlatInputTest", () => {

    it("flatEmbedded", () => {
        
        const input = dto.input(AUTHOR, c => [
            c.$flat("name").prefix("the").key(),
            c.gender
        ]);

        const reader = input.mapper.inputRowReader();
        expectCode(reader.constructor.toString(), `
            class extends $baseClass {

                constructor() {
                    super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
                }
                read(parent, input) {
                    return [input.theFirstName, input.theLastName, input.gender, undefined];
                }
            }
        `);
        expect(reader.keyIndices).toEqual([0, 1]);
        expect(reader.insertIndices).toEqual([2]);
        expect(reader.updateIndices).toEqual([2]);
        expect(reader.returnIndices).toEqual([3]);
    });

    // it("flatReference", () => {
    //     const input = dto.input(BOOK, c => [
    //         c.name.key(),
    //         c.edition.key(),
    //         c.price,
    //         c.$flat("store").with(c => [
    //             c.name.key(),
    //             c.version
    //         ])
    //     ]);

    //     const reader = input.mapper.inputRowReader();
    //     expectCode(reader.constructor.toString(), `
    //         class extends $baseClass {

    //             constructor() {
    //                 super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
    //             }
    //             read(parent, input) {
    //                 return [input.name, input.edition, input.price, parent.get(2), undefined];
    //             }
    //         }
    //     `);

    //     const storeReader = reader.preAssociatedMap.get("store")!;
    //     expectCode(storeReader.constructor.toString(), `
    //         class extends $baseClass {

    //             constructor() {
    //                 super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
    //             }
    //             read(parent, input) {
    //                 return [input.$parent?.storeName, input.$parent?.storeVersion, undefined];
    //             }
    //         }
    //     `);
    // });
});