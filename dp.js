$(function() {
  "use strict";

  const startState =  { x: 0, y: 0};
  let agentState = { x: 0, y: 0 };
  const gridWorld = new rl.GridWorld('#gridWorld', startState);
  const agent = new rl.AgentDP(gridWorld, .90);

  let wallsCoordinates = [
    [4, 5], [ 3, 6], [2, 7],
      [1, 7], [1, 6], [1, 5], [1, 4],
      [5, 5], [6, 5], [7, 5],
    [7, 2 ], [8, 1], [9, 0]];
  for (let coords of wallsCoordinates) {
    gridWorld.makeWall(coords[0], coords[1]);
  }

  gridWorld.draw();
  gridWorld.drawPolicy(function(x, y) { return [.25, .25, .25, .25]; });
  $("#gridWorld").children().last().addClass("center-block");

  gridWorld.setReward(4, 6, 1);
  gridWorld.setReward(5, 6, -1);
  gridWorld.setReward(4, 8, -1);
  gridWorld.setReward(6, 7, -1);
  gridWorld.setReward(0, 7, -2);
  gridWorld.setReward(0, 6, -5);
  gridWorld.makeTerminal(4, 6);

  gridWorld.drawRewards();

  let valueFunction = function(x, y) {
    return agent.valueFunction(x, y);
  }

  let policyFunction = function(x, y) {
    return agent.policy(x, y);
  }

  gridWorld.drawValueFunction(valueFunction);

  $("#startButton").on("click", function() {
    if ($(this).text() == "Stop") {
      $(this).text("Start");
      gridWorld.stopAgent();
      return;
    } else if ($(this).text() == "Reset") {
      $(this).text("Start");
      gridWorld.reset();
      return;
    }

    $(this).text("Stop");
    let stepCount = 0;
    do {
      let action = agent.getAction(agentState.x, agentState.y);
      var stepRes = gridWorld.step(action);
      agentState.x = stepRes.state.x;
      agentState.y = stepRes.state.y;
      var lastTransition = gridWorld.transitionAgent();

      stepCount += 1;
      if (stepCount == 100) {
        break;
      }
    } while (!stepRes.done);


    let self = this;
    lastTransition.on("end", function() {
      if (stepRes.done) { // trully last transition.
        console.log("Terminal state");
        $(self).text("Reset");
      } else { // did not reach endpoint in lots of steps, try again?
        console.log("Did not reach endpoin int lots of steps, try again?");
        $(self).text("Start");
      }
    });
  });

  $("#policySweepButton").click(function() {
    agent.policySweep();
    gridWorld.drawValueFunction(valueFunction);
  });


  $("#policyUpdateButton").click(function() {
    agent.policyUpdate();
    gridWorld.drawPolicy(policyFunction);
  });

  $("#valueIterationButton").click(function() {
    do {
      agent.policySweep();
      gridWorld.drawValueFunction(valueFunction);
      var converged = agent.policyUpdate();
      gridWorld.drawPolicy(policyFunction);
    } while (!converged);
    console.log("Converged!");
  });
});

