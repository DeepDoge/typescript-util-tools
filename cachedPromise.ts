import { cacheRecord } from "./cacheRecord"
import type { FinalizeCallback } from "./weakRecord"


export function cachedPromise
    <
        P extends Record<string, any>,
        R extends object
    >
    (
        keyGetter: (params: P) => string,
        task: (params: { params: P, setFinalizeCallback: (finalizeCallback: FinalizeCallback) => void }) => Promise<R>
    )
{
    const records = cacheRecord<R>()
    const running: Record<string, Promise<R>> = {}

    async function promise(params: P): Promise<R>
    {
        const key = keyGetter(params)
        const cache = records.get(key)
        if (cache) return cache

        if (running[key]) return await running[key]

        let finalizeCallback: FinalizeCallback = null
        const result = await (running[key] = task({
            params,
            setFinalizeCallback: (callback: FinalizeCallback) => finalizeCallback = callback
        }))
        records.set(key, result, finalizeCallback)
        delete running[key]

        return records.get(key)
    }

    const taskWithInternalAccess: typeof promise &
    {
        _cacheRecord: typeof records
    } = promise as any
    taskWithInternalAccess._cacheRecord = records
    return taskWithInternalAccess
}