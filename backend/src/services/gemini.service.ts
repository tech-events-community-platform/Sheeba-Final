export interface EventContextForAI {
  title: string;
  description?: string;
  type?: string;
  date?: string;
  time?: string;
  location?: string;
  venueName?: string;
  organizerName?: string;
}

export interface AINarrativeReport {
  executiveSummary: string;
  eventBackground: string;
  objectives: string;
  deliveryNarrative?: string;
  audienceOverview: string;
  experienceNarrative?: string;
  organizationsNarrative: string;
  interestsNarrative: string;
  motivationNarrative: string;
  engagementNarrative: string;
  communityFindings?: string;
  attendeeVoice?: Array<{
    quote: string;
    theme: string;
    explanation: string;
  }>;
  audienceDeepAnalysis?: {
    profile: string;
    keyThemes: string;
    emergingInterests: string;
    communityOpportunities: string;
  };
  performanceAnalysis?: string;
  keyFindings: Array<{
    title: string;
    evidence: string;
  }>;
  structuredRecommendations?: {
    futureProgramming: string;
    mentorship: string;
    communityDevelopment: string;
  };
  partnerImpactSummary: string;

  // Legacy / convenience fields
  eventIntroduction?: string;
  demographicAnalysis?: string;
  thematicTakeaways?: string;
  impactHighlights?: string[];
  recommendations?: string[];
  strategicConclusion?: string;
}

