import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './index.css'

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
}

type SimulationDataQueryResponse = {
    simulationDataList: Record<number, SimulationDataDto>
    selected: number | null
}

type SimulationParameters = {
    simulationTotalMinutes: number
    customerArriveRate: number
    customerGroupSizeRatio: Record<number, number>
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

const Messages = {
    "backend_not_online": 0,
} as const;
type Messages = typeof Messages[keyof typeof Messages];

const emptyDashboard: DashboardResponse = {
    simulationState: 'pending',
    currentHistory: {
        time: 0,
        averageQueueLength: 0,
        averageCustomerWaitSeatSeconds: 0,
        chefUtilization: 0,
        seatTurnover: 0,
        seatIdleRate: 0,
        congestionRate: 0,
    },
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

function fetchWithTimeout(url: string | URL, options?: RequestInit, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId));
}

function localizedState(state: string) {
    if (state == 'started') {
        return '运行中'
    } else if (state == 'paused') {
        return '已暂停'
    }
    return '未开始'
}

function formatNumber(value: number, digits = 2) {
    if (!Number.isFinite(value)) return '0.00'
    return value.toFixed(digits)
}

function formatTime(seconds: number) {
    seconds = Math.floor(seconds);
    const h = Math.floor(seconds / 3600);
    const rest_seconds = seconds % 3600;
    const m = Math.floor(rest_seconds / 60);
    const s = rest_seconds % 60;
    let hs = h.toString();
    let ms = m.toString();
    let ss = s.toString();
    if (h <= 9) {
        hs = '0' + hs;
    }
    if (m <= 9) {
        ms = '0' + ms;
    }
    if (s <= 9) {
        ss = '0' + ss;
    }
    return hs + ' 时 ' + ms + ' 分 ' + ss + ' 秒';
}

function percent(value: number) {
    if (!Number.isFinite(value)) return '0%'
    return `${Math.round(value * 100)}%`
}

function renderBars(values: number[], maxValue = 1) {
    const safeValues = values.map((value) => (Number.isFinite(value) ? Math.abs(value) : 0))
    const safeMax = Math.max(maxValue, ...safeValues, 1)

    if (values.length === 0) {
        return <div className="empty-chart">暂无历史数据</div>
    }

    return (
        <div className="mini-chart">
            {safeValues.map((value, index) => {
                const height = Math.max(10, Math.min(130, (value / safeMax) * 120))

                return (
                    <span
                        key={`${value}-${index}`}
                        className="mini-bar"
                        style={{ height: `${height}px` }}
                        title={formatNumber(value)}
                    />
                )
            })}
        </div>
    )
}


