# mcp-center

> **Issue**: [#1](https://github.com/sunwu51/ai-projects/issues/1)
> **Author**: @sunwu51
> **Date**: 2026-03-11

## Requirements

### 项目简介

mcp-center

### 详细需求

## 功能需求
创建一个mcp server的管理工具
- 1 他本身就是一个mcp server，stdio版本和httpstreamable两个版本的运行方式。
- 2 他的作用是可以加载其他mcp server注册的工具等，汇总到自己这里，自己将这些再暴露出去，对外暴露的函数名是`mcpserver名_函数名`。
- 3 如何加载其他的mcpserver，方式为运行参数指定读取一个指定的`mcp.json`
- 4 这个json文件，格式为标准的mcpServer配置方式，但是可以针对每个mcp server指定enable的tool集合，默认是全都enable。

## 技术约束
- 1 使用nodejs和官方的mcp sdk来实现。
- 2 需要支持热更新配置后，服务可以加载最新的工具列表，而不需要重启。

## 验收标准
- 1 添加一个exa官方的mcp server（http版本），可以通过当前服务的tool list列出工具，并可以call调用search工具

### 首选语言（可选）

TypeScript / JavaScript

### 提交前确认

- [x] 需求描述清晰，包含足够的细节让 AI 理解
- [x] 已了解：提交后在评论输入 `/opencode` 触发实现
---

## Improvement Request — Issue #5
> [https://github.com/sunwu51/ai-projects/issues/5](https://github.com/sunwu51/ai-projects/issues/5) by @sunwu51 on 2026-03-11

### 目标项目目录名

prj-20260311-mcp-center 

### 改进需求描述

## 问题描述
现在项目有多个bug导致启动不起来，你不需要参考现有的代码了。根据requirement.md文件的需求重写整个项目吧，最好用JavaScript，而不要用Typescript。

注意mcp.json文件，通过参数指定。

你需要进行测试，分别对stdio和http server都进行测试，需要把测试流程和记录附到PR的说明中。

### 提交前确认

- [x] 标题中的目录名与仓库中的目录完全一致
- [x] 已了解：提交后在评论输入 `/opencode` 触发改进
---

## Improvement Request — Issue #7
> [https://github.com/sunwu51/ai-projects/issues/7](https://github.com/sunwu51/ai-projects/issues/7) by @sunwu51 on 2026-03-11

### 目标项目目录名

prj-20260311-mcp-center

### 改进需求描述

## 问题描述

当前代码在http模式下，运行工具会报错，prj-20260311-mcp-center/node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.js:217
            throw new Error('Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.');
                  ^

Error: Already connected to a transport. Call close() before connecting to a new transport, or use a separate Protocol instance per connection.
    at Server.connect (file:///C:/Users/sunwu/Desktop/code/ai-projects/prj-20260311-mcp-center/node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.js:217:19)
    at Server.<anonymous> (file:///C:/Users/sunwu/Desktop/code/ai-projects/prj-20260311-mcp-center/src/server.js:183:23)
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)

另外当前项目已经改成js版本了，但是还有大量的ts文件，请清理干净，并更新readme。

## 验收标准
之前的测试是只有init和list，没有实际调用call，请补测call指定的tool拿到正确结果，注意测3次，来保证连接是正常的，没有前面链接关闭后，后面无法使用的问题。

### 提交前确认

- [x] 标题中的目录名与仓库中的目录完全一致
- [x] 已了解：提交后在评论输入 `/opencode` 触发改进
---

## Improvement Request — Issue #9
> [https://github.com/sunwu51/ai-projects/issues/9](https://github.com/sunwu51/ai-projects/issues/9) by @sunwu51 on 2026-03-15

### 目标项目目录名

prj-20260311-mcp-center

### 改进需求描述

## 改进描述
现在的mcp center负责代理了其他mcp server的tools，但是还缺少另外两个重要功能，resources & template和prompt，这两个也帮忙代理一下，同样的名称前缀改为mcpserver名字+下划线开头。

## 验收标准
帮我在测试中写一个有tools，resources和template，还有prompt的小工具，添加到mcp.json完成三部分功能的测试。


### 提交前确认

- [x] 标题中的目录名与仓库中的目录完全一致
- [x] 已了解：提交后在评论输入 `/opencode` 触发改进
---

## Improvement Request — Issue #11
> [https://github.com/sunwu51/ai-projects/issues/11](https://github.com/sunwu51/ai-projects/issues/11) by @sunwu51 on 2026-03-22

### 目标项目目录名

prj-20260311-mcp-center 

### 改进需求描述

## 问题描述
- 1 当前的项目中有http streamable和stdio两个版本，请删除stdio版本，只保留http版本，便于之后维护和演进。
- 2 添加一个http ui，来支持通过web页面增加mcp server的功能。新增的stdio版本的mcp server可以指定command和args，并且还可以指定环境变量，与mcp.json配置相对应。新增的http版本的mcp server可以指定url和httpheaders，也与mcp.json配置对应。这个http ui，主要是增加了动态添加、删除、修改mcp server的功能，在更新后，需要同时更新启动时候指定的mcp.json文件。
- 3 如果不指定mcp.json来启动，则请默认创建一个`~/.mcp-center/mcp.json`的文件，默认是{}空对象即可。
- 4 启动配置中已有的mcp server的时候，采用并行的启动，而不是串行，来加快启动速度。
- 5 如果修改mcp.json也应该触发维护的mcp server的更新，但是文件更新过程中可能会出现json非法的情况，此时不要更新。需要在进程内存中也维护一个mcp server列表，如果mcp.json变动之后，对比和内存维护的列表的变化，来进行更新。

## 验收标准
- 完成以上功能。
- 新增UI和对应的mcpserver管理的api接口，测试接口可以增删改查维护的server，并同步更新到mcp server。
- 可以用exa的mcp server和test mcp server进行测试，更新、增删等。
- 同时需要测试stdio 类型的mcpserver设置环境变量是否生效，http类型的header是否生效等。
- UI页面可以采用https://github.com/sunwu51/camel-ui这个react库的样式

### 提交前确认

- [x] 标题中的目录名与仓库中的目录完全一致
- [x] 已了解：提交后在评论输入 `/opencode` 触发改进