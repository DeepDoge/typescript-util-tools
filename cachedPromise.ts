import { cacheRecord } from "./cacheRecord"


export function cachedPromise
    <
        P extends Record<string, any>,
        R extends object
    >
    (
        keyGetter: (params: P) => string,
        task: (params: { params: P, setFinalizeCallback: (finalizeCallback: () => void) => void }) => Promise<R>
    )
{
    const caches = cacheRecord<R>()
    const running: Record<string, Promise<R>> = {}

    async function promise(params: P): Promise<R>
    {
        const key = keyGetter(params)
        const cache = caches.get(key)
        if (cache) return cache

        const onGoing = running[key]
        if (onGoing) return await onGoing

        let _finalizeCallback: () => void = null
        const result = await (running[key] = task({
            params,
            setFinalizeCallback: (finalizeCallback: typeof _finalizeCallback) => _finalizeCallback = finalizeCallback
        }))
        caches.set(key, result, _finalizeCallback)
        delete running[key]

        return caches.get(key)
    }

    const taskWithInternalAccess: typeof promise &
    {
        _cacheRecord: typeof caches
    } = promise as any
    taskWithInternalAccess._cacheRecord = caches
    return taskWithInternalAccess
}
