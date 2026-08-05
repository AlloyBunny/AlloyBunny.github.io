---
title: MLLM音频处理
published: 2026-07-28
tags:
  - LLM
  - 音频
draft: false
---
# Omni模型中的AuT的原理

原本的声音是一个很复杂的波形，它是时间-振幅的一维序列。 AuT的做法是，把一段声音切成很多小窗口（比如每个窗口约 25 ms，相邻窗口间隔 10 ms），每个窗口内的音频做傅里叶变换，把它近似看成很多个正弦波的叠加，然后通过128个滤波器，每个滤波器加权汇总一个特定频段（比如300～400kHz）的能量，得到(T, 128)的二维矩阵（也叫梅尔频谱）。 然后用若干个卷积层对这个二维矩阵进行降采样，降采样后的结果就作为隐藏层表示，输入一个Transformer Encoder，输出得到音频的隐藏表示。

```
一维 waveform（时间-振幅的一维序列）
    ↓ 切成重叠的小窗口
每个窗口约 25 ms，相邻窗口间隔 10 ms
    ↓ 对每个窗口做傅里叶变换
每个时刻对应很多 FFT 频率点
    ↓ 计算各频率的能量
功率频谱
    ↓ 128 个 Mel 滤波器进行加权汇总
每个时刻得到 128 个频带的能量
    ↓ 取对数
Log-Mel Spectrogram，形状约为 (T, 128)
    ↓ Conv2D blocks，时间降采样 8 倍
较短的音频特征序列
    ↓ AuT Transformer Encoder
上下文化的音频隐藏表示
```

# TTS的原理

1. 把文本进行文本规范化（比如“7:30”变成“七点三十分”）和tokenize（“今天下午三点开会”→[Text_184, Text_7302, Text_91, ...]）
2. 一个Transformer Decoder，把文本 token → 语义语音 token
3. Flow Matching模型（或者可能是Diffusion Transformer）把语义语音 token → 梅尔频谱
4. HiFT 类声码器把梅尔频谱变成声波
