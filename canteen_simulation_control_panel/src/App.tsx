import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './index.css'

const API_BASE = 'http://localhost:23456/api'

type StatusResponse = {
  online?: boolean
  simulationState?: string
  currentTime?: number
  currentTimeSecond?: number
  currentTimeMinute?: number
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

function fetchWithTimeout(url: string, options?: RequestInit, timeoutMs = 5000) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    window.clearTimeout(timeoutId)
  })
}

function localizedState(state: string | undefined) {
  if (!state) return '未知'
  const lower = state.toLowerCase()

  if (lower.includes('start') || lower.includes('run') || lower.includes('resume')) return '运行中'
  if (lower.includes('pause')) return '已暂停'
  if (lower.includes('finish')) return '已完成'
  if (lower.includes('stop')) return '已停止'

  return state
}

function formatNumber(value: number | undefined, digits = 2) {
  if (!Number.isFinite(value)) return '0.00'
  return Number(value).toFixed(digits)
}

function formatTime(seconds: number | undefined) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? Number(seconds) : 0))
  const h = Math.floor(safeSeconds / 3600)
  const m = Math.floor((safeSeconds % 3600) / 60)
  const s = safeSeconds % 60

  return `${String(h).padStart(2, '0')} 时 ${String(m).padStart(2, '0')} 分 ${String(s).padStart(2, '0')} 秒`
}

