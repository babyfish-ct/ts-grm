/*
 * ts-grm is a pure TypeScript database ORM built on type-level programming.
 * 
 * Design principles:
 * - Zero code generation, pure TypeScript type inference
 * - No entity object instantiation — maps database rows directly to DTOs
 * - No runtime reflection — performance on par with handwritten SQL
 * - Full type safety, full SQL features
 * - Like GraphQL, clients can query exact shape of data they need
 * - Like the inversed GraphQL, clients can save exact shape of data they need
 * 
 * @author 陈涛 (Chen Tao)
 */

import { err } from "@ts-grm/core";

/**
 * A lightweight stack implementation optimized for short-lived rendering contexts.
 * 
 * While JavaScript's native Array provides push/pop operations, this custom Stack
 * is designed specifically for SQL fragments rendering scenarios where:
 * 
 * 1. Lifecycle: Stack instances are short-lived (function-scoped), created during
 *    rendering and immediately garbage-collected when done.
 * 
 * 2. Capacity strategy: Pre-allocates a modest initial capacity (20 slots) and 
 *    adopts a lazy shrinking policy. Since the entire stack object is ephemeral,
 *    there's no need for aggressive memory reclamation on pop() operations.
 * 
 * 3. Semantic clarity: Provides a focused API (push/pop/current) without the 
 *    dozens of array methods that are irrelevant to stack operations.
 * 
 * 4. GC efficiency: When the stack goes out of scope, the underlying array is
 *    collected as a unit, making per-operation cleanup less critical than it
 *    would be for a long-lived general-purpose array.
 * 
 * This design prioritizes simplicity and performance for the specific use case
 * over the flexibility of a general-purpose data structure.
 */
export class Stack<E> {

    private readonly _arr: Array<E | undefined> = new Array(20);

    private _size = 0;

    /**
     * IMPORTANT: Single Disposable Optimization
     * 
     * CORE INSIGHT:
     * =============
     * This optimization leverages a fundamental property of well-structured code:
     * when operations are properly nested, the context needed for cleanup is ALWAYS
     * at the top of the stack at disposal time. Therefore, the disposable object
     * doesn't need to remember anything - the runtime state already contains all
     * necessary information.
     * 
     * WHY THIS IS SAFE:
     * =================
     * This optimization relies on TWO CRITICAL ASSUMPTIONS that MUST NEVER be violated:
     * 
     * 1. PURE SYNCHRONOUS EXECUTION (NO ASYNC)
     *    - JavaScript is single-threaded and executes synchronously by default
     *    - The order of [Symbol.dispose] calls is guaranteed to be LIFO (Last-In-First-Out)
     *    - No async operations, no timers, no Promises, no event loop interleaving
     *    - Example of safe flow:
     *      using a = ctx.with(scope1); // push scope1
     *      using b = ctx.with(scope2); // push scope2
     *    } // 1. dispose called: performs operation corresponding to scope2
     *    } // 2. dispose called: performs operation corresponding to scope1
     * 
     * 2. OPERATIONS ARE CONTEXT-DERIVED, NOT IDENTITY-DEPENDENT
     *    - The with() method establishes a new context (push, open, begin, etc.)
     *    - The dispose() method performs the corresponding closing operation
     *    - The closing operation MUST ONLY depend on the CURRENT STACK STATE
     *    - It must NOT need to know WHICH specific scope triggered it
     * 
     *    Valid operations (identity-blind):
     *    ✓ Stack: pop() - always remove top, regardless of which scope
     *    ✓ Parentheses: append(')') - always close last opened, regardless of operator
     *    ✓ Indentation: indentLevel-- - always decrease level, regardless of block
     *    ✓ Tag closing: append('</tag>') - tag name from stack, not from disposable
     *    ✓ Transaction: rollback to savepoint - savepoint from stack state
     * 
     *    Invalid operations (identity-dependent):
     *    ✗ Need to know specific scope value to clean up
     *    ✗ Conditional logic based on which scope is being disposed
     *    ✗ Storing scope references for later use
     * 
     * WHY REUSING THE SAME DISPOSABLE WORKS:
     * ======================================
     * The disposable object acts purely as a "witness" to the scope's existence.
     * Since the closing operation can be determined solely from the current stack
     * state at the moment of disposal, the disposable itself needs no memory.
     * 
     * Think of it like parentheses in an expression:
     *   using _ = with('*'); // append '('
     *   using _ = with('+'); // append '('
     *   // generate "a + (b * c)"
     * } // dispose: append ')'  - closes the '+', regardless of knowing it was '+'
     * } // dispose: append ')'  - closes the '*', regardless of knowing it was '*'
     * 
     * The disposable never needed to know it was closing a '+' or '*' - the stack
     * order guaranteed the correct nesting.
     * 
     * ⚠️  WARNING - DO NOT MODIFY WITHOUT UNDERSTANDING:
     * ==================================================
     * Future maintainers: The following changes would BREAK this optimization:
     * 
     * ❌ Adding async operations (setTimeout, Promise, nextTick)
     * ❌ Adding callbacks or event emitters
     * ❌ Making dispose() depend on WHICH scope is being closed
     * ❌ Storing scope references in the disposable for deferred cleanup
     * ❌ Adding conditional logic that branches based on scope identity
     * ❌ Any operation that yields control back to the event loop
     * 
     * VALIDITY CHECK:
     * ===============
     * To verify if an operation qualifies for this optimization, ask:
     * 
     *   "If I only know the current stack state (not which specific scope
     *    triggered this disposal), can I perform the correct cleanup?"
     * 
     * If YES → This pattern works perfectly
     * If NO  → Must use per-call disposable objects
     * 
     * Performance Note:
     * ================
     * This pattern eliminates ALL disposable object allocations, making it ideal
     * for hot paths with high-frequency scope creation (e.g., loops, deep recursion,
     * SQL generation, template rendering).
     * 
     * @see https://github.com/tc39/proposal-explicit-resource-management
     */
    private readonly _disposable: Disposable = {
        [Symbol.dispose]: () => {
            this._arr[this._size--] = undefined;
        }
    }

    private static readonly _emptyDisposable: Disposable = {
        [Symbol.dispose]: () => {}
    }

    constructor(
        private readonly defaultValue: E | undefined
    ) {}

    with(e: E | undefined): Disposable {
        if (e == null) {
            return Stack._emptyDisposable;
        }
        this._arr[this._size++] = e;
        return this._disposable;
    }

    get currentOrUndefined(): E | undefined {
        const index = this._size - 1;
        if (index < 0) {
            return undefined;
        }
        return this._arr[index]!;
    }

    get current(): E {
        const index = this._size - 1;
        if (index < 0) {
            if (this.defaultValue == null) {
                throw new err.StateError("The stack is empty");
            }
            return this.defaultValue;
        }
        return this._arr[index]!;
    }

    size(): number {
        return this._size;
    }
}
