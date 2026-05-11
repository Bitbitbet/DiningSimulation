import { NumberInputField, type SimulationDataDto, type SimulationParameters } from "./App"

export default function DataManagerPage({
    sortedDataList,
    selectSimulationData,
    deleteSimulationData,
    parameters,
    submitParameters,
    downloadDashboard,
    refreshAll,
    setParameters,
    changeWindowCount,
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
    changeWindowCount: (c: number) => void
    loading: boolean
}
) {
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
                            <tr><td colSpan={4}>暂无仿真数据，请先点击“新建数据”。</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="button-row" style={{ marginTop: 14 }}>
                <button className="primary-button" type="button" onClick={submitParameters} disabled={loading}>新建数据</button>
                <button className="secondary-button" type="button" onClick={downloadDashboard}>下载数据</button>
                <button className="secondary-button" type="button" onClick={refreshAll}>刷新数据</button>
            </div>

        </section>
        <section className="panel-card full">
            <div className="form-grid">
                <NumberInputField
                    label="仿真总时长"
                    initial={parameters.simulationTotalMinutes}
                    onChange={v => setParameters({
                        ...parameters,
                        simulationTotalMinutes: v
                    })}
                    min={1}
                    step={0.1}
                    unit='分钟' />
                <NumberInputField
                    label="顾客到达率"
                    initial={parameters.customerArriveRate * 60}
                    onChange={v => setParameters({
                        ...parameters,
                        customerArriveRate: v / 60
                    })}
                    min={1}
                    step={0.1}
                    unit='人/分钟' />
                <div>
                    <NumberInputField
                        label="平均顾客就餐时间"
                        initial={parameters.customerEatSecondsAvg / 60}
                        onChange={v => setParameters({
                            ...parameters,
                            customerEatSecondsAvg: v * 60
                        })}
                        min={0.01}
                        step={0.01}
                        unit="分钟" />
                    <NumberInputField
                        label="顾客就餐时间标准差"
                        initial={parameters.customerEatSecondsStdVar / 60}
                        onChange={v => setParameters({
                            ...parameters,
                            customerEatSecondsStdVar: v * 60
                        })}
                        min={0.01}
                        step={0.01}
                        unit="分钟" />
                </div>
                <div>
                    <NumberInputField
                        label="平均餐品准备时间"
                        initial={parameters.dishPrepSecondsAvg / 60}
                        onChange={v => setParameters({
                            ...parameters,
                            dishPrepSecondsAvg: v * 60
                        })}
                        min={0.01}
                        step={0.01}
                        unit="分钟" />
                    <NumberInputField
                        label="餐品准备时间标准差"
                        initial={parameters.dishPrepSecondsStdVar / 60}
                        onChange={v => setParameters({
                            ...parameters,
                            dishPrepSecondsStdVar: v * 60
                        })}
                        min={0.01}
                        step={0.01}
                        unit="分钟" />
                </div>
                <NumberInputField
                    label="窗口数量"
                    initial={parameters.windows.length}
                    onChange={changeWindowCount}
                    min={3}
                    step={1}
                    unit="个" />
                <NumberInputField
                    label="座位数量"
                    initial={parameters.seatCount}
                    onChange={v => setParameters({
                        ...parameters,
                        seatCount: v
                    })}
                    min={1}
                    step={1}
                    unit="个" />
            </div>
            <div className="panel-head">
                <div>
                    <h2>餐品与顾客权重</h2>
                </div>
            </div>
            <div className="form-grid three">
                {
                    (['A', 'B', 'C'] as const).map(dish =>
                        <NumberInputField
                            label={`${dish}套餐权重`}
                            initial={parameters.customerDishRatio[dish]}
                            onChange={v => setParameters({
                                ...parameters,
                                customerDishRatio: {
                                    ...parameters.customerDishRatio,
                                    [dish]: v
                                }
                            })}
                            min={1}
                            step={1} />
                    )
                }
                {
                    (['1', '2', '3', '4'] as const).map(cnt =>
                        <NumberInputField
                            label={`${cnt}人组权重`}
                            initial={parameters.customerGroupSizeRatio[cnt]}
                            onChange={v => setParameters({
                                ...parameters,
                                customerGroupSizeRatio: {
                                    ...parameters.customerGroupSizeRatio,
                                    [cnt]: v
                                }
                            })}
                            min={1}
                            step={1} />
                    )
                }
            </div>
        </section>
    </>;
}