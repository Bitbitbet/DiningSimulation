import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from 'react'
import './App.css'
import { useToast } from './Toast'
import DataManagerPage from './DataManagerPage'
import MonitorPage from './MonitorPage'

const API_BASE = 'http://localhost:23456/api'

type StatusResponse = {
    online: boolean
}

export type HistoryPoint = {
    time: number
    averageQueueLength: number
    averageCustomerWaitSeatSeconds: number
    chefUtilization: number
    seatTurnover: number
    seatIdleRate: number
    congestionRate: number
}

export type DashboardResponse = {
    simulationState: string
    currentHistory: HistoryPoint
    finished: boolean
    windowsQueueSizes: number[]
    seatOccupation: number[]
}

type HistoryResponse = {
    data: HistoryPoint[]
    begin: number
    count: number
    endingHasMore: boolean
}

export type SimulationDataDto = {
    id: number
    name: string
}

type SimulationDataQueryResponse = {
    simulationDataList: Record<number, SimulationDataDto>
    selected: number | null
}

export type SimulationParameters = {
    simulationTotalMinutes: number
    customerArriveRate: number
    customerGroupSizeRatio: Record<string, number>
    customerDishRatio: Record<string, number>
    customerEatSecondsAvg: number
    customerEatSecondsStdVar: number
    dishPrepSecondsAvg: number
    dishPrepSecondsStdVar: number
    windows: {
        dishType: string
        windowPrepTimeModifier: number
    }[]
    seatCount: number
}

const PageState = {
    DataManagerPage: 0,
    MonitorPage: 1
} as const;
type PageState = typeof PageState[keyof typeof PageState]

const emptyHistoryPoint: HistoryPoint = {
    time: 0,
    averageQueueLength: 0,
    averageCustomerWaitSeatSeconds: 0,
    chefUtilization: 0,
    seatTurnover: 0,
    seatIdleRate: 0,
    congestionRate: 0,
}

const emptyDashboard: DashboardResponse = {
    simulationState: 'paused',
    currentHistory: emptyHistoryPoint,
    finished: false,
    windowsQueueSizes: [],
    seatOccupation: [],
}

const emptyDataList: SimulationDataQueryResponse = {
    simulationDataList: {},
    selected: null,
}

const initialParameters: SimulationParameters = {
    simulationTotalMinutes: 180,
    customerArriveRate: 0.6,
    customerGroupSizeRatio: {
        1: 40,
        2: 35,
        3: 15,
        4: 10,
    },
    customerDishRatio: {
        A: 40,
        B: 35,
        C: 25,
    },
    customerEatSecondsAvg: 1800,
    customerEatSecondsStdVar: 120,
    dishPrepSecondsAvg: 180,
    dishPrepSecondsStdVar: 30,
    windows: [
        { dishType: 'A', windowPrepTimeModifier: 1 },
        { dishType: 'B', windowPrepTimeModifier: 1 },
        { dishType: 'C', windowPrepTimeModifier: 1 },
        { dishType: 'A', windowPrepTimeModifier: 1 },
    ],
    seatCount: 24,
}
export function NumberInputField(
    { label, initial, onChange, min, max, step, unit }:
        {
            label: string;
            initial: number;
            onChange: (value: number) => void;
            min?: number;
            max?: number;
            step?: number;
            unit?: string;
        }) {

    const [value, setValue] = useState(initial);
    return <div className="">
        <label>
            {label}
        </label>
        <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={
                event => {
                    const v = Number(event.target.value);
                    setValue(v);
                    if ((min == null || v >= min) && (max == null || v <= max)) // TODO
                        onChange(v);
                }
            }
        />
        {unit ? <span>{unit}</span> : null}
    </div>;
}

function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 5000) {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

    return fetch(url, { ...options, signal: controller.signal }).finally(() => {
        window.clearTimeout(timeoutId)
    })
}

function localizedState(state: string) {
    if (state == 'started') return '运行中'
    else if (state == 'paused') return '已暂停'
}


export function formatTime(seconds: number) {
    seconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? Number(seconds) : 0))

    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60

    return `${String(h).padStart(2, '0')} 时 ${String(m).padStart(2, '0')} 分 ${String(s).padStart(2, '0')} 秒`
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
}



