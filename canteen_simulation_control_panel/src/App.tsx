import { useCallback, useEffect, useMemo, useState } from 'react'
import './index.css'

const API_BASE = 'http://localhost:23456/api'

type StatusResponse = {
  simulationState?: string
  currentTime?: number
  currentTimeSecond?: number
  currentTimeMinute?: number
  message?: string
  online?: boolean
}

type HistoryPoint = {
  time?: number
  averageQueueLength?: number
  averageCustomerWaitSeatSeconds?: number
  averageCustomerWaitingMinutes?: number
  averageWaitMinutes?: number
  chefUtilization?: number
  seatTurnover?: number
  seatTurnoverRate?: number
  seatIdleRate?: number
  congestionRate?: number
}

type DashboardResponse = {
  simulationState: string
  history: HistoryPoint[]
  windowsQueueSizes: number[]
  seatOccupation: number[]
}

type SimulationDataDto = {
  id: number
  name?: string
}

type SimulationDataQueryResponse = {
  simulationDataList?: Record<string, SimulationDataDto>
  selected?: number | null
}

type BackendSimulationParameters = {
  simulationTotalMinutes: number
  customerArriveRate: number
  customerGroupSizeRatio: Record<string, number>
  customerDishRatio: Record<string, number>
  customerEatTimeAvg: number
  customerEatTimeStdVar: number
  dishPrepTimeAvg: number
  dishPrepTimeStdVar: number
  windows: {
    dishType: string
    windowPrepTimeModifier: number
  }[]
  seatCount: number
}

const emptyDashboard: DashboardResponse = {
  simulationState: 'paused',
  history: [],
  windowsQueueSizes: [],
  seatOccupation: [],
}

const emptyDataList: SimulationDataQueryResponse = {
  simulationDataList: {},
  selected: null,
}

const initialParameters: BackendSimulationParameters = {
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
  customerEatTimeAvg: 24,
  customerEatTimeStdVar: 4,
  dishPrepTimeAvg: 3.5,
  dishPrepTimeStdVar: 0.8,
  windows: [
    { dishType: 'A', windowPrepTimeModifier: 1 },
    { dishType: 'B', windowPrepTimeModifier: 1 },
    { dishType: 'C', windowPrepTimeModifier: 1 },
    { dishType: 'A', windowPrepTimeModifier: 1 },
  ],
  seatCount: 24,
}

function localizedState(state?: string) {
  if (!state) return '未知'

  const lower = state.toLowerCase()

  if (lower.includes('start') || lower.includes('run') || lower.includes('resume')) {
    return '运行中'
  }

  if (lower.includes('pause')) {
    return '已暂停'
  }

  if (lower.includes('stop')) {
    return '已停止'
  }

  return state
}

function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) return '0.00'
  return value.toFixed(digits)
}

function percent(value: number) {
  if (!Number.isFinite(value)) return '0%'
  return `${Math.round(value * 100)}%`
}

function getWaitMinutes(point?: HistoryPoint) {
  if (!point) return 0

  if (typeof point.averageWaitMinutes === 'number') {
    return point.averageWaitMinutes
  }

  if (typeof point.averageCustomerWaitingMinutes === 'number') {
    return point.averageCustomerWaitingMinutes
  }

  if (typeof point.averageCustomerWaitSeatSeconds === 'number') {
    return point.averageCustomerWaitSeatSeconds / 60
  }

  return 0
}

function getSeatTurnover(point?: HistoryPoint) {
  if (!point) return 0

  if (typeof point.seatTurnoverRate === 'number') {
    return point.seatTurnoverRate
  }

  if (typeof point.seatTurnover === 'number') {
    return point.seatTurnover
  }

  return 0
}

