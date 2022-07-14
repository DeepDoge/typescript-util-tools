export function createLocalStore<T>(databaseName: string, storeName: string)
{
    let db: IDBDatabase = null
    const openRequest = indexedDB.open(`(store) ${databaseName}`)
    openRequest.addEventListener('upgradeneeded', () => openRequest.result.createObjectStore(storeName)/* .createIndex("expireAt", "expireAt") */)
    openRequest.addEventListener('success', () =>
    {
        db = openRequest.result
    })

    async function getAwaitDB()
    {
        while (!db) new Promise((r) => setTimeout(r, 100))
        return db
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
            const request = store.put(value, key)
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
        }) as { value: T })

        return response.value
    }

    return { put, get, clearAll }
}