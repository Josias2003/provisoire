export const TRACKS = [
  {
    id: 'provisoire',
    name: 'Provisoire',
    subtitle: 'Rwanda Driving Test',
    description: "Rwanda's provisional driving licence theory exam, extracted from the official question bank.",
    examTotal: 20,
    passMark: 12, // matches the real exam's 60% pass mark
    hasLanguages: true,
    hasImages: true,
    hasLawNotice: true,
  },
  {
    id: 'it-networking',
    name: 'Networking',
    subtitle: 'Network+ style',
    description: 'OSI/TCP-IP models, IP addressing, routing & switching, protocols, wireless, troubleshooting.',
    examTotal: 20,
    passMark: 14, // ~70%, a common certification-style pass bar
    hasLanguages: false,
    hasImages: false,
    hasLawNotice: false,
  },
  {
    id: 'it-cybersecurity',
    name: 'Cybersecurity',
    subtitle: 'Security+ style',
    description: 'CIA triad, malware types, social engineering, cryptography, access control, common attacks.',
    examTotal: 20,
    passMark: 14,
    hasLanguages: false,
    hasImages: false,
    hasLawNotice: false,
  },
  {
    id: 'it-helpdesk',
    name: 'IT Helpdesk / Support',
    subtitle: 'A+ style',
    description: 'Hardware, OS troubleshooting, ports/connectors, customer service, ticketing & triage.',
    examTotal: 20,
    passMark: 14,
    hasLanguages: false,
    hasImages: false,
    hasLawNotice: false,
  },
  {
    id: 'it-software',
    name: 'Software & Programming',
    subtitle: 'Fundamentals',
    description: 'Programming basics, OOP, SDLC/Agile, Git, databases, data structures, web & API concepts.',
    examTotal: 20,
    passMark: 14,
    hasLanguages: false,
    hasImages: false,
    hasLawNotice: false,
  },
]

export function getTrack(trackId) {
  return TRACKS.find((t) => t.id === trackId) || TRACKS[0]
}
