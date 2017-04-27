var rl = (function(rl) {
  "use strict";

  // Utility funcitons.
  let utils = {
    assert: function(condition, message) {
        if (!condition) {
            message = message || "Assertion failed";
            if (typeof Error !== "undefined") {
                throw new Error(message);
            }
            throw message; // Fallback
        }
    },

    random: function(values, probabilities) {
      if (typeof probabilities == "undfined") {
        var probabilities = [];
        for (let v of values) {
          probabilitities.push(1 / values.length);
        }
      }
      rl.utils.assert(values.length == probabilities.length,
        "Values and probabilities must have equal length." +
          `values.length=${values.length}, ` +
          `probabilities.length=${probabilities.length}`);
      let sum = 0,
          rand = Math.random();
      for (let i = 0; i < values.length - 1; i++) {
        sum += probabilities[i];
        if (rand < sum) {
          return values[i];
        }
      }

      return values[values.length - 1];
    }
  }

  let GridWorld = function(selector, startState) {
    this.MAX_REWARD = 5;
    this.MIN_REWARD = -10;
    this.cells = [];
    this.nrows = 10;
    this.ncols = 10;

    this.cellWidth = 65;
    this.cellHeight = 65;

    this.startState = { x: startState.x, y: startState.y };
    this.agentState = { x: startState.x, y: startState.y };
    this.stopAgentFlag = false;

    this.selector = selector;
    this.grid = undefined;

    this.transitionDuration = 100;

    let xpos = 0;
    let ypos = 0;

    // Set coordinates of each cell one by one.
    for (let row = 0; row < this.nrows; row++) {
      this.cells.push(new Array())
      for (let col = 0; col < this.ncols; col++) {
        this.cells[row].push({
          coordinates: {
            x: xpos,
            y: ypos,
          },
          reward: 0,
          isWall: false,
          isTerminal: false,
        });
        xpos += this.cellWidth;
      }
      xpos = 0;
      ypos += this.cellHeight;
    }
  }

  GridWorld.prototype.draw = function () {
    this.grid = d3.select(this.selector)
      .append("svg")
      .attr("width", this.cellWidth * this.ncols + "px")
      .attr("height", this.cellHeight * this.nrows + "px");

    // Add each row using data joins.
    var rows = this.grid.selectAll(".row")
      .data(this.cells)
      .enter().append("g")
        .attr("class", "row");

    this.gridCellsEnter = rows.selectAll("g")
      .data(function(cell) {
        return cell
      })
      .enter().append("g")
        .attr("class", "cell");

    // Add each cell, again with data joins.
    let rects = this.gridCellsEnter
      .append("rect")
        .attr("class", "square")
        .attr("x", function(c) { return c.coordinates.x })
        .attr("y", function(c) { return c.coordinates.y })
        .attr("width", this.cellWidth)
        .attr("height", this.cellHeight)
        .style("fill", function(c) {
          if (c.isWall) {
            return "#808080";
          } else {
            return "hsl(120, 100%, 100%)";
          }
        })
        .style("stroke", "#222");


    this.drawRewards();

    // Agent is added before after each row, so that each cell could be
    // colored. However it complicates adding arrows, which represent policy.
    this.agent = this.grid.append("circle")
      .attr("r", .25 * this.cellWidth)
      .style("fill", "rgb(255, 255, 0)")
    this.lastAgentTransition = this.agent;
    this.transitionAgent();

    return this;
  }


  /**
   * Repositions the agent based on its latest step. Typical use is to
   * perform interactions with the environment using `step` method and then
   * calling this method to display the changes.
   *
   * @returns {object} - d3.transition object of the transition. This, for
   * example, can be used for callbacks on beginning
   */
  GridWorld.prototype.transitionAgent = function() {
    // Reposition the agent. Use chained transitions to guarantee synchronicity.
    // After a transition ends, reassign agent selection to the last
    // agent transition variable, so that next transition will be
    // attached to the DOM-element and not a transition that has already ended.
    let self = this;
    this.lastAgentTransition = this.lastAgentTransition
      .transition()
        .duration(self.transitionDuration)
      .attr("cx", this.agentState.x * this.cellHeight + this.cellHeight / 2)
      .attr("cy", this.agentState.y * this.cellWidth + this.cellWidth / 2)
      .on("start", function() {
        if (self.stopAgentFlag) {
          d3.select(this).interrupt();
          self.agentState.x = Math.floor(
            d3.select('circle').attr('cx') / self.cellWidth);
          self.agentState.y = Math.floor(
            d3.select('circle').attr('cy') / self.cellHeight);
          console.log(self.agentState.x, self.agentState.y);
          self.stopAgentFlag = false;
        }
      })
      .on("end", function() {
        self.lastAgentTransition = d3.select(this);
      });

    return this.lastAgentTransition;
  }

  /**
   * Interrupts all the remaining transitions of the agent.
   */
  GridWorld.prototype.stopAgent = function() {
    this.stopAgentFlag = true;
  }

  /**
   * Adds arrows representing probabilities of each move to the gridworld.
   * Lenghts of the arrows show how the probabilities of actions relate to
   * each other. For example, if all actions are equaly likely, all
   * arrows will have equal length. Requires that the gridworld is drawn.
   *
   * @param {function} policy(state) - function returning probability of each
   * move for a given state.
   */
  GridWorld.prototype.drawPolicy = function(policy) {
    let offsetForCenter = {
      x: this.cellWidth / 2,
      y: this.cellHeight / 2,
    }

    // Add arrow head marker if not already.
    if (this.grid.select("#arrowMarker").empty()) {
      this.grid.append("defs")
        .append("marker")
          .attr("id", "arrowMarker")
          .attr("viewBox", "0 -5 10 10")
          .attr("refX", 5)
          .attr("refY", 0)
          .attr("markerWidth", 4)
          .attr("markerHeight", 4)
          .attr("orient", "auto")
        .append("path")
          .attr("d", "M0,-5L10,0L0,5")
          .style("stroke", "#222")
    }

    // Set group element for arrows if not defined.
    let policyArrows = this.grid.select("#policyArrows");
    if (policyArrows.empty()) {
      policyArrows = this.grid.append("g")
        .attr("id", "policyArrows");
    }

    let xMaxLength = .40 * this.cellWidth, // Max length of horizontal line.
        yMaxLength = .40 * this.cellHeight; // Max length of vertical line.

    let self = this;

    // Save last agents transition for later synchronisation of arrows
    // transitions.
    let lastAgentsTransition = this.lastAgentsTransition

    //
    this.gridCellsEnter
      .filter(function(c) { return !c.isWall; })
      .each(function(cellDatum) {
        let policyHere = policy(cellDatum.coordinates.x / self.cellWidth,
                                  cellDatum.coordinates.y / self.cellHeight);
        if (policyHere.length != 4) {
          throw new Error("Invalid shape of policy array.")
        }

        let center = {
          x: cellDatum.coordinates.x + offsetForCenter.x,
          y: cellDatum.coordinates.y + offsetForCenter.y,
        };

        // Works even if wall was made a regular cell.
        const needAppend = typeof cellDatum.linesTransitions == "undefined";

        // Add or update each of the four lines after computing its endpoint.
        for (let i = 0; i < policyHere.length; i++) {
          let newX = center.x,
              newY = center.y;

          if (i % 2 == 0) { // Vertical arrow.
            newY -= Math.pow(-1, i / 2) * policyHere[i] * yMaxLength;
          } else { // Horizontal arrow.
            newX -= Math.pow(-1, (i + 1) / 2) * policyHere[i] * xMaxLength;
          }

          // Create the line if none exist.
          if (needAppend) {
            // Need append & first iteration of this loop =>
            // no array of lines transitions exist. Create the array.
            if (i == 0) {
              cellDatum.linesTransitions = [];
            }
            cellDatum.linesTransitions.push(
              policyArrows.append("line")
                .attr("x1", center.x)
                .attr("y1", center.y)
                .attr("x2", center.x)
                .attr("y2", center.y)
                .attr("marker-end", "url(#arrowMarker)")
                .style("stroke", "#222")
            );
          }

          var visibility;
          if (newX == center.x && newY == center.y) {
            visibility = "hidden";
          } else {
            visibility = "visible";
          }

          // Use the same trick as for agent transition to change the
          // endpoint of the line.
          cellDatum.linesTransitions[i] =
            cellDatum.linesTransitions[i]
              .transition(self.lastAgentsTransition)
                .duration(self.transitionDuration)
              .attr("visibility", visibility)
              .attr("x2", newX)
              .attr("y2", newY)
              .on("end", function(d) {
                cellDatum.linesTransitions[i] = d3.select(this)
              });
        }
      })
  }

  /**
   * Makes specified cell in the grid a wall. Nothing is ode if the specified
   * cell is already a wall.
   *
   * @param {number} x - x coordinate of the cell (vertical offset from top).
   * @param {number} y - y coordinate of the cell (horizontal offset from left).
   */
  GridWorld.prototype.makeWall = function(x, y) {
    if (this.agentState.x == x && this.agentState.y == y) {
      throw new Error("Cannot transform cell containing an agent into a wall.");
    }
    if (this.cells[y][x].isWall) {
      return;
    }
    this.cells[y][x].isWall = true;

    // Increment x and y, for correct use of nth-child.
    x++; y++;
    if (typeof this.grid != "undefined") {
      // Recolor as wall.
      const row = this.grid.select(`g.row:nth-child(${x})`);
      row.select(`rect:nth-child(${y})`).style("fill", "#808080");

      // Delete reward value from the cell.
      row.select(`text:nth-child(${y})`).text("");
    }
  }

  /**
   * Sets reward cell specified by its x and y coordinates.
   */
  GridWorld.prototype.setReward = function(x, y, reward) {
    if (reward < this.MIN_REWARD || this.MAX_REWARD < this.MIN_REWARD) {
      throw new RangeError("Reward is out of range");
    }
    this.cells[y][x].reward = reward;
  }

  /**
   * Make given state terminal.
   */
  GridWorld.prototype.makeTerminal = function(x, y) {
    if (this.cells[y][x].isWall) {
      throw new Error("Attempting to make wall a terminal state.");
    }
    this.cells[y][x].isTerminal = true;
  }

  /**
   * Returns successor state after taking specified action in specified state.
   * Given state object is not modified.
   *
   * @param {Number} x - x coordinates of the agent.
   * @param {Number} y - y coordinate of the agent.
   * @param {number} action - An integer from 0 to 3 (inclusive) indicating
   * direction of transition:
   *    0 - UP,
   *    1 - RIGHT,
   *    2 - DOWN,
   *    3 - LEFT.
   *
   *  @returns {object} - Successor state.
   */
  GridWorld.prototype.getSuccessorState = function(x, y, action) {
    if (this.cells[y][x].isTerminal) {
      return {x: x, y: y};
    }
    let newX = x,
        newY = y;

    if (action % 2 == 0) {
      newY -= Math.pow(-1, Math.ceil(action / 2));
    } else {
      newX -= Math.pow(-1, Math.ceil(action / 2));
    }

    // Reset new state if it is outside of grid boundaries.
    if (newX < 0 || this.nrows <= newX) {
      newX = x;
    }
    if (newY < 0 || this.ncols <= newY) {
      newY = y;
    }

    // Reset if went into a wall.
    if (this.cells[newY][newX].isWall) {
      newX = x;
      newY = y;
    }

    return {x: newX, y: newY};
  }

  /**
   * Returns reward for taking any action in specified state.
   *
   * @param {Number} x - x coordinate of the state (horizontal).
   * @param {Number} y - y coordinate of the state( vertical).
   */
  GridWorld.prototype.getReward = function(s1, s2) {
    if (this.cells[s1.y][s1.x].isTerminal) {
      return 0;
    }

    let r = this.cells[s1.y][s1.x].reward;
    if (this.cells[s2.y][s2.x].isTerminal) {
      r += this.cells[s2.y][s2.x].reward;
    }
    return r;
  }

  GridWorld.prototype.drawRewards = function() {
    let hOffset = .45 * this.cellWidth; // horizontal offset in
                                            // cell for reward value
    let vOffset = .15 * this.cellHeight; // vertical offset in
                                             // cell for reward value

    let rewards = this.grid.selectAll(".rewardText");
    if (rewards.empty()) {
      rewards = this.gridCellsEnter
        .filter(function(d) { return !d.isWall; })
        .append("text")
        .attr("class", "rewardText")
        .attr("x", function(d) { return d.coordinates.x + hOffset; })
        .attr("y", function(d) { return d.coordinates.y + vOffset; })
        .style("font-size", "10px")
        .text(function(d) { return "R=" + d.reward.toFixed(2); });
    } else {
      rewards.text(function(d) { return "R=" + d.reward.toFixed(2); })
    }
  }

  GridWorld.prototype.drawValueFunction = function(valueFunction) {
    // Print draw value function.
    const hOffset = .03 * this.cellWidth // horizontal offset in
                                       // cell for reward value
    const vOffset = .95 * this.cellHeight // vertical offset in
                                        // cell for reward value

    self = this;
    let valueText = this.grid.selectAll(".valueText")
    if (valueText.empty()) {
      valueText = this.gridCellsEnter
        .filter(function(d) { return !d.isWall })
        .append("text")
        .attr("class", "valueText")
        .attr("x", function(d) { return d.coordinates.x  + hOffset })
        .attr("y", function(d) { return d.coordinates.y + vOffset })
        .style("font-size", "10px")
    }

    // Use each to reassing ALL of the transitions (same hack as in
    // transition agent).
    this.grid.selectAll(".cell")
      .filter(function(d) { return !d.isWall; })
      .each(function(d) {
        if (typeof d.valueTextTransition == "undefined") {
          d.valueTextTransition = d3.select(this).select(".valueText");
        }

        // Set value.
        let value = valueFunction(
          d.coordinates.x / self.cellWidth,
          d.coordinates.y / self.cellHeight);

        d.valueTextTransition = d.valueTextTransition
          .transition()
            .duration(self.transitionDuration)
          .text("V=" + value.toFixed(2))
          .on("end", function() {
            d.valueTextTransition = d3.select(this);
          });

        // Color the cell.
        // For terminal cell set value function equal to reward in that cell.
        if (typeof d.colorTransition == "undefined") {
          d.colorTransition = d3.select(this).select(".square");
        }
        let hue, lightness;
        if (value > 0) {
          hue = "120";
          lightness = 100 - Math.max(10, Math.round(
            Math.min(value / self.MAX_REWARD, 1) * 100)) / 2;
        } else if (value != 0) {
          hue = "0";
          lightness = 100 - Math.max(10, Math.round(
            Math.min(value / self.MIN_REWARD, 1) * 100)) / 2;
        }
        d.colorTransition = d.colorTransition
          .transition()
            .duration(self.transitionDuration)
          .style("fill", `hsl(${hue}, 100%, ${lightness}%)`)
          .on("end", function() {
            d.colorTransition = d3.select(this);
          });
      });
  }

  /**
   * Run one timestep of the environment's dynamics. Accepts an action and
   * returns an object with properties state, reward, done.
   *
   * @param {number} action - Direction in which the direction moves. An
   * integer * from 0 to 3:
   *    0 - UP,
   *    1 - RIGHT,
   *    2 - DOWN,
   *    3 - LEFT.
   * @returns {object} - Object containing:
   *    state - new state of the agent. Represented with x and y coordinates.
   *    reward - a numeric reward (result of previous action).
   *    done - whether a terminal state of the episode is reached.
   */
  GridWorld.prototype.step = function(action) {
    const oldState = this.agentState;
    this.agentState = this.getSuccessorState(
        this.agentState.x, this.agentState.y, action);

    utils.assert((0 <= this.agentState.x && this.agentState.x < this.ncols) &&
             (0 <= this.agentState.y && this.agentState.y < this.nrows),
           `Invalid postion of agent after step: x=${this.agentState.x}, ` +
              `y=${this.agentState.y}`);
    return {
      state: this.agentState,
      reward: this.getReward(oldState, this.agentState),
      done: this.cells[this.agentState.y][this.agentState.x].isTerminal,
    }
  }

  /**
   * Resets the environment to start state. Automatically calls
   * method for transitioning the agent and returns result of that call
   * which is a transition object.
   */
  GridWorld.prototype.reset = function() {
    this.agentState = { x: this.startState.x , y: this.startState.y };
    return this.transitionAgent();
  }

  rl.utils = utils
  rl.GridWorld = GridWorld
  return rl
})(rl || {});
