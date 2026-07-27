---
title: Claude Code的记忆与上下文管理
published: 2026-07-23
tags:
  - LLM
  - ClaudeCode
draft: false
---

参考：

- https://code.claude.com/docs/zh-CN/memory#organize-rules-with-claude/rules/
- https://brtkwr.com/posts/2026-04-01-what-we-can-all-learn-from-the-claude-code-source/
- https://github.com/VILA-Lab/Dive-into-Claude-Code

# 记忆机制

每个 Claude Code 会话都从一个全新的上下文窗口开始。两种机制可以跨会话传递知识：

- **CLAUDE.md 文件**：你编写的指令，为 Claude 提供持久上下文（默认人写）
- **自动记忆**：Claude 根据你的更正和偏好自己编写的笔记（默认Claude写）

## CLAUDE.md

有四个层级：

| 范围         | 位置                                   | 目的                                  | 用例示例                         | 共享对象                 |
| :----------- | :------------------------------------- | :------------------------------------ | :------------------------------- | :----------------------- |
| **托管策略** | `/etc/claude-code/CLAUDE.md`           | 由 IT/DevOps 管理的组织范围指令       | 公司编码标准、安全策略、合规要求 | 组织中的所有用户         |
| **用户指令** | `~/.claude/CLAUDE.md`                  | 所有项目的个人偏好                    | 代码样式偏好、个人工具快捷方式   | 仅你（所有项目）         |
| **项目指令** | `./CLAUDE.md` 或 `./.claude/CLAUDE.md` | 项目的团队共享指令                    | 项目架构、编码标准、常见工作流   | 通过源代码控制的团队成员 |
| **本地指令** | `./CLAUDE.local.md`                    | 个人项目特定偏好；添加到 `.gitignore` | 你的沙箱 URL、首选测试数据       | 仅你（当前项目）         |

**注：**每个 CLAUDE.md 文件目标在 200 行以下，较长的文件消耗更多上下文并降低遵守度。并且规则间不要出现冲突，如果冲突了，Claude可能随机选其中一条遵守，导致未知行为。

**补充：**`.claude/`下，也可以使用 `.claude/rules/` 记录一些额外的规则。

```
your-project/
├── .claude/
│   ├── CLAUDE.md           # 主项目指令
│   └── rules/
│       ├── code-style.md   # 代码样式指南
│       ├── testing.md      # 测试约定
│       └── security.md     # 安全要求
```

## AutoMemory

自动记忆让 Claude 跨会话积累知识，无需你编写任何内容。Claude 在工作时为自己保存笔记：构建命令、调试见解、架构笔记、代码样式偏好和工作流习惯。Claude 不会每个会话都保存内容。它根据信息在未来对话中是否有用来决定什么值得记住。

自动记忆以项目级别存储在`~/.claude/projects/<project>/memory/`中，格式是：

```
~/.claude/projects/<project>/memory/
├── MEMORY.md          # 简洁索引，加载到每个会话
├── debugging.md       # 关于调试模式的详细笔记
├── api-conventions.md # API 设计决策
└── ...                # Claude 创建的任何其他主题文件
```

其中，`MEMORY.md`是记录了其他记忆文件的名称+一句话介绍，相当于“记忆的目录”。

其他的markdown文件是具体的记忆内容，一般是扁平文件结构，没有树形的记忆文件分级。但是他们的metadata里有限制标记四种type中的一种（具体见[这里](https://github.com/search?q=repo%3APiebald-AI%2Fclaude-code-system-prompts%20type%3A%20user%20%7C%20feedback%20%7C%20project%20%7C%20reference&type=code)），这意味着Claude在“有意识地只记录这四类重要信息”：

```
metadata:
  type: user | feedback | project | reference
```

其中：

- `user`：用户角色、专业能力、偏好；
- `feedback`：用户对 Claude 工作方式的纠正或认可；
- `project`：不能直接从代码或 Git 得到的长期工作、目标和约束；
- `reference`：URL、dashboard、ticket 等外部资源。

**注：**AutoMemory并不是对用户不可见的，可以运行 `/memory` 并选择自动记忆文件夹来浏览 Claude 保存的内容。一切都是纯 markdown，用户可以读取、编辑或删除。

### AutoDream更新机制

间隔时间>=24h，且>=5个会话产生了新的记忆，就会进行一次记忆整合，把碎片化的记忆清理、合并、去除矛盾，然后更新AutoMemory。

# 上下文管理机制

可以看[这个博客](https://brtkwr.com/posts/2026-04-01-what-we-can-all-learn-from-the-claude-code-source/#context-management-the-hardest-problem-in-llm-tooling)

## Tool Result Budgeting（工具结果预算限制）

每个工具的结果上限为 5 万个字符，过大的结果会保存到磁盘文件里，上下文里只放大约2KB的预览内容和磁盘文件路径。

## History Snipping（历史删减）

自动删掉没啥用+很旧的消息。没有用summary机制保留这些上下文，可能导致信息丢失。

## Microcompaction（微压缩）

相对小幅度的压缩，删掉上下文中最旧的工具结果的具体内容（但Agent仍能请求读文件，再次获取这些信息）。

## Context Collapse（上下文折叠）

把一段相关的上下文进行摘要，替换掉原本的这部分上下文

## Autocompact（完全压缩）

LLM的上下文窗口要爆的时候，Claude Code会用压缩后的上下文来替换旧的上下文。

Autocompact是上下文快炸了的时候才会进行，后面讲到的Session-memory是对话进行的时候就实时维护“压缩后的上下文”。

```
接近 context limit
        ↓
fork 一个 summarizer
        ↓
读取当前长对话
        ↓
现场生成结构化 summary
        ↓
用 summary 替换旧历史
```

压缩后的上下文会结构化地保留这九种信息：主要请求和意图、关键技术概念、文件和代码段（包含完整代码片段）、错误和修复、问题解决历史、所有用户消息、待处理任务、当前工作、下一步。

## Session-memory（另一种完全压缩）

具体见[这篇博客](https://piebald.ai/blog/session-memory-is-coming-to-claude-code)。我的理解是，Autocompact和Session-memory是二选一的两种完全压缩技术。

是由fork出来的一个sub agent实时地做渐进式维护一个`session-memory.md`，在对话每增加约 5,000 token，并且至少有 3 次工具调用后，就会触发一次对`session-memory.md`的更新。
