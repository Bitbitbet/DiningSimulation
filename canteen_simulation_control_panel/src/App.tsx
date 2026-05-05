import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

const API_BASE = 'http://localhost:23456/api'

type StatusResponse = {
    online: boolean
}

type HistoryPoint = {
    time: number
    averageQueueLength: number
    averageCustomerWaitSeatSeconds: number
    chefUtilization: number
    seatTurnover: number
    seatIdleRate: number
    congestionRate: number
}

type DashboardResponse = {
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

type SimulationDataDto = {
    id: number
    name?: string
    source?: string
    selected?: boolean
}

type SimulationDataQueryResponse = {
    simulationDataList: Record<string, SimulationDataDto>
    selected: number | null
}

type SimulationParameters = {
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
function numberInputField(
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
                    onChange(v);
                }
            }
        />
        {unit ? <span>{unit}</span> : null}
    </label>;
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
    else return '未开始'
}

function normalizeNumber(value: number, digits = 2) {
    if (!Number.isFinite(value)) return '0.00'
    return Number(value).toFixed(digits)
}

function formatTime(seconds: number) {
    seconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? Number(seconds) : 0))

    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60

    return `${String(h).padStart(2, '0')} 时 ${String(m).padStart(2, '0')} 分 ${String(s).padStart(2, '0')} 秒`
}

function percent(value: number) {
    if (!Number.isFinite(value)) return '0%'
    return `${Math.round(Number(value) * 100)}%`
}

function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value))
}

function normalizeHistoryPoint(point: Partial<HistoryPoint> | null | undefined): HistoryPoint {
    return {
        time: Number(point?.time ?? 0),
        averageQueueLength: Number(point?.averageQueueLength ?? 0),
        averageCustomerWaitSeatSeconds: Number(point?.averageCustomerWaitSeatSeconds ?? 0),
        chefUtilization: Number(point?.chefUtilization ?? 0),
        seatTurnover: Number(point?.seatTurnover ?? 0),
        seatIdleRate: Number(point?.seatIdleRate ?? 0),
        congestionRate: Number(point?.congestionRate ?? 0),
    }
}

function mergeHistoryWithCurrent(history: HistoryPoint[], current: HistoryPoint) {
    const map = new Map<number, HistoryPoint>()

    for (const item of history) {
        if (Number.isFinite(item.time)) {
            map.set(Number(item.time.toFixed(3)), normalizeHistoryPoint(item))
        }
    }

    if (current && Number.isFinite(current.time) && current.time > 0) {
        map.set(Number(current.time.toFixed(3)), normalizeHistoryPoint(current))
    }

    return Array.from(map.values()).sort((a, b) => a.time - b.time)
}

