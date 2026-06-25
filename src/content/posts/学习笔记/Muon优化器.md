---
title: Muon优化器
published: 2026-06-25
tags:
  - LLM
  - 优化器
  - ds-v4技术
draft: false
---

本文参考了[Muon的官方博客](https://kellerjordan.github.io/posts/muon/)

# 前置知识：SVD（奇异值分解）

参考视频：[【无痛线代】彻底搞懂SVD！矩阵究竟怎么就奇异了？](https://www.bilibili.com/video/BV1XcfiBeEwQ/?share_source=copy_web&vd_source=7e010f16494955c14fbe8ca810a7c74e)

SVD的公式是$A=U\Sigma V^T$，其中：

- $U$称为左奇异矩阵，$V$称为右奇异矩阵，$\Sigma$奇异值对角矩阵
- $U$和$V$是正交矩阵，满足$UU^T=I和VV^T=I$，$\Sigma$是对角矩阵，它只有主对角线上有非零值。

SVD的几何直觉理解可以表述为，任何一个矩阵$A$，都等效于一个三步的线性变换，具体来说，$Ax$可以拆成：

1. **坐标分解：**$V^Tx$，计算$x$在由$V$的列向量组成的正交基底下的坐标。
2. **沿坐标轴缩放：**$\Sigma V^Tx$，把上述坐标在坐标轴方向进行拉伸变换，第$i$个分量乘上奇异值$\sigma_{i}$。
3. **在输出基底中合成：**$U\Sigma V^Tx$，把拉伸后的新坐标看作由 $U$ 的列向量组成的基底下的坐标，再乘 $U$，将其合成为标准坐标系下的最终输出向量$Ax$。

特征值分解中似乎也有类似的东西，$P^{-1}x$是求$x$在$P$的坐标系下是什么，$\Lambda$是给变换后的坐标在坐标系轴的方向上拉伸，再乘$P$是把$\Lambda P^{-1}x$从$P$坐标系下的坐标转化成原坐标系的坐标。

# Muon的动机——Adam有啥问题

1. Adam要同时保存一阶矩和二阶矩，占显存特别多
2. Adam的动量（即一阶矩）往往是近似低秩的，导致更新主要集中在少数奇异方向，而多数方向上更新很慢

注：第二点中讲到近似低秩是：动量$M$进行SVD分解$M=U\Sigma V^T$之后，$\Sigma$只有前几个奇异值比较大。

# Muon咋做的

对于动量$B$，Muon试图找到：
$$
\mathrm{Ortho}(M)=\mathrm{argmin}_O\left\{\|O-M\|_F\right\}\\\mathrm{subject~to~}OO^\top=I\mathrm{~or~}O^\top O=I
$$
理论推导得到的结论是：如果用SVD把$M$分解为$M=U\Sigma V^T$，那么$\mathrm{Ortho}(M)=UV^T$。具体推导这里不细讲。

完整的执行流程如下图（官方给的伪代码），图中的$B$就是前面讲到的动量$M$，$O$就是$\mathrm{Ortho}(M)$。

![image](https://kellerjordan.github.io/images/muon/muon_algo.png)

从图中可以看出：

1. Muon也用了类似Adam/AdamW的动量，但没有用二阶矩。如果用一个式子来表示Muon，那就是$\theta_t\leftarrow\theta_{t-1}-\eta \mathrm{Ortho}(M_t)$

2. $\mathrm{Ortho}(M_t)$的计算方法并不是SVD分解，而是使用Newton-Schulz算法来近似，它的伪代码是：

   ```python
   # Pytorch code
   def newtonschulz5(G, steps=5, eps=1e-7):
       assert G.ndim == 2
       a, b, c = (3.4445, -4.7750, 2.0315)
       X = G.bfloat16()
       X /= (X.norm() + eps)
       if G.size(0) > G.size(1):
           X = X.T
       for _ in range(steps):
           A = X @ X.T
           B = b * A + c * A @ A
           X = a * X + B @ X
       if G.size(0) > G.size(1):
           X = X.T
       return X
   ```

   具体原理我没学，不讲。但总之它的作用就是可以计算$\mathrm{Ortho}(M_t)$，这样计算开销比SVD小很多。

补充：官方给的伪代码只讲了简单实现，实际的工程实现中，Muon还会对$\mathrm{Ortho}(M_t)$乘一个系数进行缩放，并且也有Weight Decay。

# 总结

- AdamW = Momentum + RMSProp + Weight Decay
- Muon = Momentum + 动量矩阵正交化/奇异值展平 + Weight Decay

AdamW 对每个参数做基于一阶矩和二阶矩的逐元素自适应缩放，但它的更新矩阵可能出现奇异值谱集中，即更新主要集中在少数奇异方向。Muon 对 momentum 矩阵做正交化，把非零奇异值展平，使更多矩阵方向得到有效更新。同时，Muon 通常只需要保存一个 momentum 状态，因此比 AdamW 更省优化器显存。
