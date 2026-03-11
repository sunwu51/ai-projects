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

## Improvement Request — Issue #3
> [https://github.com/sunwu51/ai-projects/issues/3](https://github.com/sunwu51/ai-projects/issues/3) by @sunwu51 on 2026-03-11

### 目标项目目录名

prj-20260311-mcp-center

### 改进需求描述

## 问题描述
我实测有多个问题：
- 1 chatbox等工具导入http server的时候直接报错404，看上去是这些工具用的是get请求，而当前只支持了post请求，请加上get的支持。（我个人觉得是这个原因）
- 2 http版本的启动后list tool报错Bad Request: Server not initialized，我简单看了下可能是有多个bug
   - 2.1 165行左右，怎么请求结束的回调里面`server?.close()`给全局server给关掉了
   - 2.2 160行左右，是每个请求都新建了transport吗，这样设计合理吗 
   - 是不是应该每个请求建立独立server + transport
```js
app.post('/mcp', async (req, res) => {
    // 每个请求独立的 server 和 transport
    const srv = createServer();
    const transportImpl = new StreamableHTTPServerTransport({ ... });
    await srv.connect(transportImpl);
    await transportImpl.handleRequest(req, res, req.body);

    res.on('close', () => {
      transportImpl.close();
      srv.close();  // 关自己这个请求的 server，不影响其他请求
    });
  });
```
- 3 配置文件不要读当前目录`mcp.json`啊，如果用stdio配置的话，你不知道agent的运行目录的，所以要改成参数指定`mcp.json`文件啊。

## 验收
请务必用当前目录下的json文件进行完整的，工具list，工具调用测试成功后，再提交pr。

### 提交前确认

- [x] 标题中的目录名与仓库中的目录完全一致
- [x] 已了解：提交后在评论输入 `/opencode` 触发改进