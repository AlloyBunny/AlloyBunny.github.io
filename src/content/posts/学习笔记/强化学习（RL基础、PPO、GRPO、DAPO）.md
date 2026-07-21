---
title: 强化学习（RL基础、PPO、GRPO、DAPO）
published: 2026-07-11
tags:
  - LLM
  - RL
draft: false
---
参考视频：[RethinkFun强化学习](https://www.bilibili.com/video/BV14swKz7Ego)

注：本笔记仅节选了视频中本人认为重要的部分，有部分知识没有涉及。

# RL基础

## 马尔可夫决策过程

强化学习（RL）里有两种东西：Agent和环境。Agent即进行RL训练的模型（或者叫policy），记为$\pi_\theta$，环境由“state、action、reward”组成，环境的规则符合马尔可夫决策过程（MDP）：
$$
\mathcal{M}=\langle S,A,P,R,\gamma\rangle
$$
其中：

- $S$是状态空间，表示所有可能状态$s$的集合
- $A$是动作空间，表示所有可能状态$a$的集合
- $P$是状态转移概率，$P(s,a)是在状态为s，动作为a情况下转移到的状态的概率分布$
- $R$是奖励函数，$R(s,a)=E[R_{t+1}|S_t=s, A_t=a]$，从时刻$t$起累计的奖励叫做回报，记作$G_t$
- $\gamma$是折扣因子，用于给未来的奖励做折扣，$0\leq\gamma\leq1$

MDP满足马尔可夫性，未来之取决于现在的状态，而与过去的状态无关。即满足：
$$
P(S_{t+1}|S_t)=P(S_{t+1}|S_t,S_{t-1},S_{t-2},...S_0)
$$
RL的目的是训练让Agent能够在一个轨迹里拿到尽可能高的累积奖励，即最大化回报$G_t$：
$$
G_t=R_{t+1}+\gamma R_{t+2}+\gamma^2R_{t+3}+...=\sum_{k=0}^\infty\gamma^kR_{t+k+1}\quad
$$

## 价值函数

定义**状态价值函数**，用来表示从状态$s$出发，一直按照策略$\pi$来执行，可以获得的期望回报：
$$
V_\pi(s)=E_\pi[G_t|S_t=s]
$$
$V_\pi(s)$能够衡量状态$s$对于策略$\pi$来说有多好。可以发现这个“价值”是和策略本身有关的，不能单独评价一个状态好不好（举个例子，一个好的棋局，交给一个不会下棋的人，后面也会下的很烂。状态是好的，但$V_\pi(s)$反而低），所以再引入最优状态价值函数（见下）。

定义**最优状态价值函数**，用来表示从状态$s$出发，一直按照最优策略来执行，可以获得的期望回报：
$$
V_*(s)=\max_\pi V_\pi(s)V_*(s)=\max_\pi V_\pi(s)
$$
定义**动作价值函数**，用来表示从状态$s$出发，并做出动作$a$，然后按照策略$\pi$来执行，可以获得的期望回报。
$$
Q_\pi(s,a)=E_\pi[G_t|S_t=s,A_t=a]
$$
定义**最优动作价值函数**，用来表示从状态$s$出发，并做出动作$a$，然后按照最优策略来执行，可以获得的期望回报。
$$
Q_*(s,a)=\max_\pi Q_\pi(s,a)Q_*(s,a)=\max_\pi Q_\pi(s,a)Q_*(s,a)=\max_\pi Q_\pi(s,a)Q_*(s,a)=\max_\pi Q_\pi(s,a)
$$

## 贝尔曼方程

贝尔曼方程的思想是，$当前步的价值=即时奖励+\gamma\times 下一步的价值$。

**状态价值函数的贝尔曼期望方程**：
$$
V_{\pi}(s)=E_{\pi}[R_{t+1}+\gamma V_{\pi}(S_{t+1})|S_{t}=s]=\sum_a\left\{\pi(a|s)\left[r(s,a)+\sum_{s^{\prime}}\left[p(s^{\prime}|s,a)\gamma V_\pi(s^{\prime})\right]\right]\right\}
$$
**动作价值函数的贝尔曼期望方程**：
$$
Q_{\pi}(s,a)=E_{\pi}[R_{t+1}+\gamma Q_{\pi}(S_{t+1},A_{t+1})|S_{t}=s,A_{t}=a]=r(s,a)+\gamma\sum_{s^{\prime}}\left\{p(s^{\prime}|s,a)\sum_{a^{\prime}}[\pi(a^{\prime}|s^{\prime})Q_{\pi}(s^{\prime},a^{\prime})]\right\}
$$
上面俩方程，主要需要理解第一步的定义，第二步展开计算的结果不太重要。

按照上一小节里取max的操作，也可以算出对应的两个**最优状态/动作价值函数贝尔曼最优方程**，这里不展开。

## 基于价值和基于策略的方法

RL有两种方法：

1. **基于价值的方法 （Value-based）：**学习最优动作价值，然后根据最优动作价值间接得到策略。
2. **基于策略的方法 （Policy-based）：**直接学习一个策略函数：$\pi_\theta(a|s)$，通过学习让该策略不断逼近最优策略。

我们只学第二种，PPO、GRPO、DAPO都是第二种。

## 策略梯度

RL的目标是训练出一个$\pi_\theta$，让它最大化$J(\theta)=E_{\tau\sim p_\theta(\tau)}[G(\tau)]$，这里的$\tau=(s_{0,}\:a_{0,}\:r_{1,}\:s_{1,}\:a_{1,}\:\ldots s_{t})$是轨迹。对$J(\theta)$求导得到：
$$
\begin{aligned}\nabla_{\theta}J(\theta)&=E_{\tau\sim p_\theta(\tau)}\left[\left(\sum_{t=0}^T\nabla_\theta log\:\pi_\theta(a_t|s_t)\right)G(\tau)\right]\\&\approx\frac1N\sum_n\left[\left(\sum_{t=0}^T\nabla_\theta log\:\pi_\theta(a_t^n|s_t^n)\right)G(\tau^n)\right]\end{aligned}
$$
我们采用蒙特卡洛法，利用$\pi_\theta$采样多个轨迹求平均值作为$\nabla_\theta J(\theta)$，然后用梯度上升法更新参数$\theta\leftarrow\theta+\alpha\nabla_\theta J(\theta)$。

$\nabla_{\theta}J(\theta)$的推导比较难，我们只尝试对他做直观理解。由于：
$$
\begin{aligned}\nabla_{\theta}J(\theta)&=E_{\tau\sim p_\theta(\tau)}\left[\left(\sum_{t=0}^T\nabla_\theta log\:\pi_\theta(a_t|s_t)\right)G(\tau)\right]\\&=E_{\tau\sim p_\theta(\tau)}\left[\sum_{t=0}^T\left[\nabla_\theta log\:\pi_\theta(a_t|s_t)G(\tau)\right]\right]\end{aligned}
$$
对于$\nabla_\theta log\:\pi_\theta(a_t|s_t)G(\tau)$，由于log是递增函数，所以$log\:\pi_\theta(a_t|s_t)$的梯度方向，就是让$\pi_\theta(a_t|s_t)$增大的方向。如果$G(\tau)>0$，就是鼓励$\pi_\theta(a_t|s_t)$增大；如果$G(\tau)<0$，就是鼓励$\pi_\theta(a_t|s_t)$减小。

## REINFORCE算法

之前的$\nabla_\theta J(\theta)=E_{\tau\sim p_\theta(\tau)}\left[\sum_{t=0}^T\left[\nabla_\theta log\:\pi_\theta(a_t|s_t)G(\tau)\right]\right]$有个问题：它在考虑$\pi_\theta(a_t|s_t)$的更新方向的时候，是根据$G(\tau)$的正负来判断的。但考虑因果性，“在当前的$s_t$下应该选择哪个$a_t$”应该只和之后获得的奖励有关，和之前的无关，所以把$G(\tau)$修正为$G(t)$，减小训练噪声，变为$\nabla_\theta J(\theta)=E_{\tau\sim p_\theta(\tau)}\left[\sum_{t=0}^T\left[\nabla_\theta log\:\pi_\theta(a_t|s_t)G(t)\right]\right]$。使用蒙特卡洛法采样n条轨迹取平均估计策略梯度，再加上负号就得到loss为：
$$
L=-\frac{1}{N}\sum_{n=1}^{N}\left[\sum_{t=0}^{T}[log\:\pi_{\theta}(a_{t}^{n}|s_{t}^{n})G_{t}^{n}]\right]
$$
这就是REINFORCE算法。如果把其中的$G(t)$再改成$G(t)-V_\pi(s_t)$，就是REINFORCE with baseline算法。

## Actor-Critic算法

REINFORCE算法有个问题，$G(t)$需要采样完整轨迹，有两个问题：（1）回报方差大，（2）训练效率低

Actor-Critic算法想到$Q_\pi(s_t,a_t)=E_\pi[G_t|s_t,a_t]$，既然动作价值函数是回报的期望，那就可以用它来替代$G_t$，解决方差大的问题。又因为$Q_{\pi}(s,a)=E_{\pi}[R_{t+1}+\gamma Q_{\pi}(S_{t+1},A_{t+1})|S_{t}=s,A_{t}=a]$，可用单步采样近似为$Q_\pi(s_t,a_t)\approx r_{t+1}+\gamma V_\pi(s_{t+1})$。

于是，之前的$G(t)-V_\pi(s_t)$改成动作优势$\delta_{t}=r_{t+1}+\gamma V_\pi(s_{t+1})-V_\pi(s_t)$，这里的$\delta_{t}$称为TD误差，它同时是：

1. Critic 网络的训练误差信号（使用$MS\_Loss=\frac12(\delta_t)^2$更新 Critic 网络)
2. Actor 网络的策略更新信号（使用$\nabla_{\theta}J(\theta)=E_{\tau\sim p_{\theta}(\tau)}\left[\sum_{t=0}^{T}\left(\nabla_{\theta}log\:\pi_{\theta}(a_{t}|s_{t})\delta_{t}\right)\right]$更新 Actor 网络）

