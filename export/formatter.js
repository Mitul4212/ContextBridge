export const EXPORT_TARGETS = ['universal', 'claude', 'chatgpt', 'gemini', 'perplexity', 'grok'];

export const MASTER_SUMMARIZATION_PROMPT = String.raw`SYSTEM:
You are a context compression expert. Your job is to extract durable, high-fidelity memory from an AI chat session so anyone can resume exactly from where it stopped.

CRITICAL RULES — violating these makes the memory file useless:
1. NEVER leave "Verified Findings" or "Failed Attempts" empty. These are the two most important sections.
2. Every command, config change, test, or action mentioned in the chat MUST appear in one of these two sections.
3. If something worked or was observed → Verified Findings. If something was tried but failed or caused an error → Failed Attempts.
4. Include exact wording, file names, flag names, error messages, IDs, and values.
5. Include all numeric values in Measurements / Metrics — scores, counts, timings, percentages, IDs.
6. "Software Behavior" = ONLY directly observed facts. NO inferences or theories — those go in Hypothesis.
7. Decisions must include the reason WHY — not just what was decided.
8. TASK STATUS — read carefully before writing Pending Tasks:
   - A task is DONE if the transcript shows it was completed, fixed, deployed, or resolved.
   - A task is PENDING only if it was explicitly mentioned as future work or left unfinished at the end.
   - Do NOT list completed work as pending. Do NOT list failed attempts as pending tasks.
9. OPEN QUESTIONS — only list things that are genuinely unresolved at the end of the session.
   - If a question was answered during the session, do NOT list it as open.
   - If an issue was fixed, do NOT list it as an open question.
10. Include a "Key Files" section with exact file paths and their purpose if any files were mentioned.
11. If the session involves a software project, extract "Tech Stack" and any "SEO / Critical Constraints".
12. If the session involves a business or product, extract "Business Context" including ALL account IDs, profile URLs, and statuses.
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
[Owner, live URL, GitHub, hosting, target markets, services, pricing, contact details.
Include ALL account IDs and statuses: GA4 measurement ID, Supabase project ID, Search Console property type, all business profile statuses (Google Business, LinkedIn, Crunchbase, GoodFirms, Clutch, etc.)]

## Goal
[What the user was trying to achieve]

## Decisions Made
[Bullet list. Each decision must include the reason: "- [what was decided] — Reason: [why]"]

## Verified Findings (Observed)
[MANDATORY — every fact confirmed by direct observation or testing.
Format: "- [observation or action] → [result or behavior]"
Include: things that worked, behaviors observed, environment quirks confirmed, tool behaviors.
Never leave blank. If in doubt, include it.]

## Failed Attempts (and outcome)
[MANDATORY — every attempt that failed or caused errors.
Format:
- Attempt: [what was tried]
  Expected: [what should have happened]
  Actual: [what actually happened / error received]
Never leave blank. If in doubt, include it.]

## Hardware Behavior
[LED patterns, vibration responses, sleep behavior, charging behavior, pairing behavior observed during the session]

## Software Behavior
[ONLY directly observed facts: what the screen showed, what tools reported, what errors appeared.
Do NOT include inferences or theories here — those go in Hypothesis.]

## Measurements / Metrics
[All numeric values: Lighthouse scores, error counts, timings, percentages, calibration values, LED counts, battery levels, TBT, FCP, health scores, etc.]

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
[Problems identified but NOT yet fixed. Format: "- [issue] — Cause: [why] — Workaround: [fix or mitigation]"
Do NOT list issues that were already resolved during this session.]

## Pending Tasks
[ONLY tasks explicitly left unfinished or planned for future sessions. In priority order.
Do NOT include tasks already completed during this session.
Format: "1. [task] — [why it matters or what's blocking it]"]

## Open Questions
[ONLY things genuinely unresolved at the end of the session — not answered, not fixed.
Do NOT list questions that were answered during the session.]

## Current State
[Exactly where things stood at the end - what was done and not done]

## Resume Prompt
[A single paragraph in second person to the AI: "We were working on... The last thing completed was... Please continue by..."]`;

