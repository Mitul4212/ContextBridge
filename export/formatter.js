export const EXPORT_TARGETS = ['universal', 'claude', 'chatgpt', 'gemini', 'perplexity', 'grok'];

export const MASTER_SUMMARIZATION_PROMPT = String.raw`SYSTEM:
You are a context compression expert. Your job is to extract durable, high-fidelity memory from an AI chat session so anyone can resume exactly from where it stopped.

CRITICAL RULES — violating these makes the memory file useless:
1. NEVER leave "Verified Findings" or "Failed Attempts" empty. These are the two most important sections.
2. Every button combo, shortcut, command, or test result mentioned in the chat MUST appear in one of these two sections.
3. If something worked → Verified Findings. If something was tried but failed → Failed Attempts.
4. Include exact wording: "Capture + Start", "L3 + USB", "START + SELECT + HOME", etc.
5. Include all numeric values in Measurements / Metrics — battery percentages, LED counts, timings, calibration values, Lighthouse scores, error counts.
6. "Software Behavior" = ONLY directly observed facts. NO inferences or theories here — those go in Hypothesis.
7. Decisions must include the reason WHY — not just what was decided.
8. Separate "Known Issues" (identified problems + workarounds) from "Open Questions" (unresolved unknowns).
9. "Pending Tasks" must only list tasks NOT yet completed. Do not include tasks already done.
10. Include a "Key Files" section with exact file paths and their purpose if any files were mentioned.
11. If the session involves a software project, extract "Tech Stack" and any "SEO / Critical Constraints" that must not be changed.
12. If the session involves a business or product, extract "Business Context" including IDs, profile URLs, and account statuses.
13. Be concise but NEVER omit concrete evidence.

USER:
Here is a full AI chat session. Create a structured Memory File from it.

<chat>
{{RAW_CHAT_TEXT}}
</chat>

Output ONLY the following markdown structure. Nothing before or after it. Omit any section that has no relevant content — do not include empty sections.

## Project / Topic
[1-2 sentences: what this session was fundamentally about. Include project name, owner, live URL if mentioned.]

## Tech Stack
[Languages, frameworks, libraries, hosting, databases, services, IDs. Only include if a software project.]

## Key Files
[Exact file paths and their purpose that were mentioned or modified. Be specific — agents need exact paths.]

## Business Context
[Owner, live URL, GitHub, hosting, target markets, services, pricing, contact details, account IDs (GA4, Supabase, etc.), business profile statuses.]

## Goal
[What the user was trying to achieve]

## Decisions Made
[Bullet list. Each decision must include the reason: "- [what was decided] — Reason: [why]"]

## Verified Findings (Observed)
[MANDATORY — every fact confirmed by direct observation or testing.
Format: "- [observation or action] → [result or behavior]"
Include: things that worked, behaviors observed, environment quirks confirmed.
Never leave blank.]

## Failed Attempts (and outcome)
[MANDATORY — every attempt that failed or caused errors.
Format:
- Attempt: [what was tried]
  Expected: [what should have happened]
  Actual: [what actually happened / error received]
Never leave blank.]

## Hardware Behavior
[LED patterns, vibration responses, sleep behavior, charging behavior, pairing behavior observed during the session]

## Software Behavior
[ONLY directly observed facts: what the screen showed, what tools reported, what errors appeared.
Do NOT include inferences or theories here — those go in Hypothesis.]

## Measurements / Metrics
[All numeric values: Lighthouse scores, error counts, timings, percentages, calibration values, LED counts, battery levels, TBT, FCP, etc.]

## Version-Specific Behavior
[Differences across device/app/model/version/revision. Include workarounds for version-specific bugs.]

## Key Outputs
[Any important code, formulas, frameworks, structures, or artifacts produced. Include code blocks where relevant. Keep full fidelity - do not truncate code.]

## SEO / Critical Constraints
[Things that MUST NOT be changed — URLs, headings, schema, canonical tags, config values. Only include if relevant.]

## Confidence / Status

### Confirmed
[Facts directly verified by testing — no doubt]

### Likely
[Strong inferences based on observed evidence, not directly tested]

### Hypothesis
[Unproven theories that could explain observed behavior — move speculative language from other sections here]

## Known Issues
[Identified problems with known causes or workarounds. Format: "- [issue] — Cause: [why] — Workaround: [fix or mitigation]"]

## Pending Tasks
[ONLY tasks not yet completed, in priority order. Do NOT include tasks already done.
Format: "1. [task] — [why it matters or what's blocking it]"]

## Open Questions
[Things genuinely unresolved or unknown — not issues with known causes]

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
    techStack: pickSection(masterFile, 'Tech Stack'),
    keyFiles: pickSection(masterFile, 'Key Files'),
    businessContext: pickSection(masterFile, 'Business Context'),
    goal: pickSection(masterFile, 'Goal'),
    decisions: pickSection(masterFile, 'Decisions Made'),
    observed: pickSection(masterFile, 'Verified Findings (Observed)'),
    failed: pickSection(masterFile, 'Failed Attempts (and outcome)'),
    hardware: pickSection(masterFile, 'Hardware Behavior'),
    software: pickSection(masterFile, 'Software Behavior'),
    metrics: pickSection(masterFile, 'Measurements / Metrics'),
    version: pickSection(masterFile, 'Version-Specific Behavior'),
    outputs: pickSection(masterFile, 'Key Outputs'),
    seoConstraints: pickSection(masterFile, 'SEO / Critical Constraints'),
    confidence: pickSection(masterFile, 'Confidence / Status'),
    knownIssues: pickSection(masterFile, 'Known Issues'),
    pendingTasks: pickSection(masterFile, 'Pending Tasks'),
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

  const optionalSection = (label, value) => value ? `\n<${label}>${value}</${label}>` : '';
  const optionalMd = (heading, value) => value ? `\n\n## ${heading}\n${value}` : '';

  if (target === 'claude') {
    return `<context>\n<project>${s.project}</project>${optionalSection('tech_stack', s.techStack)}${optionalSection('key_files', s.keyFiles)}${optionalSection('business_context', s.businessContext)}\n<goal>${s.goal}</goal>\n<decisions>${s.decisions}</decisions>\n<observed>${s.observed}</observed>\n<failed_attempts>${s.failed}</failed_attempts>${optionalSection('hardware', s.hardware)}${optionalSection('software', s.software)}\n<metrics>${s.metrics}</metrics>${optionalSection('version_specific', s.version)}${optionalSection('outputs', s.outputs)}${optionalSection('seo_critical', s.seoConstraints)}\n<confidence>${s.confidence}</confidence>${optionalSection('known_issues', s.knownIssues)}${optionalSection('pending_tasks', s.pendingTasks)}${optionalSection('open_questions', s.openQuestions)}\n<current_state>${s.currentState}</current_state>\n</context>\n\n${s.resume}`;
  }

  if (target === 'chatgpt') {
    return `## Project\n${s.project}${optionalMd('Tech Stack', s.techStack)}${optionalMd('Key Files', s.keyFiles)}${optionalMd('Business Context', s.businessContext)}\n\n## Goal\n${s.goal}\n\n## Decisions\n${s.decisions}\n\n## Verified Findings\n${s.observed}\n\n## Failed Attempts\n${s.failed}${optionalMd('Hardware Behavior', s.hardware)}${optionalMd('Software Behavior', s.software)}\n\n## Metrics\n${s.metrics}${optionalMd('Version-Specific Behavior', s.version)}${optionalMd('Outputs', s.outputs)}${optionalMd('SEO / Critical Constraints', s.seoConstraints)}\n\n## Confidence / Status\n${s.confidence}${optionalMd('Known Issues', s.knownIssues)}${optionalMd('Pending Tasks', s.pendingTasks)}\n\n## Current State\n${s.currentState}\n\nNow continue by: ${s.resume || 'take the next concrete step.'}`;
  }

  if (target === 'gemini') {
    return `# Context Brief\n\n## Project\n${s.project}${optionalMd('Tech Stack', s.techStack)}${optionalMd('Key Files', s.keyFiles)}${optionalMd('Business Context', s.businessContext)}\n\n## Goal\n${s.goal}\n\n## Decisions\n${s.decisions}\n\n## Verified Findings\n${s.observed}\n\n## Failed Attempts\n${s.failed}${optionalMd('Hardware Behavior', s.hardware)}${optionalMd('Software Behavior', s.software)}\n\n## Measurements\n${s.metrics}${optionalMd('Version-Specific Behavior', s.version)}${optionalMd('Key Outputs', s.outputs)}${optionalMd('SEO / Critical Constraints', s.seoConstraints)}\n\n## Confidence / Status\n${s.confidence}${optionalMd('Known Issues', s.knownIssues)}${optionalMd('Pending Tasks', s.pendingTasks)}${optionalMd('Open Questions', s.openQuestions)}\n\n## Current State\n${s.currentState}\n\nPlease continue from here: ${s.resume || 'proceed with the highest-impact next action.'}`;
  }

  if (target === 'perplexity') {
    return `Goal: ${s.goal}\nCurrent state: ${s.currentState}\nKey observed facts: ${s.observed}\nFailed attempts: ${s.failed}\nPending tasks: ${s.pendingTasks || 'none'}\nNext question: ${s.resume || 'What is the best next step?'}`;
  }

  if (target === 'grok') {
    return `We were working on ${s.project}. Goal: ${s.goal}. Confirmed findings: ${s.observed}. Failed attempts: ${s.failed}.${s.hardware ? ` Hardware behavior: ${s.hardware}.` : ''}${s.software ? ` Software behavior: ${s.software}.` : ''} Current state: ${s.currentState}.${s.pendingTasks ? `\n\nPending tasks:\n${s.pendingTasks}` : ''}\n\nPick up from here: ${s.resume || 'continue with the next action.'}`;
  }

  return `## Project / Topic\n${s.project}${optionalMd('Tech Stack', s.techStack)}${optionalMd('Key Files', s.keyFiles)}${optionalMd('Business Context', s.businessContext)}\n\n## Goal\n${s.goal}\n\n## Decisions Made\n${s.decisions}\n\n## Verified Findings (Observed)\n${s.observed}\n\n## Failed Attempts (and outcome)\n${s.failed}${optionalMd('Hardware Behavior', s.hardware)}${optionalMd('Software Behavior', s.software)}\n\n## Measurements / Metrics\n${s.metrics}${optionalMd('Version-Specific Behavior', s.version)}${optionalMd('Key Outputs', s.outputs)}${optionalMd('SEO / Critical Constraints', s.seoConstraints)}\n\n## Confidence / Status\n${s.confidence}${optionalMd('Known Issues', s.knownIssues)}${optionalMd('Pending Tasks', s.pendingTasks)}\n\n## Open Questions\n${s.openQuestions}\n\n## Current State\n${s.currentState}\n\n## Resume Prompt\n${s.resume}`;
}
