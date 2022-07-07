import { cacheRecord } from "./cacheRecord"


export function cachedPromise<P extends Record<string, any>, R extends object>(keyGetter: (params: P) => string, promise: (params: P) => Promise<R>)
{
    const caches = cacheRecord<R>()

    const onGoingTasks: Record<string, Promise<R>> = {}
    async function task(params: P): Promise<R>
    {
        const key = keyGetter(params)
        const cache = caches.get(key)
        if (cache) return cache

        const onGoing = onGoingTasks[key]
        if (onGoing) return await onGoing

        const result = await (onGoingTasks[key] = promise(params))
        caches.set(key, result)
        delete onGoingTasks[key]

        return caches.get(key)
    }

    const taskWithInternalAccess: typeof task &
    {
        _cacheRecord: typeof caches
    } = task as any
    taskWithInternalAccess._cacheRecord = caches
    return taskWithInternalAccess
}
