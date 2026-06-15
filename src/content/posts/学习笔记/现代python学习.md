---
title: 现代python学习
published: 2026-06-13
tags:
  - python
  - 基础知识
draft: false
---

参考课程：[【Python/uv】迈向AI的第零步！现代化Python工具指南](https://www.bilibili.com/video/BV1xk1eBQEUB/?p=2&share_source=copy_web&vd_source=7e010f16494955c14fbe8ca810a7c74e)

# uv：比pip更好的包管理器

一个用rust写的包管理器，替代pip。主流用法是uv+venv，它比起pip+venv有两个好处：

1. pyproject.toml+uv.lock+.python-version自动记录环境依赖，uv sync一键复现venv环境。比pip freeze > requirements.txt更靠谱。
2. uv的安装速度比pip快

但它无法完全替代pip+conda，因为venv没法做到conda的系统依赖管理，如果要用到ffmpeg、gcc等的环境隔离和版本管理，那就还得用conda

## 安装与使用uv

```bash
# 安装uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# 开发常用操作
uv init --python 3.11 # 初始化项目+指定python版本
uv add transformers datasets peft accelerate trl # 安装包
uv remove transformers # 删除包
uv run python train.py # 用uv环境跑代码

# 复现别人代码常用操作
uv sync # 安装虚拟环境
uv run python train.py # 用uv环境跑代码

# 提交到 git
# 提交：pyproject.toml / uv.lock / .python-version
# 不提交：.venv/

# torch之类的特殊包需要特别处理
# 比如安装torch v2.7.1+cuda12.6的版本，在官网找到的推荐命令是
# pip install torch==2.7.1 torchvision==0.22.1 torchaudio==2.7.1 \
#   --index-url https://download.pytorch.org/whl/cu126
# 转换到uv上，要把pip install改成uv add，然后--index-url改成--index，改为：
uv add torch==2.7.1 torchvision==0.22.1 torchaudio==2.7.1 \
  --index https://download.pytorch.org/whl/cu126
```

补充：

1. 这里没有用到uv venv这个命令，是因为uv add第一个包的时候会自动创建venv环境
2. 关于uv安装pytorch的问题，建议参考[官方文档](https://docs.astral.sh/uv/guides/integration/pytorch/#installing-pytorch)，讲得更详细
3. uv pip install可以像pip一样地使用uv，但只能加速安装，它不会自动管理项目依赖，所以不推荐，也不用学

## pyproject.toml

属于相关知识点，我还没完全学明白，详见[这个视频](https://www.bilibili.com/video/BV1xk1eBQEUB/?p=5)

# Ruff：代码格式化工具

用来做代码格式化的工具，具体可以看这个视频 [Ruff使用指南：最新的超快速代码格式化工具（Python五分钟）](https://www.bilibili.c。om/video/BV1XPj4zpE1a/?share_source=copy_web&vd_source=7e010f16494955c14fbe8ca810a7c74e)

个人认为在vibe coding时代，也许它在个人项目中没有那么有必要了，暂时不学。不过，如果code agent写的代码有冗余，也许可以让它自己装个Ruff，自己修复问题？

【补充】教程的up主说团队项目中一定会用到Ruff来进行语法检查，先记下，以后要用到就回来学。

# pyright：静态类型检查器

用来检查python代码潜在的错误，vscode的pylance插件集成了它，如果要用，只需要装pyright就行。

# rich：美化堆栈报错

让python的报错变得更清晰、方便看懂