export function buildFidelityPatchPrompt(rawChatText, masterFile) {
  return `SYSTEM:
You are a strict memory auditor. Compare a transcript against a memory file and find everything that was missed or wrong.

Pay special attention to:
- "Verified Findings (Observed)" — any command, config, test, or observation that WORKED or was confirmed must be here. Format: "- [action] → [result]". Never leave empty.
- "Failed Attempts (and outcome)" — any attempt that FAILED or caused an error must be here. Format: "- Attempt: [what] / Expected: [x] / Actual: [y]". Never leave empty.
- "Business Context" — extract ALL account IDs (GA4, Supabase project ID), all business profile statuses (Google Business, LinkedIn, Crunchbase, GoodFirms, Clutch, etc.).
- "Software Behavior" — ONLY directly observed facts. Move any speculative language to Hypothesis.
- "Measurements / Metrics" — any number, percentage, score, count, timing, ID must be here.
- "Pending Tasks" — ONLY tasks left unfinished at the END of the session. Remove any tasks that were completed during the session.
- "Known Issues" — ONLY problems NOT yet fixed. Remove any issues that were resolved during the session.
- "Open Questions" — ONLY questions unanswered at the END. Remove any that were answered during the session.
- "Confidence / Status" — Confirmed = directly tested, Likely = strong inference, Hypothesis = unproven theory.

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
2) Remove from Pending Tasks, Known Issues, and Open Questions anything that was completed/resolved/answered in the transcript.
3) Check Software Behavior for speculative language — move it to Hypothesis.
4) Return a revised full memory file using the same section structure.
5) Add only missing facts. Do not remove anything that is still accurate.`;
}

