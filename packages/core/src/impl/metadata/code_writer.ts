export class CodeWriter {

    private _scope: Scope | undefined;

    private _lineDirty = false;

    private readonly _parts: Array<string> = [];

    scope(
        options: ScopeKind | {
            readonly kind: ScopeKind;
            readonly multiline?: boolean;
        },
        fn: () => void
    ): this {
        const kind = typeof options === "string"
            ? options
            : options.kind;
        const multiline = (
            typeof options === "string"
                ? undefined
                : options.multiline
        ) ?? (kind === "CURLY_BRACKETS");
        this._parts.push(startStr(kind));
        this._scope = {
            kind,
            parent: this._scope,
            multiline,
            depth: (this._scope?.depth ?? 0) + (multiline ? 1 : 0),
            dirty: false
        };
        try {
            if (multiline) {
                this.newLine();
            }
            fn();
            if (multiline && this._parts[this._parts.length - 1] != "\n") {
                this.newLine();
            }
        } finally {
            this._scope = this._scope.parent;
        }
        this.code(endStr(kind));
        return this;
    }

    code(value: string): this {
        const parts = value.split('\n');
        const size = parts.length;
        this._addPart(parts[0]!);
        for (let i = 1; i < size; i++) {
            this.newLine();
            this._addPart(parts[i]!);
        }
        return this;
    }

    newLine(end: string = ""): this {
        if (end !== "") {
            this._parts.push(end);
        }
        this._parts.push("\n");
        this._lineDirty = false;
        return this;
    }

    separator(text: string = ", "): this {
        if (this._scope != null && this._scope.dirty) {
            this.code(text);
            if (this._scope.multiline) {
                this.newLine();
            }
        }
        return this;
    }

    toString(): string {
        return this._parts.join("");
    }

    private _addPart(part: string) {
        if (part === "") {
            return;
        }
        if (this._lineDirty === false) {
            for (let i = this._scope?.depth ?? 0; i > 0; --i) {
                this._parts.push("    ");
            }
            this._lineDirty = true;
        }
        if (this._scope != null) {
            this._scope.dirty = true;
        }
        this._parts.push(part);
    }
}

type Scope = {
    kind: ScopeKind;
    parent: Scope | undefined;
    multiline: boolean;
    depth: number;
    dirty: boolean;
};

type ScopeKind = "PARENTHESES" | "SQUARE_BRACKETS" | "CURLY_BRACKETS";

function startStr(kind: ScopeKind): string {
    switch (kind) {
        case "PARENTHESES":
            return "(";
        case "SQUARE_BRACKETS":
            return "[";
        case "CURLY_BRACKETS":
            return "{";
    }
}

function endStr(kind: ScopeKind): string {
    switch (kind) {
        case "PARENTHESES":
            return ")";
        case "SQUARE_BRACKETS":
            return "]";
        case "CURLY_BRACKETS":
            return "}";
    }
}