# PPO

## GAE

前面讲了REINFORCE with baseline算法和Actor-Critic算法。前者用$G(t)-V_\pi(s_t)$表示动作优势，高方差低偏差；后者用$\delta_{t}=r_{t+1}+\gamma V_\pi(s_{t+1})-V_\pi(s_t)$表示动作优势，高偏差低方差。

GAE考虑对优势估计$A_\pi(s,a)=Q_\pi(s,a)-V_\pi(s)$进行若干步采样：

- $A_\pi^{(1)}(s_t,a)=r_t+\gamma*V_\pi(s_{t+1})-V_\pi(s_t)$
- $A_{\pi}^{(2)}(s_{t},a)=r_{t}+\gamma*r_{t+1}+\gamma^{2}*V_{\pi}(s_{t+2})-V_{\pi}(s_{t})$
- ......
- $A_\pi^{(T)}(s_t,a)=r_t+\gamma*r_{t+1}+\gamma^2*r_{t+2}+\gamma^3*r_{t+3}+\cdotp\cdotp\cdotp+\gamma^{T-1}*r_{T-1}-V_{\pi}(s_{t})$

采样步数越多，就越接近REINFORCE with baseline，高方差低偏差；
采样步数越少，就越接近Actor-Critic，高偏差低方差

GAE说“我全都要”，对这些结果做了个加权平均：
$$
A_{t}^{GAE}=（1-\lambda)\sum_{k=1}^{\infty}\lambda^{k-1}A_{t}^{(k)}\quad\lambda\in[0,1]
$$
其中$\lambda$一般取接近于1的值，比如0.95。实际计算的时候一般用递推式：
$$
A_t^{GAE}=\lambda\gamma A_{t+1}^{GAE}
$$