export function buildSectionCompletionPrompt(rawChatText, masterFile) {
  return `SYSTEM:
You are a precision technical note editor. Your job is to extract concrete evidence from a transcript and fill in missing sections of a memory file, while also removing stale entries.

Rules:
- Read the ENTIRE transcript carefully for any test results, observations, commands run, errors, or outcomes.
- "Verified Findings" = things directly observed or confirmed to work. Format: "- [action] → [result]". Extract every single one. Never leave blank.
- "Failed Attempts" = things tried but failed. Format: "- Attempt: [what]\n  Expected: [what should happen]\n  Actual: [what happened]". Extract every single one. Never leave blank.
- "Business Context" = extract ALL account IDs (GA4 measurement ID, Supabase project ID), ALL business profile statuses with platform names.
- "Hardware Behavior" = LED patterns, vibration, sleep, charging, pairing behavior observed.
- "Software Behavior" = ONLY directly observed facts. Do NOT include inferences — move those to Hypothesis.
- "Measurements / Metrics" = any numbers, percentages, scores, IDs, counts. Extract all of them.
- "Pending Tasks" = ONLY tasks left unfinished at the END. If the transcript shows a task was completed, remove it.
- "Known Issues" = ONLY problems NOT yet fixed. If the transcript shows an issue was resolved, remove it.
- "Open Questions" = ONLY questions unanswered at the END. If answered in the transcript, remove them.
- "Confidence / Status" = Confirmed / Likely / Hypothesis. Move speculative language from Software Behavior to Hypothesis.
- If a section says "None", "N/A", or similar but the transcript has evidence, REPLACE it.
- If a section truly has no evidence, write "- None observed."
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

  const optionalSection = (label, value) => value ? `\n<${label}>\n${value}\n</${label}>` : '';
  const optionalMd = (heading, value) => value ? `\n\n## ${heading}\n${value}` : '';

  if (target === 'claude') {
    // Claude: XML tags, all context FIRST, resume prompt (task) at the very END
    // Per Anthropic docs: putting query at end improves quality up to 30%
    return `<documents>
<document index="1">
<source>context_memory_file</source>
<document_content>
<project>${s.project}</project>${optionalSection('tech_stack', s.techStack)}${optionalSection('key_files', s.keyFiles)}${optionalSection('business_context', s.businessContext)}${optionalSection('business_profiles', s.businessContext ? '' : '')}
<goal>${s.goal}</goal>
<decisions>${s.decisions}</decisions>
<observed>${s.observed}</observed>
<failed_attempts>${s.failed}</failed_attempts>${optionalSection('hardware', s.hardware)}${optionalSection('software', s.software)}
<metrics>${s.metrics}</metrics>${optionalSection('version_specific', s.version)}${optionalSection('outputs', s.outputs)}${optionalSection('seo_critical', s.seoConstraints)}
<confidence>${s.confidence}</confidence>${optionalSection('known_issues', s.knownIssues)}${optionalSection('pending_tasks', s.pendingTasks)}${optionalSection('open_questions', s.openQuestions)}
<current_state>${s.currentState}</current_state>
</document_content>
</document>
</documents>

${s.resume}`;
  }

  if (target === 'chatgpt') {
    // ChatGPT: Markdown headers, structured clearly
    return `## Project\n${s.project}${optionalMd('Tech Stack', s.techStack)}${optionalMd('Key Files', s.keyFiles)}${optionalMd('Business Context', s.businessContext)}\n\n## Goal\n${s.goal}\n\n## Decisions\n${s.decisions}\n\n## Verified Findings\n${s.observed}\n\n## Failed Attempts\n${s.failed}${optionalMd('Hardware Behavior', s.hardware)}${optionalMd('Software Behavior', s.software)}\n\n## Metrics\n${s.metrics}${optionalMd('Version-Specific Behavior', s.version)}${optionalMd('Key Outputs', s.outputs)}${optionalMd('SEO / Critical Constraints', s.seoConstraints)}\n\n## Confidence / Status\n${s.confidence}${optionalMd('Known Issues', s.knownIssues)}${optionalMd('Pending Tasks', s.pendingTasks)}${optionalMd('Open Questions', s.openQuestions)}\n\n## Current State\n${s.currentState}\n\n---\n\n${s.resume || 'Please continue from where we left off.'}`;
  }

  if (target === 'gemini') {
    // Gemini: Context FIRST, bridge phrase, then task at END
    // Per Google docs: "supply all context first, place instructions at the very end"
    return `# Session Context\n\n## Project\n${s.project}${optionalMd('Tech Stack', s.techStack)}${optionalMd('Key Files', s.keyFiles)}${optionalMd('Business Context', s.businessContext)}\n\n## Goal\n${s.goal}\n\n## Decisions\n${s.decisions}\n\n## Verified Findings\n${s.observed}\n\n## Failed Attempts\n${s.failed}${optionalMd('Hardware Behavior', s.hardware)}${optionalMd('Software Behavior', s.software)}\n\n## Measurements\n${s.metrics}${optionalMd('Version-Specific Behavior', s.version)}${optionalMd('Key Outputs', s.outputs)}${optionalMd('SEO / Critical Constraints', s.seoConstraints)}\n\n## Confidence / Status\n${s.confidence}${optionalMd('Known Issues', s.knownIssues)}${optionalMd('Pending Tasks', s.pendingTasks)}${optionalMd('Open Questions', s.openQuestions)}\n\n## Current State\n${s.currentState}\n\n---\n\nBased on the context above, ${s.resume || 'please continue from where we left off.'}`;
  }

  if (target === 'perplexity') {
    // Perplexity: Search-focused, concise facts + clear next question
    return `**Project:** ${s.project}\n\n**Goal:** ${s.goal}\n\n**Current State:** ${s.currentState}\n\n**Key Facts:**\n${s.observed}\n\n**What Failed:**\n${s.failed}\n\n**Pending:**\n${s.pendingTasks || 'none'}\n\n**Open Questions:**\n${s.openQuestions || 'none'}\n\n---\n\n${s.resume || 'What is the best next step?'}`;
  }

  if (target === 'grok') {
    // Grok: Structured plain text, direct and concise
    return `Context for continuing our session:\n\nProject: ${s.project}\nGoal: ${s.goal}\n${s.techStack ? `\nTech stack: ${s.techStack}` : ''}${s.keyFiles ? `\nKey files: ${s.keyFiles}` : ''}\n\nWhat we confirmed works:\n${s.observed}\n\nWhat failed:\n${s.failed}\n${s.hardware ? `\nHardware behavior: ${s.hardware}` : ''}${s.software ? `\nSoftware behavior: ${s.software}` : ''}\n\nMetrics: ${s.metrics}\n${s.knownIssues ? `\nKnown issues: ${s.knownIssues}` : ''}${s.pendingTasks ? `\nPending tasks:\n${s.pendingTasks}` : ''}\n\nCurrent state: ${s.currentState}\n\n${s.resume || 'Continue with the next action.'}`;
  }

  // Universal: Clean markdown, context first, resume prompt last
  return `## Project / Topic\n${s.project}${optionalMd('Tech Stack', s.techStack)}${optionalMd('Key Files', s.keyFiles)}${optionalMd('Business Context', s.businessContext)}\n\n## Goal\n${s.goal}\n\n## Decisions Made\n${s.decisions}\n\n## Verified Findings (Observed)\n${s.observed}\n\n## Failed Attempts (and outcome)\n${s.failed}${optionalMd('Hardware Behavior', s.hardware)}${optionalMd('Software Behavior', s.software)}\n\n## Measurements / Metrics\n${s.metrics}${optionalMd('Version-Specific Behavior', s.version)}${optionalMd('Key Outputs', s.outputs)}${optionalMd('SEO / Critical Constraints', s.seoConstraints)}\n\n## Confidence / Status\n${s.confidence}${optionalMd('Known Issues', s.knownIssues)}${optionalMd('Pending Tasks', s.pendingTasks)}\n\n## Open Questions\n${s.openQuestions}\n\n## Current State\n${s.currentState}\n\n## Resume Prompt\n${s.resume}`;
}