function createPolyline(points: HistoryPoint[], getValue: (point: HistoryPoint) => number, width: number, height: number) {
    if (points.length === 0) return ''

    const paddingX = 36
    const paddingY = 24
    const plotWidth = width - paddingX * 2
    const plotHeight = height - paddingY * 2
    const values = points.map((item) => {
        const value = getValue(item)
        return Number.isFinite(value) ? value : 0
    })
    const minValue = Math.min(...values, 0)
    const maxValue = Math.max(...values, 1)
    const span = maxValue - minValue || 1

    return values
        .map((value, index) => {
            const x = points.length <= 1 ? paddingX : paddingX + (index / (points.length - 1)) * plotWidth
            const y = paddingY + (1 - (value - minValue) / span) * plotHeight
            return `${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ')
}

function renderHistoryOverview(history: HistoryPoint[]) {
    if (history.length === 0) {
        return <div className="empty-chart">暂无历史数据，请先新建、选择仿真数据并运行一段时间。</div>
    }

    const width = 760
    const height = 300
    const latest = history.at(-1) ?? emptyHistoryPoint

    const series = [
        {
            label: '仿真时间',
            value: `${normalizeNumber((latest.time ?? 0) / 60, 2)} 分钟`,
            color: '#2c3e50',
            getter: (point: HistoryPoint) => point.time,
        },
        {
            label: '平均排队长度',
            value: `${normalizeNumber(latest.averageQueueLength, 2)} 人`,
            color: '#2563eb',
            getter: (point: HistoryPoint) => point.averageQueueLength,
        },
        {
            label: '平均等座时间',
            value: `${normalizeNumber(latest.averageCustomerWaitSeatSeconds / 60, 2)} 分钟`,
            color: '#f59e0b',
            getter: (point: HistoryPoint) => point.averageCustomerWaitSeatSeconds / 60,
        },
        {
            label: '厨师利用率',
            value: percent(latest.chefUtilization),
            color: '#16a34a',
            getter: (point: HistoryPoint) => point.chefUtilization,
        },
        {
            label: '座位周转率',
            value: `${normalizeNumber(latest.seatTurnover, 2)} 次/时段`,
            color: '#7c3aed',
            getter: (point: HistoryPoint) => point.seatTurnover,
        },
        {
            label: '座位空置率',
            value: percent(latest.seatIdleRate),
            color: '#0891b2',
            getter: (point: HistoryPoint) => point.seatIdleRate,
        },
        {
            label: '拥堵程度',
            value: percent(latest.congestionRate),
            color: '#dc2626',
            getter: (point: HistoryPoint) => point.congestionRate,
        },
    ]

    return (
        <div className="history-overview-card">
            <h3>仿真历史总览（7 项指标归一化展示）</h3>
            <svg viewBox={`0 0 ${width} ${height}`} className="overview-chart" role="img" aria-label="仿真历史总览折线图">
                {[0, 1, 2, 3].map((line) => {
                    const y = 24 + (line / 3) * (height - 48)
                    return <line key={line} x1="36" x2={width - 36} y1={y} y2={y} className="grid-line" />
                })}
                {series.map((item) => (
                    <polyline
                        key={item.label}
                        points={createPolyline(history, item.getter, width, height)}
                        fill="none"
                        stroke={item.color}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ))}
            </svg>
            <div className="chart-time-row">
                <span>{formatTime(history[0]?.time ?? 0)}</span>
                <span>{formatTime(latest.time)}</span>
            </div>
            <div className="legend-grid">
                {series.map((item) => (
                    <span key={item.label} className="legend-chip">
                        <i style={{ background: item.color }} />
                        {item.label}：{item.value}
                    </span>
                ))}
            </div>
        </div>
    )
}

function App() {
    const [online, setOnline] = useState(false)
    const [dashboard, setDashboard] = useState<DashboardResponse>(emptyDashboard)
    const [dataList, setDataList] = useState<SimulationDataQueryResponse>(emptyDataList)
    const [parameters, setParameters] = useState<SimulationParameters>(initialParameters)
    const [history, setHistory] = useState<HistoryPoint[]>([])
    const [notice, setNotice] = useState('正在连接后端服务...')
    const [loading, setLoading] = useState(false)
    const [historyLoading, setHistoryLoading] = useState(false)
    const [speed, setSpeed] = useState(1)

    const [page, setPage] = useState<PageState>(PageState.DataManagerPage);

    const selectedDataRef = useRef<number | null>(null)
    const dashboardRef = useRef<DashboardResponse>(emptyDashboard)
    const historyLoadingRef = useRef(false)

    const selectedDataId = dataList.selected ?? null
    const hasSelectedSimulationData = selectedDataId !== null && selectedDataId !== undefined
    const currentHistory = dashboard.currentHistory ?? emptyHistoryPoint

    useEffect(() => {
        selectedDataRef.current = selectedDataId
    }, [selectedDataId])

    useEffect(() => {
        dashboardRef.current = dashboard
    }, [dashboard])

    const dataItems = useMemo(() => {
        return Object.values(dataList.simulationDataList ?? {}).sort((a, b) => a.id - b.id)
    }, [dataList.simulationDataList])

    const occupiedSeatCount = useMemo(() => {
        return dashboard.seatOccupation.filter((value) => value > 0).length
    }, [dashboard.seatOccupation])

    const totalQueueLength = useMemo(() => {
        return dashboard.windowsQueueSizes.reduce((sum, value) => sum + value, 0)
    }, [dashboard.windowsQueueSizes])

    const updateStatus = useCallback(async () => {
        try {
            const response = await fetchWithTimeout(`${API_BASE}/status`)
            if (!response.ok) throw new Error('status response not ok')
            const result = (await response.json()) as StatusResponse
            setOnline(result.online ?? true)
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

            // 兜底：dashboard 的 currentHistory 是最新点。即使历史接口分页或追加慢，图也不会停在旧时间。
            if (selectedDataRef.current !== null && result.currentHistory.time > 0) {
                setHistory((oldHistory) => mergeHistoryWithCurrent(oldHistory, result.currentHistory))
            }
        } catch {
            // dashboard 失败时不清空旧数据，避免页面闪烁。
        }
    }, [])

    const updateDataList = useCallback(async () => {
        try {
            const response = await fetchWithTimeout(`${API_BASE}/data/query`)
            if (!response.ok) throw new Error('data query response not ok')
            const result = (await response.json()) as SimulationDataQueryResponse
            setDataList(result)
        } catch { }
    }, [])

    const updateHistory = useCallback(async () => {
        if (selectedDataRef.current === null) {
            setHistory([])
            return
        }

        if (historyLoadingRef.current) {
            return
        }

        historyLoadingRef.current = true
        setHistoryLoading(true)

        try {
            const pageSize = 1000
            const maxPages = 200
            let begin = 0
            let hasMore = true
            const allHistory: HistoryPoint[] = []

            for (let page = 0; page < maxPages && hasMore; page += 1) {
                const response = await fetchWithTimeout(`${API_BASE}/history/range?begin=${begin}&count=${pageSize}`, undefined, 10000)
                if (!response.ok) throw new Error('history response not ok')
                const result = (await response.json()) as HistoryResponse
                const pageData = Array.isArray(result.data) ? result.data.map(normalizeHistoryPoint) : []

                allHistory.push(...pageData)
                hasMore = Boolean(result.endingHasMore) && pageData.length > 0
                begin += pageData.length
            }

            setHistory(mergeHistoryWithCurrent(allHistory, dashboardRef.current.currentHistory))
        } catch {
            // 如果历史接口暂时失败，至少保留 dashboard 当前点，不让图表完全空白。
            setHistory((oldHistory) => mergeHistoryWithCurrent(oldHistory, dashboardRef.current.currentHistory))
        } finally {
            historyLoadingRef.current = false
            setHistoryLoading(false)
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
        const historyTimer = window.setInterval(updateHistory, 3000)

        return () => {
            window.clearInterval(statusTimer)
            window.clearInterval(dashboardTimer)
            window.clearInterval(dataListTimer)
            window.clearInterval(historyTimer)
        }
    }, [])

    const validateParameters = () => {
        if (parameters.simulationTotalMinutes <= 0) return '仿真总时长必须大于 0。'
        if (parameters.customerArriveRate < 0) return '顾客到达率不能小于 0。'
        if (parameters.customerEatSecondsAvg <= 0) return '平均就餐时间必须大于 0。'
        if (parameters.customerEatSecondsStdVar < 0) return '就餐时间标准差不能小于 0。'
        if (parameters.dishPrepSecondsAvg <= 0) return '平均做餐时间必须大于 0。'
        if (parameters.dishPrepSecondsStdVar < 0) return '做餐时间标准差不能小于 0。'
        if (parameters.windows.length <= 0) return '窗口数量必须大于 0。'
        if (parameters.seatCount <= 0) return '座位数量必须大于 0。'

        const dishRatioSum = Object.values(parameters.customerDishRatio).reduce((sum, value) => sum + Number(value), 0)
        const groupRatioSum = Object.values(parameters.customerGroupSizeRatio).reduce((sum, value) => sum + Number(value), 0)

        if (dishRatioSum <= 0) return '餐品比例之和必须大于 0。'
        if (groupRatioSum <= 0) return '顾客组比例之和必须大于 0。'

        const invalidWindow = parameters.windows.some((item) => !item.dishType || item.windowPrepTimeModifier <= 0)
        if (invalidWindow) return '窗口餐品类型不能为空，且窗口效率系数必须大于 0。'

        return ''
    }

    const callPost = async (path: string) => {
        const response = await fetchWithTimeout(`${API_BASE}${path}`, { method: 'POST' }, 8000)
        if (!response.ok) {
            const text = await response.text().catch(() => '')
            throw new Error(`${response.status} ${text}`)
        }
        return response
    }

    const callSimulation = async (path: string) => {
        if (path === '/simulation/resume' && !hasSelectedSimulationData) {
            setNotice('请先在“仿真数据管理”中新建或选择一份仿真数据。')
            return
        }

        setLoading(true)
        try {
            const response = await callPost(path)
            const result = await response.json().catch(() => null)
            if (result && typeof result === 'object') {
                setDashboard((old) => ({
                    ...old,
                    ...(result as Partial<DashboardResponse>),
                    currentHistory: normalizeHistoryPoint((result as Partial<DashboardResponse>).currentHistory ?? old.currentHistory),
                    windowsQueueSizes: Array.isArray((result as Partial<DashboardResponse>).windowsQueueSizes)
                        ? ((result as Partial<DashboardResponse>).windowsQueueSizes as number[])
                        : old.windowsQueueSizes,
                    seatOccupation: Array.isArray((result as Partial<DashboardResponse>).seatOccupation)
                        ? ((result as Partial<DashboardResponse>).seatOccupation as number[])
                        : old.seatOccupation,
                }))
            }
            setNotice('操作成功。')
            await refreshAll()
        } catch (error) {
            setNotice(`操作失败：${error instanceof Error ? error.message : '请检查后端接口。'}`)
        } finally {
            setLoading(false)
        }
    }

    const saveParameters = async () => {
        const errorMessage = validateParameters()
        if (errorMessage) {
            setNotice(errorMessage)
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
                setNotice(`保存参数失败：${response.status} ${errorText}`)
                return
            }

            setNotice('参数已提交后端，并生成新的仿真数据。')
            await refreshAll()
        } catch {
            setNotice('保存参数失败，请检查后端是否启动。')
        } finally {
            setLoading(false)
        }
    }

    const selectSimulationData = async (id: number) => {
        setLoading(true)
        try {
            let response = await fetchWithTimeout(`${API_BASE}/data/select?id=${id}`, { method: 'POST' }, 8000)
            if (!response.ok) {
                response = await fetchWithTimeout(`${API_BASE}/data/select/${id}`, { method: 'POST' }, 8000)
            }

            if (!response.ok) {
                const errorText = await response.text()
                setNotice(`选择数据失败：${response.status} ${errorText}`)
                return
            }

            setNotice(`已选择仿真数据：${id}`)
            setHistory([])
            await refreshAll()
        } catch {
            setNotice('选择数据失败，请检查后端 /api/data/select 接口。')
        } finally {
            setLoading(false)
        }
    }

    const deleteSimulationData = async (id: number) => {
        if (!window.confirm(`确定要删除 Simulation #${id} 吗？`)) return

        setLoading(true)
        try {
            const response = await fetchWithTimeout(`${API_BASE}/data/delete/${id}`, { method: 'POST' }, 8000)
            if (!response.ok) {
                const errorText = await response.text()
                setNotice(`删除数据失败：${response.status} ${errorText}`)
                return
            }

            setNotice(`已删除仿真数据：${id}`)
            setHistory([])
            await refreshAll()
        } catch {
            setNotice('删除数据失败，请检查后端 /api/data/delete/{id} 接口。')
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
                setNotice('设置仿真速度失败，请确认后端是否提供 /api/simulation/speed。')
            }
        } catch {
            setNotice('设置仿真速度失败，请确认后端是否提供 /api/simulation/speed。')
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
        setNotice('当前 dashboard 数据已下载。')
    }
    let content = <></>;
    if (page == PageState.MonitorPage) {
        content = <>
            <section className="metrics-grid">
                <div className="metric-card"><span>平均排队长度</span><strong>{normalizeNumber(currentHistory.averageQueueLength)} 人</strong></div>
                <div className="metric-card"><span>顾客等待时间</span><strong>{normalizeNumber(currentHistory.averageCustomerWaitSeatSeconds / 60)} 分钟</strong></div>
                <div className="metric-card"><span>厨师利用率</span><strong>{percent(currentHistory.chefUtilization)}</strong></div>
                <div className="metric-card"><span>座位周转率</span><strong>{normalizeNumber(currentHistory.seatTurnover)} 次/时段</strong></div>
                <div className="metric-card"><span>座位空置率</span><strong>{percent(currentHistory.seatIdleRate)}</strong></div>
                <div className="metric-card"><span>拥堵程度</span><strong>{percent(currentHistory.congestionRate)}</strong></div>
            </section>
            <section className="panel-grid">
                <div className="panel-card">
                    <div className="panel-head">
                        <div>
                            <h2>历史指标趋势</h2>
                            <p>展示当前仿真从开始到当前时刻的总览折线图。</p>
                        </div>
                        <button className="secondary-button" type="button" onClick={updateHistory} disabled={historyLoading || !hasSelectedSimulationData}>
                            {historyLoading ? '刷新中' : '刷新历史'}
                        </button>
                    </div>
                    {renderHistoryOverview(history)}
                </div>

                <div className="panel-card">
                    <div className="panel-head">
                        <div>
                            <h2>仿真控制</h2>
                        </div>
                    </div>
                    <div className="button-row" style={{ marginBottom: 16 }}>
                        <button className="primary-button" type="button" onClick={() => callSimulation('/simulation/resume')} disabled={loading || !hasSelectedSimulationData}>开始</button>
                        <button className="secondary-button" type="button" onClick={() => callSimulation('/simulation/pause')} disabled={loading}>暂停</button>
                        <button className="secondary-button" type="button" onClick={() => callSimulation('/simulation/reset')} disabled={loading}>重置</button>
                    </div>

                    <div className="speed-card">
                        <div className="speed-row">
                            <strong>仿真速度：{normalizeNumber(speed, 1)}x</strong>
                            <input type="range" min="0.1" max="10" step="0.1" value={speed} onChange={(event) => updateSpeed(Number(event.target.value))} />
                            <div className="speed-pills">
                                <button className="secondary-button" type="button" onClick={() => updateSpeed(0.1)}>0.1x 慢速</button>
                                <button className="secondary-button" type="button" onClick={() => updateSpeed(1)}>1.0x 正常</button>
                                <button className="secondary-button" type="button" onClick={() => updateSpeed(10)}>10.0x 快速</button>
                            </div>
                        </div>
                    </div>
                </div><section className="panel-card full">
                    <div className="panel-head">
                        <div>
                            <h2>窗口与座位明细</h2>
                        </div>
                    </div>
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>类型</th><th>编号</th><th>当前数值</th><th>说明</th></tr></thead>
                            <tbody>
                                {dashboard.windowsQueueSizes.map((size, index) => (
                                    <tr key={`window-${index}`}><td>窗口</td><td>{index + 1}</td><td>{size}</td><td>当前排队人数</td></tr>
                                ))}
                                {dashboard.seatOccupation.map((occupied, index) => (
                                    <tr key={`seat-${index}`}><td>座位</td><td>{index + 1}</td><td>{occupied}</td><td>{occupied > 0 ? '已占用' : '空闲'}</td></tr>
                                ))}
                                {dashboard.windowsQueueSizes.length === 0 && dashboard.seatOccupation.length === 0 && (
                                    <tr><td colSpan={4}>暂无明细数据，请先新建并选择仿真数据。</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="summary-row">
                        <span>窗口数量：{dashboard.windowsQueueSizes.length}</span>
                        <span>当前排队人数：{totalQueueLength}</span>
                        <span>座位数量：{dashboard.seatOccupation.length}</span>
                        <span>已占座位：{occupiedSeatCount}</span>
                    </div>
                </section>
            </section>
        </>
    } else if (page == PageState.DataManagerPage) {
        content = <>
            <section className="panel-grid">
                <div className="panel-card">
                    <div className="panel-head">
                        <h2>仿真数据管理</h2>
                    </div>
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr><th>数据名称</th><th>来源</th><th>状态</th><th>操作</th></tr>
                            </thead>
                            <tbody>
                                {dataItems.length > 0 ? dataItems.map((item) => {
                                    const selected = dataList.selected === item.id
                                    return (
                                        <tr key={item.id}>
                                            <td>{item.name || `Simulation #${item.id}`}</td>
                                            <td>{item.source || '数据库'}</td>
                                            <td>{selected ? '当前选中' : '未选中'}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button className="secondary-button" type="button" onClick={() => selectSimulationData(item.id)} disabled={loading}>选择</button>
                                                    <button className="danger-button" type="button" onClick={() => deleteSimulationData(item.id)} disabled={loading}>删除</button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                }) : (
                                    <tr><td colSpan={4}>暂无仿真数据，请先点击“新建数据”。</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="button-row" style={{ marginTop: 14 }}>
                        <button className="secondary-button" type="button" onClick={downloadDashboard}>下载数据</button>
                        <button className="secondary-button" type="button" onClick={refreshAll}>刷新数据</button>
                    </div>
                </div>

                <div className="panel-card">
                    <div className="panel-head">
                        <div>
                            <h2>窗口队列状态</h2>
                        </div>
                    </div>
                    <div className="queue-list">
                        {dashboard.windowsQueueSizes.length > 0 ? dashboard.windowsQueueSizes.map((size, index) => (
                            <div className="queue-item" key={index}>
                                <span>窗口 {index + 1}</span>
                                <strong>{size} 人排队</strong>
                            </div>
                        )) : <div className="empty-chart">暂无窗口队列数据</div>}
                    </div>
                </div>
            </section>
            <div className="form-grid">
                {numberInputField({
                    label: "仿真总时长",
                    initial: parameters.simulationTotalMinutes,
                    onChange: v => setParameters({
                        ...parameters,
                        simulationTotalMinutes: v
                    }),
                    min: 1,
                    step: 0.1,
                    unit: "分钟"
                })}
                {numberInputField({
                    label: "顾客到达率",
                    initial: parameters.customerArriveRate * 60,
                    onChange: v => setParameters({
                        ...parameters,
                        customerArriveRate: v / 60
                    }),
                    min: 1,
                    step: 0.1,
                    unit: "人/分钟"
                })}
                {numberInputField({
                    label: "平均顾客就餐时间",
                    initial: parameters.customerEatSecondsAvg / 60,
                    onChange: v => setParameters({
                        ...parameters,
                        customerEatSecondsAvg: v * 60
                    }),
                    min: 0.01,
                    step: 0.01,
                    unit: "分钟"
                })}
                {numberInputField({
                    label: "顾客就餐时间标准差",
                    initial: parameters.customerEatSecondsStdVar / 60,
                    onChange: v => setParameters({
                        ...parameters,
                        customerEatSecondsStdVar: v * 60
                    }),
                    min: 0.01,
                    step: 0.01,
                    unit: "分钟"
                })}
                {numberInputField({
                    label: "平均餐品准备时间",
                    initial: parameters.dishPrepSecondsAvg / 60,
                    onChange: v => setParameters({
                        ...parameters,
                        dishPrepSecondsAvg: v * 60
                    }),
                    min: 0.01,
                    step: 0.01,
                    unit: "分钟"
                })}
                {numberInputField({
                    label: "餐品准备时间标准差",
                    initial: parameters.dishPrepSecondsStdVar / 60,
                    onChange: v => setParameters({
                        ...parameters,
                        dishPrepSecondsStdVar: v * 60
                    }),
                    min: 0.01,
                    step: 0.01,
                    unit: "分钟"
                })}
                {numberInputField({
                    label: "窗口数量",
                    initial: parameters.windows.length,
                    onChange: v => changeWindowCount(v),
                    min: 3,
                    step: 1,
                    unit: "个"
                })}
                {numberInputField({
                    label: "座位数量",
                    initial: parameters.seatCount,
                    onChange: v => setParameters({
                        ...parameters,
                        seatCount: v
                    }),
                    min: 1,
                    step: 1,
                    unit: "个"
                })}
                <label>平均就餐时间<input type="number" value={parameters.customerEatSecondsAvg / 60} onChange={(e) => setParameters((old) => ({ ...old, customerEatSecondsAvg: Number(e.target.value) * 60 }))} /><span className="unit">分钟</span></label>
                <label>就餐时间标准差<input type="number" value={parameters.customerEatSecondsStdVar / 60} onChange={(e) => setParameters((old) => ({ ...old, customerEatSecondsStdVar: Number(e.target.value) * 60 }))} /><span className="unit">分钟</span></label>
                <label>平均做餐时间<input type="number" value={parameters.dishPrepSecondsAvg / 60} onChange={(e) => setParameters((old) => ({ ...old, dishPrepSecondsAvg: Number(e.target.value) * 60 }))} /><span className="unit">分钟</span></label>
                <label>做餐时间标准差<input type="number" value={parameters.dishPrepSecondsStdVar / 60} onChange={(e) => setParameters((old) => ({ ...old, dishPrepSecondsStdVar: Number(e.target.value) * 60 }))} /><span className="unit">分钟</span></label>
                <label>窗口数量<input type="number" value={parameters.windows.length} onChange={(e) => changeWindowCount(Number(e.target.value))} /><span className="unit">个</span></label>
                <label>座位数量<input type="number" value={parameters.seatCount} onChange={(e) => setParameters((old) => ({ ...old, seatCount: Number(e.target.value) }))} /><span className="unit">个</span></label>
            </div >
            <section className="panel-card full">
                <div className="panel-head">
                    <div>
                        <h2>餐品与顾客比例</h2>
                    </div>
                    <button className="primary-button" type="button" onClick={saveParameters} disabled={loading}>新建数据</button>
                </div>
                <div className="form-grid three">
                    {(['A', 'B', 'C'] as const).map((dish) => (
                        <label key={dish}>{dish} 套餐比例<input type="number" value={parameters.customerDishRatio[dish]} onChange={(e) => setParameters((old) => ({ ...old, customerDishRatio: { ...old.customerDishRatio, [dish]: Number(e.target.value) } }))} /><span className="unit">%</span></label>
                    ))}
                    {(['1', '2', '3', '4'] as const).map((size) => (
                        <label key={size}>{size} 人组比例<input type="number" value={parameters.customerGroupSizeRatio[size]} onChange={(e) => setParameters((old) => ({ ...old, customerGroupSizeRatio: { ...old.customerGroupSizeRatio, [size]: Number(e.target.value) } }))} /><span className="unit">%</span></label>
                    ))}
                </div>
            </section>
        </>
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
                <header className="hero-card">
                    <h1>北平食堂大学食堂就餐仿真系统</h1>
                    <div className="hero-actions">
                        <span className="chip">当前仿真时钟：{formatTime(currentHistory.time)}</span>
                        <span className="chip">状态：{localizedState(dashboard.simulationState)}</span>
                    </div>
                </header>

                <div className="notice-card">{notice}</div>
                {content}
            </main>
        </div>
    )
}

export default App
