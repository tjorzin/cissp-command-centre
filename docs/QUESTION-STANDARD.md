# Question standard

Every question in `data/questions.json` must meet this standard. `tests/validate-content.js` checks the mechanical rules automatically; the judgement rules are checked by review. A question that fails either is rewritten or cut. Fewer sharp items beat many weak ones.

## 1. No give-aways (automated where marked ⚙)

| Rule | Why |
|---|---|
| ⚙ **Length parity.** No option may be more than 35% longer than the mean of the others, and the correct option must not be the single longest in more than ~30% of the bank. | The longest, most qualified answer is the classic tell. |
| ⚙ **No stem echo.** The correct option must not be the only option that repeats a distinctive word from the stem. | Keyword matching should never beat understanding. |
| ⚙ **No absolutes as tells.** "always", "never", "only", "all", "none", "guarantees", "completely" may appear in at most one option, and that option is not reliably wrong across the bank. | Test-wise candidates eliminate absolutes on sight. |
| ⚙ **Banned options.** No "all of the above", "none of the above", "both A and B". | They test option logic, not security. |
| ⚙ **Answer-key spread.** No position holds more than ~35% of single-answer correct keys; options are shuffled at display anyway. | Positional bias. |
| ⚙ **Multi-select count varies.** Multi questions say "Select TWO" or "Select THREE", and the bank mixes both. | A fixed count is a tell. |
| **Parallel grammar.** All options share the same form (all actions, all nouns, all controls) and fit the stem grammatically. | A mismatched article or tense gives the answer away. |
| **No odd-one-out.** The correct answer is not the only governance option among three technical ones (or the reverse). At least one distractor is in the same category as the key. | Category spotting is not the manager mindset. |
| **No textbook phrasing on the key.** The correct option is not the only one written in study-guide language. | Familiar wording is a tell. |

## 2. Realism and difficulty

- **Target mix:** difficulty 1–2 at most 15% of the bank, 3 about 25%, 4–6 at least 60%. Hard mode (5–6) has at least 20 items per domain by the full bank.
- **Exam-length stems** (typically 50–120 words for level 4+), set in a realistic organisation with a stated role for the reader ("You are the CISO…", "As the security manager…").
- **Deliberate decoy detail:** at least one true but irrelevant fact in level 4+ stems (a product name, a budget figure, a past incident) that tempts a technical answer.
- **Several plausible answers at level 6:** at least two options a competent engineer would defend; the key wins only on CISSP reasoning (first step, life safety, governance, cost against risk, scope). The rationale for the runner-up says exactly why it loses.
- **Every distractor is wrong for a stated, specific reason** in `rationales`, not "this is incorrect".
- **Question types to favour:** FIRST / BEST / MOST / LEAST / NEXT, "which is the PRIMARY concern", and sequence questions. Avoid pure definition recall beyond level 2.
- **Sector spread:** banking, telecoms, healthcare, government, mining, manufacturing, cloud SaaS, with some African settings (for example a Harare-based telco, a regional bank). Do not use real organisations' names.

## 3. Currency: write against the latest material

Content reflects the outline in force on the target date (2024 outline by default; topics new in the 2027 outline are tagged `outline2027`) and current versions of the frameworks the exam draws on. Before writing a domain batch, confirm each version below is still current and note any change in `data/SOURCES.md`.

| Area | Version to use | Status |
|---|---|---|
| Cybersecurity framework | NIST CSF 2.0 (Govern function added) | to re-verify at batch time |
| ISMS | ISO/IEC 27001:2022 and 27002:2022 (93 controls, 4 themes) | to re-verify |
| Control catalogue / RMF | NIST SP 800-53 Rev 5, SP 800-37 Rev 2 | to re-verify |
| Zero trust | NIST SP 800-207 | to re-verify |
| Digital identity | NIST SP 800-63-4 | to re-verify |
| Incident response | NIST SP 800-61 Rev 3 (aligned to CSF 2.0) | to re-verify |
| Post-quantum cryptography | FIPS 203 (ML-KEM), 204 (ML-DSA), 205 (SLH-DSA) and NIST transition guidance | to re-verify |
| Payment cards | PCI DSS v4.0.1 | to re-verify |
| Privacy law | GDPR; Zimbabwe Cyber and Data Protection Act [Chapter 12:07] (2021) for practical notes | to re-verify |
| EU regulation | NIS2, DORA, EU AI Act | to re-verify |
| Application security | Current OWASP Top 10 and ASVS, SBOM, SLSA, secure-by-design | to re-verify |

Rules: never test a superseded version as current (for example CSF 1.1's five functions, ISO 27001:2013's 114 controls, PCI DSS 3.2.1). Where the exam may still expect a classic model (Bell-LaPadula, Biba, Clark-Wilson, the ISC2 Code of Ethics canons), test it as the exam frames it.

## 4. Integrity

- All questions are original. None is, or is claimed to be, a real ISC2 item. No ISC2 or publisher text is copied.
- Facts in `rationales` and `practicalNote` that rely on a standard name the standard and version.
