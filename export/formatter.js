export const EXPORT_TARGETS = ['universal', 'claude', 'chatgpt', 'gemini', 'perplexity', 'grok'];

export const MASTER_SUMMARIZATION_PROMPT = String.raw`SYSTEM:
You are a context compression expert. Your job is to extract durable, high-fidelity memory from an AI chat session so anyone can resume exactly from where it stopped.

CRITICAL RULES — violating these makes the memory file useless:
1. NEVER leave "Verified Findings" or "Failed Attempts" empty. These are the two most important sections.
2. Every button combo, shortcut, command, or test result mentioned in the chat MUST appear in one of these two sections.
3. If something worked → Verified Findings. If something was tried but failed → Failed Attempts.
4. Include exact wording: "Capture + Start", "L3 + USB", "START + SELECT + HOME", etc.
5. Include all numeric values in Measurements / Metrics — battery percentages, LED counts, timings, calibration values.
6. "Software Behavior" = ONLY directly observed facts (what Windows showed, what the updater said, what the tool reported). NO inferences or theories here.
7. "Hypothesis" in Confidence/Status = unproven theories (e.g. "firmware uses a different bootloader"). Move any speculative language from Software Behavior into Hypothesis.
8. For each major finding in Confidence/Status, assign: Confirmed (directly tested), Likely (strong inference), or Hypothesis (unproven theory).
9. Be concise but NEVER omit concrete evidence.

USER:
Here is a full AI chat session. Create a structured Memory File from it.

<chat>
{{RAW_CHAT_TEXT}}
</chat>

Output ONLY the following markdown structure. Nothing before or after it.

## Project / Topic
[1-2 sentences: what this session was fundamentally about]

## Goal
[What the user was trying to achieve]

## Decisions Made
[Bullet list of concrete decisions, choices, or conclusions reached]

## Verified Findings (Observed)
[MANDATORY — every fact confirmed by direct testing/observation.
Format: "- [action/shortcut] → [observed result]"
Include: successful button combinations, LED behaviors, software detections, hardware responses.
Never leave blank. If in doubt, include it here.]

## Failed Attempts (and outcome)
[MANDATORY — every attempt that failed or gave unexpected results.
Format:
- Attempt: [what was tried]
  Expected: [what should have happened]
  Actual: [what actually happened]
Never leave blank. If in doubt, include it here.]

## Hardware Behavior
[LED patterns, vibration responses, sleep behavior, charging behavior, pairing behavior observed during the session]

## Software Behavior
[ONLY directly observed facts: Windows detection names, what firmware updater showed on screen, what third-party tools reported.
Do NOT include inferences or theories here — those go in Hypothesis.]

## Measurements / Metrics
[All numeric values, error rates, timings, percentages, calibration values, LED counts, battery levels, etc.]

## Version-Specific Behavior
[Differences across device/app/model/version/revision]

## Key Outputs
[Any important code, formulas, frameworks, structures, or artifacts produced. Include code blocks where relevant. Keep full fidelity - do not truncate code.]

## Confidence / Status

### Confirmed
[Facts directly verified by testing — no doubt]

### Likely
[Strong inferences based on observed evidence, not directly tested]

### Hypothesis
[Unproven theories that could explain observed behavior — move speculative language from other sections here]

## Open Questions
[Things unresolved or left for later]

## Current State
[Exactly where things stood at the end - what was done and not done]

## Resume Prompt
[A single paragraph in second person to the AI: "We were working on... The last decision was... Please continue by..."]`;

export function buildFidelityPatchPrompt(rawChatText, masterFile) {
  return `SYSTEM:
You are a strict memory auditor. Compare a transcript against a memory file and find everything that was missed.

Pay special attention to:
- "Verified Findings (Observed)" — any button combo, shortcut, command, or test that WORKED must be here. Format: "- [action] → [result]". Never leave empty.
- "Failed Attempts (and outcome)" — any attempt that FAILED or gave unexpected results must be here. Format: "- Attempt: [what] / Expected: [x] / Actual: [y]". Never leave empty.
- "Hardware Behavior" — LED patterns, vibration, charging, pairing behavior
- "Software Behavior" — ONLY directly observed facts (what the screen showed, what the tool reported). Move any speculative language to Hypothesis.
- "Measurements / Metrics" — any number, percentage, LED count, battery level, timing must be here
- "Confidence / Status" — Confirmed = directly tested, Likely = strong inference, Hypothesis = unproven theory. Move speculative statements from Software Behavior into Hypothesis.

USER:
Transcript:
<chat>
${rawChatText}
</chat>

Memory file:
<memory>
${masterFile}
</memory>

Task:
1) Find every concrete fact in the transcript missing or understated in the memory file.
2) Check Software Behavior for any speculative/inferential language — move it to Hypothesis.
3) Return a revised full memory file using the same section structure.
4) Add only missing facts. Do not remove anything already there.`;
}

export function buildSectionCompletionPrompt(rawChatText, masterFile) {
  return `SYSTEM:
You are a precision technical note editor. Your job is to extract concrete evidence from a transcript and fill in missing sections of a memory file.

Rules:
- Read the ENTIRE transcript carefully for any test results, observations, button presses, commands run, error messages, or outcomes.
- "Verified Findings" = things directly observed or confirmed to work. Format: "- [action] → [result]". Extract every single one. Never leave blank.
- "Failed Attempts" = things tried but failed. Format: "- Attempt: [what]\n  Expected: [what should happen]\n  Actual: [what happened]". Extract every single one. Never leave blank.
- "Hardware Behavior" = LED patterns, vibration, sleep, charging, pairing behavior observed.
- "Software Behavior" = ONLY directly observed facts: what Windows showed, what the firmware updater displayed, what third-party tools reported. Do NOT include inferences or theories — move those to Hypothesis.
- "Measurements / Metrics" = any numbers, percentages, battery levels, timings, counts. Extract all of them.
- "Confidence / Status" = populate three subsections:
  ### Confirmed — facts directly verified by testing
  ### Likely — strong inferences from evidence, not directly tested
  ### Hypothesis — unproven theories. Also move any speculative language found in Software Behavior here.
- If a section currently says "None", "N/A", or similar but the transcript contains relevant evidence, REPLACE it with the real findings.
- If a section truly has no evidence in the transcript, write "- None observed."
- Return the FULL revised memory file with exactly the same section structure. Do not drop any sections.

Transcript:
<chat>
${rawChatText}
</chat>

Memory file:
<memory>
${masterFile}
</memory>`;
}

