declare module 'electron-store' {
  export default class ElectronStore<T extends Record<string, any> = Record<string, unknown>> {
    constructor(options?: any);
    get<K extends keyof T>(key: K, defaultValue?: T[K]): T[K];
    get(key: string, defaultValue?: any): any;
    set<K extends keyof T>(key: K, value: T[K]): void;
    set(key: string, value: any): void;
    delete(key: keyof T | string): void;
    clear(): void;
    store: T;
  }
}
