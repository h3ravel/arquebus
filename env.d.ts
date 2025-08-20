declare global {
    interface PromiseConstructor {
        delay (duration: number): Promise<true>;
    }
}