function validateParameters(parameters: SimulationParameters): { valid: true } | { valid: false, reason: string } {
    if (parameters.simulationTotalMinutes <= 0) return { valid: false, reason: '仿真总时长必须大于 0。' };
    if (parameters.customerArriveRate < 0) return { valid: false, reason: '顾客到达率不能小于 0。' }
    if (parameters.customerEatSecondsAvg <= 0) return { valid: false, reason: '平均就餐时间必须大于 0。' }
    if (parameters.customerEatSecondsStdVar < 0) return { valid: false, reason: '就餐时间标准差不能小于 0。' }
    if (parameters.dishPrepSecondsAvg <= 0) return { valid: false, reason: '平均做餐时间必须大于 0。' }
    if (parameters.dishPrepSecondsStdVar < 0) return { valid: false, reason: '做餐时间标准差不能小于 0。' }
    if (parameters.windows.length <= 0) return { valid: false, reason: '窗口数量必须大于 0。' }
    if (parameters.seatCount <= 0) return { valid: false, reason: '座位数量必须大于 0。' }

    const invalidWindow = parameters.windows.some((item) => !item.dishType || item.windowPrepTimeModifier <= 0)
    if (invalidWindow) return { valid: false, reason: '窗口餐品类型不能为空，且窗口效率系数必须大于 0。' }

    return { valid: true }
}

function useStateWithRef<S>(initialState: S | (() => S)): [S, Dispatch<SetStateAction<S>>, RefObject<S>] {
    const [state, setState] = useState(initialState)

    const ref = useRef(state);
    useEffect(() => {
        ref.current = state;
    }, [state]);

    return [state, setState, ref];
}

