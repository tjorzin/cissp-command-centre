# Sources for exam facts

Retrieved: **27 October 2026** (Africa/Harare). All values below were read from ISC2's own pages and PDFs on that date, not from memory. Explanations elsewhere in this app are original; no ISC2 outline text is reproduced beyond domain and objective titles used as navigation labels.

| Source | URL |
|---|---|
| CISSP exam outline page | https://www.isc2.org/certifications/cissp/cissp-certification-exam-outline |
| CISSP outline PDF, effective 15 April 2024 (English) | https://edge.sitecorecloud.io/internationf173-xmc4e73-prodbc0f-9660/media/Project/ISC2/Main/Media/documents/exam-outlines/CISSP-Exam-Outline-April-2024-English.pdf |
| CISSP outline PDF, effective 15 April 2027 (English) | https://edge.sitecorecloud.io/internationf173-xmc4e73-prodbc0f-9660/media/Project/ISC2/Main/Media/documents/exam-outlines/2027/EXAMS-CISSP-Exam-Outline-English-RB-Revised-1016-ENU-2.pdf |
| CISSP experience requirements | https://www.isc2.org/certifications/cissp/cissp-experience-requirements |
| CISSP certification page | https://www.isc2.org/certifications/cissp |

## Important finding: the outline changes on 15 April 2027

ISC2 has published a **new CISSP outline effective 15 April 2027**. The default target date (31 March 2027) falls under the **current 2024 outline**. A sitting on or after 15 April 2027 is tested against the **2027 outline**. The app stores both and selects by target date.

## Exam format (identical in both outlines)

| Item | Value | Status |
|---|---|---|
| Delivery | Computerised Adaptive Testing (CAT) for English, German, Spanish, Japanese, Simplified Chinese | Verified |
| Number of items | 100 to 150 | Verified |
| Length | 3 hours | Verified |
| Passing grade | 700 out of 1000 points (scaled; no fixed percentage) | Verified |
| Item format | Multiple choice and advanced (innovative) item types | Verified |

Not stated in the outline PDFs, so **not used as facts in the app**: number of unscored pretest items, exact CAT stopping rules.

## Domain weights

| # | 2024 outline (15 Apr 2024 to 14 Apr 2027) | Weight | 2027 outline (from 15 Apr 2027) | Weight |
|---|---|---|---|---|
| 1 | Security and Risk Management | 16% | Security **Governance** and Risk Management | 13.6% |
| 2 | Asset Security | 10% | Asset Security | 12% |
| 3 | Security Architecture and Engineering | 13% | Security Architecture and Engineering | 12.8% |
| 4 | Communication and Network Security | 13% | Communication and Network Security | 12.8% |
| 5 | Identity and Access Management (IAM) | 13% | Identity and Access Management (IAM) | 13.6% |
| 6 | Security Assessment and Testing | 12% | Security Assessment and Testing | 11.2% |
| 7 | Security Operations | 13% | Security Operations | 12.8% |
| 8 | Software Development Security | 10% | Software Development Security | 11.2% |

The brief's expected 2024 values are **confirmed exactly**.

## Objective structure

Both outlines keep the same numbered objectives (12 / 6 / 10 / 3 / 6 / 5 / 15 / 5 = 62). Wording shifts in the 2027 outline that matter for content:

- 1.3 adds "sustain" governance; 1.12 adds "measure" the awareness programme.
- 2.5 becomes "asset **management**" (EOL, EOS), was "asset retention".
- 5.1 "Manage" access (provision, control, review, revoke); 5.6 becomes "authentication **and authorisation** systems".
- 6.2 lists coverage analysis; 6.4 becomes "test/audit output"; 6.5 explicitly includes third-party audits.
- 7.4 names Defence in Depth; 7.8 becomes "patch and vulnerability **based** management".

### Topic-level comparison (phase 2, 27 October 2026)

Every sub-topic in both outlines was compared objective by objective. The result is in `data/domains.json`, where each topic is tagged `both`, `2024` (dropped) or `2027` (new). The Study screen shows the topics for the outline your target date falls under, and lists the differences under each objective.

**New in the 2027 outline (main items):** ethics in AI (1.1); HIPAA (1.4, 1.9); SLAs in third-party contracts (1.8); reputational supplier risk (1.11); handling requirements spelt out: physical, digital, secure media destruction, encryption (2.2); data management policy (2.4); asset management policy, retention and retirement (2.5); CNAPP (2.6); well-architected frameworks, rotation of duties, two-person integrity, privacy-enhancing technologies (3.1); HSM (3.4); OT, FaaS, supply chain risk, autonomous systems, quantum computing (3.5); post-quantum cryptography and key access management (3.6); zero-day attacks and AI threats such as adversarial AI, model poisoning and deepfakes (3.7); continuous security review (3.10); software-defined security moves to 4.1; remote working (4.3); identities as an asset type (5.1); FIDO, WebAuthn and passkeys (5.2); SOAR and DLP for egress (7.2); defence in depth (7.4); data states in incidents (7.6); EDR/XDR, DDoS scrubbing and MSSPs (7.7); immutable and encrypted backups and warm sites (7.10); DR metrics such as MTTR and MTBF (7.11); SSDF, SBOM requirements and shift left (8.1); memory-safe languages (8.2); SCA moves to open source and FaaS is added (8.4).

