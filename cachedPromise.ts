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

const MAX_AGE = 1000 * 60

export function cachedPromise<P extends Record<string, any>, R extends object>(keyGetter: (params: P) => string, promise: (params: P) => Promise<R>)
{
    const caches: Record<string, WeakRef<R>> = {}
    const copies: Record<string, { lastUse: number, value: R }> = {}
    const finalizer = new FinalizationRegistry((key: string) =>
    {
        delete caches[key]
        const copy = copies[key]
        const age = Date.now() - copy.lastUse
        if (age < MAX_AGE) 
        {
            console.log(`GC happened but using the copy ${key}`)
            setCache(key, copy.value);

            // This prevent creation of new copies before the value is old enough, so we don't do unnecessary GC loops
            (async () => {
                const same = copy.value
                const timeLeft = MAX_AGE - age
                await new Promise((resolve) => setTimeout(resolve, timeLeft))
                console.log("Stop preventing loop for", key)
            })()
        }
        else 
        {
            delete copies[key]
            console.log(`Finalizing cached promise: ${key}`)
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

        copies[key] = { value: { ...value }, lastUse: copies[key]?.lastUse ?? 0 }
        caches[key] = new WeakRef(value)
        finalizer.register(value, key, value)
    }
    function getCache(key: string)
    {
        const value = caches[key]?.deref()
        if (!value) return value
        console.log('use', key)
        copies[key].lastUse = Date.now()
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
