---
layout: post
title: linux配置rclone上传文件到google drive
tags: [手册]
---

 压缩和上传

```bash
# 压缩
tar -cf - ablation_and_analysis individual_memory inference_en inference_zh inference_scripts profile utils .env README.md | pigz -9 > PerESC_inference.tar.gz

# 上传
rclone copy PerESC_inference.tar.gz gdrive:/ \
  --progress \
  --transfers=1 \
  --checkers=1 \
  --retries=200 \
  --low-level-retries=500 \
  --retries-sleep=10s \
  --timeout=5m \
  --drive-chunk-size=64M \
  --tpslimit=2 \
  --tpslimit-burst=3 \
  --bwlimit=8M \
  --log-file=/data/zhaiyuxuan/upload.log \
  --log-level=INFO
```

配置方法忘了，下次补