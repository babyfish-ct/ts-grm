import { NodeRenderContext } from "@/index_spi";
import { Composite, Scope, Value } from "./fragment";
import { Precedence } from "./precedence";
import { Stack } from "./stack";
import { spi } from "@ts-grm/core";

export function createRenderTools(
    driverName: string,
    visitor: spi.Visitor
): [
    Stack<Composite>,
    Stack<number>,
    NodeRenderContext
] {
    const compositeStack = new class extends Stack<Composite> {
        constructor() {
            super(undefined);
        }
        override with(composite: Composite | undefined): Disposable {
            if (composite == null) {
                return super.with(undefined);
            }
            const parent = this.currentOrUndefined;
            if (parent != null) {
                parent.add(composite);
            }
            return super.with(composite);
        }
    };
    const precedenceStack = new class extends Stack<number> {
        constructor() {
            super(Precedence.ROOT);
        }

        override with(precedence: number): Disposable {
            const current = this.current;
            const disposable = super.with(precedence);
            if (precedence === Precedence.ROOT) {
                return disposable;
            }
            if (current <= precedence) {
                return disposable;
            }
            const noIndentParenDisposable = compositeStack.with(new Scope("NO_INDENT_PAREN"));
            return {
                [Symbol.dispose]() {
                    noIndentParenDisposable[Symbol.dispose]();
                    disposable[Symbol.dispose]();
                }
            };
        }
    };
    const nodeRenderContext = new class implements NodeRenderContext {

        get driverName(): string {
            return driverName;
        }

        text(value: string): void {
            compositeStack.current.add(value);
        }
        
        separator(): void {
            compositeStack.current.separator();
        }
    
        withComposite(composite: Composite): Disposable {
            return compositeStack.with(composite);
        }
    
        withPrecedence(precedence: number): Disposable {
            return precedenceStack.with(precedence);
        }
    
        render(node: spi.Node | Value | string): void {
            if (typeof node === "string") {
                compositeStack.current.add(node);
            } else if (node instanceof Value) {
                compositeStack.current.add(node);
            } else {
                node.accept(visitor);
            }
        }
    };
    return [
        compositeStack,
        precedenceStack,
        nodeRenderContext
    ];
}
