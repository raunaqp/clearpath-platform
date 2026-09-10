/**
 * Question text for a clarification.
 *
 * `buildClarifyingQuestions` generates a serviceable question from the gate and
 * the gap. These are better ones — written for the specific evidence on file,
 * naming what is wrong with it rather than restating the gate. A question a
 * vendor can answer precisely gets a precise answer; "which document supports
 * your answer here?" gets a document list.
 *
 * Keyed by slug and gate, falling back to the generated text where none is
 * written. `binds` names the document already on file that a truthful answer
 * would point at — an answer supplies a BINDING, never new evidence.
 */
export type WrittenQuestion = { text: string; binds: string | null };

export const WRITTEN_QUESTIONS: Record<string, Record<string, WrittenQuestion>> = {
  cerviai: {
    G1: {
      text: "Your validation study is single-centre and non-Indian. Is an India-population evaluation underway, and at what care level?",
      binds: "ev-cerviai-validation",
    },
    G17: {
      text: "The subgroup analysis comes from that same cohort. Has performance been checked in an Indian screening population?",
      binds: "ev-cerviai-validation",
    },
    G2: {
      text: "Fail-safe behaviour is described in a vendor-run evaluation. Has the override pathway been observed by anyone outside the company?",
      binds: "ev-cerviai-eval",
    },
    G3: {
      text: "Who decides referral when the tool and the nurse disagree?",
      binds: "ev-cerviai-eval",
    },
    G8: {
      text: "What does the nurse see when the tool returns low confidence?",
      binds: "ev-cerviai-eval",
    },
  },
  retinascan: {
    G13: {
      text: "You declare export as partly in place with nothing bound to it. Does the user manual document the export format, and where?",
      binds: "ev-retinascan-manual",
    },
    G17: {
      text: "Fairness across skin tones is declared as requiring support, with no document against it. Is the subgroup breakdown in the validation study?",
      binds: "ev-retinascan-validation",
    },
    G6: {
      text: "Operability at PHC is declared as requiring support. Does the operator training pack cover camera handling at a PHC, and by which cadre?",
      binds: "ev-retinascan-manual",
    },
    G2: {
      text: "Fail-safe behaviour rests on the validation study alone. Has the override been observed outside the study setting?",
      binds: "ev-retinascan-validation",
    },
    G1: {
      text: "The predicate-based validation was read by specialists at a tertiary institute. Is a PHC-camera evaluation underway?",
      binds: "ev-retinascan-validation",
    },
  },
};

export function writtenQuestion(slug: string, gateId: string): WrittenQuestion | undefined {
  return WRITTEN_QUESTIONS[slug]?.[gateId];
}