function pickSection(masterFile, heading) {
  const pattern = new RegExp(`##\\s+${heading.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*([\\s\\S]*?)(?=\\n##\\s+|$)`, 'i');
  const match = masterFile.match(pattern);
  return match ? match[1].trim() : '';
}

function extract(masterFile) {
  return {
    project: pickSection(masterFile, 'Project / Topic'),
    goal: pickSection(masterFile, 'Goal'),
    decisions: pickSection(masterFile, 'Decisions Made'),
    observed: pickSection(masterFile, 'Verified Findings (Observed)'),
    failed: pickSection(masterFile, 'Failed Attempts (and outcome)'),
    hardware: pickSection(masterFile, 'Hardware Behavior'),
    software: pickSection(masterFile, 'Software Behavior'),
    metrics: pickSection(masterFile, 'Measurements / Metrics'),
    version: pickSection(masterFile, 'Version-Specific Behavior'),
    outputs: pickSection(masterFile, 'Key Outputs'),
    confidence: pickSection(masterFile, 'Confidence / Status'),
    openQuestions: pickSection(masterFile, 'Open Questions'),
    currentState: pickSection(masterFile, 'Current State'),
    resume: pickSection(masterFile, 'Resume Prompt')
  };
}

export function buildMasterPrompt(rawChatText) {
  return MASTER_SUMMARIZATION_PROMPT.replace('{{RAW_CHAT_TEXT}}', rawChatText || '');
}

export function formatForTarget(masterFile, target) {
  const s = extract(masterFile);

  if (target === 'claude') {
    return `<context>\n<project>${s.project}</project>\n<goal>${s.goal}</goal>\n<decisions>${s.decisions}</decisions>\n<observed>${s.observed}</observed>\n<failed_attempts>${s.failed}</failed_attempts>\n<hardware>${s.hardware}</hardware>\n<software>${s.software}</software>\n<metrics>${s.metrics}</metrics>\n<version_specific>${s.version}</version_specific>\n<outputs>${s.outputs}</outputs>\n<confidence>${s.confidence}</confidence>\n<open_questions>${s.openQuestions}</open_questions>\n<current_state>${s.currentState}</current_state>\n</context>\n\n${s.resume}`;
  }

  if (target === 'chatgpt') {
    return `## Project\n${s.project}\n\n## Goal\n${s.goal}\n\n## Decisions\n${s.decisions}\n\n## Verified Findings\n${s.observed}\n\n## Failed Attempts\n${s.failed}\n\n## Hardware Behavior\n${s.hardware}\n\n## Software Behavior\n${s.software}\n\n## Metrics\n${s.metrics}\n\n## Version-Specific Behavior\n${s.version}\n\n## Outputs\n${s.outputs}\n\n## Confidence / Status\n${s.confidence}\n\n## Current State\n${s.currentState}\n\nNow continue by: ${s.resume || 'take the next concrete step.'}`;
  }

  if (target === 'gemini') {
    return `# Context Brief\n\n## Project\n${s.project}\n\n## Goal\n${s.goal}\n\n## Decisions\n${s.decisions}\n\n## Verified Findings\n${s.observed}\n\n## Failed Attempts\n${s.failed}\n\n## Hardware Behavior\n${s.hardware}\n\n## Software Behavior\n${s.software}\n\n## Measurements\n${s.metrics}\n\n## Version-Specific Behavior\n${s.version}\n\n## Key Outputs\n${s.outputs}\n\n## Confidence / Status\n${s.confidence}\n\n## Open Questions\n${s.openQuestions}\n\n## Current State\n${s.currentState}\n\nPlease continue from here: ${s.resume || 'proceed with the highest-impact next action.'}`;
  }

  if (target === 'perplexity') {
    return `Goal: ${s.goal}\nCurrent state: ${s.currentState}\nKey observed facts: ${s.observed}\nFailed attempts: ${s.failed}\nNext question: ${s.resume || 'What is the best next step?'}`;
  }

  if (target === 'grok') {
    return `We were working on ${s.project}. Goal: ${s.goal}. Confirmed findings: ${s.observed}. Failed attempts: ${s.failed}. Hardware behavior: ${s.hardware}. Software behavior: ${s.software}. Current state: ${s.currentState}.\n\nPick up from here: ${s.resume || 'continue with the next action.'}`;
  }

  return `## Project / Topic\n${s.project}\n\n## Goal\n${s.goal}\n\n## Decisions Made\n${s.decisions}\n\n## Verified Findings (Observed)\n${s.observed}\n\n## Failed Attempts (and outcome)\n${s.failed}\n\n## Hardware Behavior\n${s.hardware}\n\n## Software Behavior\n${s.software}\n\n## Measurements / Metrics\n${s.metrics}\n\n## Version-Specific Behavior\n${s.version}\n\n## Key Outputs\n${s.outputs}\n\n## Confidence / Status\n${s.confidence}\n\n## Open Questions\n${s.openQuestions}\n\n## Current State\n${s.currentState}\n\n## Resume Prompt\n${s.resume}`;
}
