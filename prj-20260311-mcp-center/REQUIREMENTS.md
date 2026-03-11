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