function renderHistoryOverview(history: HistoryPoint[]) {
    if (history.length === 0) {
        return <div className="empty-chart">暂无历史数据，请先选择仿真数据并运行一段时间。</div>
    }

    const width = 720
    const height = 260
    const paddingX = 38
    const paddingY = 30
    const plotWidth = width - paddingX * 2
    const plotHeight = height - paddingY * 2

    const xOf = (index: number) => {
        if (history.length <= 1) return paddingX
        return paddingX + (index / (history.length - 1)) * plotWidth
    }

    const normalize = (values: number[]) => {
        const safeValues = values.map((value) => (Number.isFinite(value) ? value : 0))
        const minValue = Math.min(...safeValues, 0)
        const maxValue = Math.max(...safeValues, 1)
        const span = maxValue - minValue || 1

        return safeValues.map((value, index) => {
            const x = xOf(index)
            const y = paddingY + (1 - (value - minValue) / span) * plotHeight
            return `${x.toFixed(1)},${y.toFixed(1)}`
        }).join(' ')
    }

    const series = [
        {
            label: '仿真时间',
            color: '#334155',
            values: history.map((item) => (item.time ?? 0) / 60),
            latest: `${formatNumber((history.at(-1)?.time ?? 0) / 60)} 分钟`,
        },
        {
            label: '平均排队长度',
            color: '#1e5bff',
            values: history.map((item) => item.averageQueueLength ?? 0),
            latest: `${formatNumber(history.at(-1)?.averageQueueLength ?? 0)} 人`,
        },
        {
            label: '平均等座时间',
            color: '#ff8a00',
            values: history.map((item) => (item.averageCustomerWaitSeatSeconds ?? 0) / 60),
            latest: `${formatNumber((history.at(-1)?.averageCustomerWaitSeatSeconds ?? 0) / 60)} 分钟`,
        },
        {
            label: '厨师利用率',
            color: '#20a66a',
            values: history.map((item) => (item.chefUtilization ?? 0) * 100),
            latest: percent(history.at(-1)?.chefUtilization ?? 0),
        },
        {
            label: '座位周转率',
            color: '#7c3aed',
            values: history.map((item) => item.seatTurnover ?? 0),
            latest: `${formatNumber(history.at(-1)?.seatTurnover ?? 0)} 次/时段`,
        },
        {
            label: '座位空置率',
            color: '#0891b2',
            values: history.map((item) => (item.seatIdleRate ?? 0) * 100),
            latest: percent(history.at(-1)?.seatIdleRate ?? 0),
        },
        {
            label: '拥堵程度',
            color: '#d9363e',
            values: history.map((item) => (item.congestionRate ?? 0) * 100),
            latest: percent(history.at(-1)?.congestionRate ?? 0),
        },
    ]

    const firstTime = history[0]?.time ?? 0
    const lastTime = history.at(-1)?.time ?? 0

    return (
        <div>
            <svg
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label="仿真历史总览折线图"
                style={{ width: '100%', height: 300, display: 'block' }}
            >
                <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#dbe7f5" strokeWidth="2" />
                <line x1={paddingX} y1={paddingY} x2={paddingX} y2={height - paddingY} stroke="#dbe7f5" strokeWidth="2" />
                {[0.25, 0.5, 0.75].map((ratio) => {
                    const y = paddingY + ratio * plotHeight
                    return <line key={ratio} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#edf3fb" strokeWidth="1" />
                })}
                {series.map((item) => (
                    <polyline
                        key={item.label}
                        points={normalize(item.values)}
                        fill="none"
                        stroke={item.color}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                ))}
                <text x={paddingX} y={height - 7} fill="#6d7f9b" fontSize="18" fontWeight="700">
                    {formatTime(firstTime)}
                </text>
                <text x={width - paddingX - 95} y={height - 7} fill="#6d7f9b" fontSize="18" fontWeight="700">
                    {formatTime(lastTime)}
                </text>
            </svg>

            <div className="summary-row" style={{ marginTop: 8 }}>
                {series.map((item) => (
                    <span key={item.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <i style={{ width: 12, height: 12, borderRadius: 999, background: item.color, display: 'inline-block' }} />
                        {item.label}：{item.latest}
                    </span>
                ))}
            </div>
        </div>
    )
}

function numberInputField(
    { label, initial, callback, min, max, step, unit }:
        {
            label: string;
            initial: number;
            callback: (value: number) => void;
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
                    callback(v);
                }
            }
        />
        {unit ? <span>{unit}</span> : null}
    </label>;
}

