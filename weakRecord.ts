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
        cache.finalizeCallback?.call(null, key)
    })
    function set(key: string, value: T, finalizeCallback?: FinalizeCallback)
    {
        if (typeof value !== 'object') throw `Can only cache object type but got ${key}: ${value}(${typeof value})`
        const cache = get(key)
        if (cache === value) return
        if (cache) finalizer.unregister(cache)

        records[key] =
        {
            finalizeCallback,
            weakRef: new WeakRef(value)
        }
        finalizer.register(value, key, value)
    }
    function get(key: string)
    {
        return records[key]?.weakRef.deref()
    }

    function has(key: string) 
    {
        return records[key]
    }

    return {
        set,
        get,
        has
    }
}