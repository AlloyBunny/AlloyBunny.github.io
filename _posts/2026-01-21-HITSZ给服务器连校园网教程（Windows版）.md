---
layout: post
title: HITSZ给服务器连校园网教程（Windows版）
tags: [手册]
---

（注：本教程仅对windows电脑有效，用mac的同学要把MobaXterm换成XQuartz，原理和操作是类似的）

### Step 1: 下载[MobaXterm](https://mobaxterm.mobatek.net/download-home-edition.html)

![image-20260121205539487](C:\Users\zhaiyuxuan\AppData\Roaming\Typora\typora-user-images\image-20260121205539487.png)

### Step 2: 打开MobaXterm，点击“Start local terminal”

![image-20260121205723922](C:\Users\zhaiyuxuan\AppData\Roaming\Typora\typora-user-images\image-20260121205723922.png)

### Step 3: 在终端中登录服务器并联网

在终端输入

```bash
# Case 1: 如果可以用密码登录，则输入这行（其中10.xxx.xx.xx是服务器ip）
ssh -Y zhaiyuxuan@10.xxx.xx.xx

# Case 2: 如果必须用秘钥登录，则输入这行（-i 后面的换成自己的私钥文件路径）
ssh -Y -i "/drives/C/Users/zhaiyuxuan/.ssh/id_rsa" zhaiyuxuan@10.xxx.xx.xx
```

（补充说明：MobaXterm不支持ctrl+V粘贴，要点击右键粘贴）

### Step 4: 打开firefox，根据提示打开登录页面联网

在终端输入

```bash
firefox
```

加载几秒后，会弹出火狐浏览器界面，点击“打开网络登录页面”即可进入统一身份认证页面，随后完成登录即可

![image-20260121210635672](C:\Users\zhaiyuxuan\AppData\Roaming\Typora\typora-user-images\image-20260121210635672.png)



END