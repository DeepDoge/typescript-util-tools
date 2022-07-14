export function createCacheStore<T>(databaseName: string, storeName: string, expireTime: number = 1000 * 60 * 60 * 24 * 30)
{
    let db: IDBDatabase | null = null
    const openRequest = indexedDB.open(databaseName)
    openRequest.addEventListener('upgradeneeded', () => openRequest.result.createObjectStore(storeName).createIndex("expireAt", "expireAt"))
    openRequest.addEventListener('success', () =>
    {
        db = openRequest.result
        clearExpired()
    })

    async function getAwaitDB()
    {
        while (!db) new Promise((r) => setTimeout(r, 100))
        return db
    }


    async function clearExpired()
    {
        return new Promise<void>(async (resolve, reject) =>
        {
            const transaction = (await getAwaitDB()).transaction(storeName, "readwrite")
            const range = IDBKeyRange.upperBound(new Date())

            const expireAtCursorRequest = transaction.objectStore(storeName).index("expireAt").openCursor(range)
            expireAtCursorRequest.addEventListener('error', () => reject(expireAtCursorRequest.error))
            expireAtCursorRequest.addEventListener('success', () =>
            {
                try
                {
                    const expireCursor = expireAtCursorRequest.result
                    if (!expireCursor) return
                    expireCursor.delete()
                    expireCursor.continue()
                    resolve()
                }
                catch (ex)
                {
                    reject(ex)
                }
            })
        })
    }

    async function clearAll()
    {
        return await new Promise<void>(async (resolve, reject) =>
        {
            const store = (await getAwaitDB()).transaction(storeName, "readwrite").objectStore(storeName)
            
            const request = store.clear()
            request.addEventListener('success', () => resolve())
            request.addEventListener('error', () => reject(request.error))
        })
    }

    async function put(key: string, value: T): Promise<void>
    {
        return await new Promise(async (resolve, reject) =>
        {
            const store = (await getAwaitDB()).transaction(storeName, "readwrite").objectStore(storeName)

            const expireAt = new Date(Date.now() + expireTime)
            const request = store.put({ value: value, expireAt }, key)
            request.addEventListener('success', () => resolve())
            request.addEventListener('error', () => reject(request.error))
        })
    }

    async function get(id: string): Promise<T>
    {
        const response = (await new Promise(async (resolve, reject) =>
        {
            const store = (await getAwaitDB()).transaction(storeName, "readonly").objectStore(storeName)

            const request = store.get(id)
            request.addEventListener('success', () => resolve(request.result))
            request.addEventListener('error', () => reject(request.error))
        }) as { value: T, expireAt: Date } | undefined)

        if (response === undefined) return undefined
        if (response.expireAt <= new Date())
        {
            await clearExpired()
            return undefined
        }
        return response.value
    }

    return { put, get, clearAll, clearExpired }
}