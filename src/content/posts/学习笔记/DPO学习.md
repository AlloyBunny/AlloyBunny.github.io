---
title: DPO学习
published: 2026-07-21
tags:
  - LLM
  - DPO
draft: false
---

# DPO

DPO给定prompt $x$, chosen response $y_w$和rejected response $y_l$，希望模型学习在输入$x$时输出$y_w$，不要输出$y_l$。它的loss函数是：
$$
L_{DPO}=-\log\sigma\left(\beta\left[\log\frac{\pi_\theta(y_w|x)}{\pi_{ref}(y_w|x)}-\log\frac{\pi_\theta(y_l|x)}{\pi_{ref}(y_l|x)}\right]\right)
$$
令其中$\Delta=\log\frac{\pi_\theta(y_w|x)}{\pi_{ref}(y_w|x)}-\log\frac{\pi_\theta(y_l|x)}{\pi_{ref}(y_l|x)}$，DPO希望$\Delta$增大，即希望$\frac{\pi_\theta(y_w)}{\pi_{ref}(y_w)}>\frac{\pi_\theta(y_l)}{\pi_{ref}(y_l)}$。

# DPO的变体

## KTO

有些偏好数据可能只有$x$和$y_w$，或者只有$x$和$y_l$，希望把他们利用起来。KTO的数据格式是：

```
(x,y,label)

label:
  good
  bad
```

它令$z=\beta\log\frac{\pi_\theta(y|x)}{\pi_{ref}(y|x)}$，然后根据label来决定loss中z的正负：
$$
L=\begin{cases}-\log\sigma(z),&good\\-\log\sigma(-z),&bad&\end{cases}
$$
可以看到，其实KTO的loss就是DPO的loss的一部分，如果是good，就是$y_w$那部分；如果是bad，就是$y_l$那部分。

## CPO

它认为不需要reference model，直接$L_{contrative}=-\log\sigma(\beta(\log\pi_\theta(y_w)-\log\pi_\theta(y_l)))$，然后：
$$
L=-\log\sigma(\beta(\log\pi_\theta(y_w)-\log\pi_\theta(y_l)))
$$
加SFT loss是为了防止$\pi_\theta(y_w)$和$\pi_\theta(y_l)$都降低，但$\log\pi_\theta(y_w)-\log\pi_\theta(y_l)$增大的情况（这种情况我们不希望遇到）。加SFT loss能强制让$\pi_\theta(y_w)$增长。

问题：没有reference model，数据集覆盖不到的能力容易退化。