export class GeminiService {
  static async generateReportNarrative(
    event: EventContextForAI,
    metrics: {
      totalRegistered: number;
      totalAttended: number;
      attendanceRate: number;
      badgeDistribution?: {
        attended: number;
        participant: number;
        winner: number;
        speaker: number;
      };
      rolesBreakdown?: Array<{
        role: string;
        count: number;
        percentage: number;
      }>;
      topOrganizations?: Array<{
        name: string;
        count: number;
      }>;
      goalsBreakdown?: Array<{
        goal: string;
        count: number;
        percentage: number;
      }>;
      sampleInterests?: string[];
      hourlyCheckIns?: Array<{
        hour: string;
        count: number;
      }>;
      customQA?: Array<{
        question: string;
        sampleAnswers: string[];
      }>;
    }
  ): Promise<AINarrativeReport> {
    const apiKey = process.env.GEMINI_API_KEY;

    // Truth-based fallback used when Gemini is unavailable.
    const generateFallback = (): AINarrativeReport => {
      const hasRoles =
        Boolean(
          metrics.rolesBreakdown &&
          metrics.rolesBreakdown.length > 0
        );

      const hasOrgs =
        Boolean(
          metrics.topOrganizations &&
          metrics.topOrganizations.length > 0
        );

      const hasGoals =
        Boolean(
          metrics.goalsBreakdown &&
          metrics.goalsBreakdown.length > 0
        );

      const hasInterests =
        Boolean(
          metrics.sampleInterests &&
          metrics.sampleInterests.length > 0
        );

      const topRoles = hasRoles
        ? metrics
            .rolesBreakdown!
            .map(
              (role) =>
                `${role.role} (${role.percentage}%)`
            )
            .join(', ')
        : 'No demographic roles were recorded during registration';

      const topOrgs = hasOrgs
        ? metrics
            .topOrganizations!
            .map(
              (organization) =>
                `${organization.name} (${organization.count})`
            )
            .join(', ')
        : 'No organizational affiliations were recorded';

      const topGoals = hasGoals
        ? metrics
            .goalsBreakdown!
            .map(
              (goal) =>
                `${goal.goal} (${goal.percentage}%)`
            )
            .join(', ')
        : 'No specific attendee goals were recorded';

      const topInterests = hasInterests
        ? metrics.sampleInterests!
            .slice(0, 8)
            .join(', ')
        : 'No specific technical interests were recorded';

      const isZeroReg =
        metrics.totalRegistered === 0;

      const executiveSummary = isZeroReg
        ? `The ${event.title} has not recorded any registrations yet. Once participants register and check in through Sheeba, verified attendance figures and demographic information will appear in this report.`
        : `The ${event.title} recorded ${metrics.totalRegistered} registration(s), with ${metrics.totalAttended} attendee(s) physically verified through Sheeba's QR check-in system, resulting in a ${metrics.attendanceRate}% verified attendance rate.\n\n${
            hasRoles
              ? `Attendee submissions reflected the following role distribution: ${topRoles}.`
              : 'No role-specific demographic responses were recorded during registration.'
          } ${
            hasInterests
              ? `Reported areas of interest included ${topInterests}.`
              : 'No specific interest responses were recorded.'
          }\n\n${
            hasOrgs
              ? `Participants reported affiliations including ${topOrgs}.`
              : 'No organizational affiliations were recorded.'
          } All attendance figures are based on Sheeba registration and QR check-in records.`;

      const eventBackground =
        `${event.title} was organized by ${
          event.organizerName || 'the organizer'
        }${
          event.description
            ? ` to address: ${event.description}`
            : '.'
        }\n\nThe event brought together members of the technology community in ${
          event.location || 'the event location'
        } and provided an environment for learning, professional connection, and community participation.`;

      const objectives =
        `The primary objective was to deliver the event described by the organizer while providing participants with an opportunity to engage with the relevant technical or professional subject matter.\n\nA secondary objective was to facilitate meaningful participation and community connection. Sheeba's registration and attendance infrastructure provides verified data that can be used to understand the event's actual reach and participation.`;

      const delivery =
        `Registration was managed through Sheeba, allowing participants to provide registration information before attending the event. On the event day, attendees were verified through Sheeba's QR-based check-in process, creating a record that distinguishes registered participants from those who physically attended.\n\nOf the ${metrics.totalRegistered} registered participant(s), ${metrics.totalAttended} were recorded as checked in, representing a verified attendance rate of ${metrics.attendanceRate}%.`;

      const audienceOverview = hasRoles
        ? `Attendee submissions reflect representation across ${topRoles}. This breakdown is based on information provided by participants during registration.\n\nThe recorded composition provides a factual view of the professional and participant groups reached by the event without assuming demographic characteristics that were not captured by Sheeba.`
        : `A total of ${metrics.totalRegistered} participant(s) registered for the event. No role-specific demographic responses were recorded, so a more detailed professional composition cannot be established from the available registration data.`;

      const experienceNarrative = hasRoles
        ? `The available registration data provides the following role distribution: ${topRoles}.\n\nThis information indicates the types of participants reached by the event, but it should not be interpreted as a measure of professional seniority unless experience level was explicitly collected during registration.`
        : `No experience-level or role-specific responses were recorded during registration. Therefore, the professional experience distribution of attendees cannot be determined from the available data.`;

      const organizationsNarrative = hasOrgs
        ? `Participants reported affiliations across ${metrics.topOrganizations!.length} distinct organization(s), including ${topOrgs}.\n\nThis organizational representation demonstrates the range of institutions represented in the registration data. The available data can therefore be used to document cross-organizational participation without assuming additional affiliations that were not submitted.`
        : `No organizational affiliations were recorded during registration. As a result, the event's institutional or cross-sector representation cannot be determined from the available data.`;

      const interestsNarrative = hasInterests
        ? `Attendee responses highlighted the following areas of interest: ${topInterests}.\n\nThese responses provide direct evidence of the topics participants identified as relevant to them. For sponsors and partners, the data can help identify areas of programming that align with the interests explicitly reported by the event audience.`
        : `No specific technical interest responses were submitted during registration. Consequently, the available data does not support a more detailed analysis of attendee interests.`;

      const motivationNarrative = hasGoals
        ? `Participants reported the following goals or motivations: ${topGoals}.\n\nThese responses provide direct evidence of what participants expected to gain from the event and can be used to understand the educational, professional, or networking objectives expressed during registration.`
        : `No specific attendee goals or motivations were recorded during registration. The available data therefore cannot establish a detailed motivation profile for participants.`;

      const badgeData =
        metrics.badgeDistribution || {
          attended: metrics.totalAttended,
          participant: 0,
          winner: 0,
          speaker: 0,
        };

      const engagementNarrative =
        `Of the ${metrics.totalAttended} verified attendees, ${badgeData.attended} received Attended credentials. ${badgeData.participant} received Participant credentials, ${badgeData.speaker} were recorded as Speakers, and ${badgeData.winner} were recorded as Winners.\n\nThese credentials provide additional information about participation beyond registration and physical attendance.`;

      const attendeeVoice =
        (metrics.customQA || [])
          .filter(
            (qa) =>
              qa.sampleAnswers &&
              qa.sampleAnswers.length > 0
          )
          .slice(0, 3)
          .map((qa) => ({
            quote: qa.sampleAnswers[0],
            theme: qa.question,
            explanation: `Verified attendee response to: "${qa.question}"`,
          }));

      const communityFindings =
        metrics.customQA &&
        metrics.customQA.length > 0
          ? metrics.customQA
              .map(
                (qa) =>
                  `${qa.question}: ${qa.sampleAnswers.join(
                    ', '
                  )}`
              )
              .join('\n\n')
          : 'No custom registration questions or written responses were submitted for this event.';

      const keyFindings = [
        {
          title:
            'Finding 1 — Verified Registration & Turnout',
          evidence:
            `Platform telemetry recorded ${metrics.totalRegistered} registration(s) and ${metrics.totalAttended} verified physical attendee(s), yielding a ${metrics.attendanceRate}% verified attendance rate.`,
        },
        {
          title:
            'Finding 2 — Organizational Footprint',
          evidence: hasOrgs
            ? `Registrants represented ${metrics.topOrganizations!.length} distinct organization(s): ${topOrgs}.`
            : 'No organizational affiliations were submitted during registration.',
        },
        {
          title:
            'Finding 3 — Attendee Profiles',
          evidence: hasRoles
            ? `The recorded role distribution was: ${topRoles}.`
            : 'No specific professional role breakdown was captured.',
        },
        {
          title:
            'Finding 4 — Goals & Community Focus',
          evidence: hasGoals
            ? `Reported attendee goals included: ${topGoals}.`
            : hasInterests
              ? `Stated participant interests included: ${topInterests}.`
              : 'No specific goals or interests were recorded.',
        },
      ];

      const audienceDeepAnalysis = {
        profile: hasRoles
          ? `The available attendee profile reflects the following registration responses: ${topRoles}. This represents the professional composition reported directly by participants.`
          : `A total of ${metrics.totalRegistered} participant(s) registered for this event, but no role-specific profile information was recorded.`,
        keyThemes: hasInterests
          ? `Reported thematic interests included ${topInterests}. These themes represent topics explicitly identified by attendees.`
          : `No specific thematic interest responses were recorded during registration.`,
        emergingInterests: hasInterests
          ? `The available interest responses indicate attention toward ${topInterests}. Further events can collect more structured interest data to identify changes over time.`
          : `No emerging interest areas can be established from the available registration responses.`,
        communityOpportunities: hasOrgs
          ? `The organizations represented in the registration data — ${topOrgs} — provide identifiable points for future community engagement and partnership outreach.`
          : `Future events can collect organizational affiliation data to better understand institutional reach and identify partnership opportunities.`,
      };

      const performanceAnalysis =
        `The event achieved a ${metrics.attendanceRate}% verified check-in rate, with ${metrics.totalAttended} attendees recorded from ${metrics.totalRegistered} registrations.\n\n${
          metrics.hourlyCheckIns &&
          metrics.hourlyCheckIns.length > 0
            ? `The available check-in records show arrival activity across the following recorded periods: ${metrics.hourlyCheckIns
                .map(
                  (item) =>
                    `${item.hour} (${item.count})`
                )
                .join(', ')}.`
            : 'No hourly check-in distribution was recorded for this event.'
        }`;

      const structuredRecommendations = {
        futureProgramming: hasInterests
          ? `Future programming can be aligned with the interests explicitly reported by attendees, including ${topInterests}.`
          : 'Future registration forms can collect structured interest data to guide programming decisions.',
        mentorship: hasRoles
          ? `Mentorship opportunities can be designed around the participant roles recorded during registration: ${topRoles}.`
          : 'Future events can collect experience-level information to better design mentorship and career-connection opportunities.',
        communityDevelopment: hasOrgs
          ? `Community development efforts can build on the organizations already represented in the registration data, including ${topOrgs}.`
          : 'Future events can strengthen organizational-affiliation data collection to identify potential institutional partnerships.',
      };

      const partnerImpactSummary =
        `The event generated ${metrics.totalRegistered} registration(s) and ${metrics.totalAttended} verified in-person attendee(s), producing a ${metrics.attendanceRate}% verified attendance rate. These figures provide partners with measurable evidence of registration reach and physical participation.\n\n${
          hasOrgs
            ? `The registration data also documents participation from organizations including ${topOrgs}.`
            : 'No organizational affiliations were recorded in the available registration data.'
        } ${
          hasInterests
            ? `Reported attendee interests included ${topInterests}.`
            : 'No specific interest responses were recorded.'
        }\n\nAll attendance figures are based on Sheeba registration and QR check-in records.`;

      const recommendations = [
        structuredRecommendations.futureProgramming,
        structuredRecommendations.mentorship,
        structuredRecommendations.communityDevelopment,
      ];

      const impactHighlights = keyFindings.map(
        (finding) =>
          `${finding.title}: ${finding.evidence}`
      );

      const strategicConclusion =
        `The ${event.title} recorded ${metrics.totalRegistered} registration(s) and ${metrics.totalAttended} verified attendee(s), resulting in a ${metrics.attendanceRate}% verified attendance rate.\n\nThe available platform data provides an evidence-based record of participation, attendee responses, organizational representation, and event engagement. All conclusions in this fallback report are limited to information recorded through Sheeba registration and attendance systems.`;

      return {
        executiveSummary,
        eventBackground,
        objectives,
        deliveryNarrative: delivery,
        audienceOverview,
        experienceNarrative,
        organizationsNarrative,
        interestsNarrative,
        motivationNarrative,
        engagementNarrative,
        communityFindings,
        attendeeVoice,
        audienceDeepAnalysis,
        performanceAnalysis,
        keyFindings,
        structuredRecommendations,
        partnerImpactSummary,

        // Legacy support
        eventIntroduction: eventBackground,
        demographicAnalysis: audienceOverview,
        thematicTakeaways: interestsNarrative,
        impactHighlights,
        recommendations,
        strategicConclusion,
      };
    };

    if (!apiKey) {
      return generateFallback();
    }

    const prompt = `
You are a Principal Event Intelligence & Impact Analyst preparing an authoritative, publication-quality SHEEBA EVENT IMPACT REPORT for institutional sponsors, corporate partners, universities, and government stakeholders.

Analyze the following verified post-event dossier.

=== VERIFIED EVENT DATA ===
- Event Title: "${event.title}"
- Event Description / Agenda: "${event.description || 'Not provided'}"
- Category / Type: "${event.type || 'Not provided'}"
- Date: "${event.date || 'Not provided'}"
- Time: "${event.time || 'Not provided'}"
- Location: "${event.location || 'Not provided'}"
- Venue: "${event.venueName || 'Not provided'}"
- Organizer / Host: "${event.organizerName || 'Not provided'}"

=== VERIFIED PLATFORM METRICS ===
- Total Registered Attendees: ${metrics.totalRegistered}
- Total Checked-in In-Person: ${metrics.totalAttended}
- Verified Attendance Rate: ${metrics.attendanceRate}%
- Badge Distribution: ${JSON.stringify(
      metrics.badgeDistribution || {
        attended: metrics.totalAttended,
        participant: 0,
        winner: 0,
        speaker: 0,
      }
    )}
- Roles Breakdown: ${JSON.stringify(
      metrics.rolesBreakdown || []
    )}
- Top Organizations Represented: ${JSON.stringify(
      metrics.topOrganizations || []
    )}
- Attendee Goals & Motivations: ${JSON.stringify(
      metrics.goalsBreakdown || []
    )}
- Primary Areas of Interest / Expertise: ${JSON.stringify(
      metrics.sampleInterests || []
    )}
- Hourly Check-ins: ${JSON.stringify(
      metrics.hourlyCheckIns || []
    )}
- Custom Questions & Verified Answers: ${JSON.stringify(
      metrics.customQA || []
    )}

=== DATA INTEGRITY RULES ===

1. Report ONLY facts directly supported by the VERIFIED PLATFORM DATA above.

2. NEVER invent organizations, universities, companies, attendee quotes, statistics, professional backgrounds, or event activities.

3. If rolesBreakdown is empty, explicitly state that no role-specific responses were recorded.

4. If topOrganizations is empty, explicitly state that no organizational affiliations were recorded.

5. If goalsBreakdown is empty, explicitly state that no attendee goals or motivations were recorded.

6. If sampleInterests is empty, explicitly state that no specific interests were recorded.

7. If customQA is empty, explicitly state that no custom-question responses were recorded.

8. For attendeeVoice, use ONLY exact quotes from customQA.sampleAnswers. If customQA is empty, return [].

9. Do NOT create fictional attendee quotations.

10. Do NOT use generic organizations as examples when real organizational data is unavailable.

11. Do NOT assume that a role means a particular experience or seniority level.

12. Do NOT claim that an event included activities, speakers, workshops, keynotes, or networking unless that information is supported by the event description or verified data.

13. All findings must be traceable to the provided platform data.

14. Distinguish clearly between verified facts and reasonable interpretation.

=== REPORT STYLE ===

Write a comprehensive, deep, and structured impact report.

Tone:
- Sophisticated
- Articulate
- Analytical
- Evidence-based
- Objective
- Suitable for sponsors, partners, universities, NGOs, and institutional stakeholders

Do NOT write generic two-line summaries.

Where the data supports it, write substantive multi-paragraph sections explaining:

DATA → INTERPRETATION → MEANING

=== REQUIRED JSON STRUCTURE ===

Return exactly one valid JSON object with these keys:

{
  "executiveSummary": "A substantive multi-paragraph executive summary covering event context, registration volume, verified attendance, attendance rate, attendee composition, interests, and overall significance. Only discuss categories supported by the data.",

  "eventBackground": "Detailed factual background based on the event title, description, organizer, date, location, and other provided event information.",

  "objectives": "Detailed objectives inferred only from the event description and verified event information. Do not invent objectives unsupported by the data.",

  "deliveryNarrative": "Detailed factual narrative describing registration, QR verification, physical attendance, and the verified attendance conversion.",

  "audienceOverview": "Detailed analysis of the real roles and participant categories recorded in the registration data. If none were recorded, say so.",

  "experienceNarrative": "Analysis of professional roles or experience-related data only when such information is actually present. Do not infer seniority from job titles unless supported.",

  "organizationsNarrative": "Detailed analysis of the exact organizations represented in the registration data. If none were recorded, say so.",

  "interestsNarrative": "Detailed analysis of reported interests. If no interests were recorded, state that clearly.",

  "motivationNarrative": "Detailed analysis of reported goals and motivations. If no goals were recorded, state that clearly.",

  "engagementNarrative": "Detailed distinction between registration, physical attendance, and verified badge credentials using only the provided numbers.",

  "communityFindings": "Detailed analysis of custom registration questions and their answers. If none exist, state that no custom responses were recorded.",

  "attendeeVoice": [
    {
      "quote": "Exact quote copied from a customQA sampleAnswers value",
      "theme": "Theme based on the actual question",
      "explanation": "Brief analytical interpretation"
    }
  ],

  "audienceDeepAnalysis": {
    "profile": "Factual attendee profile based on the actual registration data.",
    "keyThemes": "Themes supported by the actual interests, goals, event description, or custom responses.",
    "emergingInterests": "Emerging interests only where supported by actual attendee responses.",
    "communityOpportunities": "Actionable opportunities grounded in the actual data."
  },

  "performanceAnalysis": "Detailed analysis of registration, attendance, attendance rate, and hourly check-in data when available.",

  "keyFindings": [
    {
      "title": "Finding 1 — Concise factual title",
      "evidence": "Substantive evidence based directly on platform data."
    },
    {
      "title": "Finding 2 — Concise factual title",
      "evidence": "Substantive evidence based directly on platform data."
    },
    {
      "title": "Finding 3 — Concise factual title",
      "evidence": "Substantive evidence based directly on platform data."
    },
    {
      "title": "Finding 4 — Concise factual title",
      "evidence": "Substantive evidence based directly on platform data."
    }
  ],

  "structuredRecommendations": {
    "futureProgramming": "Forward-looking programming recommendations grounded in the recorded attendee data.",
    "mentorship": "Mentorship and career-connection recommendations grounded in the recorded participant profile.",
    "communityDevelopment": "Institutional and community partnership opportunities grounded in the organizations and participation data."
  },

  "partnerImpactSummary": "Detailed sponsor-oriented analysis explaining measurable registration reach, verified physical attendance, audience alignment, and available organizational or interest data. Do not claim ROI that cannot be measured from the supplied data.",

  "strategicConclusion": "Comprehensive closing synthesis summarizing verified metrics, attendee composition, interests, organizational representation, and the evidence available for future programming or partnership decisions."
}

CRITICAL:
Return ONLY valid JSON.
Do not wrap the JSON in markdown.
`;

    // Try available Gemini models.
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview',
      'gemini-3.5-flash',
    ];

