import { formatTime, type DashboardResponse, type HistoryPoint } from "./App"

function percent(value: number) {
    return `${(value * 100).toFixed(1)}%`
}

function renderHistoryOverview(history: HistoryPoint[]) {
    if (history.length === 0) {
        return <div className="empty-chart">暂无历史数据，请先新建、选择仿真数据并运行一段时间。</div>
    }

    const width = 760
    const height = 300
    const latest = history.at(-1)!;

    const series = [
        {
            label: '平均排队长度',
            value: `${latest.averageQueueLength.toFixed(2)} 人`,
            color: '#2563eb',
            getter: (point: HistoryPoint) => point.averageQueueLength,
        },
        {
            label: '平均等座时间',
            value: `${(latest.averageCustomerWaitSeatSeconds / 60).toFixed(2)} 分钟`,
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
            value: `${latest.seatTurnover.toFixed(2)} 次/时段`,
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
            <h3>仿真历史总览</h3>
            <svg viewBox={`0 0 ${width} ${height}`} className="overview-chart" role="img" aria-label="仿真历史总览折线图">
                {[0, 1, 2, 3].map((line) => {
                    const y = 24 + (line / 3) * (height - 48)
                    return <line key={line} x1="36" y1={y} x2={width - 36} y2={y} className="grid-line" />
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

function createPolyline(points: HistoryPoint[], getValue: (point: HistoryPoint) => number, width: number, height: number) {
    if (points.length == 0) return ''

    const paddingX = 36
    const paddingY = 24
    const plotWidth = width - paddingX * 2
    const plotHeight = height - paddingY * 2
    const values = points.map(getValue);
    const minValue = Math.min(...values, 0)
    const maxValue = Math.max(...values, 1)
    const startTime = points.at(0)!.time;
    const endTime = points.at(-1)!.time;
    const timespan = endTime - startTime;
    const isLongEnough = timespan >= 0.01;
    const span = maxValue - minValue || 1

    return points
        .map(point => {
            const value = getValue(point);
            const time = point.time;
            let x = paddingX;
            if (isLongEnough)
                x += (time - startTime) / timespan * plotWidth
            const y = paddingY + (1 - (value - minValue) / span) * plotHeight
            return `${x.toFixed(2)},${y.toFixed(2)}`
        })
        .join(' ')
}


export default function MonitorPage({
    dashboard,
    historyLoading,
    totalQueueLength,
    history,
    updateHistory,
    hasSelectedSimulationData,
    speed,
    updateSpeed,
    resumeSimulation,
    pauseSimulation,
    loading
}: {
    dashboard: DashboardResponse
    historyLoading: boolean
    totalQueueLength: number
    history: HistoryPoint[] | null
    updateHistory: () => void
    hasSelectedSimulationData: boolean
    speed: number
    updateSpeed: (s: number) => void
    resumeSimulation: () => void,
    pauseSimulation: () => void,
    loading: boolean
}) {
    return <>
        <section className="metrics-grid">
            <div className="metric-card"><span>平均排队长度</span><strong>{dashboard.currentHistory.averageQueueLength.toFixed(2)} 人</strong></div>
            <div className="metric-card"><span>顾客等待座位时间</span><strong>{(dashboard.currentHistory.averageCustomerWaitSeatSeconds / 60).toFixed(2)} 分钟</strong></div>
            <div className="metric-card"><span>厨师利用率</span><strong>{percent(dashboard.currentHistory.chefUtilization)}</strong></div>
            <div className="metric-card"><span>座位周转率</span><strong>{(dashboard.currentHistory.seatTurnover).toFixed(2)} 次/时段</strong></div>
            <div className="metric-card"><span>座位空置率</span><strong>{percent(dashboard.currentHistory.seatIdleRate)}</strong></div>
            <div className="metric-card"><span>拥堵程度</span><strong>{percent(dashboard.currentHistory.congestionRate)}</strong></div>
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
                {history != null && renderHistoryOverview(history)}
            </div>

            <div className="panel-card">
                <div className="panel-head">
                    <div>
                        <h2>仿真控制</h2>
                    </div>
                </div>
                <div className="button-row" style={{ marginBottom: 16 }}>
                    <button className="primary-button" type="button" onClick={resumeSimulation} disabled={loading || !hasSelectedSimulationData}>开始</button>
                    <button className="secondary-button" type="button" onClick={pauseSimulation} disabled={loading}>暂停</button>
                </div>

                <div className="speed-card">
                    <div className="speed-row">
                        <strong>仿真速度：{speed.toFixed(1)}x</strong>
                        <input type="range" min="0.1" max="10" step="0.1" value={speed} onChange={(event) => updateSpeed(Number(event.target.value))} />
                        <div className="speed-pills">
                            <button className="secondary-button" type="button" onClick={() => updateSpeed(0.1)}>0.1x 慢速</button>
                            <button className="secondary-button" type="button" onClick={() => updateSpeed(1)}>1.0x 正常</button>
                            <button className="secondary-button" type="button" onClick={() => updateSpeed(10)}>10.0x 快速</button>
                        </div>
                    </div>
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
                            <span>窗口 {index}</span>
                            <strong>{size} 人排队</strong>
                        </div>
                    )) : <div className="empty-chart">暂无窗口队列数据</div>}
                </div>
            </div>
            <section className="panel-card full">
                <div className="panel-head">
                    <div>
                        <h2>座位</h2>
                    </div>
                </div>
                <div className="summary-row">
                    <span>窗口数量：{dashboard.windowsQueueSizes.length}</span>
                    <span>当前排队人数：{totalQueueLength}</span>
                    <span>座位数量：{dashboard.seatOccupation.length}</span>
                </div>
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>编号</th><th>人数</th><th>说明</th></tr></thead>
                        <tbody>
                            {dashboard.seatOccupation.map((occupied, index) => (
                                <tr key={index}><td>座位{index}</td><td>{occupied}</td><td>{occupied > 0 ? '已占用' : '空闲'}</td></tr>
                            ))}
                            {dashboard.windowsQueueSizes.length === 0 && dashboard.seatOccupation.length === 0 && (
                                <tr><td colSpan={4}>暂无明细数据，请先新建并选择仿真数据。</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </section >
    </>;
}