export default function App() {
    const [online, setOnline] = useState(false)
    const onlineRef = useRef(online);
    const [onlineLoading, setOnlineLoading] = useState(false);
    const onlineLoadingRef = useRef(onlineLoading);
    const [loading, setLoading] = useState(false)

    const [dashboard, setDashboard] = useState<DashboardResponse>(emptyDashboard)
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const dashboardLoadingRef = useRef(dashboardLoading);

    const [recentHistory, setRecentHistory] = useState<HistoryPoint[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const historyLoadingRef = useRef(historyLoading)
    const selectedDataRef = useRef<number | null>(null)

    const [dataList, setDataList] = useState<SimulationDataQueryResponse>(emptyDataList)
    const [dataListLoading, setDataListLoading] = useState(false);

    const [parameters, setParameters] = useState<SimulationParameters>(initialParameters)
    const [simulationSpeed, setSimulationSpeedValue] = useState(1)
    const [speedSaving, setSpeedSaving] = useState(false)
    const [notice, setNotice] = useState('正在连接后端服务...')

    const hasSelectedSimulationData = dataList.selected != null

    useEffect(() => {
        onlineRef.current = online;
    }, [online]);
    useEffect(() => {
        onlineLoadingRef.current = onlineLoading;
    }, [onlineLoading]);
    useEffect(() => {
        dashboardLoadingRef.current = dashboardLoading;
    }, [dashboardLoading]);
    useEffect(() => {
        historyLoadingRef.current = historyLoading;
    }, [historyLoading]);
    useEffect(() => {
        selectedDataRef.current = dataList.selected;
    }, [dataList.selected]);

    const updateStatus = useCallback(async () => {
        if (onlineLoadingRef.current) {
            return
        }
        setOnlineLoading(true);
        try {
            let response = await fetchWithTimeout(`${API_BASE}/status`, undefined, 3000).then(r => {
                if (!r.ok) throw new Error("Response not ok");

                return r.json() as Promise<StatusResponse>;
            });

            setOnline(response.online);
        } catch (_) {
            setOnline(false);
        } finally {
            setOnlineLoading(false);
        }
    }, []);
    const updateDashboard = useCallback(async () => {
        if (!onlineRef.current) {
            return;
        }
        if (dashboardLoadingRef.current) {
            return;
        }
        console.log("UPDATING DASHBOARDDD")
        setDashboardLoading(true);
        try {
            const response = await fetchWithTimeout(`${API_BASE}/dashboard`, undefined, 5000).then(r => {
                if (!r.ok) throw new Error('Response not ok')

                return r.json() as Promise<DashboardResponse>
            });

            setDashboard(response);
        } catch (_) {

        } finally {
            setDashboardLoading(false);
        }
    }, []);
    const updateDataList = async () => {
        if (!online) {
            return;
        }
        if (dataListLoading) {
            return;
        }
        setDataListLoading(true);
        try {
            const response = await fetchWithTimeout(`${API_BASE}/data/query`, undefined, 5000).then(r => {
                if (!r.ok) throw new Error('Response not ok')

                return r.json() as Promise<SimulationDataQueryResponse>
            });

            setDataList(response);
            if (response.selected == null) {
                setRecentHistory([]);
            }
        } catch (_) {

        } finally {
            setDataListLoading(false);
        }
    }

    const updateRecentHistory = useCallback(async () => {
        if (!onlineRef.current) {
            return;
        }

        if (selectedDataRef.current == null) {
            setRecentHistory([]);
            return;
        }

        if (historyLoadingRef.current) {
            return;
        }

        setHistoryLoading(true);
        try {
            const response = await fetchWithTimeout(`${API_BASE}/history/range?begin=0&count=1000`, undefined, 5000).then(r => {
                if (!r.ok) throw new Error('Response not ok')

                return r.json() as Promise<HistoryResponse>
            });

            setRecentHistory(response.data ?? []);
        } catch (_) {
            setRecentHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    }, []);

    useEffect(() => {
        updateStatus();
        const timerStatus = setInterval(updateStatus, 2000);
        const timerDashboard = setInterval(updateDashboard, 1000);
        const timerHistory = setInterval(updateRecentHistory, 3000);

        return () => {
            clearInterval(timerStatus);
            clearInterval(timerDashboard);
            clearInterval(timerHistory);
        }
    }, [updateDashboard, updateRecentHistory, updateStatus])

    useEffect(() => {
        if (online) {
            updateDashboard();
            updateDataList();
        }
    }, [online])

    useEffect(() => {
        if (dataList.selected == null) {
            setRecentHistory([]);
            return;
        }

        updateDashboard();
        updateRecentHistory();
    }, [dataList.selected, updateDashboard, updateRecentHistory])


    const formatedTime = formatTime(dashboard.currentHistory.time);
    const averageQueueLength = dashboard.currentHistory.averageQueueLength;
    const averageWaitSeatMinutes = dashboard.currentHistory.averageCustomerWaitSeatSeconds / 60;

    const chefUtilization = dashboard.currentHistory.chefUtilization
    const seatTurnoverRate = dashboard.currentHistory.seatTurnover
    const seatIdleRate = dashboard.currentHistory.seatIdleRate
    const congestionRate = dashboard.currentHistory.congestionRate

    const totalQueueLength = dashboard.windowsQueueSizes.reduce((sum, value) => sum + value, 0)
    const occupiedSeatCount = dashboard.seatOccupation.filter((value) => value > 0).length
    const dataItems = Object.values(dataList.simulationDataList ?? {}) as SimulationDataDto[]

    const validateParameters = () => {
        if (parameters.simulationTotalMinutes <= 0) {
            return '仿真总时长必须大于 0。'
        }

        if (parameters.customerArriveRate < 0) {
            return '顾客到达率不能小于 0。'
        }

        if (parameters.customerEatSecondsAvg <= 0) {
            return '平均就餐时间必须大于 0。'
        }

        if (parameters.dishPrepSecondsAvg <= 0) {
            return '平均做餐时间必须大于 0。'
        }

        if (parameters.customerEatSecondsStdVar < 0 || parameters.dishPrepSecondsStdVar < 0) {
            return '时间标准差不能小于 0。'
        }

        if (parameters.windows.length <= 0) {
            return '窗口数量必须大于 0。'
        }

        if (parameters.seatCount <= 0) {
            return '座位数量必须大于 0。'
        }

        const dishRatioSum = (Object.values(parameters.customerDishRatio) as number[]).reduce((sum, value) => sum + value, 0)
        if (dishRatioSum <= 0) {
            return '餐品比例之和必须大于 0。'
        }

        const groupRatioSum = (Object.values(parameters.customerGroupSizeRatio) as number[]).reduce((sum, value) => sum + value, 0)
        if (groupRatioSum <= 0) {
            return '顾客组比例之和必须大于 0。'
        }

        const invalidWindow = parameters.windows.some(
            (window) => !window.dishType || window.windowPrepTimeModifier <= 0,
        )

        if (invalidWindow) {
            return '窗口餐品类型不能为空，且窗口做餐修正系数必须大于 0。'
        }

        return ''
    }

    const deleteSimulationData = async (id: number) => {
        const confirmed = window.confirm(`确定要删除 Simulation #${id} 吗？`)

        if (!confirmed) {
            return
        }

        setLoading(true)

        try {
            const response = await fetch(`${API_BASE}/data/delete/${id}`, {
                method: 'POST',
            })

            if (!response.ok) {
                const errorText = await response.text()
                setNotice(`删除数据失败：${response.status} ${errorText}`)
                return
            }

            setNotice(`已删除仿真数据：${id}`)
            await updateDataList()
        } catch {
            setNotice('删除数据失败，请检查后端 /api/data/delete/{id} 接口。')
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

        if (loading) {
            return
        }

        setLoading(true)

        try {
            const response = await fetch(`${API_BASE}/data/new`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parameters),
            });

            if (!response.ok) {
                setNotice('保存参数失败，请检查后端是否启动。')
                return
            }

            setNotice('参数已提交后端，并生成新的仿真数据。')
            await updateDataList();
        } catch {
            setNotice('保存参数失败，请检查后端是否启动。')
        } finally {
            setLoading(false)
        }
    }

    const selectSimulationData = async (id: number) => {
        setLoading(true)

        try {
            const response = await fetch(`${API_BASE}/data/select/${id}`, {
                method: 'POST',
            })


            if (!response.ok) {
                const errorText = await response.text()
                setNotice(`选择数据失败：${response.status} ${errorText}`)
                return
            }

            setNotice(`已选择仿真数据：${id}`)
            await updateDataList()
            selectedDataRef.current = id
            await updateDashboard()
            await updateRecentHistory()
        } catch {
            setNotice('选择数据失败，请检查后端是否运行。')
        } finally {
            setLoading(false)
        }
    }

    const downloadDashboard = () => {
        const content = JSON.stringify(
            {
                status,
                dashboard,
                dataList,
            },
            null,
            2,
        )

        const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `canteen-dashboard-${Date.now()}.json`
        link.click()
        URL.revokeObjectURL(url)

        setNotice('当前 dashboard 数据已下载。')
    }

    const resumeSimuation = async () => {
        if (loading) {
            return;
        }
        setLoading(true)

        try {
            const response = await fetch(`${API_BASE}/simulation/resume`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error("Failed to resume")
            }

            setNotice('操作成功。')
            await updateDashboard()
        } catch {
            setNotice('操作失败，请检查后端接口或控制台报错。')
        } finally {
            setLoading(false)
        }
    }
    const pauseSimuation = async () => {
        if (loading) {
            return;
        }
        setLoading(true)

        try {
            const response = await fetch(`${API_BASE}/simulation/pause`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error("Failed to pause")
            }

            setNotice('操作成功。')
            await updateDashboard()
        } catch {
            setNotice('操作失败，请检查后端接口或控制台报错。')
        } finally {
            setLoading(false)
        }
    }

    const applySimulationSpeed = async (speed: number) => {
        const safeSpeed = Math.max(0.1, Math.min(10, speed));
        setSimulationSpeedValue(safeSpeed);
        setSpeedSaving(true);

        try {
            const response = await fetch(`${API_BASE}/simulation/speed?speed=${encodeURIComponent(safeSpeed)}`, {
                method: 'POST',
            });

            if (!response.ok) {
                throw new Error('Failed to set simulation speed')
            }

            setNotice(`仿真速度已调整为 ${safeSpeed.toFixed(1)}x。`)
        } catch {
            setNotice('仿真速度调整失败，请检查后端 /api/simulation/speed 接口。')
        } finally {
            setSpeedSaving(false);
        }
    }

    const changeWindowCount = (count: number) => {
        const safeCount = Math.max(1, Math.min(20, count))
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

        setParameters({
            ...parameters,
            windows: nextWindows,
        })
    }

    return (
        <>
            <main className="app-shell">
                <aside className="sidebar">
                    <div className="brand">
                        <div className="brand-mark">食</div>
                        <div>
                            <strong>食堂仿真系统</strong>
                            <span>控制面板</span>
                        </div>
                    </div>

                    <div className={online ? 'status-dot online' : 'status-dot offline'}>
                        <span />
                        {online ? '后端在线' : '后端离线'}
                    </div>
                </aside>

                <section className="content">
                    <header className="hero-card">
                        <div>
                            <h1>北平食堂大学食堂就餐仿真系统</h1>
                        </div>

                        <div className="hero-actions">
                            <span className="time-chip">当前仿真时钟：{formatedTime}</span>
                            <span className="time-chip">状态：{localizedState(dashboard.simulationState)}</span>
                        </div>
                    </header>

                    <div className="notice-card">{notice}</div>

                    <section className="metric-grid">
                        {[
                            ['平均排队长度', `${formatNumber(averageQueueLength)} 人`],
                            ['顾客等待时间', `${formatNumber(averageWaitSeatMinutes)} 分钟`],
                            ['厨师利用率', percent(chefUtilization)],
                            ['座位周转率', `${formatNumber(seatTurnoverRate)} 次/时段`],
                            ['座位空置率', percent(seatIdleRate)],
                            ['拥堵程度', percent(congestionRate)],
                        ].map(([label, value]) => (
                            <article className="metric-card" key={label}>
                                <span>{label}</span>
                                <strong>{value}</strong>
                            </article>
                        ))}
                    </section>

                    <section className="panel-grid">
                        <div className="panel-card">
                            <div className="panel-head">
                                <div>
                                    <h2>历史指标趋势</h2>
                                    <p>展示当前仿真从开始到当前时刻的总览折线图。</p>
                                </div>
                                <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={updateRecentHistory}
                                    disabled={loading || historyLoading || !hasSelectedSimulationData}
                                    title={!hasSelectedSimulationData ? '请先选择仿真数据' : '刷新历史趋势'}
                                >
                                    {historyLoading ? '刷新中...' : '刷新历史'}
                                </button>
                            </div>

                            <div className="chart-grid">
                                <div className="chart-card" style={{ gridColumn: '1 / -1', minHeight: 360 }}>
                                    <h3>仿真历史总览（7 项指标归一化展示）</h3>
                                    {renderHistoryOverview(recentHistory)}
                                </div>
                            </div>
                        </div>

                        <div className="panel-card">
                            <div className="panel-head compact">
                                <div>
                                    <h2>仿真控制</h2>
                                </div>
                            </div>

                            <div className="button-row">
                                <button
                                    className="primary-button"
                                    type="button"
                                    onClick={resumeSimuation}
                                    disabled={loading || !hasSelectedSimulationData || dashboard.finished}
                                    title={!hasSelectedSimulationData ? '请先新建或选择仿真数据' : '开始或继续仿真'}
                                >
                                    开始
                                </button>

                                <button
                                    className="secondary-button"
                                    type="button"
                                    onClick={pauseSimuation}
                                    disabled={loading}
                                >
                                    暂停
                                </button>
                            </div>

                            <div
                                style={{
                                    padding: '16px 18px',
                                    borderRadius: 18,
                                    background: '#f8fbff',
                                    border: '1px solid #dbe7f5',
                                    marginBottom: 18,
                                }}
                            >
                                <label style={{ display: 'grid', gap: 10 }}>
                                    <span>仿真速度：{simulationSpeed.toFixed(1)}x {speedSaving ? '（保存中）' : ''}</span>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="10"
                                        step="0.1"
                                        value={simulationSpeed}
                                        onChange={(event) => setSimulationSpeedValue(Number(event.target.value))}
                                        onMouseUp={(event) => applySimulationSpeed(Number(event.currentTarget.value))}
                                        onTouchEnd={(event) => applySimulationSpeed(Number(event.currentTarget.value))}
                                        onBlur={(event) => applySimulationSpeed(Number(event.currentTarget.value))}
                                        disabled={!online || speedSaving}
                                    />
                                </label>
                                <div className="summary-row" style={{ marginTop: 8 }}>
                                    <span>0.1x 慢速</span>
                                    <span>1.0x 正常</span>
                                    <span>10.0x 快速</span>
                                </div>
                            </div>

                            {!hasSelectedSimulationData && (
                                <p className="hint-text">请先在“仿真数据管理”中新建或选择一份仿真数据，然后再开始仿真。</p>
                            )}

                            <div className="form-grid">
                                {
                                    numberInputField({
                                        label: "仿真总时长",
                                        initial: parameters.simulationTotalMinutes,
                                        callback: v => setParameters({
                                            ...parameters,
                                            simulationTotalMinutes: v,
                                        }),
                                        min: 1,
                                        step: 1,
                                        unit: "分钟"
                                    })
                                }
                                {
                                    numberInputField({
                                        label: "顾客到达率",
                                        initial: parameters.customerArriveRate * 60,
                                        callback: v => setParameters({
                                            ...parameters,
                                            customerArriveRate: v / 60,
                                        }),
                                        min: 0,
                                        step: 0.1,
                                        unit: "人/分钟"
                                    })
                                }
                                {
                                    numberInputField({
                                        label: "平均做餐时间",
                                        initial: parameters.dishPrepSecondsAvg / 60,
                                        callback: v => setParameters({
                                            ...parameters,
                                            dishPrepSecondsAvg: v * 60,
                                        }),
                                        min: 0.1,
                                        step: 0.1,
                                        unit: "分钟"
                                    })
                                }
                                {
                                    numberInputField({
                                        label: "做餐时间标准差",
                                        initial: parameters.dishPrepSecondsStdVar / 60,
                                        callback: v => setParameters({
                                            ...parameters,
                                            dishPrepSecondsStdVar: v * 60,
                                        }),
                                        min: 0,
                                        step: 0.1,
                                        unit: "分钟"
                                    })
                                }
                                {
                                    numberInputField({
                                        label: "平均就餐时间",
                                        initial: parameters.customerEatSecondsAvg / 60,
                                        callback: v => setParameters({
                                            ...parameters,
                                            customerEatSecondsAvg: v * 60,
                                        }),
                                        min: 1,
                                        step: 0.5,
                                        unit: "分钟"
                                    })
                                }
                                {
                                    numberInputField({
                                        label: "就餐时间标准差",
                                        initial: parameters.customerEatSecondsStdVar / 60,
                                        callback: v => setParameters({
                                            ...parameters,
                                            customerEatSecondsStdVar: v * 60,
                                        }),
                                        min: 0,
                                        step: 0.1,
                                        unit: "分钟"
                                    })
                                }
                                {
                                    numberInputField({
                                        label: "窗口数量",
                                        initial: parameters.windows.length,
                                        callback: v => changeWindowCount(v),
                                        min: 3,
                                        step: 1,
                                        unit: "个"
                                    })
                                }
                                {
                                    numberInputField({
                                        label: "座位数量",
                                        initial: parameters.seatCount,
                                        callback: v => setParameters({
                                            ...parameters,
                                            seatCount: v,
                                        }),
                                        min: 3,
                                        step: 1,
                                        unit: "个"
                                    })
                                }
                            </div>
                        </div>
                    </section>

                    <section className="panel-card" style={{ marginTop: 22 }}>
                        <div className="panel-head compact">
                            <div>
                                <h2>餐品与顾客比例</h2>
                                <p>这些参数会通过 /api/data/new 提交给后端。</p>
                            </div>
                        </div>

                        <div className="form-grid three">
                            {(['A', 'B', 'C'] as const).map((dish) => (
                                <label key={dish}>
                                    {dish} 套餐比例
                                    <input
                                        type="number"
                                        min="0"
                                        value={parameters.customerDishRatio[dish]}
                                        onChange={(event) =>
                                            setParameters({
                                                ...parameters,
                                                customerDishRatio: {
                                                    ...parameters.customerDishRatio,
                                                    [dish]: Number(event.target.value),
                                                },
                                            })
                                        }
                                    />
                                    <span>%</span>
                                </label>
                            ))}

                            {(['1', '2', '3', '4'] as const).map((size) => (
                                <label key={size}>
                                    {size} 人组比例
                                    <input
                                        type="number"
                                        min="0"
                                        value={parameters.customerGroupSizeRatio[size]}
                                        onChange={(event) =>
                                            setParameters({
                                                ...parameters,
                                                customerGroupSizeRatio: {
                                                    ...parameters.customerGroupSizeRatio,
                                                    [size]: Number(event.target.value),
                                                },
                                            })
                                        }
                                    />
                                    <span>%</span>
                                </label>
                            ))}
                        </div>
                    </section>

                    <section className="panel-grid">
                        <div className="panel-card">
                            <div className="panel-head compact">
                                <div>
                                    <h2>仿真数据管理</h2>
                                    <p>从后端 /api/data/query 获取 SimulationDataManager 中的数据。</p>
                                </div>
                            </div>

                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>数据名称</th>
                                            <th>来源</th>
                                            <th>状态</th>
                                            <th>操作</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {dataItems.length > 0 ? (
                                            dataItems.map((item) => (
                                                <tr key={item.id}>
                                                    <td>{item.name ?? `Simulation #${item.id}`}</td>
                                                    <td>{dataList.selected === item.id ? '当前选中' : '数据库'}</td>
                                                    <td>{dataList.selected === item.id ? '当前使用' : '未选中'}</td>
                                                    <td>
                                                        <button className="secondary-button" type="button" onClick={() => selectSimulationData(item.id)}>
                                                            选择
                                                        </button>
                                                        <button
                                                            className="danger-button"
                                                            type="button"
                                                            onClick={() => deleteSimulationData(item.id)}
                                                            disabled={loading}
                                                        >
                                                            删除
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4}>暂无仿真数据，请先点击“新建数据”。</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="button-row">
                                <button className="primary-button" type="button" onClick={saveParameters} disabled={loading}>
                                    新建数据
                                </button>
                                <button className="secondary-button" type="button" onClick={downloadDashboard}>
                                    下载数据
                                </button>
                                <button className="secondary-button" type="button" onClick={updateDataList} disabled={loading || dataListLoading}>
                                    刷新数据
                                </button>
                            </div>
                        </div>

                        <div className="panel-card">
                            <div className="panel-head compact">
                                <div>
                                    <h2>窗口队列状态</h2>
                                    <p>后端当前返回的是各窗口队列长度。</p>
                                </div>
                            </div>

                            <div className="window-list">
                                {dashboard.windowsQueueSizes.length > 0 ? (
                                    dashboard.windowsQueueSizes.map((size, index) => (
                                        <div className="window-item" key={`window-${index}`}>
                                            <span>窗口 {index + 1}</span>
                                            <strong>{size} 人排队</strong>
                                        </div>
                                    ))
                                ) : (
                                    <p className="empty-text">暂无窗口队列数据</p>
                                )}
                            </div>
                        </div>
                    </section>

                    <section className="panel-card" style={{ marginTop: 22 }}>
                        <div className="panel-head compact">
                            <div>
                                <h2>窗口与座位明细</h2>
                                <p>按照后端当前 DashboardResponse 展示窗口队列和座位占用。</p>
                            </div>
                        </div>

                        <div className="summary-row">
                            <span>窗口数量：{dashboard.windowsQueueSizes.length}</span>
                            <span>当前排队人数：{totalQueueLength}</span>
                            <span>座位数量：{dashboard.seatOccupation.length}</span>
                            <span>已占座位：{occupiedSeatCount}</span>
                        </div>

                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>类型</th>
                                        <th>编号</th>
                                        <th>当前人数</th>
                                        <th>说明</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dashboard.seatOccupation.map((occupied, index) => (
                                        <tr key={`seat-detail-${index}`}>
                                            <td>座位</td>
                                            <td>{index}</td>
                                            <td>{occupied}</td>
                                            <td>{occupied > 0 ? '已占用' : '空闲'}</td>
                                        </tr>
                                    ))}

                                    {dashboard.windowsQueueSizes.length === 0 && dashboard.seatOccupation.length === 0 && (
                                        <tr>
                                            <td colSpan={4}>暂无明细数据，请先新建并选择仿真数据。</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </section>
            </main >
        </>
    )
}