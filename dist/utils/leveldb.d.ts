export default function leveldb(dbName?: string): {
    start: () => void;
    put: (key: string, data: any, cb: (err: any | null, data?: any) => void) => void;
    get: (key: string, cb: (err: any | null, data?: any) => void) => void;
};
