---
title: LLM中的参数精度与量化的基础知识
published: 2026-06-26
tags:
  - pytorch
  - 基础知识
draft: false
---
# LLM中常见的参数精度

最常见的是：FP32, FP16, BF16, INT8, INT4，各自的主要用途见下表。

| 格式 | LLM 中最典型的用途                    |
| ---- | ------------------------------------- |
| FP32 | 优化器状态、数值敏感计算、基准高精度  |
| FP16 | 混合精度训练、推理                    |
| BF16 | 现代 LLM 训练和模型参数存储的主流格式 |
| INT8 | 低显存推理、部分低精度训练            |
| INT4 | 大幅压缩模型，主要用于推理和 QLoRA    |

## 浮点数：FP32, FP16, BF16

浮点数在计算机中一般存储格式为$[s,e,m]$，表示：$x=(-1)^s\times m\times2^e$。

**FP32**也叫32位浮点数，是PyTorch中的`torch.float`或者`torch.float32`，$[s,e,m]$分配的二进制位数为$[1,8,23]$，占4 bytes，主要用于存储Adam/AdamW的一阶/二阶动量、Softmax的部分内部计算、某些梯度累积、矩阵乘法的累加等。

**FP16**也叫半精度浮点数，是PyTorch中的`torch.float16`或者`torch.half`，$[s,e,m]$分配的二进制位数为$[1,5,10]$，占2 bytes，主要用于混合精度训练、推理。最大的问题在于指数位较少，容易出现上溢（overflow, 大于65504的存不下）和下溢（underflow, 小于1e-8的梯度变成0）。PyTorch中常通过loss scaling的办法解决梯度下溢问题，语法如下：

```python
scaler = torch.amp.GradScaler("cuda") # 创建用于 CUDA 混合精度训练的梯度缩放器
optimizer.zero_grad()
with torch.autocast(device_type="cuda", dtype=torch.float16): # 让 PyTorch 自动选择 FP16 或 FP32 来执行不同运算，比全用 FP16 更加精准
    output = model(x)
    loss = criterion(output, y)
scaler.scale(loss).backward()         # 放大 loss，并反向传播，得到放大后的梯度
scaler.step(optimizer)                # 相当于先还原梯度，再optimizer.step()
scaler.update()                       # 调整下一轮的缩放因子 scale
```

注：scaler的作用仅仅是防止梯度下溢，并不产生其他影响。如果精度足够，理论上用不用scaler是一样的。

**BF16**全名是Brain Floating Point 16，是PyTorch中的`torch.bfloat16`，$[s,e,m]$分配的二进制位数为$[1,8,7]$，占2 bytes，比起FP16，它的精度更大，但表示范围更大，因此不容易出现上溢和下溢，所以一般也用不上loss scaling。

补充知识点：LLM训练时有反向传播，因此有大量微小梯度，容易出现下溢问题，所以用BF16或者FP16+loss scaling；而推理时没有反向传播，所以直接用BF16或者FP16，不需要loss scaling。

## 整数：INT8, INT4

**INT8** 是 8 位有符号整数，范围是 -128~127。它通过量化方式“映射到”FP16或者FP32。

假设一组FP16或者FP32权重的范围是$x\in[-a,a]$，将INT8取对称范围$q\in[-127,127]$，定义scale为$s=\frac a{127}$，定义以下两个操作：

- **量化（x to q）：**$q = round(\frac{x}{s})$
- **反量化（q to x）：**$\hat{x}=sq$，由于反量化是有精度损失的，所以这里用$\hat x$而非$x$表示

**INT4** 是 4 为有符号整数，范围是 -8~7。和 INT8 类似，不再赘述。

另外讲一下per-tensor、per-channel、per-group 量化，他们分别表示：同一个权重矩阵/同一个输出通道/同一个组共享一个scale，scale数量逐个增多，量化误差逐个减小。

### 常见的几种量化方式

- W4A16：权重 INT4，激活 FP16/BF16；
- W8A16：权重 INT8，激活 FP16/BF16；
- W8A8：权重 INT8，激活 INT8；
- W4A8：权重 INT4，激活 INT8；
- FP8 W8A8：权重和激活都使用 FP8。

下面以W8A16和W8A8为例讲解。

W8A16是**Weight-only quantization**，它只量化权重$W$，不量化输入$X$，计算方式是$Y\approx X(s_WQ_W)^T$，也就是先反量化，再计算乘积。但实际实现的时候不会完整计算$s_WQ_W$，而是每次只计算一部分，与$X$的对应部分完成计算后，就立刻扔掉这部分，算下一部分。

W8A8是**Weight + activation quantization**，它是同时量化权重权重$W$和输入$X$，计算方式是$Y\approx s_Xs_W(Q_XQ_W^T)$，也就是先计算两个量化结果的乘积，乘积结果存储为 INT32，然后再乘上两个scale，转成bf16/fp16。这么做是为了不需要做 bf16 乘 bf16 这样的昂贵计算，加快运算速度。
