// An error with a message for the user. Route handlers return it with its status.
// All other errors get a generic message, so no internals leak.
export class KeyActionError extends Error {
    public readonly status: number;

    public constructor(message: string, status = 400) {
        super(message);
        this.name = 'KeyActionError';
        this.status = status;
    }
}
