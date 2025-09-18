---
layout: post
title: 用ms-swift框架进行SFT、DPO训练
tags: [经验]
---

### 需求

在4×4090 24GB的服务器上，对7~8B量级的LLM进行SFT、DPO训练，要求框架使用简单，支持的模型种类多。

### 踩过的坑

1. 一开始尝试用llama-factory，跑通了官方examples中的`llama3-8B-Instruct`的DPO训练，也跑通了`qwen3-8B`，但是跑`qwen2.5-7B-Instruct`的时候遇到了[loss不下降的问题](https://github.com/hiyouga/LLaMA-Factory/issues/8981)，尝试解决没有成功。
2. 后来用unsloth，这个需要自己写代码，我太菜了，写的代码总是跑不通，失败了。

### ms-swift简介

[ms-swift](https://github.com/modelscope/ms-swift/tree/main)是魔搭社区提供的LLM/MLLM微调部署框架，支持主流的多种训练/微调方法，[支持的模型](https://swift.readthedocs.io/zh-cn/latest/Instruction/%E6%94%AF%E6%8C%81%E7%9A%84%E6%A8%A1%E5%9E%8B%E5%92%8C%E6%95%B0%E6%8D%AE%E9%9B%86.html)也很多。

### 用ms-swift框架SFT训练

官方Github仓库提供了[基于lora的SFT脚本](https://github.com/modelscope/ms-swift/blob/main/examples/train/lora_sft.sh)，我改了一些地方——手动指定val_dataset，以及调整上下文长度为8192（调整后需要双卡）

```bash
export NCCL_P2P_DISABLE="1" # RTX4090要加这两行
export NCCL_IB_DISABLE="1"
CUDA_VISIBLE_DEVICES=0,1 \
swift sft \
    --model /data/zhaiyuxuan/models/Qwen2.5-7B-Instruct \
    --train_type lora \
    --dataset "/data/zhaiyuxuan/swift/dataset/sage+/train_sft.jsonl" \
    --val_dataset "/data/zhaiyuxuan/swift/dataset/sage+/validation_sft.jsonl" \
    --torch_dtype bfloat16 \
    --num_train_epochs 10 \
    --per_device_train_batch_size 1 \
    --per_device_eval_batch_size 1 \
    --learning_rate 5e-5 \
    --lora_rank 8 \
    --lora_alpha 32 \
    --target_modules all-linear \
    --gradient_accumulation_steps 8 \
    --eval_steps 50 \
    --save_steps 50 \
    --save_total_limit 100 \
    --logging_steps 5 \
    --max_length 8192 \
    --output_dir output/sft2/Qwen2.5-7B-Instruct \
    --warmup_ratio 0.05 \
    --dataloader_num_workers 4 \
    --model_author zhaiyuxuan \
    --model_name qwen2.5-7b-Instruct-sft2 \
    --ddp_find_unused_parameters false
```

### 用ms-swift框架DPO训练

[官方文档](https://swift.readthedocs.io/zh-cn/latest/Instruction/%E4%BA%BA%E7%B1%BB%E5%AF%B9%E9%BD%90.html#dpo)中提供了[基于lora的DPO脚本](https://github.com/modelscope/ms-swift/blob/main/examples/train/rlhf/dpo/lora.sh)，只需要24GB的单卡就能训练，刚好是一张4090。示例脚本中用的模型恰好就是`qwen2.5-7B-Instruct`，所以我几乎是直接拿过来就直接用了。以下是我的脚本

```bash
CUDA_VISIBLE_DEVICES=0 \
swift rlhf \
    --rlhf_type dpo \
    --model /data/zhaiyuxuan/models/Qwen2.5-7B-Instruct-sft \
    --train_type lora \
    --dataset dataset/sage+/train_dpo.jsonl \
    --val_dataset dataset/sage+/val_dpo.jsonl \
    --torch_dtype bfloat16 \
    --num_train_epochs 15 \
    --per_device_train_batch_size 1 \
    --per_device_eval_batch_size 1 \
    --learning_rate 5e-5 \
    --lora_rank 8 \
    --lora_alpha 32 \
    --target_modules all-linear \
    --gradient_accumulation_steps 16 \
    --eval_steps 50 \
    --save_steps 50 \
    --save_total_limit 50 \
    --logging_steps 5 \
    --max_length 8192 \
    --output_dir output/dpo/Qwen2.5-7B-Instruct-sft \
    --warmup_ratio 0.05 \
    --dataloader_num_workers 4 \
    --rpo_alpha 0.1 \
    --dataset_num_proc 4
```

### 自定义数据集

[脚本](https://github.com/modelscope/ms-swift/blob/main/examples/train/rlhf/dpo/lora.sh)中我唯一需要修改的地方是数据集，官方文档也给出了[自定义数据集的方法](https://swift.readthedocs.io/zh-cn/latest/Customization/%E8%87%AA%E5%AE%9A%E4%B9%89%E6%95%B0%E6%8D%AE%E9%9B%86.html)。原文有些长，我这里讲讲我用的最简单的做法。

以DPO的数据集为例，首先将数据集整理成如下的jsonl格式（这里只展示了jsonl的一项）：

```json
{
    "messages": [
        {
            "role": "user",
            "content": "最近有些事搞得我头大，张浩那个态度，真让我摸不着头脑。"
        },
        {
            "role": "assistant",
            "content": "听起来你在和张浩的互动中遇到了些挑战。这样的情况..."
        },
        {
            "role": "user",
            "content": "对啊，他老是对未来的事模棱两可，真是搞不懂。你觉得他这么做是啥意思？"
        },
        {
            "role": "assistant",
            "content": "确实能感觉这挺让你头痛..."
        }
    ],
    "rejected_response": "这种情况挺常见的，在人际交往中有种不确定性..."
}
```

要注意的是，"messages"的最后一项是chosen，它的"role"必须为assistant。而rejected写在"rejected_response"。

然后把[基于lora的DPO脚本](https://github.com/modelscope/ms-swift/blob/main/examples/train/rlhf/dpo/lora.sh)里的

```bash
--dataset hjh0119/shareAI-Llama3-DPO-zh-en-emoji
```

改成

```bash
--dataset /path/to/your/dataset.jsonl
```

就ok了。

### 补充：ms-swift的安装和环境搭建

参考[github文档](https://github.com/modelscope/ms-swift/blob/main/README_CN.md#%EF%B8%8F-%E5%AE%89%E8%A3%85)和[官方文档](https://swift.readthedocs.io/zh-cn/latest/GetStarted/SWIFT%E5%AE%89%E8%A3%85.html)，我的安装流程如下：

```bash
conda create -n swift python=3.10 # 官方推荐3.10
conda activate swift
pip install torch==2.6.0 torchvision==0.21.0 torchaudio==2.6.0 --index-url https://download.pytorch.org/whl/cu124 # 官方推荐的2.7.1只有cu118和cu126，但我是cu124的，所以安装有cu124的2.6.0版本
pip install 'ms-swift' # 安装ms-swift

# 【补充】安装过程可能遇到问题，可参考以下方法解决（不保证一定有效）
pip install typing-extensions==4.12.2 # 如果遇到typing-extensions版本不兼容，可以尝试装这个版本
pip install sentencepiece pyarrow --only-binary :all: # 这两个包需要编译，如果编译失败，可以安装预编译版本
```

