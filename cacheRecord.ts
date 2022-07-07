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

export function cacheRecord<T extends object>(gcDelay = 60 * 1000)
{
    const caches: Record<string, WeakRef<T>> = {}
    const infos: Record<string,
        {
            active: boolean,
            lastActive: number,
            copy: T,
            finalizeCallback?: () => void
        }> = {}
    const finalizer = new FinalizationRegistry((key: string) =>
    {
        delete caches[key]
        const info = infos[key]
        if (info.active)
        {
            // console.log(`Not active anymore: ${key}`)
            info.lastActive = Date.now()
            info.active = false

            const copyCache = info.copy
            set(key, copyCache);

            // Prevent GC for a while
            (async () =>
            {
                // console.log("Delay GC for while:", key)
                const same = copyCache
                await new Promise((resolve) => setTimeout(resolve, gcDelay))
                // if (!info.active) console.log("Haven't been active for a while, free to finalize:", key)
            })()
        }
        else
        {
            info.finalizeCallback?.call(null)
            delete infos[key]
            // console.log(`Finalize: ${key}`)
        }
    })
    function set(key: string, value: T, finalizeCallback?: () => void)
    {
        if (typeof value !== 'object') throw `Can only cache object type but got ${key}: ${value}(${typeof value})`
        const cache = get(key)
        if (cache) 
        {
            if (cache === value) return
            finalizer.unregister(cache)
        }

        if (infos[key]) infos[key].copy = { ...value }
        else infos[key] = { active: false, copy: { ...value }, lastActive: 0, finalizeCallback }

        caches[key] = new WeakRef(value)
        finalizer.register(value, key, value)
    }
    function get(key: string)
    {
        const value = caches[key]?.deref()
        if (!value) return value
        // if (!infos[key].active) console.log("Active:", key)
        infos[key].active = true
        return value
    }

    return {
        set,
        get
    }
}