function getHistoryTimeMinute(point?: HistoryPoint) {
  if (!point?.time) return 0

  if (point.time > 1000) {
    return Math.round(point.time / 60)
  }

  return Math.round(point.time)
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

function App() {
  const [backendOnline, setBackendOnline] = useState(false)
  const [status, setStatus] = useState<StatusResponse>({})
  const [dashboard, setDashboard] = useState<DashboardResponse>(emptyDashboard)
  const [dataList, setDataList] = useState<SimulationDataQueryResponse>(emptyDataList)
  const [parameters, setParameters] = useState<BackendSimulationParameters>(initialParameters)
  const [notice, setNotice] = useState('正在连接后端服务...')
  const [loading, setLoading] = useState(false)

  const hasSelectedSimulationData = dataList.selected !== null && dataList.selected !== undefined

  const refreshAll = useCallback(async () => {
    try {
      const [statusResult, dashboardResult, dataListResult] = await Promise.allSettled([
        fetch(`${API_BASE}/status`).then((res) => {
          if (!res.ok) throw new Error('status 请求失败')
          return res.json()
        }),
        fetch(`${API_BASE}/dashboard`).then((res) => {
          if (!res.ok) throw new Error('dashboard 请求失败')
          return res.json()
        }),
        fetch(`${API_BASE}/data/query`).then((res) => {
          if (!res.ok) throw new Error('data/query 请求失败')
          return res.json()
        }),
      ])

      if (statusResult.status === 'fulfilled') {
        setStatus(statusResult.value)
        setBackendOnline(true)
      } else {
        setBackendOnline(false)
      }

      if (dashboardResult.status === 'fulfilled') {
        const result = dashboardResult.value as DashboardResponse

        setDashboard({
          simulationState: result.simulationState ?? 'paused',
          history: Array.isArray(result.history) ? result.history : [],
          windowsQueueSizes: Array.isArray(result.windowsQueueSizes) ? result.windowsQueueSizes : [],
          seatOccupation: Array.isArray(result.seatOccupation) ? result.seatOccupation : [],
        })
      }

      if (dataListResult.status === 'fulfilled') {
        setDataList(dataListResult.value)
      }

      if (statusResult.status === 'fulfilled' || dashboardResult.status === 'fulfilled') {
        setNotice('后端连接正常，数据已刷新。')
      } else {
        setNotice('无法连接后端，请确认 Spring Boot 服务是否已启动。')
      }
    } catch {
      setBackendOnline(false)
      setNotice('无法连接后端，请确认 Spring Boot 服务是否已启动。')
    }
  }, [])

  useEffect(() => {
    refreshAll()
    const timer = window.setInterval(refreshAll, 2000)

    return () => window.clearInterval(timer)
  }, [refreshAll])

  const recentHistory = useMemo(() => dashboard.history.slice(-10), [dashboard.history])
  const latestHistory = recentHistory.at(-1)

  const currentTimeMinute = useMemo(() => {
    if (typeof status.currentTimeMinute === 'number') return status.currentTimeMinute
    if (typeof status.currentTimeSecond === 'number') return Math.round(status.currentTimeSecond / 60)
    if (typeof status.currentTime === 'number') return Math.round(status.currentTime / 60)
    return getHistoryTimeMinute(latestHistory)
  }, [latestHistory, status.currentTime, status.currentTimeMinute, status.currentTimeSecond])

  const averageQueueLength = latestHistory?.averageQueueLength ?? 0
  const averageWaitMinutes = getWaitMinutes(latestHistory)
  const chefUtilization = latestHistory?.chefUtilization ?? 0
  const seatTurnoverRate = getSeatTurnover(latestHistory)
  const seatIdleRate = latestHistory?.seatIdleRate ?? 0
  const congestionRate = latestHistory?.congestionRate ?? 0

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

    if (parameters.customerEatTimeAvg <= 0) {
      return '平均就餐时间必须大于 0。'
    }

    if (parameters.dishPrepTimeAvg <= 0) {
      return '平均做餐时间必须大于 0。'
    }

    if (parameters.customerEatTimeStdVar < 0 || parameters.dishPrepTimeStdVar < 0) {
      return '时间方差不能小于 0。'
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

  const callSimulation = async (path: string) => {
    if (path === '/simulation/resume' && !hasSelectedSimulationData) {
      setNotice('请先在“仿真数据管理”中新建或选择一份仿真数据。')
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}${path}`, {
        method: 'POST',
      })

      if (!response.ok) {
        setNotice(`请求失败：${path}`)
        return
      }

      const result = await response.json().catch(() => null)

      if (result && typeof result === 'object') {
        setDashboard((old) => ({
          ...old,
          ...result,
          history: Array.isArray(result.history) ? result.history : old.history,
          windowsQueueSizes: Array.isArray(result.windowsQueueSizes)
            ? result.windowsQueueSizes
            : old.windowsQueueSizes,
          seatOccupation: Array.isArray(result.seatOccupation) ? result.seatOccupation : old.seatOccupation,
        }))
      }

      setNotice('操作成功。')
      await refreshAll()
    } catch {
      setNotice('操作失败，请检查后端接口或控制台报错。')
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
      simulationTotalMinutes: parameters.simulationTotalMinutes,
      customerArriveRate: parameters.customerArriveRate,
      customerGroupSizeRatio: parameters.customerGroupSizeRatio,
      customerDishRatio: parameters.customerDishRatio,

      // 注意：这里要用后端 SimulationParametersDto 里的字段名
      customerEatSecondsAvg: parameters.customerEatTimeAvg,
      customerEatSecondsStdVar: parameters.customerEatTimeStdVar,
      dishPrepSecondsAvg: parameters.dishPrepTimeAvg,
      dishPrepTimeSecondsVar: parameters.dishPrepTimeStdVar,

      windows: parameters.windows,
      seatCount: parameters.seatCount,
    }

    const response = await fetch(`${API_BASE}/data/new`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

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
      // 先按 query 参数形式请求：/api/data/select?id=0
      let response = await fetch(`${API_BASE}/data/select?id=${id}`, {
        method: 'POST',
      })

      // 如果 query 参数形式不行，再尝试路径参数形式：/api/data/select/0
      if (!response.ok) {
        response = await fetch(`${API_BASE}/data/select/${id}`, {
          method: 'POST',
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        setNotice(`选择数据失败：${response.status} ${errorText}`)
        return
      }

      setNotice(`已选择仿真数据：${id}`)
      await refreshAll()
    } catch {
      setNotice('选择数据失败，请检查后端 /api/data/select 接口。')
    } finally {
      setLoading(false)
    }
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
      await refreshAll()
    } catch {
      setNotice('删除数据失败，请检查后端 /api/data/delete/{id} 接口。')
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
      <style>
        {`
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            background: #edf3fb;
            color: #0f2344;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
          }

          button,
          input {
            font: inherit;
          }

          .app-shell {
            min-height: 100vh;
            display: grid;
            grid-template-columns: 260px minmax(0, 1fr);
            background: linear-gradient(135deg, #eef5ff 0%, #f8fbff 55%, #eef4fb 100%);
          }

          .sidebar {
            position: sticky;
            top: 0;
            height: 100vh;
            padding: 28px 22px;
            background: rgba(255, 255, 255, 0.86);
            border-right: 1px solid #dbe7f5;
            box-shadow: 12px 0 36px rgba(35, 77, 130, 0.06);
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-bottom: 30px;
          }

          .brand-mark {
            width: 46px;
            height: 46px;
            border-radius: 16px;
            display: grid;
            place-items: center;
            background: linear-gradient(135deg, #1e5bff, #5aa6ff);
            color: white;
            font-size: 22px;
            font-weight: 900;
            box-shadow: 0 12px 24px rgba(30, 91, 255, 0.24);
          }

          .brand strong {
            display: block;
            font-size: 18px;
            letter-spacing: 0.02em;
          }

          .brand span {
            display: block;
            margin-top: 4px;
            color: #6d7f9b;
            font-size: 13px;
          }

          nav {
            display: grid;
            gap: 10px;
          }

          .nav-item {
            width: 100%;
            border: none;
            border-radius: 16px;
            padding: 14px 16px;
            text-align: left;
            color: #35506f;
            background: transparent;
            cursor: pointer;
            font-weight: 700;
          }

          .nav-item.active,
          .nav-item:hover {
            background: #eaf2ff;
            color: #1448ad;
          }

          .status-dot {
            margin-top: 28px;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 16px;
            border-radius: 16px;
            font-weight: 800;
            background: #f3f7fc;
          }

          .status-dot span {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            display: inline-block;
          }

          .status-dot.online span {
            background: #20c36b;
            box-shadow: 0 0 0 6px rgba(32, 195, 107, 0.15);
          }

          .status-dot.offline span {
            background: #ff5a5f;
            box-shadow: 0 0 0 6px rgba(255, 90, 95, 0.15);
          }

          .content {
            min-width: 0;
            padding: 28px;
          }

          .hero-card,
          .notice-card,
          .metric-card,
          .panel-card {
            border: 1px solid #dbe7f5;
            background: rgba(255, 255, 255, 0.9);
            box-shadow: 0 16px 42px rgba(35, 77, 130, 0.08);
            backdrop-filter: blur(10px);
          }

          .hero-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 24px;
            padding: 30px 34px;
            border-radius: 28px;
          }

          .eyebrow {
            margin: 0 0 10px;
            color: #4773ad;
            font-weight: 900;
            letter-spacing: 0.08em;
          }

          h1,
          h2,
          h3,
          p {
            margin-top: 0;
          }

          .hero-card h1 {
            margin-bottom: 12px;
            font-size: 34px;
            line-height: 1.2;
            color: #0c2348;
          }

          .hero-card p {
            margin-bottom: 0;
            color: #506581;
          }

          .hero-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .time-chip {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            padding: 12px 18px;
            background: #edf4ff;
            color: #24508a;
            font-weight: 800;
            white-space: nowrap;
          }

          .notice-card {
            margin-top: 22px;
            padding: 18px 24px;
            border-radius: 22px;
            color: #506581;
            font-weight: 800;
          }

          .metric-grid {
            margin-top: 22px;
            display: grid;
            grid-template-columns: repeat(6, minmax(0, 1fr));
            gap: 18px;
          }

          .metric-card {
            border-radius: 22px;
            padding: 22px;
            min-height: 132px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }

          .metric-card span {
            color: #60758f;
            font-weight: 700;
            margin-bottom: 14px;
          }

          .metric-card strong {
            color: #061b3d;
            font-size: 28px;
          }

          .panel-grid {
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) minmax(360px, 0.8fr);
            gap: 22px;
            margin-top: 22px;
          }

          .panel-card {
            border-radius: 28px;
            padding: 26px;
            overflow: hidden;
          }

          .panel-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            margin-bottom: 22px;
          }

          .panel-head.compact {
            margin-bottom: 18px;
          }

          .panel-head h2,
          .panel-head h3 {
            margin-bottom: 8px;
            color: #0c2348;
          }

          .panel-head p {
            margin-bottom: 0;
            color: #60758f;
          }

          .chart-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
          }

          .chart-card {
            min-height: 220px;
            padding: 20px;
            border-radius: 22px;
            background: #f8fbff;
            border: 1px solid #dbe7f5;
          }

          .chart-card h3 {
            margin-bottom: 18px;
            color: #193b68;
          }

          .mini-chart {
            height: 145px;
            display: flex;
            align-items: flex-end;
            gap: 8px;
            overflow: hidden;
          }

          .mini-bar {
            flex: 1;
            min-width: 8px;
            max-width: 24px;
            border-radius: 10px 10px 4px 4px;
            background: linear-gradient(180deg, #64a7ff, #2165ea);
          }

          .empty-chart,
          .empty-text,
          .hint-text {
            color: #7a8ca5;
            font-weight: 700;
          }

          .hint-text {
            margin-top: -8px;
            margin-bottom: 18px;
            font-size: 14px;
          }

          .button-row {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin: 16px 0 22px;
          }

          .primary-button,
          .secondary-button,
          .wide-button {
            border: none;
            border-radius: 16px;
            padding: 13px 18px;
            cursor: pointer;
            font-weight: 900;
          }
          .action-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.danger-button {
  border: none;
  border-radius: 16px;
  padding: 13px 18px;
  cursor: pointer;
  font-weight: 900;
  background: #fff0f0;
  color: #d9363e;
}

.danger-button:hover {
  background: #ffe1e1;
}

.danger-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
          .primary-button,
          .wide-button {
            background: #2454e6;
            color: white;
          }

          .secondary-button {
            background: #edf3fb;
            color: #14365f;
          }

          .primary-button:hover,
          .wide-button:hover {
            background: #1d46c4;
          }

          .secondary-button:hover {
            background: #e0ebf8;
          }

          button:disabled {
            opacity: 0.45;
            cursor: not-allowed;
          }

          .wide-button {
            width: 100%;
            margin-top: 12px;
            padding: 16px 18px;
          }

          .form-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
          }

          .form-grid.three {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          label {
            display: grid;
            gap: 8px;
            color: #536984;
            font-weight: 800;
          }

          input {
            width: 100%;
            border: 1px solid #d5e2f1;
            background: white;
            border-radius: 14px;
            padding: 12px 14px;
            color: #0c2348;
            outline: none;
          }

          input:focus {
            border-color: #4181ff;
            box-shadow: 0 0 0 4px rgba(65, 129, 255, 0.12);
          }

          label span {
            color: #7a8ca5;
            font-size: 13px;
          }

          .table-wrap {
            width: 100%;
            overflow-x: auto;
            border-radius: 18px;
            border: 1px solid #dbe7f5;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            min-width: 640px;
            background: white;
          }

          th,
          td {
            padding: 16px 18px;
            text-align: left;
            border-bottom: 1px solid #e5edf7;
          }

          th {
            background: #f4f8fe;
            color: #31516f;
            font-weight: 900;
          }

          td {
            color: #102746;
            font-weight: 650;
          }

          .window-list {
            display: grid;
            gap: 12px;
          }

          .window-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            padding: 16px;
            border-radius: 16px;
            background: #f6f9fd;
            border: 1px solid #dbe7f5;
          }

          .window-item span {
            color: #536984;
            font-weight: 800;
          }

          .window-item strong {
            color: #0f2a52;
          }

          .summary-row {
            margin-top: 18px;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
          }

          .summary-row span {
            border-radius: 999px;
            padding: 10px 14px;
            background: #edf4ff;
            color: #24508a;
            font-weight: 800;
          }

          @media (max-width: 1180px) {
            .app-shell {
              grid-template-columns: 1fr;
            }

            .sidebar {
              position: static;
              height: auto;
            }

            .metric-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .panel-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 720px) {
            .content {
              padding: 16px;
            }

            .hero-card {
              flex-direction: column;
              align-items: flex-start;
            }

            .hero-card h1 {
              font-size: 26px;
            }

            .metric-grid,
            .chart-grid,
            .form-grid,
            .form-grid.three {
              grid-template-columns: 1fr;
            }
          }
        `}
      </style>

      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">食</div>
            <div>
              <strong>食堂仿真系统</strong>
              <span>控制面板</span>
            </div>
          </div>

          <nav>
            <button className="nav-item active" type="button">
              数据面板
            </button>
            <button className="nav-item" type="button">
              仿真控制
            </button>
            <button className="nav-item" type="button">
              数据管理
            </button>
          </nav>

          <div className={backendOnline ? 'status-dot online' : 'status-dot offline'}>
            <span />
            {backendOnline ? '后端在线' : '后端离线'}
          </div>
        </aside>

        <section className="content">
          <header className="hero-card">
            <div>
              <p className="eyebrow">B/S 架构 · React + Java</p>
              <h1>北京交通大学食堂就餐仿真系统</h1>
              <p>根据后端 DashboardResponse 展示窗口队列、座位占用和历史统计指标。</p>
            </div>

            <div className="hero-actions">
              <span className="time-chip">当前仿真时钟：{currentTimeMinute} 分钟</span>
              <span className="time-chip">状态：{localizedState(dashboard.simulationState || status.simulationState)}</span>
            </div>
          </header>

          <div className="notice-card">{notice}</div>

          <section className="metric-grid">
            {[
              ['平均排队长度', `${formatNumber(averageQueueLength)} 人`],
              ['顾客等待时间', `${formatNumber(averageWaitMinutes)} 分钟`],
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
                <button className="secondary-button" type="button" onClick={refreshAll} disabled={loading}>
                  刷新数据
                </button>
              </div>

              <div className="chart-grid">
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
                    recentHistory.map((item) => getWaitMinutes(item)),
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
                    recentHistory.map((item) => getSeatTurnover(item)),
                    10,
                  )}
                </div>
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-head compact">
                <div>
                  <h2>仿真控制</h2>
                  <p>开始与继续统一调用后端 /api/simulation/resume。</p>
                </div>
              </div>

              <div className="button-row">
                <button
                  className="primary-button"
                  type="button"
                  onClick={() => callSimulation('/simulation/resume')}
                  disabled={loading || !hasSelectedSimulationData}
                  title={!hasSelectedSimulationData ? '请先新建或选择仿真数据' : '开始或继续仿真'}
                >
                  开始
                </button>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => callSimulation('/simulation/pause')}
                  disabled={loading}
                >
                  暂停
                </button>

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setNotice('后端暂未提供 reset 接口。')}
                >
                  重置
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
                        customerArriveRate: Number(event.target.value),
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
                    value={parameters.dishPrepTimeAvg}
                    onChange={(event) =>
                      setParameters({
                        ...parameters,
                        dishPrepTimeAvg: Number(event.target.value),
                      })
                    }
                  />
                  <span>分钟</span>
                </label>

                <label>
                  做餐时间方差
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={parameters.dishPrepTimeStdVar}
                    onChange={(event) =>
                      setParameters({
                        ...parameters,
                        dishPrepTimeStdVar: Number(event.target.value),
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
                    value={parameters.customerEatTimeAvg}
                    onChange={(event) =>
                      setParameters({
                        ...parameters,
                        customerEatTimeAvg: Number(event.target.value),
                      })
                    }
                  />
                  <span>分钟</span>
                </label>

                <label>
                  就餐时间方差
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={parameters.customerEatTimeStdVar}
                    onChange={(event) =>
                      setParameters({
                        ...parameters,
                        customerEatTimeStdVar: Number(event.target.value),
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

              <button className="wide-button" type="button" onClick={saveParameters} disabled={loading}>
                保存仿真参数
              </button>
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
                            <div className="action-buttons">
                              <button
                                className="secondary-button"
                                type="button"
                                onClick={() => selectSimulationData(item.id)}
                                disabled={loading}
                              >
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
                            </div>
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
                <button className="secondary-button" type="button" onClick={refreshAll} disabled={loading}>
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

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>类型</th>
                    <th>编号</th>
                    <th>当前数值</th>
                    <th>说明</th>
                  </tr>
                </thead>

                <tbody>
                  {dashboard.windowsQueueSizes.map((size, index) => (
                    <tr key={`window-detail-${index}`}>
                      <td>窗口</td>
                      <td>{index + 1}</td>
                      <td>{size}</td>
                      <td>当前排队人数</td>
                    </tr>
                  ))}

                  {dashboard.seatOccupation.map((occupied, index) => (
                    <tr key={`seat-detail-${index}`}>
                      <td>座位</td>
                      <td>{index + 1}</td>
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

            <div className="summary-row">
              <span>窗口数量：{dashboard.windowsQueueSizes.length}</span>
              <span>当前排队人数：{totalQueueLength}</span>
              <span>座位数量：{dashboard.seatOccupation.length}</span>
              <span>已占座位：{occupiedSeatCount}</span>
            </div>
          </section>
        </section>
      </main>
    </>
  )
}

export default App