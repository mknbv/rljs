var rl = ((rl) => {
  "use strict";

  /**
   * Agent that uses dynamic programming method. It requires complete knowledge
   * of environment's dynamics and works only for finite MDPs.
   *
   * @param {object} gridWorld - grid world object.
   * @param {Number} gamma - discount factor.
   */
  let AgentDP = function(gridWorld, gamma) {
    this.gridWorld = gridWorld;
    this.dim1 = gridWorld.ncols,
    this.dim2 = gridWorld.nrows;

    this.gamma = gamma;

    this.actions = [ 0, 1, 2, 3 ];

    this.policyConverged = false;

    // Initialize table measuring state-value function of each state.
    // Also intialize equiprobable policy for each state-action pair.
    this.stateValues = [];
    this.policyMatrix = [];
    for (let i = 0; i < this.dim1; i++) {
      this.stateValues.push([]);
      this.policyMatrix.push([]);
      for (let j = 0; j < this.dim2; j++) {
        this.stateValues[i].push(0);

        this.policyMatrix[i].push([]);
        for (let a of this.actions) {
          this.policyMatrix[i][j].push(1 / this.actions.length);
        }
      }
    }
  }

  /**
   * Returns policy distribution in given state.
   */
  AgentDP.prototype.policy = function(x, y) {
    return this.policyMatrix[x][y];
  }

  /**
   * Returns state-value function of a given state.
   */
  AgentDP.prototype.valueFunction = function(x, y) {
    return this.stateValues[x][y];
  }

  /**
   * Runs one iteration of iterative policy evaluation method for
   * current policy. As a result of calling this method state-value
   * of each state might change.
   *
   * @param {Number} delta - value to test for convergence. If not specifed
   * 1e-3 is used.
   *
   * @returns {Boolean} - true if maximum change in state-value for each state
   * is less then delta and false otherwise.
   */
  AgentDP.prototype.policySweep = function(delta) {
    // Note: if for current policy there is a state s' with state-value function
    // equal to negative infinity this algorithm will not converge.
    // We can use constant that is smaller then v(s) for all s, from which
    // agent is able to move to s' using single action. Although in such
    // case the value function for s' will not be correct, policy iteration
    // will work successfully.
    if (typeof delta == "undefined") {
      var delta = 1e-3;
    }
    let converged = false;
    for (let x = 0; x < this.dim1; x++) {
      for (let y = 0; y < this.dim2; y++) {
        let oldValue = this.stateValues[x][y];
        this.stateValues[x][y] = 0;

        let policyHere = this.policy(x, y);
        for (let i = 0; i < this.actions.length; i++) {
          let action = this.actions[i],
              actionProba = policyHere[i],
              nextState = this.gridWorld.getSuccessorState(x, y, action),
              reward = this.gridWorld.getReward({x: x, y: y}, nextState);

          this.stateValues[x][y] += actionProba * (reward +
            this.gamma * this.stateValues[nextState.x][nextState.y]);
        }

        if (Math.abs(this.stateValues[x][y] - oldValue) < delta) {
          converged = true;
        }
      }
    }

    return converged;
  }

  /**
   * Updates current policy using greedy strategy of choosing best actions
   * based on current approximation of the state-value function. Requires
   * complete knowledge of environment's dynamics to compute q-value function
   * for each action.
   */
  AgentDP.prototype.policyUpdate = function() {
    let converged = true;

    for (let x = 0; x < this.dim1; x++) {
      for (let y = 0; y < this.dim2; y++) {
        // Compute q values for each action, also count
        // how many q values are equal to maximum.
        let maxQ = Number.NEGATIVE_INFINITY, // max q value among actions.
            i = 0, // best action index.
            n = 0; // number of actions for each q-value == max q-value.

        let qValues = [];
        for (let j = 0; j < this.actions.length; j++) {
          let action = this.actions[j],
              nextState = this.gridWorld.getSuccessorState(x, y, action),
              reward = this.gridWorld.getReward({x: x, y: y}, nextState),
              q = reward +
                    this.gamma * this.stateValues[nextState.x][nextState.y];

          qValues.push(q);
          if (maxQ < q) {
            maxQ = q;
            i = j;
            n = 1;
          } else if (maxQ == q) {
            n++;
          }
        }

        // Set probabilities of each action.
        for (let j = 0; j < this.actions.length; j++) {
          converged &= qValues[j] == maxQ ^ this.policyMatrix[x][y][j] == 0;
          this.policyMatrix[x][y][j] = qValues[j] == maxQ ? 1 / n : 0;
        }
      }
    }

    return converged;
  }

  /**
   * Returns an action based on current policy.
   */
  AgentDP.prototype.getAction = function(x, y) {
    return rl.utils.random(this.actions, this.policyMatrix[x][y]);
  }

  rl.AgentDP = AgentDP;

  return rl;
})(rl || {});
