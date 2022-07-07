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

export function cachedPromise<P extends Record<string, any>, R extends object>(keyGetter: (params: P) => string, promise: (params: P) => Promise<R>)
{
    const caches: Record<string, WeakRef<R>> = {}
    const infos: Record<string, { active: boolean, lastActive: number, copy: R }> = {}
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
            setCache(key, copyCache);

            // Prevent GC for a while
            (async () =>
            {
                // console.log("Delay GC for while:", key)
                const same = copyCache
                await new Promise((resolve) => setTimeout(resolve, 1000 * 60))
                // if (!info.active) console.log("Haven't been active for a while, free to finalize:", key)
            })()
        }
        else
        {
            delete infos[key]
            // console.log(`Finalize: ${key}`)
        }
    })
    function setCache(key: string, value: R)
    {
        if (typeof value !== 'object') throw `Can only cache objects but got ${key}: ${value}(${typeof value})`
        const cache = getCache(key)
        if (cache) 
        {
            if (cache === value) return
            finalizer.unregister(cache)
        }

        if (infos[key]) infos[key].copy = { ...value }
        else infos[key] = { active: false, copy: { ...value }, lastActive: 0 }

        caches[key] = new WeakRef(value)
        finalizer.register(value, key, value)
    }
    function getCache(key: string)
    {
        const value = caches[key]?.deref()
        if (!value) return value
        // if (!infos[key].active) console.log("Active:", key)
        infos[key].active = true
        return value
    }

    const onGoingTasks: Record<string, Promise<R>> = {}
    async function task(params: P): Promise<R>
    {
        const key = keyGetter(params)
        const cache = getCache(key)
        if (cache) return cache

        const onGoing = onGoingTasks[key]
        if (onGoing) return await onGoing

        const result = await (onGoingTasks[key] = promise(params))
        setCache(key, result)
        delete onGoingTasks[key]

        return getCache(key)
    }

    const taskWithInternalAccess: typeof task &
    {
        _getCache(key: string): R
        _setCache(key: string, value: R): void
    } = task as any
    taskWithInternalAccess._getCache = (key) => getCache(key)
    taskWithInternalAccess._setCache = (key, value) => setCache(key, value)
    return taskWithInternalAccess
}
