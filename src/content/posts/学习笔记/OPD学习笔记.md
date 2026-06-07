---
title: OPD学习笔记
published: 2026-06-05
tags:
  - OPD
draft: false
---

# 从SFT和蒸馏讲起

SFT的loss是：$\mathcal{L}_{SFT}=\mathbb{E}_{x,y\sim D}\left[-\sum_t\log\pi_\theta(y_t|x,y_{<t})\right]$

蒸馏的loss是：$\mathcal{L}_{\mathrm{KD}}=\mathbb{E}_{x,y\sim D}\left[\sum_tD_{KL}\left(\pi_T(\cdot|x,y_{<t})\|\pi_\theta(\cdot|x,y_{<t})\right)\right]$

其中$\pi_T$是teacher模型，$\pi_\theta$是student模型。$D_{KL}$ 是KL散度。

## SFT是蒸馏的特殊情况

一个重要的观察是，SFT 是蒸馏的特殊情况。

在蒸馏中，$x$ 是输入文本，$y$​ 仍然通常是一个具体的文本 token 序列；但真正作为监督信号的是 teacher 在每个前缀下给出的 next-token 分布 $\pi_T(\cdot|x,y_{<t})$，而不是$y$。

如果把SFT看作一种蒸馏，那么它对应着 $\pi_T(\cdot|x,y_{<t})$总是one-hot分布的特殊情况。代入公式就会发现loss公式也符合这条规律。

## SFT和蒸馏的数据来自哪里

SFT的数据通常来自人类标注/强模型生成后筛选等高质量数据。

蒸馏的数据来源有多种。

1. 在已有数据上做soft distribution：在外部数据$\mathcal{D}=\{(x,y)\}$上，让teacher对每个前缀做$\pi_T(\cdot|x,y_{<t})$，让student在$(x,y_{<t})$状态下学习这个分布。
2. teacher 先生成答案，再蒸馏：$x$来自外部数据，$y$来自teacher生成，仍然是teacher计算分布，让student学习分布。
3. 广义的蒸馏：$x$来自外部数据，$y$来自teacher生成，但不再计算分布，直接拿这些$(x,y)$去SFT

## 离线蒸馏的问题在哪

最大的问题是**分布偏移**。SFT和离线蒸馏都有这个问题，他们训练数据的前缀$(x,y_{<t})$中的$y_{<t}$来自外部或者teacher模型。但推理时的$y_{<t}$将来自student模型，student推理时容易遇到训练时没见过的情况。

# OPD (On-policy distillation，在线蒸馏)

OPD的loss是：$\mathcal{L}_{OPD}=\mathbb{E}_{x\sim\mathcal{D},y\sim\pi_\theta}\left[\sum_tD_{KL}\left(\pi_\theta(\cdot|x,y_{<t})\|\pi_T(\cdot|x,y_{<t})\right)\right]$

它和离线蒸馏的loss区别是，$y$来自$\pi_\theta$而非$\mathcal{D}$，且KL散度从正向的换成的反向的。

## OPD如何解决训推不一致

OPD 的核心思想是：不要只在固定的数据轨迹上蒸馏，而是让 student 当前策略自己生成：$\hat{y}\sim \pi_\theta(\cdot|x)$。于是训练状态变成：$hat{s}_t=(x,\hat{y}_{<t})$，也就是 student 自己真实会走到的状态。然后在这些状态上，让 teacher 给出 next-token distribution：$\pi_T(\cdot|\hat{s}_t)$，用于指导蒸馏训练。

## OPD对比离线蒸馏/RL的好处

| 维度           | 离线蒸馏 KD            | 强化学习 RLHF      | 在线策略蒸馏 OPD   |
| -------------- | ---------------------- | ------------------ | ------------------ |
| **数据来源**   | 固定离线语料           | 学生采样轨迹       | 学生采样轨迹       |
| **监督粒度**   | token 概率分布         | 标量奖励 R         | token 概率分布     |
| **KL 方向**    | 前向 KL（覆盖）        | 反向KL，仅做约束项 | 反向 KL（选峰）    |
| **训练稳定性** | 高，但有分布偏移       | 低，方差大         | 高，信号密集       |
| **样本效率**   | 中等                   | 低                 | 高                 |
| **典型代价**   | 学生超出训练分布即失效 | 需奖励模型 RM      | 需教师在线推理算力 |

# 附录

## KL散度是啥

$D_{KL}$ 是KL散度，它的定义是：
$$
D_{KL}(P\|Q)=\mathbb{E}_{x\sim P}\left[\log P(x)-\log Q(x)\right]=\sum_xP(x)\log\frac{P(x)}{Q(x)}
$$
它主要惩罚“$P(x)$大的地方，$Q(x)$不足够大”。当$P$和$Q$是两个模型在某个状态下的输出下一个token的概率分布的时候，KL散度能够衡量“这两个模型的输出分布像不像”。

## 两种经典的KL散度

1. **Forward KL：**

   $D_{KL}(\pi_T\|\pi_\theta)$，teacher在前，student在后，蒸馏/OPD用的就是forward KL。它强调“teacher 给到高概率的选项，student都必须给高概率”。mode-covering、多样性

2. **Reverse KL：**

   $D_{KL}(\pi_\theta\|\pi_T)$，student在前，teacher在后。它强调“teacher 给到低概率的地方，student 必须都给低概率”。mode-seeking、准确性

> Forward KL 适合蒸馏，适合“学 teacher”，因为它要求 student 覆盖 teacher 认为高概率的输出。离线蒸馏技术一般用它。
>
> Reverse KL 适合 RL 里的 policy regularization以及OPD。它不会要求新策略保留 reference 的所有模式，而是主要限制新策略不要把概率放到 reference 几乎不支持的区域。因此它允许模型根据 reward 把概率从低 reward 但原本合理的输出，转移到高 reward 且 reference 也支持的输出上。

## 其他的变种KL散度

1. **JS 散度：**

   把Forward和Reverse均衡一下，$JS(P\|Q)=\frac{1}{2}KL(P\|M)+\frac{1}{2}KL(Q\|M)$，其中$M=\frac12(P+Q)$

2. **Alpha散度：**

   思想类似JS散度，但可以通过参数$\alpha$调整”更偏向Forward还是Reverse

3. **Skew KL散度：**

   student rollouts的轨迹$y$可能非常烂，没得救了。所以改成在 mixed (teacher + student)的轨迹上训练

# 参考资料

1. [【研3基本功+1】你难道还没学过 OPD 吗？（On-policy distillation 基础知识）](https://www.bilibili.com/video/BV1y1LJ6ME9u)
2. [从RL到OPD：Qwen3、GLM-5、DeepSeek都在关注什么？](https://www.bilibili.com/video/BV1bNGz6xEQf)
