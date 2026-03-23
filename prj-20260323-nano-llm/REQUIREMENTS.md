# nano llm

> **Issue**: [#13](https://github.com/sunwu51/ai-projects/issues/13)
> **Author**: @sunwu51
> **Date**: 2026-03-23

## Requirements

### 项目简介

类似litellm的大模型provider网关

### 详细需求

## 功能需求
- 1 加载代理的供应商模型：
  - 读取配置文件默认是`~/.nanollm/config.ymal`，配置方式类似litellm，主要有对外暴露的模型名，调用供应商实际模型名，协议（responses, chat/completions, messages）三种之一。
- 2 对外暴露/v1/responses, /v1/chat/completions和/v1/messages三个接口，因为供应商可以是三者任一，所以就需要每一种分别映射到其他两种接口的请求和响应的转换器，调研并实现这6种转换器，尤其注意prompt cache在request中的转换。
- 3 日志开关，打印日志到控制台和`~/.nanollm/日期.log`,采用合理的日志框架记录，日志中至少有每次调用的模型id，path，和状态码。如果配置文件中日志配置为trace级别，则也打印每次收到的请求(header+body)和返回的结果header+body。如果是debug级别，则还会打印像下游供应商发起的请求和响应，还有url。
- 4 配置文件中还应该支持，强制指定httpheader值发送到供应商，默认是透传http header的，其中authorization字段特殊，会被覆盖为`Bearer sk-配置文件中写的值`，如果配置文件没有配置，则透传用户自己传的。
- 5 配置文件中还需要支持，强制指定json body中的值，用yaml格式指定即可，注意多级格式。body中指定值的时候可以来自字符串字面量，也可以用`{uuid}`自动生成，或者`{headers.xxx}`来自header。
- 6 整个配置文件的配置也可以通过webui进行配置，减少使用复杂度。

## 技术要求
- 请用golang实现这个server端，这样最后可以打包为一个二进制文件在各个平台运行。

## 验收标准
- 设置三种接口规范的provider作为测试，可以是openrouter，他是支持这三种协议的，分别设置3个openrouter的provider。这是一个测试的key：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，很快就会失效。
- 设置好provider后，通过三种协议，分别调用这3个provider，都应该生效，并且验证缓存也应该是生效的。

### 首选语言（可选）

Go

### 提交前确认

- [x] 需求描述清晰，包含足够的细节让 AI 理解
- [x] 已了解：提交后在评论输入 `/opencode` 触发实现