    for (const model of candidateModels) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: prompt,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
              },
            }),
          }
        );

        if (!response.ok) {
          console.warn(
            `Model ${model} returned HTTP ${response.status}. Trying next...`
          );
          continue;
        }

        const data = await response.json();

        const rawText =
          data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawText) {
          console.warn(
            `Model ${model} returned empty response. Trying next...`
          );
          continue;
        }

        const cleaned = rawText
          .replace(/```json/g, '')
          .replace(/```/g, '')
          .trim();

        const parsed = JSON.parse(cleaned);

        if (parsed.executiveSummary) {
          return {
            executiveSummary:
              parsed.executiveSummary,

            eventBackground:
              parsed.eventBackground || '',

            objectives:
              parsed.objectives || '',

            deliveryNarrative:
              parsed.deliveryNarrative || '',

            audienceOverview:
              parsed.audienceOverview || '',

            experienceNarrative:
              parsed.experienceNarrative || '',

            organizationsNarrative:
              parsed.organizationsNarrative || '',

            interestsNarrative:
              parsed.interestsNarrative || '',

            motivationNarrative:
              parsed.motivationNarrative || '',

            engagementNarrative:
              parsed.engagementNarrative || '',

            communityFindings:
              parsed.communityFindings || '',

            attendeeVoice:
              Array.isArray(parsed.attendeeVoice)
                ? parsed.attendeeVoice
                : [],

            audienceDeepAnalysis:
              parsed.audienceDeepAnalysis || {
                profile: '',
                keyThemes: '',
                emergingInterests: '',
                communityOpportunities: '',
              },

            performanceAnalysis:
              parsed.performanceAnalysis || '',

            keyFindings:
              Array.isArray(parsed.keyFindings)
                ? parsed.keyFindings
                : [],

            structuredRecommendations:
              parsed.structuredRecommendations || {
                futureProgramming: '',
                mentorship: '',
                communityDevelopment: '',
              },

            partnerImpactSummary:
              parsed.partnerImpactSummary || '',

            // Legacy / convenience mappings
            eventIntroduction:
              parsed.eventBackground ||
              parsed.eventIntroduction ||
              '',

            demographicAnalysis:
              parsed.audienceOverview ||
              parsed.demographicAnalysis ||
              '',

            thematicTakeaways:
              parsed.interestsNarrative ||
              parsed.thematicTakeaways ||
              '',

            impactHighlights:
              Array.isArray(parsed.keyFindings)
                ? parsed.keyFindings.map(
                    (finding: any) =>
                      `${finding.title}: ${String(
                        finding.evidence || ''
                      ).slice(0, 120)}...`
                  )
                : [],

            recommendations:
              parsed.structuredRecommendations
                ? [
                    parsed
                      .structuredRecommendations
                      .futureProgramming,
                    parsed
                      .structuredRecommendations
                      .mentorship,
                    parsed
                      .structuredRecommendations
                      .communityDevelopment,
                  ]
                : [],

            strategicConclusion:
              parsed.strategicConclusion ||
              '',
          };
        }
      } catch (modelErr) {
        console.warn(
          `Model ${model} execution error:`,
          modelErr
        );
      }
    }

    console.warn(
      'All Gemini models failed, using master report fallback.'
    );

    return generateFallback();
  }
}