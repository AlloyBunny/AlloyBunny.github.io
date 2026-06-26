---
title: Adam和AdamW
published: 2026-06-24
tags:
  - LLM
  - 优化器
draft: false
---
参考视频：[十分钟搞明白Adam和AdamW，SGD，Momentum，RMSProp，Adam，AdamW](https://www.bilibili.com/video/BV1NZ421s75D/?share_source=copy_web&vd_source=7e010f16494955c14fbe8ca810a7c74e)

# 从指数加权平均讲起

一家商店，前六天收入分别是$[100, 114, 118, 117, 120, 122]$，如何预测第7天的收入？一种做法是算6天平均，但考虑到“距离今天越近的日子，收入参考意义越大”，考虑只用指数加权平均。

记$V_0=0, \beta=0.7$，第$i$天收入为$x_i$，递推式为$V_i=\beta V_{i-1}+(1-\beta)x_i$，最终得到的$V_t$作为预测值。这里算第7天收入，所以是$V_7$。

展开递推式发现每个$x_i$的权重为$w_i=(1-\beta)\beta^{t-i}$，进而有$\Sigma w_i=1-\beta^t$，总权重是小于1的，需要修正。所以应该使用$V_t^{correct}=\frac{V_t}{1-\beta^t}$作为修正后的正确的预测值。

# 从SGD的问题到Momentum的提出

SGD的问题是，学习率大的时候，梯度方向会不断改变（比如某个参数$b$的梯度$g_b$频繁地呈现“正、负、正、负”的变化），就产生了震荡，训练不稳定。Momentum的思想就是给梯度做一个指数平均，用指数平均值去更新。

举个例子，神经网络有两个参数，$w$和$b$，梯度分别是$g_{w}=\frac{\partial L}{\partial w},g_{b}=\frac{\partial L}{\partial b}$，取$\beta=0.9$，计算$w$和$b$的指数平均值：
$$
V_{w}=\beta V_{w}+(1-\beta)g_{w}\\V_{b}=\beta V_{b}+(1-\beta)g_{b}
$$
然后用这俩去更新$w$和$b$：
$$
w_{t+1}=w_{t}-rV_{w}\\b_{t+1}=b_{t}-rV_{b}
$$

# RMSProp算法

RMSProp算法的动机是：1）不同参数的梯度尺度差异很大 2）同一个参数，不同时期的梯度尺度差异也很大。所以要给学习率做修正，它做的是：
$$
S_w=\beta S_w+(1-\beta)g_w^2\\S_b=\beta S_b+(1-\beta){g_b}^2
$$
更新$w$和$b$：
$$
w_{t+1}=w_{t}-r\frac{g_{w}}{\sqrt{S_{w}}+\varepsilon}\\b_{t+1}=b_{t}-r\frac{g_{b}}{\sqrt{S_{b}}+\varepsilon}
$$
等效于把$w$有效学习率设为$\frac{r}{\sqrt{S_{w}}}$，$b$同理。

# Adam和AdamW

Adam算法是Momentum和RMSProp的结合，对于参数$w$和两个系数$\beta_1=0.99$和$\beta_2=0.999$，它计算：
$$
\begin{aligned}&g_{w}=\frac{\partial L}{\partial w}\\&V_{w}=\beta_{1}V_{w}+(1-\beta_{1})g_{w}\\&S_{w}=\beta_{2}S_{w}+(1-\beta_{2})g_{w}{}^{2}\\&V_{w}^{correct}=\frac{V_{w}}{1-\beta_{1}{}^{t}}\\&S_{w}^{correct}=\frac{S_{w}}{1-\beta_{2}{}^{t}}\\&w_{t+1}=w_{t}-r\frac{V_{w}^{correct}}{\sqrt{S_{w}^{correct}}+\varepsilon}\end{aligned}
$$
按照更常见的写法，往往可以写成：
$$
w_{t+1}=w_{t}-r\frac{\hat{m}_t}{\sqrt{\hat{v}_t}+\varepsilon}
$$
其中$\hat{m}_t$称为 一阶矩估计/一阶矩/一阶动量，$\hat{v}_t$称为 二阶矩估计/二阶矩/二阶动量。

而AdamW仅仅是在Adam基础，为了防止参数越变越大，额外减去一个weight decay，得到：
$$
w_{t+1}=w_{t}-r\frac{\hat{m}_t}{\sqrt{\hat{v}_t}+\varepsilon}-r\lambda w_t
$$
Adam/AdamW计算过程中，需要保存$m_t$和$v_t$这两个值，这俩数要保持高精度，需要用float32位来存储。如果参数用float16存储，这两个值占用大小将是参数大小的4倍，所以Adam/AdamW很占显存空间。
