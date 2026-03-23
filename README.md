# AI Projects Workspace

使用 [OpenCode](https://opencode.ai) AI 在 GitHub Issue 中自动实现子项目的工作空间。

## 工作流程

```
创建 Issue（描述需求）
       ↓
评论 /opencode
       ↓
GitHub Action 触发
       ↓
自动创建 prj-YYYYMMDD-name/ 目录
       ↓
写入 REQUIREMENTS.md
       ↓
OpenCode AI 实现功能 + 写测试
       ↓
提交 Pull Request
```

---

## 快速开始

### 1. 一次性配置

#### 安装 OpenCode GitHub App
访问 [github.com/apps/opencode-agent](https://github.com/apps/opencode-agent)，将其安装到本仓库。

#### 添加 API 密钥、变量
进入仓库 **Settings → Secrets and variables → Actions**，添加：

| 密钥名称 | 说明 |
|---------|------|
| `OPENCODE_API_KEY` | 供应商的sk |

| 变量名称 | 说明 |
|---------|------|
| `OPENCODE_BASE_URL` | 供应商的url |
| `OPENCODE_MODEL`    | 使用的模型名 |


### 2. 创建新项目

1. 点击 **Issues → New Issue**，选择「新建项目 / New Project」模板
2. 填写项目标题（建议英文，用于生成目录名）和详细需求
3. 提交 Issue
4. 在 Issue 评论中输入：
   ```
   /opencode
   ```
   或简写：
   ```
   /oc
   ```

### 3. 等待 AI 实现

OpenCode 将自动完成以下工作：
- 创建 `prj-YYYYMMDD-{slug}/` 目录
- 生成 `REQUIREMENTS.md` 需求文档
- 实现完整功能代码
- 编写并运行测试
- 提交 Pull Request（关联原 Issue）

---

## 目录命名规则

```
prj-{YYYYMMDD}-{slug}
     ^^^^^^^^   ^^^^
     创建日期   Issue 标题转换（小写英文+数字，空格→连字符）
```

**示例：**

| Issue 标题 | 生成目录名 |
|-----------|-----------|
| REST API for user management | `prj-20260101-rest-api-for-user-management` |
| CSV to JSON converter CLI | `prj-20260101-csv-to-json-converter-cli` |
| 数据分析 dashboard | `prj-20260101-cn-dashboard` |

---

## 项目内部结构

每个子项目目录由 AI 自动组织，通常包含：

```
prj-20260101-my-project/
├── REQUIREMENTS.md   ← 自动从 Issue 生成的需求文档
├── README.md         ← AI 生成的项目说明
├── src/              ← 源代码
└── tests/            ← 测试文件
```

---

## 高级用法

### 指定技术栈

在 Issue 评论中加入具体指令：
```
/opencode 使用 Python + FastAPI 实现，并添加 Docker 支持
```

### 要求修改已有实现

在对应 PR 的代码行上留评论并加 `/oc`：
```
这里需要增加错误处理 /oc
```

---

## 本地开发（可选）

如需在本地使用 OpenCode：

```bash
# 安装 OpenCode
npm install -g opencode-ai

# 在子项目目录中运行
cd prj-20260101-my-project
opencode
```
