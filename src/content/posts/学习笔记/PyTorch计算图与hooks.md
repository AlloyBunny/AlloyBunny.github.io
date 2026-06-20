---
title: PyTorch计算图与hooks
published: 2026-06-20
tags:
  - pytorch
  - 基础知识
draft: false
---
前言：最近在学习[Minimind](https://github.com/jingyaogong/minimind/tree/master)的源码，希望写完一个模块可以做模块测试+debug，偶然了解到了pytorch的hook机制可以做到这个，于是进行学习。

# pytorch计算图

在学习hook之前，得先了解pytorch的计算图机制。下面用一个例子讲解：

```python
import torch

x = torch.tensor(2.0, requires_grad=True)
a = x ** 2
y = 3 * a + 1

print(x.grad) # None，此时还没有梯度
y.backward()  # backward的时候计算梯度
print(x.grad) # tensor(12.)
```

`x.grad`的值等于y对x的导数值（使用链式求导），$\frac{dy}{dx}=\frac{dy}{da}\frac{da}{dx}=3*2x=12$。

这里的`requires_grad=True`表示需要追踪x的梯度，`requires_grad=True`是具有传递性的，x是计算图的叶子节点，会把梯度不断往后传，因此：

```python
print(x.requires_grad) # True
print(a.requires_grad) # True
print(y.requires_grad) # True
```

pytorch默认只保留叶子节点的梯度，所以如果`print(a.grad)`，会输出`None`。如果要保存a的梯度，需要在`y.backward()`之前执行`a.retain_grad()`（注：`retain_grad()`本身也是个hook，后面会讲到）。

`grad_fn`记录的是参数的计算图，这个参数是怎么被计算出来的（只记录最后一次运算），例如：

```python
print(x.grad_fn) # None
print(a.grad_fn) # <PowBackward0 object ...>
print(y.grad_fn) # <AddBackward0 object ...>
```

下面是一个训练模型的例子

```python
optimizer.zero_grad()       # 清空旧梯度

prediction = model(x)       # 前向传播，建立计算图
loss = nn.MSELoss(prediction, target)

loss.backward()             # 沿计算图反向传播，计算梯度
optimizer.step()            # 根据梯度更新参数
```

# pytorch的hook

参考[这个视频](https://www.bilibili.com/video/BV1MV411t7td/)

## 为什么需要hook

### 1. 用来看张量的backward

对于这个例子：

```python
x = torch.tensor(2.0, requires_grad=True)
a = x ** 2
y = 3 * a + 1
```

它在pytorch中会形成两个计算图，一个前向图，一个后向图。前向图是清晰的，我们需要查看前向图中任何一个变量，只需要print一下，比如`print(a)`就可以了，但反向图呢？完整的反向图是：

```
AddBackward0
├── input 0 → MulBackward0
│             ├── input 0 → PowBackward0
│             │             ├── input 0 → AccumulateGrad → x
│             │             └── 内部参数：exponent = 2
│             └── input 1 → None，常数 3
└── input 1 → None，常数 1
```

但我们既看不到它，更无法打印出其中的任何一个值，能看到的只有`y.backward()`之后的`x.grad`。而hook就是解决这个问题的，hook可以：1）打印梯度，2）修改梯度。

### 2. 用来调试、查看一个封装好的模型的数据流（重要）

对于`layer = nn.Linear(4, 8)`这样一个封装好的线性层，如果我们想调试里面的数据，可能需要进入`nn.Linear`里写print，会很麻烦。但有了hook，就可以在调用线性层对象的时候使用以下这段代码来调试：

```python
def forward_hook(module, inputs, output):
    print("module:", module)
    print("inputs:", inputs)
    print("output:", output)
    
handle = layer.register_forward_hook(forward_hook)
```

## 张量上的hook

```python
x = torch.tensor(2.0, requires_grad=True)
a = x ** 2

def a_hook(grad):
	print(grad)
	return grad
a.register_hook(a_hook) # 给a注册a_hook
a.retain_grad()         # 给a保存梯度，这也是个hook

y = 3 * a + 1

def y_hook(grad):
  new_grad = grad+2
	print(new_grad)
	return new_grad
y.register_hook(y_hook)
y.retain_grad()

y.backward() # 反向传播的同时，会先后执行print(y.grad)和print(a.grad)，打印出3和9

print(x.grad)  # 36
```

在上面这个例子中，我们给a和y各注册了一个hook。前向计算的顺序是x→a→y，而在`y.backward()`反向计算的时候，计算顺序是y→a→x，对于每个反向图节点，计算顺序是：获取输入梯度→执行对应参数的hooks→输出新的梯度值到下一个节点。

具体来说，`y.backward()`的时候，首先有`y.grad=1`，然后执行`y_hook`，修改`y.grad=3`并打印出3，然后传到a，$3*\frac{dy}{da}=9$，所以`a.grad=9`，然后执行`a_hook()`打印出9，最后传到x，算出`x.grad=36`。

注意：

1. 一个变量可以注册多个hooks，执行顺序就是注册顺序，如果一个hook是+=2，一个是\*=2，那么谁先注册会影响最终结果
2. 但`retain_grad()`特殊，它永远保存最终的grad值，放在前面和后面都没区别。
3. 在hook中，不要in-place地修改梯度，容易引发副作用，详见视频的 13:17～15:12 

## nn.Module上的hook

这里我们只学nn.Module上的forward hook，看下面这个例子：

```python
class SumNet(nn.Module):
	def __init__(self):
		super(SumNet, self).__init__()
	
	@staticmethod
	def forward(a, b):
		return a + b

def forward_pre_hook(module, inputs):
	a, b = inputs
	return a+10, b

def forward_hook(module, inputs, output):
	return output * 2
	
if __name__ == '__main__':
	sumnet = SumNet()
	sumnet.register_forward_pre_hook(forward_pre_hook)
	sumnet.register_forward_hook(forward_hook)
	
	a = torch.tensor(1.0, requires_grad=True)
	b = torch.tensor(2.0, requires_grad=True)

	c = sumnet(a, b) # 将先后执行：forward_pre_hook, sumnet.forward, forward_hook
	print(c)         # tensor(26.)
```

真正使用nn.Module的forward hook的时候，最实用的其实是用它来做打印调试，看下面这个例子：

```python
import torch

def make_debug_hook(name): # 这可以看作一个debug工具函数，封装多一层是为了方便打印name
    def hook(module, inputs, output):
        x = output[0] if isinstance(output, tuple) else output

        if not isinstance(x, torch.Tensor):
            print(f"{name}: {type(output).__name__}")
            return

        x_float = x.detach().float()

        print(
            f"{name:25s}"
            f" shape={tuple(x.shape)}"
            f" mean={x_float.mean().item():.4f}"
            f" std={x_float.std().item():.4f}"
            f" max={x_float.abs().max().item():.4f}"
            f" finite={torch.isfinite(x_float).all().item()}"
        )

    return hook

class Model(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.embedding = torch.nn.Embedding(100, 16)
        self.linear = torch.nn.Linear(16, 32)

    def forward(self, input_ids):
        x = self.embedding(input_ids)
        x = self.linear(x)
        return x
        
model = Model()
handles = [] # 用来保存hook句柄，方便后续remove

for name, module in model.named_modules(): # 遍历每个层的名字和模块
    if isinstance(module, (nn.Embedding, nn.Linear)):
        handles.append(
            module.register_forward_hook(
                make_debug_hook(name)
            )
        )

input_ids = torch.tensor([[1, 5, 8, 2]])
with torch.no_grad():
    output = model(input_ids)

"""
可能得到输出：
layers.0                  shape=(1, 16, 512) mean=0.0012 std=1.0345 max=4.1732 finite=True
layers.1                  shape=(1, 16, 512) mean=0.0028 std=1.0712 max=4.5081 finite=True
layers.2                  shape=(1, 16, 512) mean=0.0031 std=1.1247 max=5.0374 finite=True
"""

for handle in handles:
    handle.remove() # 调试结束后，需要移除handles
```

