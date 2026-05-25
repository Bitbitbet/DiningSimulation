import { useCallback, useMemo, useRef, useState } from "react"
import { formatTime, type DashboardResponse, type HistoryPoint } from "./App"

function percent(value: number) {
    return `${(value * 100).toFixed(1)}%`
}

const METRIC_SERIES = [
    {
        label: '平均排队长度',
        unit: ' 人',
        color: '#2563eb',
        getter: (p: HistoryPoint) => p.averageQueueLength,
        format: (v: number) => v.toFixed(2),
    },
    {
        label: '平均等座时间',
        unit: ' 分钟',
        color: '#f59e0b',
        getter: (p: HistoryPoint) => p.averageCustomerWaitSeatSeconds / 60,
        format: (v: number) => v.toFixed(2),
    },
    {
        label: '厨师利用率',
        unit: '',
        color: '#16a34a',
        getter: (p: HistoryPoint) => p.chefUtilization,
        format: percent,
    },
    {
        label: '座位周转率',
        unit: ' 次/时段',
        color: '#7c3aed',
        getter: (p: HistoryPoint) => p.seatTurnover,
        format: (v: number) => v.toFixed(2),
    },
    {
        label: '座位空置率',
        unit: '',
        color: '#0891b2',
        getter: (p: HistoryPoint) => p.seatIdleRate,
        format: percent,
    },
    {
        label: '拥堵程度',
        unit: '',
        color: '#dc2626',
        getter: (p: HistoryPoint) => p.congestionRate,
        format: percent,
    },
] as const

const TIME_RANGES = [
    { label: '全部', minutes: null },
    { label: '15分钟', minutes: 15 },
    { label: '30分钟', minutes: 30 },
    { label: '60分钟', minutes: 60 },
] as const

const CHART_W = 600
const CHART_H = 30
const PAD_X = 4
const PAD_Y = 3

function smoothPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return ''
    if (points.length === 1) {
        return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
    }
    if (points.length === 2) {
        return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)} ${points[1].y.toFixed(1)}`
    }

    const parts: string[] = []
    parts.push(`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`)

    for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i === 0 ? 0 : i - 1]
        const p1 = points[i]
        const p2 = points[i + 1]
        const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2]

        const cp1x = p1.x + (p2.x - p0.x) / 6
        const cp1y = p1.y + (p2.y - p0.y) / 6
        const cp2x = p2.x - (p3.x - p1.x) / 6
        const cp2y = p2.y - (p3.y - p1.y) / 6

        parts.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`)
    }

    return parts.join(' ')
}


