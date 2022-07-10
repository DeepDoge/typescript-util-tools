declare class FinalizationRegistry<T>
{
    constructor(finalizer: (value: T) => void)
    register(object: object, value: T, unregister: object): void
    unregister(unregister: object): void
}

declare class WeakRef<T extends object>
{
    constructor(object: T)
    deref(): T
}

export type FinalizeCallback = (key: string) => void
export function weakRecord<T extends object>()
{
    const records: Record<string,
        {
            finalizeCallback?: FinalizeCallback
            weakRef: WeakRef<T>
        }> = {}
    const finalizer = new FinalizationRegistry((key: string) =>
    {
        const cache = records[key]
        delete records[key]
        if (cache.finalizeCallback) cache.finalizeCallback(key)
    })
    function set(key: string, value: T, finalizeCallback?: FinalizeCallback)
    {
        if (typeof value !== 'object') throw `Can only cache object type but got ${key}: ${value}(${typeof value})`
        const cacheValue = get(key)
        if (cacheValue === value) return
        if (cacheValue) 
        {
            finalizer.unregister(cacheValue)
            const cache = records[key]
            if (cache.finalizeCallback) cache.finalizeCallback(key)
        }

        finalizer.register(value, key, value)
        records[key] =
        {
            finalizeCallback,
            weakRef: new WeakRef(value)
        }
    }
    function get(key: string)
    {
        const value = records[key]?.weakRef.deref()
        if (records[key] && !value && records[key].finalizeCallback) records[key].finalizeCallback(key)
        return records[key]?.weakRef.deref()
    }

    function has(key: string) 
    {
        return !!get(key)
    }

    return {
        set,
        get,
        has
    }
}