## 重要性采样

重要性采样的思想很简答，利用$E_{x\sim p(x)}[f(x)]=E_{x\sim q(x)}[f(x)\frac{p(x)}{q(x)}]$的性质（按照期望的定义展开，很容易证明），用旧策略替代新策略采样，以提高样本利用率。把上面的$p(x)$看作新策略$\pi_\theta$采样的概率，$q(x)$看作旧策略$\pi_{\theta_{old}}$采样的概率，我们发现，用旧策略采样，乘上一个重要性采样系数$r_\theta$，可以近似等同于用新策略采样。其中：
$$
r_t(\theta) = \frac{\pi_\theta(a_t|s_t)}{\pi_{\theta_{old}}(a_t|s_t)}
$$

## 完整的PPO算法

有了前面的铺垫，其实PPO就很简单了，它其实就是$\nabla_\theta J(\theta)=E_{\tau\sim p_\theta(\tau)}\left[\sum_{t=0}^T\left[\nabla_\theta log\:\pi_\theta(a_t|s_t)A_{t}^{GAE}\right]\right]$加上重要性采样，得到：
$$
\nabla_\theta J(\theta)=E_{\tau\sim p_{\theta_{old}}(\tau)}\left[\sum_{t=0}^T\frac{\nabla_\theta\pi_\theta(a_t|s_t)}{\pi_{\theta_{old}}(a_t|s_t)}A_t^{GAE}\right]
$$
最终设计出的loss函数为：
$$
L_{PPO}=-\frac{1}{N}\sum_{n=1}^{N}\sum_{t=0}^{T}\frac{\pi_{\theta}(a_{t}|s_{t})}{\pi_{\theta_{old}}(a_{t}|s_{t})}A_{t}^{GAE}(a_{n}^{t},s_{n}^{t})
$$
还有一个点是，由于$A^{GAE}_t$是老策略的动作优势，如果新策略和老策略相差太大，PPO会有较大偏差。PPO通过两种方法二选一来解决这个问题：