function percent(value: number | undefined) {
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
      value: `${formatNumber((latest.time ?? 0) / 60, 2)} 分钟`,
      color: '#2c3e50',
      getter: (point: HistoryPoint) => point.time,
    },
    {
      label: '平均排队长度',
      value: `${formatNumber(latest.averageQueueLength, 2)} 人`,
      color: '#2563eb',
      getter: (point: HistoryPoint) => point.averageQueueLength,
    },
    {
      label: '平均等座时间',
      value: `${formatNumber(latest.averageCustomerWaitSeatSeconds / 60, 2)} 分钟`,
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
      value: `${formatNumber(latest.seatTurnover, 2)} 次/时段`,
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
  const [status, setStatus] = useState<StatusResponse>({})
  const [backendOnline, setBackendOnline] = useState(false)
  const [dashboard, setDashboard] = useState<DashboardResponse>(emptyDashboard)
  const [dataList, setDataList] = useState<SimulationDataQueryResponse>(emptyDataList)
  const [parameters, setParameters] = useState<SimulationParameters>(initialParameters)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const [notice, setNotice] = useState('正在连接后端服务...')
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [speed, setSpeed] = useState(1)

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
      setStatus(result)
      setBackendOnline(Boolean(result.online ?? true))
    } catch {
      setBackendOnline(false)
    }
  }, [])

  const updateDashboard = useCallback(async () => {
    try {
      const response = await fetchWithTimeout(`${API_BASE}/dashboard`)
      if (!response.ok) throw new Error('dashboard response not ok')
      const result = (await response.json()) as Partial<DashboardResponse>
      const normalized: DashboardResponse = {
        simulationState: result.simulationState ?? dashboardRef.current.simulationState ?? 'paused',
        currentHistory: normalizeHistoryPoint(result.currentHistory),
        finished: Boolean(result.finished),
        windowsQueueSizes: Array.isArray(result.windowsQueueSizes) ? result.windowsQueueSizes : [],
        seatOccupation: Array.isArray(result.seatOccupation) ? result.seatOccupation : [],
      }

      setDashboard(normalized)

      // 兜底：dashboard 的 currentHistory 是最新点。即使历史接口分页或追加慢，图也不会停在旧时间。
      if (selectedDataRef.current !== null && normalized.currentHistory.time > 0) {
        setHistory((oldHistory) => mergeHistoryWithCurrent(oldHistory, normalized.currentHistory))
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
      setDataList({
        simulationDataList: result.simulationDataList ?? {},
        selected: result.selected ?? null,
      })
    } catch {
      setDataList(emptyDataList)
    }
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
    setNotice('后端连接正常，数据已刷新。')
  }, [updateDashboard, updateDataList, updateHistory, updateStatus])

  useEffect(() => {
    refreshAll()
    const statusTimer = window.setInterval(updateStatus, 2000)
    const dashboardTimer = window.setInterval(updateDashboard, 1000)
    const dataTimer = window.setInterval(updateDataList, 3000)
    const historyTimer = window.setInterval(updateHistory, 3000)

    return () => {
      window.clearInterval(statusTimer)
      window.clearInterval(dashboardTimer)
      window.clearInterval(dataTimer)
      window.clearInterval(historyTimer)
    }
  }, [refreshAll, updateDashboard, updateDataList, updateHistory, updateStatus])

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
      const payload = {
        simulationTotalMinutes: Number(parameters.simulationTotalMinutes),
        customerArriveRate: Number(parameters.customerArriveRate),
        customerGroupSizeRatio: {
          1: Number(parameters.customerGroupSizeRatio[1]),
          2: Number(parameters.customerGroupSizeRatio[2]),
          3: Number(parameters.customerGroupSizeRatio[3]),
          4: Number(parameters.customerGroupSizeRatio[4]),
        },
        customerDishRatio: {
          A: Number(parameters.customerDishRatio.A),
          B: Number(parameters.customerDishRatio.B),
          C: Number(parameters.customerDishRatio.C),
        },
        customerEatSecondsAvg: Number(parameters.customerEatSecondsAvg),
        customerEatSecondsStdVar: Number(parameters.customerEatSecondsStdVar),
        dishPrepSecondsAvg: Number(parameters.dishPrepSecondsAvg),
        dishPrepSecondsStdVar: Number(parameters.dishPrepSecondsStdVar),
        windows: parameters.windows.map((item) => ({
          dishType: String(item.dishType),
          windowPrepTimeModifier: Number(item.windowPrepTimeModifier),
        })),
        seatCount: Number(parameters.seatCount),
      }

      const response = await fetchWithTimeout(
        `${API_BASE}/data/new`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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
    const safeCount = clamp(count, 1, 20)
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
    const content = JSON.stringify({ status, dashboard, dataList, history }, null, 2)
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `canteen-dashboard-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    setNotice('当前 dashboard 数据已下载。')
  }

  return (
    <>
      <style>
        {`
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #edf3fb;
            color: #0f2344;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
          }
          button, input, select { font: inherit; }
          button { cursor: pointer; }
          button:disabled { cursor: not-allowed; opacity: 0.55; }
          .app-shell {
            min-height: 100vh;
            display: grid;
            grid-template-columns: 250px minmax(0, 1fr);
            background: linear-gradient(135deg, #eef5ff 0%, #f8fbff 55%, #eef4fb 100%);
          }
          .sidebar {
            position: sticky;
            top: 0;
            height: 100vh;
            padding: 28px 22px;
            background: rgba(255, 255, 255, 0.88);
            border-right: 1px solid #dbe7f5;
            box-shadow: 12px 0 36px rgba(35, 77, 130, 0.06);
          }
          .brand { display: flex; align-items: center; gap: 14px; margin-bottom: 30px; }
          .brand-mark {
            width: 46px; height: 46px; border-radius: 16px; display: grid; place-items: center;
            background: linear-gradient(135deg, #1e5bff, #5aa6ff); color: white; font-size: 22px; font-weight: 900;
            box-shadow: 0 12px 24px rgba(30, 91, 255, 0.24);
          }
          .brand strong { display: block; font-size: 18px; }
          .brand span { display: block; margin-top: 4px; color: #6d7f9b; font-size: 13px; }
          nav { display: grid; gap: 10px; }
          .nav-item {
            width: 100%; border: none; border-radius: 16px; padding: 14px 16px; text-align: left;
            color: #35506f; background: transparent; font-weight: 800;
          }
          .nav-item.active, .nav-item:hover { background: #eaf2ff; color: #1448ad; }
          .status-dot {
            margin-top: 28px; display: flex; align-items: center; gap: 10px; padding: 14px 16px;
            border-radius: 16px; font-weight: 900; background: #f3f7fc;
          }
          .status-dot span { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
          .status-dot.online span { background: #2ecf7a; }
          .status-dot.offline span { background: #ff6270; }
          .content { padding: 34px 44px 70px; }
          .hero-card, .notice-card, .panel-card, .metric-card {
            border: 1px solid #d6e6f7;
            background: rgba(255,255,255,0.93);
            border-radius: 24px;
            box-shadow: 0 18px 38px rgba(37, 78, 130, 0.07);
          }
          .hero-card {
            min-height: 150px; padding: 34px 38px; display: flex; justify-content: space-between; gap: 24px; align-items: center;
          }
          .hero-card h1 { margin: 6px 0 12px; font-size: 34px; line-height: 1.16; }
          .hero-card p { margin: 0; color: #5f7391; font-size: 16px; }
          .sub-title { color: #48607d; font-weight: 900; letter-spacing: .04em; }
          .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
          .chip { padding: 12px 18px; border-radius: 999px; background: #eaf3ff; color: #1f559b; font-weight: 900; white-space: nowrap; }
          .notice-card { margin-top: 18px; padding: 18px 24px; color: #48607d; font-weight: 800; }
          .metrics-grid { margin-top: 20px; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 16px; }
          .metric-card { padding: 24px 20px; min-height: 126px; }
          .metric-card span { color: #5a6f8b; font-size: 14px; font-weight: 900; }
          .metric-card strong { display: block; margin-top: 18px; font-size: 26px; line-height: 1.2; }
          .panel-grid { margin-top: 20px; display: grid; grid-template-columns: 1.35fr .9fr; gap: 20px; align-items: start; }
          .panel-card { padding: 24px; }
          .panel-card.full { margin-top: 20px; }
          .panel-head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
          .panel-head h2, .panel-head h3 { margin: 0; font-size: 24px; }
          .panel-head p { margin: 8px 0 0; color: #607590; }
          .button-row, .action-buttons { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
          .primary-button, .secondary-button, .danger-button {
            border: none; border-radius: 14px; padding: 12px 16px; font-weight: 900;
          }
          .primary-button { background: #2c5be8; color: white; }
          .secondary-button { background: #edf3fb; color: #193b66; }
          .danger-button { background: #ffe9ea; color: #c52b3a; }
          .history-overview-card { border: 1px solid #d6e6f7; border-radius: 18px; background: #f8fbff; padding: 18px; }
          .history-overview-card h3 { margin: 0 0 10px; font-size: 18px; }
          .overview-chart { width: 100%; height: auto; min-height: 250px; display: block; }
          .grid-line { stroke: #dce9f7; stroke-width: 1; }
          .chart-time-row { display: flex; justify-content: space-between; color: #6c7f9d; font-weight: 900; font-size: 20px; margin: -6px 34px 12px; }
          .legend-grid { display: flex; flex-wrap: wrap; gap: 10px; }
          .legend-chip { display: inline-flex; align-items: center; gap: 9px; padding: 10px 13px; border-radius: 999px; background: #edf5ff; font-weight: 900; color: #20466f; }
          .legend-chip i { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
          .empty-chart { min-height: 180px; display: grid; place-items: center; color: #607590; font-weight: 900; border: 1px dashed #bfd3ec; border-radius: 16px; background: #f8fbff; }
          .speed-card { padding: 18px; border-radius: 18px; background: #f8fbff; border: 1px solid #dce9f7; margin-bottom: 18px; }
          .speed-row { display: grid; gap: 10px; }
          .speed-row input { width: 100%; }
          .speed-pills { display: flex; gap: 8px; flex-wrap: wrap; }
          .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
          .form-grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          label { display: grid; gap: 6px; font-weight: 900; color: #48607d; }
          input, select {
            border: 1px solid #cfdeee; border-radius: 12px; padding: 11px 12px; color: #0f2344; background: white; font-weight: 800;
          }
          .unit { font-size: 12px; color: #6b809c; }
          .table-wrap { overflow: auto; border: 1px solid #d6e6f7; border-radius: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 14px 16px; border-bottom: 1px solid #d6e6f7; text-align: left; white-space: nowrap; }
          th { background: #f0f5fb; color: #35506f; }
          td { font-weight: 800; }
          tr:last-child td { border-bottom: none; }
          .queue-list { display: grid; gap: 12px; }
          .queue-item { display: flex; justify-content: space-between; padding: 15px 17px; border: 1px solid #d6e6f7; border-radius: 14px; background: #f8fbff; font-weight: 900; }
          .summary-row { margin-top: 14px; display: flex; gap: 12px; flex-wrap: wrap; color: #48607d; font-weight: 900; }
          @media (max-width: 1180px) {
            .app-shell { grid-template-columns: 1fr; }
            .sidebar { position: static; height: auto; }
            .metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .panel-grid { grid-template-columns: 1fr; }
          }
        `}
      </style>

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
            <button className="nav-item active" type="button">数据面板</button>
            <button className="nav-item" type="button">仿真控制</button>
            <button className="nav-item" type="button">数据管理</button>
          </nav>
          <div className={`status-dot ${backendOnline ? 'online' : 'offline'}`}>
            <span />
            {backendOnline ? '后端在线' : '后端离线'}
          </div>
        </aside>

        <main className="content">
          <header className="hero-card">
            <div>
              <div className="sub-title">B/S 架构 · React + Java</div>
              <h1>北京交通大学食堂就餐仿真系统</h1>
              <p>根据后端 DashboardResponse 展示窗口队列、座位占用和历史统计指标。</p>
            </div>
            <div className="hero-actions">
              <span className="chip">当前仿真时钟：{formatTime(currentHistory.time)}</span>
              <span className="chip">状态：{localizedState(dashboard.simulationState)}</span>
            </div>
          </header>

          <div className="notice-card">{notice}</div>

          <section className="metrics-grid">
            <div className="metric-card"><span>平均排队长度</span><strong>{formatNumber(currentHistory.averageQueueLength)} 人</strong></div>
            <div className="metric-card"><span>顾客等待时间</span><strong>{formatNumber(currentHistory.averageCustomerWaitSeatSeconds / 60)} 分钟</strong></div>
            <div className="metric-card"><span>厨师利用率</span><strong>{percent(currentHistory.chefUtilization)}</strong></div>
            <div className="metric-card"><span>座位周转率</span><strong>{formatNumber(currentHistory.seatTurnover)} 次/时段</strong></div>
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
                  <p>开始与继续统一调用后端 /api/simulation/resume。</p>
                </div>
              </div>
              <div className="button-row" style={{ marginBottom: 16 }}>
                <button className="primary-button" type="button" onClick={() => callSimulation('/simulation/resume')} disabled={loading || !hasSelectedSimulationData}>开始</button>
                <button className="secondary-button" type="button" onClick={() => callSimulation('/simulation/pause')} disabled={loading}>暂停</button>
                <button className="secondary-button" type="button" onClick={() => callSimulation('/simulation/reset')} disabled={loading}>重置</button>
              </div>

              <div className="speed-card">
                <div className="speed-row">
                  <strong>仿真速度：{formatNumber(speed, 1)}x</strong>
                  <input type="range" min="0.1" max="10" step="0.1" value={speed} onChange={(event) => updateSpeed(Number(event.target.value))} />
                  <div className="speed-pills">
                    <button className="secondary-button" type="button" onClick={() => updateSpeed(0.1)}>0.1x 慢速</button>
                    <button className="secondary-button" type="button" onClick={() => updateSpeed(1)}>1.0x 正常</button>
                    <button className="secondary-button" type="button" onClick={() => updateSpeed(10)}>10.0x 快速</button>
                  </div>
                </div>
              </div>

              <div className="form-grid">
                <label>仿真总时长<input type="number" value={parameters.simulationTotalMinutes} onChange={(e) => setParameters((old) => ({ ...old, simulationTotalMinutes: Number(e.target.value) }))} /><span className="unit">分钟</span></label>
                <label>顾客到达率<input type="number" step="0.1" value={parameters.customerArriveRate} onChange={(e) => setParameters((old) => ({ ...old, customerArriveRate: Number(e.target.value) }))} /><span className="unit">人/分钟</span></label>
                <label>平均就餐时间<input type="number" value={parameters.customerEatSecondsAvg / 60} onChange={(e) => setParameters((old) => ({ ...old, customerEatSecondsAvg: Number(e.target.value) * 60 }))} /><span className="unit">分钟</span></label>
                <label>就餐时间标准差<input type="number" value={parameters.customerEatSecondsStdVar / 60} onChange={(e) => setParameters((old) => ({ ...old, customerEatSecondsStdVar: Number(e.target.value) * 60 }))} /><span className="unit">分钟</span></label>
                <label>平均做餐时间<input type="number" value={parameters.dishPrepSecondsAvg / 60} onChange={(e) => setParameters((old) => ({ ...old, dishPrepSecondsAvg: Number(e.target.value) * 60 }))} /><span className="unit">分钟</span></label>
                <label>做餐时间标准差<input type="number" value={parameters.dishPrepSecondsStdVar / 60} onChange={(e) => setParameters((old) => ({ ...old, dishPrepSecondsStdVar: Number(e.target.value) * 60 }))} /><span className="unit">分钟</span></label>
                <label>窗口数量<input type="number" value={parameters.windows.length} onChange={(e) => changeWindowCount(Number(e.target.value))} /><span className="unit">个</span></label>
                <label>座位数量<input type="number" value={parameters.seatCount} onChange={(e) => setParameters((old) => ({ ...old, seatCount: Number(e.target.value) }))} /><span className="unit">个</span></label>
              </div>
            </div>
          </section>

          <section className="panel-card full">
            <div className="panel-head">
              <div>
                <h2>餐品与顾客比例</h2>
                <p>这些参数会通过 /api/data/new 提交给后端。</p>
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

          <section className="panel-grid">
            <div className="panel-card">
              <div className="panel-head">
                <div>
                  <h2>仿真数据管理</h2>
                  <p>从后端 /api/data/query 获取 SimulationDataManager 中的数据。</p>
                </div>
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
                  <p>后端当前返回的是各窗口队列长度。</p>
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

          <section className="panel-card full">
            <div className="panel-head">
              <div>
                <h2>窗口与座位明细</h2>
                <p>按照后端当前 DashboardResponse 展示窗口队列和座位占用。</p>
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
        </main>
      </div>
    </>
  )
}

export default App
