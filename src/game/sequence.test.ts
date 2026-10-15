import { describe, expect, it } from "vitest";
import {
  advanceSequence,
  getInitialSequenceState,
  getSequenceStepStatus,
  SEQUENCE_STEPS,
} from "./sequence";

describe("sequence of play", () => {
  it("lists the rules-defined phases and both attrition segments in order", () => {
    expect(
      SEQUENCE_STEPS.map(({ phase, name, lane, vortexRoller }) => [
        phase,
        name,
        lane,
        vortexRoller,
      ]),
    ).toEqual([
      ["A", "Movement & Conjuration", "player1", undefined],
      ["B", "Attrition Segment", "joint", undefined],
      ["B", "Vortex Movement Segment", "joint", "player1"],
      ["C", "Combat", "joint", undefined],
      ["D", "Movement & Conjuration", "player2", undefined],
      ["E", "Attrition Segment", "joint", undefined],
      ["E", "Vortex Movement Segment", "joint", "player2"],
      ["F", "Combat", "joint", undefined],
      ["G", "Game-Turn Interphase", "joint", undefined],
    ]);
  });

  it("advances through the sequence and begins a new game-turn after interphase", () => {
    let state = getInitialSequenceState();
    expect(state).toEqual({ gameTurn: 1, stepIndex: 0 });

    for (let stepIndex = 1; stepIndex < SEQUENCE_STEPS.length; stepIndex += 1) {
      state = advanceSequence(state);
      expect(state).toEqual({ gameTurn: 1, stepIndex });
    }

    expect(advanceSequence(state)).toEqual({ gameTurn: 2, stepIndex: 0 });
  });

  it("marks prior, current, and future steps for the two player lanes", () => {
    expect(getSequenceStepStatus(0, 1)).toBe("complete");
    expect(getSequenceStepStatus(1, 1)).toBe("current");
    expect(getSequenceStepStatus(2, 1)).toBe("upcoming");
    expect(SEQUENCE_STEPS[4]?.lane).toBe("player2");
    expect(SEQUENCE_STEPS[3]?.lane).toBe("joint");
  });

  it("assigns each vortex roll to the player whose turn just occurred", () => {
    expect(SEQUENCE_STEPS[2]?.vortexRoller).toBe("player1");
    expect(SEQUENCE_STEPS[6]?.vortexRoller).toBe("player2");
  });
});