export default function App() {
    const [online, setOnline] = useState(false)
    const [dashboard, setDashboard] = useState<DashboardResponse>(emptyDashboard)
    const [parameters, setParameters] = useState<SimulationParameters>(initialParameters)
    const [loading, setLoading] = useState(false)
    const [speed, setSpeed] = useState(1)
    const [page, setPage] = useState<PageState>(PageState.DataManagerPage);

    const showToast = useToast();

    const [dataList, setDataList, dataListRef] = useStateWithRef<SimulationDataQueryResponse>(emptyDataList);
    const dataListHistory = useRef(new Map<number, HistoryPoint[]>());
    const [history, setHistory] = useState<HistoryPoint[] | null>(null);
    const [dataListLoading, setDataListLoading, dataListLoadingRef] = useStateWithRef(false);

    const sortedDataList = useMemo(() => {
        return {
            selected: dataList.selected,
            datas: Object.values(dataList.simulationDataList).sort((a, b) => a.id - b.id)
        }
    }, [dataList.simulationDataList])

    const totalQueueLength = useMemo(() => {
        return dashboard.windowsQueueSizes.reduce((sum, value) => sum + value, 0)
    }, [dashboard.windowsQueueSizes])

    const updateStatus = useCallback(async () => {
        try {
            const response = await fetchWithTimeout(`${API_BASE}/status`)
            if (!response.ok) throw new Error('status response not ok')
            const result = (await response.json()) as StatusResponse
            setOnline(result.online)
        } catch {
            setOnline(false)
        }
    }, [])

    const updateDashboard = useCallback(async () => {
        try {
            const response = await fetchWithTimeout(`${API_BASE}/dashboard`)
            if (!response.ok) throw new Error('dashboard response not ok')
            const result = (await response.json()) as DashboardResponse

            setDashboard(result)
        } catch {

        }
    }, [])

    const updateDataList = useCallback(async () => {
        if (dataListLoadingRef.current) {
            return;
        }
        setDataListLoading(true)
        try {
            const response = await fetchWithTimeout(`${API_BASE}/data/query`)
            if (!response.ok) throw new Error('data query response not ok')
            const result = (await response.json()) as SimulationDataQueryResponse
            setDataList(result)

            var resultIds = new Set(Object.keys(result.simulationDataList).map(Number));

            for (const id of dataListHistory.current.keys()) {
                if (!resultIds.delete(id)) {
                    dataListHistory.current.delete(id);
                }
            }
            for (const newId of resultIds) {
                dataListHistory.current.set(newId, []);
            }

            setHistory(result.selected !== null ? dataListHistory.current.get(result.selected)! : null);
        } catch {

        } finally {
            setDataListLoading(false);
        }
    }, [])

    const updateHistory = useCallback(async () => {
        if (dataListRef.current.selected == null) {
            return
        }
        if (dataListLoadingRef.current) {
            return
        }
        setDataListLoading(true)

        const id = dataListRef.current.selected;
        let before = dataListHistory.current.get(id)!;

        try {
            const pageSize = 1000
            let begin = before.length
            let hasMore = true
            let newHistory = [];
            while (hasMore) {
                const response = await fetchWithTimeout(`${API_BASE}/history/range/${id}?begin=${begin}&count=${pageSize}`, undefined, 10000)
                if (!response.ok) throw new Error('history response not ok')
                const result = (await response.json()) as HistoryResponse
                newHistory.push(...result.data);
                begin += result.count;
                hasMore = result.endingHasMore;
            }

            if (newHistory.length != 0) {
                const rst = [...before, ...newHistory];
                dataListHistory.current.set(id, rst);

                setHistory(rst);
            }
        } catch {
            showToast("加载历史失败")
        } finally {
            setDataListLoading(false)
        }
    }, [])

    const refreshAll = useCallback(async () => {
        await Promise.all([updateStatus(), updateDashboard(), updateDataList()])
        await updateHistory()
    }, [updateDashboard, updateDataList, updateHistory, updateStatus])

    useEffect(() => {
        refreshAll()
        const statusTimer = window.setInterval(updateStatus, 1000)
        const dashboardTimer = window.setInterval(updateDashboard, 1000)
        const dataListTimer = window.setInterval(updateDataList, 3000)
        const historyTimer = window.setInterval(updateHistory, 1000)

        return () => {
            window.clearInterval(statusTimer)
            window.clearInterval(dashboardTimer)
            window.clearInterval(dataListTimer)
            window.clearInterval(historyTimer)
        }
    }, [])


    const resumeSimulation = async () => {
        if (dataList.selected == null) {
            showToast("请先在“仿真数据管理”中选择一份仿真数据。");
            return;
        }
        if (loading) {
            return;
        }
        setLoading(true);
        try {
            const response = await fetchWithTimeout(`${API_BASE}/simulation/resume`, { method: 'POST' }, 8000)
            if (!response.ok) {
                const text = await response.text().catch(() => '')
                throw new Error(`${response.status} ${text}`)
            }

            await updateDashboard()
        } catch (error) {
            showToast(`操作失败：${error instanceof Error ? error.message : ''}`)
        } finally {
            setLoading(false);
        }
    };
    const pauseSimulation = async () => {
        if (loading) {
            return;
        }

        setLoading(true)
        try {
            const response = await fetchWithTimeout(`${API_BASE}/simulation/pause`, { method: 'POST' }, 8000)
            if (!response.ok) {
                const text = await response.text().catch(() => '')
                throw new Error(`${response.status} ${text}`)
            }

            showToast('操作成功。')
            await updateDashboard()
        } catch (error) {
            showToast(`操作失败：${error instanceof Error ? error.message : ''}`)
        } finally {
            setLoading(false)
        }
    }

    const submitParameters = async () => {
        const validate = validateParameters(parameters)
        if (!validate.valid) {
            showToast(validate.reason)
            return
        }

        setLoading(true)
        try {
            const response = await fetchWithTimeout(
                `${API_BASE}/data/new`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(parameters),
                },
                8000,
            )

            if (!response.ok) {
                const errorText = await response.text()
                showToast(`保存参数失败：${response.status} ${errorText}`)
                return;
            }

            showToast('已生成新的仿真数据。')
            await refreshAll()
        } catch {
            showToast('保存参数失败。')
        } finally {
            setLoading(false)
        }
    }

    const selectSimulationData = async (id: number) => {
        const simData = dataList.simulationDataList[id];
        if (!simData) return;
        setLoading(true)
        try {
            const response = await fetchWithTimeout(`${API_BASE}/data/select/${id}`, { method: 'POST' }, 8000)

            if (!response.ok) {
                const errorText = await response.text()
                showToast(`选择数据失败：${response.status} ${errorText}`)
                return
            }

            showToast(`已选择仿真数据：${simData.name}`)
            await updateDataList()
        } catch {
            showToast('选择数据失败。')
        } finally {
            setLoading(false)
        }
    }

    const deleteSimulationData = async (id: number) => {
        const simData = dataList.simulationDataList[id];
        if (!simData) return

        if (!window.confirm(`确定要删除 ${simData.name} 吗？`)) return

        setLoading(true)
        try {
            const response = await fetchWithTimeout(`${API_BASE}/data/delete/${id}`, { method: 'POST' }, 8000)
            if (!response.ok) {
                const errorText = await response.text()
                showToast(`删除数据失败：${response.status} ${errorText}`)
                return
            }

            showToast(`已删除仿真数据：${simData.name}`)
            await refreshAll()
        } catch {
            showToast('删除数据失败。')
        } finally {
            setLoading(false)
        }
    }

    const updateSpeed = async (nextSpeed: number) => {
        const safeSpeed = clamp(Number(nextSpeed), 0.1, 10)
        setSpeed(safeSpeed)

        try {
            const response = await fetchWithTimeout(`${API_BASE}/simulation/speed?speed=${safeSpeed}`, { method: 'POST' }, 5000)
            if (!response.ok) {
                showToast('设置仿真速度失败。')
            }
        } catch {
            showToast('设置仿真速度失败。')
        }
    }

    const changeWindowCount = (count: number) => {
        const safeCount = clamp(count, 1, +Infinity)
        const nextWindows = [...parameters.windows]

        while (nextWindows.length < safeCount) {
            nextWindows.push({
                dishType: ['A', 'B', 'C'][nextWindows.length % 3],
                windowPrepTimeModifier: 1,
            })
        }

        while (nextWindows.length > safeCount) {
            nextWindows.pop()
        }

        setParameters((old) => ({
            ...old,
            windows: nextWindows,
        }))
    }

    const downloadDashboard = () => {
        const content = JSON.stringify({ status: online, dashboard, dataList, history }, null, 2)
        const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `canteen-dashboard-${Date.now()}.json`
        link.click()
        URL.revokeObjectURL(url)
        showToast('当前 dashboard 数据已下载。')
    }

    return (
        <div className="app-shell">
            <aside className="sidebar">
                <div className="brand">
                    <div className="brand-mark">食</div>
                    <div>
                        <strong>食堂仿真系统</strong>
                        <span>控制面板</span>
                    </div>
                </div>
                <nav>
                    <button className={
                        "nav-item" + (page == PageState.DataManagerPage ? " active" : "")
                    } onClick={() => setPage(PageState.DataManagerPage)} type="button">仿真数据管理</button>
                    <button className={
                        "nav-item" + (page == PageState.MonitorPage ? " active" : "")
                    } onClick={() => setPage(PageState.MonitorPage)} type="button">仿真运行面板</button>
                </nav>
                <div className={`status-dot ${online ? 'online' : 'offline'}`}>
                    <span />
                    {online ? '后端在线' : '后端离线'}
                </div>
            </aside>

            <main className="content">
                <div className="hero-card">
                    <h1>北平食堂大学食堂就餐仿真系统</h1>
                    <div className="hero-actions">
                        <div className="chip">时钟：{formatTime(dashboard.currentHistory.time)}</div>
                        <div className="chip">状态：{localizedState(dashboard.simulationState)}</div>
                    </div>
                </div>
                {page == PageState.DataManagerPage &&
                    <DataManagerPage
                        sortedDataList={sortedDataList}
                        selectSimulationData={selectSimulationData}
                        deleteSimulationData={deleteSimulationData}
                        parameters={parameters}
                        submitParameters={submitParameters}
                        downloadDashboard={downloadDashboard}
                        loading={loading}
                        refreshAll={refreshAll}
                        setParameters={setParameters}
                        changeWindowCount={changeWindowCount} />}
                {page == PageState.MonitorPage &&
                    <MonitorPage
                        dashboard={dashboard}
                        historyLoading={dataListLoading}
                        totalQueueLength={totalQueueLength}
                        history={history}
                        updateHistory={updateHistory}
                        hasSelectedSimulationData={dataList.selected != null}
                        speed={speed}
                        updateSpeed={updateSpeed}
                        resumeSimulation={resumeSimulation}
                        pauseSimulation={pauseSimulation}
                        loading={loading} />}
            </main>
        </div>
    )
}