1. KL散度：$L_{PPO-Penalty}=-\frac1N\sum_{n=1}^N\sum_{t=0}^T\frac{\pi_\theta(a_t|s_t)}{\pi_{\theta_{old}}(a_t|s_t)}A_t^{GAE}(a_n^t,s_n^t)+\beta KL(\pi_\theta,\pi_{\theta_{old}})$
2. 奖励裁剪：$L_{PPO-Clip}=-\frac1N\sum_{n=1}^N\sum_{t=0}^T\min\left(r_t(\theta)A_t^{GAE},\operatorname{clip}(r_t(\theta),1-\epsilon,1+\epsilon)A_t^{GAE}\right)$

注意，PPO是on-policy的，因为旧策略只会用来采样几轮，之后就抛弃，再取新一点的旧策略。

> 注：在LLM训练中，PPO的奖励常常是只挂在最后一个token，其他地方的reward全是0，但由于$A_t^{GAE}$的奖励回传特性，前面的token也有非零$A_t^{GAE}$。

# GRPO

GRPO比起PPO就简单粗暴很多，它删掉了value model，改为对同一个prompt采样一组多条轨迹，用一组内的所有轨迹的奖励取均值和标准差，然后把`(轨迹奖励-平均奖励)/奖励标准差`作为优势值，即：
$$
A_i=\frac{r_i-\bar{r}}{\sigma_r+\epsilon}
$$
loss为：
$$
L_{GRPO}=-\frac1G\sum_{i=1}^G\frac1{T}\sum_{t=0}^{T-1}\min(\rho_{i,t}A_i,clip(\rho_{i,t},1-\epsilon,1+\epsilon)A_i),\quad其中\rho_{i,t}=\frac{\pi_\theta(y_{i,t}|x,y_{i,<t})}{\pi_{old}(y_{i,t}|x,y_{i,<t})}
$$

