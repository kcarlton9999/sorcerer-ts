export type SequenceLane = "player1" | "player2" | "joint";

export interface SequenceStep {
  phase: string;
  name: string;
  lane: SequenceLane;
  vortexRoller?: "player1" | "player2";
}

export interface SequenceState {
  gameTurn: number;
  stepIndex: number;
}

export const SEQUENCE_STEPS: readonly SequenceStep[] = [
  {
    phase: "A",
    name: "Movement & Conjuration",
    lane: "player1",
  },
  {
    phase: "B",
    name: "Attrition Segment",
    lane: "joint",
  },
  {
    phase: "B",
    name: "Vortex Movement Segment",
    lane: "joint",
    vortexRoller: "player1",
  },
  {
    phase: "C",
    name: "Combat",
    lane: "joint",
  },
  {
    phase: "D",
    name: "Movement & Conjuration",
    lane: "player2",
  },
  {
    phase: "E",
    name: "Attrition Segment",
    lane: "joint",
  },
  {
    phase: "E",
    name: "Vortex Movement Segment",
    lane: "joint",
    vortexRoller: "player2",
  },
  {
    phase: "F",
    name: "Combat",
    lane: "joint",
  },
  {
    phase: "G",
    name: "Game-Turn Interphase",
    lane: "joint",
  },
];

export function getInitialSequenceState(): SequenceState {
  return { gameTurn: 1, stepIndex: 0 };
}

export function advanceSequence(state: SequenceState): SequenceState {
  if (state.stepIndex < SEQUENCE_STEPS.length - 1) {
    return { ...state, stepIndex: state.stepIndex + 1 };
  }
  return { gameTurn: state.gameTurn + 1, stepIndex: 0 };
}

export function getSequenceStepStatus(
  stepIndex: number,
  currentStepIndex: number,
): "complete" | "current" | "upcoming" {
  if (stepIndex < currentStepIndex) {
    return "complete";
  }
  return stepIndex === currentStepIndex ? "current" : "upcoming";
}
