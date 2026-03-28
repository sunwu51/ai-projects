# opencode-metadata-plugin

> **Issue**: [#15](https://github.com/sunwu51/ai-projects/issues/15)
> **Author**: @sunwu51
> **Date**: 2026-03-28

## Requirements

### 项目简介

一个opencode插件，可以给llm请求中添加类似claudecode中的metadata.user_id信息

### 详细需求

## 功能需求
开发一个opencode插件，实现拦截大模型调用的请求，主要是anthropic的messages请求。

在请求的body中判断是否有metadata.user_id，如果没有则添加内容的伪代码：
```
            body.metadata ||= {}
            body.metadata.user_id = model.options.metadata.user_session_id
            body.metadata.project_id = model.options.metadata.project_id
            body.metadata.session_id = model.options.metadata.session_id
            opts.body = JSON.stringify(body)
```

该功能，主要是对齐claudecode中的metadata内容，其内容至少含有session_id等信息。

## 参考实现
目前官方repo已经有个mr实现该功能https://github.com/anomalyco/opencode/pull/11276/changes，但是一直没有合并，所以这里以插件的形式进行实现，不依赖合入官方代码。



### 首选语言（可选）

TypeScript / JavaScript

### 提交前确认

- [x] 需求描述清晰，包含足够的细节让 AI 理解
- [x] 已了解：提交后在评论输入 `/opencode` 触发实现