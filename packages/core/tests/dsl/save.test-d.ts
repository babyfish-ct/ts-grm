import { SqlClient } from "@/dsl";
import { dto, Input, TypeOf } from "@/index";
import { describe, expectTypeOf, it } from "vitest";
import { ITEM, TREE_NODE } from "../model/model";

describe("SaveTest", () => {

    function createSqlClient(): SqlClient {
        throw new Error("Not implemented");
    }

    const sqlClient = createSqlClient();

    function makeObj<
        TInput extends Input<any, any, any>
    >(
        _: TInput
    ): TypeOf<TInput> {
        throw new Error("Not implemented");
    }

    const INPUT = dto.input(TREE_NODE, c => [
        c.name.key(),
        c.childNodes.with(c => [
            c.name.key(),
            c.$instanceOf(ITEM, c => [
                c.tags
            ]),
            c.childNodes.with(c => [
                c.name
            ])
        ])
    ]);

    const VIEW = dto.view(TREE_NODE, c => [
        c.name,
        c.$flat("parentNode").prefix("parent").with(c => [
            c.name,
            c.$flat("parentNode").prefix("parent").with(c => [
                c.name
            ])
        ])
    ]);

    it("saveOne", async () => {
        const result = await sqlClient.save(INPUT, makeObj(INPUT), {
            root: "UPDATE",
            associated: {
                "childNodes": "VIOLENTLY_REPLACE",
                "childNodes.tags": "APPEND_IF_ABSENT"
            },
            onDissocate: {
                "childNodes": "SET_NULL",
                "childNodes.childNodes": "DELETE"
            }
        });
        expectTypeOf<typeof result>().toEqualTypeOf<{
            affectedRows: {
                $total: number;
                childNodes: number;
                "childNodes.childNodes": number;
                "childNodes.tags": number;
            };
        }>();
    });

    it("saveOneWithView", async () => {
        const result = await sqlClient.save(INPUT, makeObj(INPUT), {
            root: "UPDATE",
            associated: {
                "childNodes": "VIOLENTLY_REPLACE",
                "childNodes.tags": "APPEND_IF_ABSENT"
            },
            onDissocate: {
                "childNodes": "SET_NULL",
                "childNodes.childNodes": "DELETE"
            },
            view: VIEW
        });
        expectTypeOf<typeof result>().toEqualTypeOf<{
            affectedRows: {
                $total: number;
                childNodes: number;
                "childNodes.childNodes": number;
                "childNodes.tags": number;
            };
            row: {
                name: string;
                parentName: string | null;
                parentParentName: string | null;
            };
        }>();
    });

    it("saveMany", async () => {
        const result = await sqlClient.save(INPUT, [makeObj(INPUT)], {
            root: "UPDATE",
            associated: {
                "childNodes": "VIOLENTLY_REPLACE",
                "childNodes.tags": "APPEND_IF_ABSENT"
            },
            onDissocate: {
                "childNodes": "SET_NULL",
                "childNodes.childNodes": "DELETE"
            }
        });
        expectTypeOf<typeof result>().toEqualTypeOf<{
            affectedRows: {
                $total: number;
                childNodes: number;
                "childNodes.childNodes": number;
                "childNodes.tags": number;
            };
        }>();
    });

    it("saveManyWithView", async () => {
        const result = await sqlClient.save(INPUT, [makeObj(INPUT)], {
            root: "UPDATE",
            associated: {
                "childNodes": "VIOLENTLY_REPLACE",
                "childNodes.tags": "APPEND_IF_ABSENT"
            },
            onDissocate: {
                "childNodes": "SET_NULL",
                "childNodes.childNodes": "DELETE"
            },
            view: VIEW
        });
        expectTypeOf<typeof result>().toEqualTypeOf<{
            affectedRows: {
                $total: number;
                childNodes: number;
                "childNodes.childNodes": number;
                "childNodes.tags": number;
            };
            rows: {
                name: string;
                parentName: string | null;
                parentParentName: string | null;
            }[];
        }>();
    });
});