export default function MonitorPage({
    dashboard,
    totalQueueLength,
    history,
    updateHistory,
    hasSelectedSimulationData,
    historyLoading
}: {
    dashboard: DashboardResponse
    totalQueueLength: number
    history: HistoryPoint[] | null
    updateHistory: () => void
    hasSelectedSimulationData: boolean
    historyLoading: boolean
}) {
    const [visibleHistoryLabels, setVisibleHistoryLabels] = useState<string[]>(
        METRIC_SERIES.map(s => s.label)
    )
    const [timeRange, setTimeRange] = useState<number | null>(null)
    const [hoverIndex, setHoverIndex] = useState<number | null>(null)
    const chartContainerRef = useRef<HTMLDivElement>(null)

    const toggleHistoryLabel = (label: string) => {
        setVisibleHistoryLabels((prev) => {
            if (prev.includes(label)) {
                return prev.filter((item) => item !== label)
            }
            return [...prev, label]
        })
    }

    const filteredHistory = useMemo(() => {
        if (!history) return []
        if (timeRange == null) return history
        const latest = history[history.length - 1].time
        const cutoff = latest - timeRange * 60
        return history.filter(p => p.time >= cutoff)
    }, [history, timeRange])

    const chartData = useMemo(() => {
        if (filteredHistory.length === 0) return null
        const startTime = filteredHistory[0].time
        const endTime = filteredHistory[filteredHistory.length - 1].time
        const timeSpan = endTime - startTime || 1
        const innerW = CHART_W - PAD_X * 2
        const innerH = CHART_H - PAD_Y * 2

        const xPositions = filteredHistory.map(p =>
            PAD_X + ((p.time - startTime) / timeSpan) * innerW
        )

        const series = METRIC_SERIES.map(metric => {
            const values = filteredHistory.map(metric.getter)
            const min = Math.min(...values, 0)
            const max = Math.max(...values, 1)
            const span = max - min || 1

            const points = values.map((v, i) => ({
                x: xPositions[i],
                y: PAD_Y + (1 - (v - min) / span) * innerH,
            }))

            const minY = PAD_Y + (1 - (min - min) / span) * innerH
            const maxY = PAD_Y + (1 - (max - min) / span) * innerH

            return {
                ...metric,
                points,
                pathD: smoothPath(points),
                latestValue: metric.format(values[values.length - 1]),
                min,
                max,
                minY,
                maxY,
                values,
            }
        })

        return { series, xPositions }
    }, [filteredHistory])

    const handleChartMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!chartData || chartData.xPositions.length === 0) return
        const svg = e.currentTarget.querySelector('svg')
        if (!svg) return
        const rect = svg.getBoundingClientRect()
        const svgX = e.clientX - rect.left
        const viewX = (svgX / rect.width) * CHART_W

        let closest = 0
        let closestDist = Math.abs(chartData.xPositions[0] - viewX)
        for (let i = 1; i < chartData.xPositions.length; i++) {
            const dist = Math.abs(chartData.xPositions[i] - viewX)
            if (dist < closestDist) {
                closest = i
                closestDist = dist
            }
        }
        setHoverIndex(closest)
    }, [chartData])

    const handleChartMouseLeave = useCallback(() => {
        setHoverIndex(null)
    }, [])

    const occupiedCount = dashboard.seatOccupation.filter(s => s > 0).length
    const totalSeats = dashboard.seatOccupation.length
    const visibleCharts = chartData?.series.filter(s => visibleHistoryLabels.includes(s.label)) ?? []

    return <>
        <section className="metrics-grid">
            <div className="metric-card"><span>平均排队长度</span><strong>{dashboard.currentHistory.averageQueueLength.toFixed(2)} 人</strong></div>
            <div className="metric-card"><span>顾客等待座位时间</span><strong>{(dashboard.currentHistory.averageCustomerWaitSeatSeconds / 60).toFixed(2)} 分钟</strong></div>
            <div className="metric-card"><span>厨师利用率</span><strong>{percent(dashboard.currentHistory.chefUtilization)}</strong></div>
            <div className="metric-card"><span>座位周转率</span><strong>{(dashboard.currentHistory.seatTurnover).toFixed(2)} 次/时段</strong></div>
            <div className="metric-card"><span>座位空置率</span><strong>{percent(dashboard.currentHistory.seatIdleRate)}</strong></div>
            <div className="metric-card"><span>拥堵程度</span><strong>{percent(dashboard.currentHistory.congestionRate)}</strong></div>
        </section>

        <section className="panel-card history-section">
            <div className="panel-head">
                <div>
                    <h2>历史指标趋势</h2>
                    <p>从仿真开始到当前时刻的总览</p>
                </div>
                <button className="secondary-button" type="button" onClick={updateHistory} disabled={historyLoading || !hasSelectedSimulationData}>
                    {historyLoading ? '刷新中...' : '刷新历史'}
                </button>
            </div>

            <div className="history-overview-card">
                <div className="history-filter">
                    {METRIC_SERIES.map((item) => (
                        <label key={item.label} className="history-filter-item">
                            <input
                                type="checkbox"
                                checked={visibleHistoryLabels.includes(item.label)}
                                onChange={() => toggleHistoryLabel(item.label)}
                            />
                            <span className="history-filter-dot" style={{ background: item.color }} />
                            {item.label}
                        </label>
                    ))}
                </div>

                <div className="time-range-bar">
                    {TIME_RANGES.map((r) => (
                        <button
                            key={r.label}
                            className={`time-range-btn${timeRange === r.minutes ? ' active' : ''}`}
                            type="button"
                            onClick={() => setTimeRange(r.minutes)}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>

                {history == null || filteredHistory.length === 0 ? (
                    <div className="empty-chart">暂无历史数据</div>
                ) : visibleCharts.length === 0 ? (
                    <div className="empty-chart">请至少选择一个历史指标</div>
                ) : (
                    <>
                        <div
                            className="small-multiples"
                            ref={chartContainerRef}
                            onMouseMove={handleChartMouseMove}
                            onMouseLeave={handleChartMouseLeave}
                        >
                            {visibleCharts.map((item) => (
                                <div className="mini-chart-row" key={item.label}>
                                    <span className="mini-label">{item.label}</span>
                                    <div className="mini-chart-svg-wrap">
                                        <svg
                                            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                                            className="mini-chart-svg"
                                            preserveAspectRatio="none"
                                        >
                                            {/* Min limit line */}
                                            <line
                                                x1={0} y1={item.minY} x2={CHART_W} y2={item.minY}
                                                className="chart-limit-line"
                                                stroke={item.color}
                                            />
                                            {/* Max limit line */}
                                            <line
                                                x1={0} y1={item.maxY} x2={CHART_W} y2={item.maxY}
                                                className="chart-limit-line"
                                                stroke={item.color}
                                            />
                                            {/* Area fill under curve */}
                                            <path
                                                d={`${item.pathD} L ${chartData!.xPositions[chartData!.xPositions.length - 1].toFixed(1)} ${item.minY} L ${chartData!.xPositions[0].toFixed(1)} ${item.minY} Z`}
                                                className="chart-area"
                                                fill={item.color}
                                            />
                                            {/* Main curve */}
                                            <path
                                                d={item.pathD}
                                                className="mini-chart-line"
                                                stroke={item.color}
                                            />
                                            {/* Cursor line + dot */}
                                            {hoverIndex != null && (
                                                <>
                                                    <line
                                                        x1={chartData!.xPositions[hoverIndex]} y1={0}
                                                        x2={chartData!.xPositions[hoverIndex]} y2={CHART_H}
                                                        className="chart-cursor-line"
                                                    />
                                                    <circle
                                                        cx={item.points[hoverIndex].x}
                                                        cy={item.points[hoverIndex].y}
                                                        r={3}
                                                        className="chart-cursor-dot"
                                                        fill="white"
                                                        stroke={item.color}
                                                    />
                                                </>
                                            )}
                                        </svg>
                                        {hoverIndex != null && (
                                            <div
                                                className="chart-tooltip"
                                                style={{ left: `${(chartData!.xPositions[hoverIndex] / CHART_W) * 100}%` }}
                                            >
                                                {item.format(item.values[hoverIndex])}{item.unit}
                                            </div>
                                        )}
                                    </div>
                                    <span className="mini-value">{item.latestValue}{item.unit}</span>
                                </div>
                            ))}
                        </div>

                        <div className="chart-time-row">
                            <span>{formatTime(filteredHistory[0]?.time ?? 0)}</span>
                            <span>{formatTime(filteredHistory[filteredHistory.length - 1]?.time ?? 0)}</span>
                            {hoverIndex != null && (
                                <span className="chart-hover-time">{formatTime(filteredHistory[hoverIndex]?.time ?? 0)}</span>
                            )}
                        </div>
                    </>
                )}
            </div>
        </section>

        <section className="panel-grid">
            <div className="panel-card">
                <div className="panel-head">
                    <h2>窗口队列</h2>
                </div>
                {dashboard.windowsQueueSizes.length > 0 ? (
                    <div className="queue-list">
                        {dashboard.windowsQueueSizes.map((size, index) => (
                            <div className="queue-item" key={index}>
                                <span>窗口 {index}</span>
                                <strong>{size} 人</strong>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-chart">暂无窗口数据</div>
                )}
                <div className="summary-row">
                    <span>共 {dashboard.windowsQueueSizes.length} 个窗口</span>
                    <span>排队 {totalQueueLength} 人</span>
                </div>
            </div>

            <div className="panel-card">
                <div className="panel-head">
                    <h2>座位</h2>
                </div>
                <div className="summary-row" style={{ marginBottom: 8 }}>
                    <span>占用 <strong>{occupiedCount}</strong> / {totalSeats} 座</span>
                    <span>{totalSeats > 0 ? (occupiedCount / totalSeats * 100).toFixed(0) : 0}% 使用率</span>
                </div>
                {totalSeats > 0 ? (
                    <div className="seats-table">
                        <table>
                            <thead><tr><th>#</th><th>人数</th><th>状态</th></tr></thead>
                            <tbody>
                                {dashboard.seatOccupation.map((occupied, index) => (
                                    <tr key={index}>
                                        <td>{index}</td>
                                        <td>{occupied}</td>
                                        <td>{occupied > 0 ? '占用' : '空闲'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-chart">暂无座位数据</div>
                )}
            </div>
        </section>
    </>;
}