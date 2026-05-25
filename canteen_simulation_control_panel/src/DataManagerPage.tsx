import { useState } from "react"
import { NumberInputField, type SimulationDataDto, type SimulationParameters } from "./App"

const Sections = {
    'basic_parameters': 0,
    'window_settings': 1,
    'dish_and_customer_weights': 2
} as const;

type Sections = typeof Sections[keyof typeof Sections]

export default function DataManagerPage({
    sortedDataList,
    selectSimulationData,
    deleteSimulationData,
    parameters,
    submitParameters,
    downloadDashboard,
    refreshAll,
    setParameters,
    loading
}: {
    sortedDataList: {
        selected: number | null
        datas: SimulationDataDto[]
    }
    selectSimulationData: (id: number) => void
    deleteSimulationData: (id: number) => void
    parameters: SimulationParameters,
    submitParameters: () => void
    downloadDashboard: () => void
    refreshAll: () => void
    setParameters: (p: SimulationParameters) => void
    loading: boolean
}
) {
    const [openSections, setOpenSections] = useState<Set<Sections>>(new Set())

    const toggleSection = (key: Sections) => {
        setOpenSections(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })
    }

    return <>
        <section className="panel-card">
            <div className="panel-head">
                <h2>仿真数据管理</h2>
            </div>
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr><th>数据名称</th><th>状态</th><th>操作</th></tr>
                    </thead>
                    <tbody>
                        {sortedDataList.datas.length > 0 ? sortedDataList.datas.map((item) => {
                            const selected = sortedDataList.selected === item.id
                            return (
                                <tr key={item.id}>
                                    <td>{item.name}</td>
                                    <td>{selected ? '当前选中' : '未选中'}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="secondary-button" type="button" onClick={() => selectSimulationData(item.id)} disabled={loading || selected}>
                                                选择
                                            </button>
                                            <button className="danger-button" type="button" onClick={() => deleteSimulationData(item.id)} disabled={loading}>
                                                删除
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr><td colSpan={4}>暂无仿真数据，请在下方新建。</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="button-row" style={{ marginTop: 14 }}>
                <button className="secondary-button" type="button" onClick={downloadDashboard}>下载数据</button>
                <button className="secondary-button" type="button" onClick={refreshAll}>刷新数据</button>
            </div>
        </section>

        <section className="panel-card full">
            <div className="panel-head">
                <h2>新建仿真数据</h2>
                <button className="primary-button" type="button" onClick={submitParameters} disabled={loading}>
                    {loading ? '创建中...' : '新建数据'}
                </button>
            </div>

            <button className={`section-toggle${openSections.has(Sections.basic_parameters) ? ' open' : ''}`} type="button" onClick={() => toggleSection(Sections.basic_parameters)}>
                <svg className="toggle-chevron" viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M 4 2.5 L 8 6 L 4 9.5" />
                </svg>
                <span>基本参数</span>
            </button>
            {openSections.has(Sections.basic_parameters) && (
                <div className="params-grid-3">
                    <NumberInputField
                        label="仿真总时长"
                        initial={parameters.simulationTotalMinutes}
                        onChange={v => setParameters({ ...parameters, simulationTotalMinutes: v })}
                        min={1} step={0.1} unit="分钟" />
                    <NumberInputField
                        label="顾客到达率"
                        initial={parameters.customerArriveRate * 60}
                        onChange={v => setParameters({ ...parameters, customerArriveRate: v / 60 })}
                        min={1} step={0.1} unit="人/分钟" />
                    <NumberInputField
                        label="平均 顾客就餐时间"
                        initial={parameters.customerEatSecondsAvg / 60}
                        onChange={v => setParameters({ ...parameters, customerEatSecondsAvg: v * 60 })}
                        min={0.01} step={0.01} unit="分钟" />
                    <NumberInputField
                        label="顾客就餐时间 标准差"
                        initial={parameters.customerEatSecondsStdVar / 60}
                        onChange={v => setParameters({ ...parameters, customerEatSecondsStdVar: v * 60 })}
                        min={0.01} step={0.01} unit="分钟" />
                    <NumberInputField
                        label="平均 餐品准备时间"
                        initial={parameters.dishPrepSecondsAvg / 60}
                        onChange={v => setParameters({ ...parameters, dishPrepSecondsAvg: v * 60 })}
                        min={0.01} step={0.01} unit="分钟" />
                    <NumberInputField
                        label="餐品准备时间 标准差"
                        initial={parameters.dishPrepSecondsStdVar / 60}
                        onChange={v => setParameters({ ...parameters, dishPrepSecondsStdVar: v * 60 })}
                        min={0.01} step={0.01} unit="分钟" />
                    <NumberInputField
                        label="座位数量"
                        initial={parameters.seatCount}
                        onChange={v => setParameters({ ...parameters, seatCount: v })}
                        min={1} step={1} unit="个" />
                </div>
            )}

            <button className={`section-toggle${openSections.has(Sections.window_settings) ? ' open' : ''}`} type="button" onClick={() => toggleSection(Sections.window_settings)}>
                <svg className="toggle-chevron" viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M 4 2.5 L 8 6 L 4 9.5" />
                </svg>
                <span>窗口设置</span>
                <span className="section-toggle-count">({parameters.windows.length} 个)</span>
            </button>
            {openSections.has(Sections.window_settings) && (
                <>
                    <div className="windows-list">
                        <div className="window-header">
                            <span>#</span>
                            <span>餐品类型</span>
                            <span>效率系数</span>
                            <span></span>
                        </div>
                        {parameters.windows.map((win, i) => (
                            <div className="window-row" key={i}>
                                <span className="window-index">{i + 1}</span>
                                <select
                                    value={win.dishType}
                                    onChange={e => {
                                        const next = [...parameters.windows]
                                        next[i] = { ...next[i], dishType: e.target.value }
                                        setParameters({ ...parameters, windows: next })
                                    }}
                                >
                                    <option value="A">A 套餐</option>
                                    <option value="B">B 套餐</option>
                                    <option value="C">C 套餐</option>
                                </select>
                                <input
                                    type="number"
                                    value={win.windowPrepTimeModifier}
                                    min={0.1}
                                    step={0.1}
                                    onChange={e => {
                                        if (!e.target.validity.valid) return
                                        const next = [...parameters.windows]
                                        next[i] = { ...next[i], windowPrepTimeModifier: Number(e.target.value) }
                                        setParameters({ ...parameters, windows: next })
                                    }}
                                />
                                <button
                                    className="danger-button"
                                    type="button"
                                    disabled={parameters.windows.length <= 3}
                                    onClick={() => {
                                        const next = parameters.windows.filter((_, j) => j !== i)
                                        setParameters({ ...parameters, windows: next })
                                    }}
                                >
                                    删除
                                </button>
                            </div>
                        ))}
                    </div>
                    <button
                        className="secondary-button"
                        type="button"
                        style={{ marginTop: 8, marginBottom: 8 }}
                        onClick={() => {
                            const types = ['A', 'B', 'C'] as const
                            const next = [...parameters.windows, { dishType: types[parameters.windows.length % 3], windowPrepTimeModifier: 1 }]
                            setParameters({ ...parameters, windows: next })
                        }}
                    >
                        + 添加窗口
                    </button>
                </>
            )}

            <button className={`section-toggle${openSections.has(Sections.dish_and_customer_weights) ? ' open' : ''}`} type="button" onClick={() => toggleSection(Sections.dish_and_customer_weights)}>
                <svg className="toggle-chevron" viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M 4 2.5 L 8 6 L 4 9.5" />
                </svg>
                <span>餐品与顾客权重</span>
            </button>
            {openSections.has(Sections.dish_and_customer_weights) && (
                <div className="form-grid">
                    <div className="input-field-container">
                        <h4>餐品权重</h4>
                        {(['A', 'B', 'C'] as const).map(dish =>
                            <NumberInputField
                                key={dish}
                                label={`${dish} 套餐`}
                                initial={parameters.customerDishRatio[dish]}
                                onChange={v => setParameters({
                                    ...parameters,
                                    customerDishRatio: { ...parameters.customerDishRatio, [dish]: v }
                                })}
                                min={1} step={1} />
                        )}
                    </div>
                    <div className="input-field-container">
                        <h4>顾客组权重</h4>
                        {(['1', '2', '3', '4'] as const).map(cnt =>
                            <NumberInputField
                                key={cnt}
                                label={`${cnt} 人组`}
                                initial={parameters.customerGroupSizeRatio[cnt]}
                                onChange={v => setParameters({
                                    ...parameters,
                                    customerGroupSizeRatio: { ...parameters.customerGroupSizeRatio, [cnt]: v }
                                })}
                                min={1} step={1} />
                        )}
                    </div>
                </div>
            )}

        </section>
    </>;
}