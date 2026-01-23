import { CodeWriter } from "@/impl/metadata/code_writer";
import { expect, test } from "vitest";

test("testCodeWriter", () => {
    const args = ["a", "b", "c"];
    const writer = new CodeWriter();
    writer
        .code("class Demo ")
        .scope("CURLY_BRACKETS", () => {
            writer
                .code("constructor")
                .scope({kind: "PARENTHESES", mutline: true}, () => {
                    for (const arg of args) {
                        writer.separator().code("readonly ").code(arg).code(": number");
                    }
                })
                .code(" ")
                .scope("CURLY_BRACKETS", () => {
                    writer.code(`console.log("Demo initialized");`).newLine();
                })
                .newLine()
                .code("start() ")
                .scope("CURLY_BRACKETS", () => {
                    writer.code(`console.log("Demo started");`).newLine();
                })
                .newLine()
                .code("stop() ")
                .scope("CURLY_BRACKETS", () => {
                    writer.code(`console.log("Demo stopped");`).newLine();
                })
                .newLine();
        });
    expect(writer.toString()).toEqual(`class Demo {
    constructor(
        readonly a: number, readonly b: number, readonly c: number) {
        console.log("Demo initialized");
    }
    start() {
        console.log("Demo started");
    }
    stop() {
        console.log("Demo stopped");
    }
}`);
});