# DAPO

DAPO是GRPO 的工程化增强版，目标是让大规模 LLM RL（尤其 RLVR：数学/代码可验证奖励）训练更稳定、更高效。它比起GRPO做了如下四项改动：

## **D**ecoupled Clip（解耦裁剪）

把裁剪从$clip(\rho,1-\epsilon,1+\epsilon)$改成$clip(\rho,1-\epsilon_-,1+\epsilon_+)$，一般是$\epsilon_+>\epsilon-$。

为什么这么做？因为LLM reasoning RL 中，往往好答案少，差答案多，所以希望$A_i>0$的时候多学一些，$A_i<0$的时候少惩罚一些，避免过度抑制导致policy collapse。

## Dynamic Sampling（动态采样）

考虑使用RLVR作为奖励信号的GRPO，它常常遇到这样的问题：要么数据太简单，采样$G$次奖励全是1；要么数据太难，采样$G$次奖励全是0。这会导致$A_i=0$，等于啥也没学到。

动态采样的做法很简单，丢掉$accuracy=0$或者$accuracy=1$的样本，只保留$0<accuracy<1$的。

## Token-level Policy Gradient Loss（Token-level策略梯度损失）

GRPO训练样本的时候，是“每条样本平权”（也就是说，loss是sample-level的），从它的$L_{GRPO}=-\frac1G\sum_{i=1}^G\frac1{T}\sum_{t=0}^{T-1}\min(...)$就能看出来，它先是对每条样本的每个token取平均，再对每个样本取平均，每个样本的权重都是$\frac{1}{G}$，而DAPO认为应该是每个token的权重一样，给它改成了：
$$
\begin{aligned}\mathcal{J}_{\mathrm{DAPO}}(\theta)&=\quad\mathbb{E}_{(q,a)\thicksim\mathcal{D},\{o_i\}_{i=1}^G\thicksim\pi_{\theta_{\mathrm{old}}}(\cdot|q)}\\&\left[\frac1{\sum_{i=1}^G|o_i|}\sum_{i=1}^G\sum_{t=1}^G\min\left(r_{i,t}(\theta)\hat{A}_{i,t},\mathrm{~clip}\left(r_{i,t}(\theta),1-\varepsilon_{\mathrm{low}},1+\varepsilon_{\mathrm{high}}\right)\hat{A}_{i,t}\right)\right]\end{aligned}
$$
从这个$\frac1{\sum_{i=1}^G|o_i|}$就能看出，它是对整个group里每个token都采取同样的权重。

## Overlong Reward Shaping（过长惩罚）

在GRPO中，模型可能学会输出特别长的CoT来混分（输出一大串，总有蒙对的），所以DAPO对过长的输出减少奖励，它定义：
$$
R_{\mathrm{length}}(y)=\begin{cases}0,&|y|\leq L_{\mathrm{max}}-L_{\mathrm{cache}}\\\frac{(L_{\mathrm{max}}-L_{\mathrm{cache}})-|y|}{L_{\mathrm{cache}}},&L_{\mathrm{max}}-L_{\mathrm{cache}}<|y|\leq L_{\mathrm{max}}\\-1,&L_{\mathrm{max}}<|y|\end{cases}
$$
然后最终的奖励是$R(y) = R(y)+R_{\mathrm{length}}(y)$，即在原本奖励基础上额外加入一个长度惩罚。

其中$L_{\mathrm{max}}$是最长长度，超过它输出就会被截断，并且奖励直接-1；$L_{\mathrm{cache}}$是一个“缓冲区”，如果长度超过$L_{\mathrm{max}}-L_{\mathrm{cache}$，也会被惩罚。



