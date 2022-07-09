import { weakRecord, type FinalizeCallback } from "./weakRecord"

interface CacheRecordInfo<T extends object>
{
    active: boolean
    lastActive: number
    copy: T
}

export function cacheRecord<T extends object>(delayGC = 60 * 1000)
{
    const records = weakRecord<T>()
    const infos: Record<string, CacheRecordInfo<T>> = {}

    function afterFinalize(key: string): boolean
    {
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
                await new Promise((resolve) => setTimeout(resolve, delayGC))
                // if (!info.active) console.log("Haven't been active for a while, free to finalize:", key)
            })()
        }
        else
        {
            delete infos[key]
            // console.log(`Finalize: ${key}`)
            return true
        }
        return false
    }

    function set(key: string, value: T, finalizeCallback?: FinalizeCallback)
    {
        records.set(key, value, (key) =>
        {
            const isRemoved = afterFinalize(key)
            if (isRemoved) finalizeCallback(key)
        })

        if (infos[key]) infos[key].copy = { ...value }
        else infos[key] = { active: false, copy: { ...value }, lastActive: 0 }
    }
    function get(key: string)
    {
        const value = records.get(key)
        if (!value) return value
        // if (!infos[key].active) console.log("Active:", key)
        infos[key].active = true
        return value
    }

    return {
        set,
        get,
        has(key: string) { records.has(key) }
    }
}