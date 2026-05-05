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
    customerEatSecondsAvg: 24,
    customerEatSecondsStdVar: 4,
    dishPrepSecondsAvg: 3.5,
    dishPrepSecondsStdVar: 0.8,
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


export default function App() {
    const [online, setOnline] = useState(false)
    const onlineRef = useRef(online);
    const [onlineLoading, setOnlineLoading] = useState(false);
    const onlineLoadingRef = useRef(onlineLoading);
    const [loading, setLoading] = useState(false)

    const [dashboard, setDashboard] = useState<DashboardResponse>(emptyDashboard)
    const [dashboardLoading, setDashboardLoading] = useState(false);
    const dashboardLoadingRef = useRef(dashboardLoading);

    const [dataList, setDataList] = useState<SimulationDataQueryResponse>(emptyDataList)
    const [dataListLoading, setDataListLoading] = useState(false);

    const [parameters, setParameters] = useState<SimulationParameters>(initialParameters)
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
        } catch (_) {

        } finally {
            setDataListLoading(false);
        }
    }

    useEffect(() => {
        updateStatus();
        const timerStatus = setInterval(updateStatus, 2000);
        const timerDashboard = setInterval(updateDashboard, 1000);

        return () => {
            clearInterval(timerStatus);
            clearInterval(timerDashboard);
        }
    }, [])

    useEffect(() => {
        if (online) {
            updateDashboard();
            updateDataList();
        }
    }, [online])


    const formatedTime = formatTime(dashboard.currentHistory.time);
    const averageQueueLength = dashboard.currentHistory.averageQueueLength;
    const averageWaitSeatMinutes = dashboard.currentHistory.averageCustomerWaitSeatSeconds / 60;

    const chefUtilization = dashboard.currentHistory.chefUtilization
    const seatTurnoverRate = dashboard.currentHistory.seatTurnover
    const seatIdleRate = dashboard.currentHistory.seatIdleRate
    const congestionRate = dashboard.currentHistory.congestionRate

    const totalQueueLength = dashboard.windowsQueueSizes.reduce((sum, value) => sum + value, 0)
    const occupiedSeatCount = dashboard.seatOccupation.filter((value) => value > 0).length
    const dataItems = Object.values(dataList.simulationDataList ?? {})

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

        const dishRatioSum = Object.values(parameters.customerDishRatio).reduce((sum, value) => sum + value, 0)
        if (dishRatioSum <= 0) {
            return '餐品比例之和必须大于 0。'
        }

        const groupRatioSum = Object.values(parameters.customerGroupSizeRatio).reduce((sum, value) => sum + value, 0)
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
                                    <p>展示最近 10 条历史指标，避免数据过密影响观察。</p>
                                </div>
                                <button className="secondary-button" type="button" onClick={/*refreshAll*/() => { }} disabled={loading}>
                                    刷新数据
                                </button>
                            </div>
                            {/* <div className="chart-grid">
                                <div className="chart-card">
                                    <h3>平均排队长度</h3>
                                    {renderBars(
                                        recentHistory.map((item) => item.averageQueueLength ?? 0),
                                        10,
                                    )}
                                </div>

                                <div className="chart-card">
                                    <h3>顾客等待时间</h3>
                                    {renderBars(
                                        recentHistory.map(h => h.averageCustomerWaitSeatSeconds),
                                        30,
                                    )}
                                </div>

                                <div className="chart-card">
                                    <h3>厨师利用率</h3>
                                    {renderBars(
                                        recentHistory.map((item) => item.chefUtilization ?? 0),
                                        1,
                                    )}
                                </div>

                                <div className="chart-card">
                                    <h3>座位周转率</h3>
                                    {renderBars(
                                        recentHistory.map((item) => item.seatTurnover),
                                        10,
                                    )}
                                </div>
                            </div> */}
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

                            {!hasSelectedSimulationData && (
                                <p className="hint-text">请先在“仿真数据管理”中新建或选择一份仿真数据，然后再开始仿真。</p>
                            )}

                            <div className="form-grid">
                                <label>
                                    仿真总时长
                                    <input
                                        type="number"
                                        min="1"
                                        value={parameters.simulationTotalMinutes}
                                        onChange={(event) =>
                                            setParameters({
                                                ...parameters,
                                                simulationTotalMinutes: Number(event.target.value),
                                            })
                                        }
                                    />
                                    <span>分钟</span>
                                </label>

                                <label>
                                    顾客到达率
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={parameters.customerArriveRate}
                                        onChange={(event) =>
                                            setParameters({
                                                ...parameters,
                                                customerArriveRate: Number(event.target.value) * 60,
                                            })
                                        }
                                    />
                                    <span>人/分钟</span>
                                </label>

                                <label>
                                    平均做餐时间
                                    <input
                                        type="number"
                                        min="0.1"
                                        step="0.1"
                                        value={parameters.dishPrepSecondsAvg}
                                        onChange={(event) =>
                                            setParameters({
                                                ...parameters,
                                                dishPrepSecondsAvg: Number(event.target.value) * 60,
                                            })
                                        }
                                    />
                                    <span>分钟</span>
                                </label>

                                <label>
                                    做餐时间标准差
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={parameters.dishPrepSecondsStdVar}
                                        onChange={(event) =>
                                            setParameters({
                                                ...parameters,
                                                dishPrepSecondsStdVar: Number(event.target.value),
                                            })
                                        }
                                    />
                                </label>

                                <label>
                                    平均就餐时间
                                    <input
                                        type="number"
                                        min="1"
                                        step="1"
                                        value={parameters.customerEatSecondsAvg}
                                        onChange={(event) =>
                                            setParameters({
                                                ...parameters,
                                                customerEatSecondsAvg: Number(event.target.value) * 60,
                                            })
                                        }
                                    />
                                    <span>分钟</span>
                                </label>

                                <label>
                                    就餐时间标准差
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={parameters.customerEatSecondsStdVar}
                                        onChange={(event) =>
                                            setParameters({
                                                ...parameters,
                                                customerEatSecondsStdVar: Number(event.target.value),
                                            })
                                        }
                                    />
                                </label>

                                <label>
                                    窗口数量
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={parameters.windows.length}
                                        onChange={(event) => changeWindowCount(Number(event.target.value))}
                                    />
                                    <span>个</span>
                                </label>

                                <label>
                                    座位数量
                                    <input
                                        type="number"
                                        min="1"
                                        value={parameters.seatCount}
                                        onChange={(event) =>
                                            setParameters({
                                                ...parameters,
                                                seatCount: Number(event.target.value),
                                            })
                                        }
                                    />
                                    <span>个</span>
                                </label>
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
                                <button className="secondary-button" type="button" onClick={() => { }} disabled={loading}>
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