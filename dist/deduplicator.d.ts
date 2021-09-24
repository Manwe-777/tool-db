import { ToolDbMessage } from ".";
export interface DeduplicatedEntry {
    time: number;
}
export interface DupOptions {
    age: number;
    max: number;
}
export default class Deduplicator {
    private entries;
    private timeout;
    private now;
    private options;
    constructor(opt?: Partial<DupOptions>);
    getEntry(id: string): DeduplicatedEntry;
    check: (id: string) => false | DeduplicatedEntry;
    add: (id: string, _entry: ToolDbMessage) => void;
    drop: (age: number) => void;
}
