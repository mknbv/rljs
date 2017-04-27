# rljs
Tabular reinforcement learning methods in JavaScript.

This repository contains implementation of dynamic programming method which
can be used when the environment is tabular and its dynamics are known.
The method is equivalent to solving a system of linear equations which describe
the value of each state. After that the optimal policy consists of always
choosing actions that lead to state with the maximal value function.

The method is visualized in a simple gridworld. The colour of each cell
represents current estimate of the value function and arrows show
which of the neighboring cells have maximal value function. The agent
is represented by a yellow circle.
<div align="center">
<img src="https://github.com/MichaelKonobeev/rljs/raw/master/imgs/gridworld.png"
width="484" height="486">
</div>
