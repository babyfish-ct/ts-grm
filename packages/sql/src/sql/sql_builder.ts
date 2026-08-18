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

import { spi, SqlClient } from "@ts-grm/core";
import { Value } from "./fragment";
import { SqlClientImplementor } from "@/sql_client";
import { SqlLoggerParameterType } from "@/cfg/sql_client_options";

export class SqlBuilder {

    private static _emptyWithPrettyDisposable: Disposable = {
        [Symbol.dispose]: (): void => {}
    };

    readonly strategy: spi.DatabaseStrategy;

    private readonly _parts: Array<string> = [];

    private _length: number = 0;

    private readonly _values = new Map<number, Value>();

    private _indent = 0;

    private _indentAdded = false;

    private _nextTableAlias = 0;

    constructor(
        readonly sqlClient: SqlClientImplementor,
        private _pretty: boolean,
        readonly parameter: SqlLoggerParameterType,
        readonly nameParameterPrefix: string | undefined
    ) {
        this.strategy = sqlClient.strategy;
    }

    static of(sqlClient: SqlClient): SqlBuilder {
        const implementor = sqlClient as SqlClientImplementor;
        return new SqlBuilder(
            implementor,
            implementor.options.sqlLogger.pretty,
            implementor.options.sqlLogger.parameter,
            implementor.driver.nameParameterPrefix
        )
    }

    get isEmpty(): boolean {
        return this._parts.length === 0;
    }

    get pretty(): boolean {
        return this._pretty;
    }

    withPretty(pretty: boolean | undefined): Disposable {
        const oldPretty = this._pretty;
        if (pretty == null || oldPretty === pretty) {
            return SqlBuilder._emptyWithPrettyDisposable;
        }
        this._pretty = pretty;
        return {
            [Symbol.dispose]: (): void => {
                this._pretty = oldPretty;
            }
        };
    }

    indent() {
        ++this._indent;
    }

    unindent() {
        --this._indent;
    }

    newLine(): this {
        if (this.pretty) {
            this._parts.push("\n");
            this._length++;
            this._indentAdded = false;
        }
        return this;
    }

    sql(text: string): this {
        if (!text.includes("\n")) {
            this._sql(text);
        } else {
            const parts = text.split("\n");
            for (let i = 0; i < parts.length; i++) {
                if (i !== 0 && this._parts[this._parts.length - 1] !== "\n") {
                    if (this.pretty) {
                        this._parts.push("\n");
                        this._indentAdded = false;
                    } else {
                        this._parts.push(" ");
                    }
                    this._length++;
                }
                this._sql(parts[i]!);
            }
        }
        return this;
    }

    value(value: Value): this {
        if (value.constant) {
            this._sql(value.value)
        }
        this._values.set(this._length, value);
        let str: string;
        if (this.nameParameterPrefix != null) {
            str = `${this.nameParameterPrefix}${this._values.size}`;
        } else {
            str = "?";
        }
        this._sql(str);
        return this;
    }

    private _sql(str: string) {
        if (str.length === 0) {
            return;
        }
        if (this._indent && !this._indentAdded) {
            for (let i = this._indent; i > 0; --i) {
                this._parts.push(INDENT);
            }
            this._length += INDENT.length * this._indent;
            this._indentAdded = true;
        }
        this._parts.push(str);
        this._length += str.length;
    }

    build(): [string, ReadonlyMap<number, Value>] {
        if (this._parts[this._parts.length - 1] === '\n') {
            this._parts.splice(this._parts.length - 1, 1);
        }
         return [this._parts.join(""), this._values];
    }

    allocateTableAlias(): string {
        return `tb_${++this._nextTableAlias}_`;
    }
}

const INDENT = "    ";