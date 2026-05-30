import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
        { dishType: 'B', windowPrepTimeModifier: 1 },
        { dishType: 'C', windowPrepTimeModifier: 1 },
        { dishType: 'A', windowPrepTimeModifier: 1 },
        { dishType: 'B', windowPrepTimeModifier: 1 },
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
    return <label>
        {label}
        <div className='input-unit'>
            <input
                type="number"
                name={label}
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={
                    event => {
                        console.log();
                        const v = Number(event.target.value);
                        setValue(v);
                        if (event.target.validity.valid &&
                            (min == null || v >= min) && (max == null || v <= max))
                            onChange(v);
                    }
                }
            />
            {unit ? <span>{unit}</span> : null}
        </div>
    </label>;
}

function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 5000, externalSignal?: AbortSignal) {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

    const signal = externalSignal
        ? AbortSignal.any([controller.signal, externalSignal])
        : controller.signal

    return fetch(url, { ...options, signal }).finally(() => {
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

function validateParameters(parameters: SimulationParameters): { valid: true } | { valid: false, reason: string } {
    if (parameters.simulationTotalMinutes <= 0) return { valid: false, reason: '仿真总时长必须大于 0。' };
    if (parameters.customerArriveRate <= 0) return { valid: false, reason: '顾客到达率不能小于 0。' }
    if (parameters.customerEatSecondsAvg <= 0) return { valid: false, reason: '平均就餐时间必须大于 0。' }
    if (parameters.customerEatSecondsStdVar < 0) return { valid: false, reason: '就餐时间标准差不能小于 0。' }
    if (parameters.dishPrepSecondsAvg <= 0) return { valid: false, reason: '平均做餐时间必须大于 0。' }
    if (parameters.dishPrepSecondsStdVar < 0) return { valid: false, reason: '做餐时间标准差不能小于 0。' }
    if (parameters.windows.length < 3) return { valid: false, reason: '窗口数量必须大于等于 3。' }
    if (!parameters.windows.some(w => w.dishType == "A")) { return { valid: false, reason: '没有提供套餐A的窗口' } }
    if (!parameters.windows.some(w => w.dishType == "B")) { return { valid: false, reason: '没有提供套餐B的窗口' } }
    if (!parameters.windows.some(w => w.dishType == "C")) { return { valid: false, reason: '没有提供套餐C的窗口' } }
    if (parameters.seatCount <= 0) return { valid: false, reason: '座位数量必须大于 0。' }
    if (parameters.windows.some((item) => item.windowPrepTimeModifier <= 0)) return { valid: false, reason: '窗口效率系数必须大于 0。' }

    return { valid: true }
}

export default function App() {
    const [online, setOnline] = useState(false)
    const [dashboard, setDashboard] = useState<DashboardResponse>(emptyDashboard)
    const [parameters, setParameters] = useState<SimulationParameters>(initialParameters)
    const [loading, setLoading] = useState(false)
    const [speed, setSpeed] = useState(1)
    const [page, setPage] = useState<PageState>(PageState.DataManagerPage);

    const showToast = useToast();

    const [dataList, setDataList] = useState<SimulationDataQueryResponse>(emptyDataList);
    const dataListRef = useRef(dataList);
    useEffect(() => { dataListRef.current = dataList; }, [dataList]);

    const dataListHistory = useRef(new Map<number, HistoryPoint[]>());
    const [history, setHistory] = useState<HistoryPoint[] | null>(null);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [speedOpen, setSpeedOpen] = useState(false);

    const sortedDataList = useMemo(() => {
        return {
            selected: dataList.selected,
            datas: Object.values(dataList.simulationDataList).sort((a, b) => a.id - b.id)
        }
    }, [dataList.simulationDataList, dataList.selected])

    const totalQueueLength = useMemo(() => {
        return dashboard.windowsQueueSizes.reduce((sum, value) => sum + value, 0)
    }, [dashboard.windowsQueueSizes])

    const isRunning = dashboard.simulationState === 'started'

    useEffect(() => {
        if (!speedOpen) return
        const close = (e: MouseEvent) => {
            if (!(e.target instanceof Element)) return
            if (e.target.closest('.speed-dropdown')) return
            setSpeedOpen(false)
        }
        document.addEventListener('click', close)
        return () => document.removeEventListener('click', close)
    }, [speedOpen])

    const statusPending = useRef(false);
    const updateStatus = useCallback(async (signal?: AbortSignal) => {
        if (statusPending.current) return
        statusPending.current = true
        try {
            const response = await fetchWithTimeout(`${API_BASE}/status`, undefined, 5000, signal)
            if (!response.ok) throw new Error('status response not ok')
            const result = (await response.json()) as StatusResponse
            setOnline(result.online)
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return
            console.error('updateStatus failed:', error)
            setOnline(false)
        } finally {
            statusPending.current = false
        }
    }, [])

    const dashboardPending = useRef(false);
    const updateDashboard = useCallback(async (signal?: AbortSignal) => {
        if (dashboardPending.current) return
        dashboardPending.current = true
        try {
            const response = await fetchWithTimeout(`${API_BASE}/dashboard`, undefined, 5000, signal)
            if (!response.ok) throw new Error('dashboard response not ok')
            const result = (await response.json()) as DashboardResponse
            setDashboard(result)
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return
            console.error('updateDashboard failed:', error)
        } finally {
            dashboardPending.current = false
        }
    }, [])

    const dataListPending = useRef(false);
    const updateDataList = useCallback(async (signal?: AbortSignal) => {
        if (dataListPending.current) return
        dataListPending.current = true
        try {
            const response = await fetchWithTimeout(`${API_BASE}/data/query`, undefined, 5000, signal)
            if (!response.ok) throw new Error('data query response not ok')
            const result = (await response.json()) as SimulationDataQueryResponse
            setDataList(result)

            const resultIds = new Set(Object.keys(result.simulationDataList).map(Number))
            for (const id of dataListHistory.current.keys()) {
                if (!resultIds.has(id)) {
                    dataListHistory.current.delete(id)
                }
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return
            console.error('updateDataList failed:', error)
        } finally {
            dataListPending.current = false
        }
    }, [])

    const historyPending = useRef(false);
    const updateHistory = useCallback(async (signal?: AbortSignal) => {
        const selectedId = dataListRef.current.selected
        if (selectedId == null) return
        if (historyPending.current) return
        historyPending.current = true
        setHistoryLoading(true)

        let before = dataListHistory.current.get(selectedId)
        if (!before) {
            before = []
            dataListHistory.current.set(selectedId, before)
        }

        try {
            const pageSize = 1000
            let begin = before.length
            let hasMore = true
            const newHistory: HistoryPoint[] = []
            while (hasMore) {
                const response = await fetchWithTimeout(
                    `${API_BASE}/history/range/${selectedId}?begin=${begin}&count=${pageSize}`,
                    undefined, 10000, signal
                )
                if (!response.ok) throw new Error('history response not ok')
                const result = (await response.json()) as HistoryResponse
                newHistory.push(...result.data)
                begin += result.count
                hasMore = result.endingHasMore
            }

            if (newHistory.length !== 0) {
                const merged = [...before, ...newHistory]
                dataListHistory.current.set(selectedId, merged)
                setHistory(merged)
            }
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return
            console.error('updateHistory failed:', error)
        } finally {
            setHistoryLoading(false)
            historyPending.current = false
        }
    }, [showToast])

    const refreshAll = useCallback(async () => {
        await Promise.all([updateStatus(), updateDashboard(), updateDataList()])
        await updateHistory()
    }, [updateDashboard, updateDataList, updateHistory, updateStatus])

    useEffect(() => {
        const unmountController = new AbortController()
        const { signal } = unmountController

        refreshAll()

        const statusTimer = window.setInterval(() => updateStatus(signal), 1000)
        const dashboardTimer = window.setInterval(() => updateDashboard(signal), 1000)
        const dataListTimer = window.setInterval(() => updateDataList(signal), 3000)
        const historyTimer = window.setInterval(() => updateHistory(signal), 1000)

        return () => {
            unmountController.abort()
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
            showToast("新建数据失败：" + validate.reason)
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
            await updateHistory()
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
            await updateDataList()
        } catch {
            showToast('删除数据失败。')
        } finally {
            setLoading(false)
        }
    }

    const updateSpeed = async (speed: number) => {
        setSpeed(speed)

        try {
            const response = await fetchWithTimeout(`${API_BASE}/simulation/speed?speed=${speed}`, { method: 'POST' }, 5000)
            if (!response.ok) {
                showToast('设置仿真速度失败。')
            }
        } catch {
            showToast('设置仿真速度失败。')
        }
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
                        <strong>就餐仿真系统</strong>
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
                <div className="status-bar">
                    <span className="status-bar-title">就餐仿真控制面板</span>
                    <div className="status-bar-right">
                        <span className="status-chip">{formatTime(dashboard.currentHistory.time)}</span>
                        <span className={`status-chip ${isRunning ? 'running' : 'paused'}`}>
                            {localizedState(dashboard.simulationState)}
                        </span>
                        <button
                            className={`status-bar-btn ${isRunning ? 'pause' : 'play'}`}
                            type="button"
                            onClick={() => isRunning ? pauseSimulation() : resumeSimulation()}
                            disabled={loading || dataList.selected == null}
                        >
                            {isRunning ? (
                                <svg className="btn-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                                    <rect x="2" y="3" width="4" height="10" rx="1" />
                                    <rect x="10" y="3" width="4" height="10" rx="1" />
                                </svg>
                            ) : (
                                <svg className="btn-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                                    <path d="M 4.5 2.5 L 12.5 8 L 4.5 13.5 Z" />
                                </svg>
                            )}
                            {isRunning ? '暂停' : '开始'}
                        </button>
                        <div className="speed-dropdown">
                            <button
                                className="status-bar-btn speed-toggle"
                                type="button"
                                onClick={e => { e.stopPropagation(); setSpeedOpen(o => !o) }}
                            >
                                {speed.toFixed(1)}x
                                <svg className={`btn-icon chevron ${speedOpen ? 'open' : ''}`} viewBox="0 0 12 12" width="10" height="10" fill="currentColor">
                                    <path d="M 3 4.5 L 6 7.5 L 9 4.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            {speedOpen && (
                                <div className="speed-dropdown-panel" onClick={e => e.stopPropagation()}>
                                    <div className="speed-dropdown-row">
                                        <span>{speed.toFixed(1)}x</span>
                                        <input type="range" min="0.1" max="10" step="0.1" value={speed} onChange={e => updateSpeed(Number(e.target.value))} />
                                    </div>
                                    <div className="speed-pills">
                                        <button className="secondary-button" type="button" onClick={() => { updateSpeed(0.1); setSpeedOpen(false) }}>0.1x</button>
                                        <button className="secondary-button" type="button" onClick={() => { updateSpeed(1); setSpeedOpen(false) }}>1.0x</button>
                                        <button className="secondary-button" type="button" onClick={() => { updateSpeed(10); setSpeedOpen(false) }}>10.0x</button>
                                    </div>
                                </div>
                            )}
                        </div>
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
                        setParameters={setParameters} />}
                {page == PageState.MonitorPage &&
                    <MonitorPage
                        dashboard={dashboard}
                        totalQueueLength={totalQueueLength}
                        history={history}
                        updateHistory={updateHistory}
                        hasSelectedSimulationData={dataList.selected != null}
                        historyLoading={historyLoading} />}
            </main>
        </div>
    )
}

