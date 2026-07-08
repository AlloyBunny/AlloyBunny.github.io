---
title: 现代LLM机制（QK-Norm、MLA、DSA）学习
published: 2026-07-07
tags:
  - LLM
draft: false
---
参考视频：

- [【2026】架构密码？开年模型架构解读与机制科普：SWA、DSA、DeltaNet](https://www.bilibili.com/video/BV1axcQznEQK)
- [DeepSeek-v2 MLA 原理讲解](https://www.bilibili.com/video/BV1BYXRYWEMj)
- [The Big LLM Architecture Comparison](https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison)

# QK-Norm（Minimax的技术）

动机：防止$q$和$k$的模长在训练过程中逐渐变大导致的attention logit ($QK^\top$)尺度变大，使得 softmax 过度尖锐、注意力塌缩，从而提升训练稳定性。

做法：在计算$QK^\top$之前，先给$Q$和$K$过一层RMSNorm（也是和$\text{RMSNorm}(x)$一样是token level的），把$Q$和$K$的尺度调整到合适范围再算点积。

# MLA（DeepSeek-V2的技术）

动机：KV Cache占用太多显存。之前的工作GQA通过减小KV heads数量来减少KV Cache，但它占用的显存仍然较多，且会显著影响性能。而MLA打算用另一种方法来解决这个问题，更省显存的同时，不降低性能甚至提升性能。

做法：借鉴LoRA的思想，我们认为$W^Q$, $W^K$和$W^V$矩阵都是低秩的，可以通过两个矩阵相乘来近似表示：
$$
\begin{aligned}
W^Q &≈ W^{DQ}W^{UQ} \\
W^K &≈ W^{DKV}W^{UK} \\
W^V &≈ W^{DKV}W^{UV}
\end{aligned}
$$
于是MLA中的Q、K、V计算变为：
$$
\begin{aligned}
Q &= XW^{DQ}W^{UQ} \\
K &= XW^{DKV}W^{UK} \\
V &= XW^{DKV}W^{UV}
\end{aligned}
$$
其中，我们把$C^{KV}=XW^{DKV}$称为压缩K/V的**隐特征**，把$C^{KV}$作为新的KV Cache，以此减少KV Cache的空间占用。用同样的方法可以计算$C^{Q}=XW^{DQ}$。

实际计算attention logit时，我们需要计算：
$$
\begin{aligned}attention&=softmax(\frac{QK^{T}}{\sqrt{d}})V\\&=softmax(\frac{C^{Q}W^{UQ}(C^{KV}W^{UK})^{T}}{\sqrt{d}})V\\&=softmax(\frac{C^{Q}W^{UQ}W^{UK^{T}}C^{KV^{T}}}{\sqrt{d}})V\end{aligned}
$$
注意最后一步的$W^{UQ}W^{UK^{T}}$是固定的，因此可以提前计算好（矩阵乘法有结合律），记为$W^{QUK}$。于是有：
$$
attention=softmax(\frac{C^{Q}W^{QUK}C^{KV^{T}}}{\sqrt{d}})V
$$
同理，用于给$V$升维的$W^{UV}$也可以和后面的$W^O$进行结合，提前计算出$W^{UVO}$。这里的提前计算$W^{QUK}$和$W^{UVO}$是MLA里重要的**吸收（absorb）**思想。以$W^{QUK}=W^{UQ}W^{UK^{T}}$举例，计算过程是先升维后降维的，提前计算它能显著减小计算量，避免多次进行大维度矩阵相乘计算。

## RoPE咋办？

如果考虑旋转位置编码(RoPE)，发现$q_ik_j^T$会变为：
$$
\begin{aligned}q_{i}R_{i}(k_{j}R_{j})^{T}&=c_i^QW^{UQ}R_i(c_j^{KV}W^{UK}R_j)^T\\&=c_i^QW^{UQ}R_iR_j^TW^{UK^T}c_j^{KV^T}\end{aligned}
$$
这里的$R_i$和$R_j$都是和token位置相关的，不是固定的，它破坏了$W^{QUK}=W^{UQ}W^{UK^{T}}$的融合，咋办？

DeepSeek最终采用的方案是，把Q和K拆成有位置编码的和没有位置编码的两部分。没有位置编码的部分就按之前的方法算$q_i^C=x_iW^{DQ}W^{UQ}$和$k_i^C=x_iW^{DKV}W^{UK}$，有位置的编码部分单独算。具体来说，在Attention层中额外引入两个矩阵$W^{QR}$和$W^{KR}$，用于计算$q_i^R=xW^{QR}$和$k_i^R=xW^{KR}$。$k^R=[k_0^R, k_1^R, ...]$也加入KV Cache中，因为它也要被多次使用。

最后，实际的$q$和$k$是：$q_i=[q_i^C;q_i^R]$和$k_i=[k_i^C;k_i^R]$，即两部分concat。实际计算attention score的时候是：
$$
\begin{aligned}q_ik_j^T&=[q_i^C;q_i^R][k_j^C;k_j^R]^T\\&=q_i^C(k_j^C)^T+q_i^R(k_j^R)^T\\&=(C_i^QW^{UQ})(C_j^{KV}W^{UK})^T+(q_i^RR_i)(k_j^RR_j)^T\\&=C_i^QW^{UQ}W^{UK^T}C_j^{KV^T}+q_i^RR_iR_j^Tk_j^{R^T}\\&=C_i^QW^{QUK}C_j^{KV^T}+q_i^RR_{i-j}k_j^{R^T}\end{aligned}
$$
其中$q_i^RR_{i-j}k_j^{R^T}$实际上仍然没法简化运算，但$q_i^R$和$k_i^R$的维度相对较小，所以运算开销不怎么大。

# DSA（DeepSeek-V3.2的技术）

动机：Attention计算太慢了，尤其是推理的时候，如果上下文长度是$n$，那么每个next token prediction都是$O(n)$的，总复杂度是$O(n^2)$，我们想加快它。

做法：提出一个$I^t=\mathrm{Indexer}(q_t,K)$，筛选$m$个k（$m\ll n$)，Attention里只计算$m$个$q_i k_j^T$，这样总的时间复杂度就降低到$O(mn)$了。

其中$I^t$是由$t$个$I^{t,s}=\sum_{j=1}^{n_h}w_t\operatorname{ReLU}(q_{t,j} k_{s,j}^T)$组成的list，这里的$n_h$是num of heads。

这个思想很像搜索系统里的**召回→排序**，是一种先粗筛，再精排的想法。

## DSA为什么能work？

因为Attention 本身具有稀疏性，有大量的权重约等于0，对结果几乎没有贡献。DSA相当于通过把小权重直接视为0，不去计算它来简化运算。

## Indexer咋训的？

*以下仅为一个大致的理论近似，不是精准做法。*

用一种类似蒸馏的做法，teacher是完整Attention，student是Indexer，我们希望$\mathrm{Softmax}(I^t)=\mathrm{Softmax}(\mathrm{Indexer}(q_t,K))$的分布能尽可能逼近$p^t=\mathrm{Softmax}(q_t K^T)$的分布。训练是两阶段的，Stage 1是Dense Warm-up，它优化整个分布：
$$
L^I=\sum_t D_{\mathrm{KL}}\left(p^{t,:},\mathrm{Softmax}(I^{t,:})\right)
$$
Stage 2是Sparse Stage，它优化top-k的分布：
$$
L^I=\sum D_{\mathrm{KL}}\left(p^{t,S^t},\mathrm{Softmax}(I^{t,S^t})\right)
$$
其中$S^t=\mathrm{TopK}(I^t)$，即Indexer选出的top-k（而非实际的top-k）。
