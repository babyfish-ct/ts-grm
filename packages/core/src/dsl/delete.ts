export interface Delete {

    setMode(mode: DeleteMode): this;

    execute(): Promise<number>;
}

export type DeleteMode = "AUTO" | "PHYSICAL" | "LOGICAL";