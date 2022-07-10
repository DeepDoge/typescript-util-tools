export function promiseTask
    <
        P extends Record<string, any>,
        R extends object
    >
    (
        keyGetter: (params: P) => string,
        task: (params: { params: P }) => Promise<R>
    )
{
    const running: Record<string, Promise<R>> = {}

    async function promise(params: P): Promise<R>
    {
        const key = keyGetter(params)
        if (running[key]) return await running[key]

        const result = await (running[key] = task({ params }))
        delete running[key]
        return result
    }

    return promise
}