**Dropped or moved in the 2027 outline:** industry-standards investigations (1.5); social engineering and phishing as awareness examples (1.12); "trust but verify" (3.1); quantum cryptography and quantum key distribution (3.6); red, blue and purple team examples (6.2); SLAs leave 7.4 (moved to 1.8); data at rest and in transit leave 7.5; multiple processing sites and resilience move from 7.11 to 7.10; insider threat, social media and MFA fatigue examples (7.15); SCA and IAST leave 8.2; software-defined security leaves 8.5.

What this means for a sitting before 15 April 2027: study the 2024 topics. The 2027-only topics are useful background, and current practice in several areas (post-quantum cryptography, passkeys, EDR/XDR, immutable backups), but they are not on the 2024 syllabus.

## Framework currency check: Domain 1 batch (28 October 2026)

| Item | Finding | Source quality |
|---|---|---|
| NIST CSF | 2.0 (2024) is current: six functions, Govern added. No newer version found. | Secondary sources; NIST page to confirm |
| PCI DSS | v4.0.1 (June 2024) is the only valid version; future-dated requirements mandatory since 31 March 2025. A request for comments ran to July 2026; no successor published. | Secondary sources |
| ISC2 Code of Ethics | Four canons unchanged. ISC2 launched a separate Code of Professional Conduct in February 2026 that builds on the Code of Ethics. | isc2.org pages |
| Zimbabwe data protection | Cyber and Data Protection Act (2021) with regulations SI 155 of 2024: breach reports to POTRAZ reportedly within 24 hours of awareness, and to data subjects within 72 hours where the risk is high. POTRAZ inspections reported from 1 September 2026. | **Secondary sources only** (law firm and news summaries); used in practical notes, never as a tested fact |

## Framework currency check: Domain 2 batch (28 October 2026)

| Item | Finding | Source quality |
|---|---|---|
| NIST SP 800-88 | **Revision 2 published September 2025**, superseding Rev. 1 (2014). It shifts from technique-by-technique guidance to running a sanitisation programme, and refers to IEEE 2883, NSA specifications or an approved standard for techniques; cryptographic erase is still covered. | csrc.nist.gov |
| IEEE 2883-2022 | Defines Clear, Purge and Destruct (Rev. 1 of SP 800-88 said "Destroy"). Purge makes recovery infeasible while allowing reuse; Destruct physically destroys the media. | Secondary summaries |

Content follows Rev. 2 and IEEE 2883 and still accepts "destroy" as the common name for the top level.

## Framework currency check: Domain 3 batch (28 October 2026)

| Item | Finding | Status used in content |
|---|---|---|
| FIPS 203 / 204 / 205 | ML-KEM (key establishment), ML-DSA and SLH-DSA (signatures), final August 2024 | Tested as current |
| FIPS 206 (FN-DSA, from Falcon) | Still a draft in mid-2026; final expected late 2026 or 2027 | Mentioned as draft only |
| HQC | Selected March 2025 as a backup KEM on a different mathematical basis; draft standard pending | Mentioned as draft only |
| NIST IR 8547 | Initial public draft (November 2024): 112-bit algorithms such as RSA-2048 and P-256 deprecated by 2030, quantum-vulnerable public-key algorithms disallowed by 2035. Still a draft | Practical notes only, labelled draft |

Sources: vendor and trade summaries of NIST announcements; confirm on csrc.nist.gov before relying on dates.

## Framework currency check: Domain 4 batch (28 October 2026)

Domain 4 content relies on long-stable standards: TLS 1.3 (RFC 8446, 2018), IPsec (RFC 4301 family), IEEE 802.1X, WPA3 (Wi-Fi Alliance, 2018) and 5G's concealed subscriber identifier (SUCI, 3GPP Release 15). No change affecting tested facts was identified; content avoids version-sensitive vendor claims.

## Experience and the Associate route (verified)

- Five years cumulative, full-time, paid experience in **two or more** of the eight domains.
- **Only one year** can be waived: by a relevant bachelor's/master's degree **or** a credential on ISC2's approved list.
- Part-time (20 to 34 hrs/week) counts: 1,040 hrs = 6 months, 2,080 hrs = 12 months. Paid or unpaid internships count with letterhead documentation.
- Without the experience, passing the exam makes you an **Associate of ISC2**, with **six years** to earn the five years.

Note for Jorzin: 10+ years in infrastructure counts only where the work maps to at least two CISSP domains (for example network security, IAM, security operations). Whether the ISC2 CC credential is on the waiver list was not checked; it is not needed given the experience on record.
