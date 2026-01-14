export abstract class GrmError extends Error {

    protected constructor(message: string) {
        super(message);
    }
}
