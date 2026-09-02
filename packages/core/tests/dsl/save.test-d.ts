import { SqlClient } from "@/dsl";
import { dto, Input, TypeOf } from "@/index";
import { describe, it } from "vitest";
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

    it("saveOptions", async () => {
        const input = dto.input(TREE_NODE, c => [
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
        await sqlClient.save(input, makeObj(input), {
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
    });
});