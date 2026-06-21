# 就餐仿真系统

写个前端，然后写个后端，都在写这个仓库里

## CanteenSimulationControlPanel

就餐仿真系统控制面板。

是一个使用vite的react项目。



## CanteenSimulationService
后端是一个Spring Boot项目

# 构建方法

在`canteen_simulation_control_panel`文件夹下，

```sh
pnpm install
pnpm build
```
`dist`文件夹内容包含前端构建结果
---
在`canteen_simulation_service`文件夹下，

```sh
mvn clean package
```

`target`文件夹的jar文件即为后端构建结果
