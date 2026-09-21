import { describe, it } from "vitest";

describe("JoinEntityInputTest", () => {

    it(() => {});

    // it("explicit", () => {
        
    //     const input = dto.input(STUDENT, c => [
    //         c.name.key(),
    //         c.learningLinks.backRefAsKey().with(c => [
    //             c.course.key().with(c => [
    //                 c.name.key()
    //             ])
    //         ])
    //     ]);
        
    //     const reader = input.mapper.inputRowReader();
    //     expectCode(reader.constructor.toString(), `
    //         class extends $baseClass {

    //             constructor() {
    //                 super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
    //             }
    //             read(parent, input) {
    //                 return [input.name, undefined];
    //             }
    //         }
    //     `);

    //     const learningLinkReader = reader.postAssociatedMap.get("learningLinks")!;
    //     console.log(learningLinkReader.constructor.toString())
    // });

    // it("implicit", () => {
        
    //     const input = dto.input(STUDENT, c => [
    //         c.name,
    //         c.courses.with(c => [
    //             c.name.key()
    //         ])
    //     ]);
    //     console.log(JSON.stringify(mapperJson(input.mapper)));

    //     const reader = input.mapper.inputRowReader();
    //     expectCode(reader.constructor.toString(), `
    //         class extends $baseClass {

    //             constructor() {
    //                 super($entity, $fields, $keyIndices, $insertIndices, $updateIndices, $returnIndices, $preAssociatedMap, $postAssociatedLazyCreatorMap);
    //             }
    //             read(parent, input) {
    //                 return [input.name, undefined];
    //             }
    //         }
    //     `);

    //     console.log(reader.postAssociatedMap)
    // });
});