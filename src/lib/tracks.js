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
    references: [
      { label: 'IANA Service Name and Transport Protocol Port Number Registry', url: 'https://www.iana.org/assignments/service-names-port-numbers' },
      { label: 'RFC 1918 - Address Allocation for Private Internets', url: 'https://www.rfc-editor.org/rfc/rfc1918' },
      { label: 'RFC 2131 - Dynamic Host Configuration Protocol (DHCP)', url: 'https://www.rfc-editor.org/rfc/rfc2131' },
      { label: 'CompTIA Network+ (N10-009) official exam objectives', url: 'https://www.comptia.org/certifications/network' },
    ],
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
    references: [
      { label: 'OWASP Top 10', url: 'https://owasp.org/Top10/' },
      { label: 'NIST Cybersecurity Framework', url: 'https://www.nist.gov/cyberframework' },
      { label: 'NIST Glossary (CIA triad, threat/vulnerability/exploit definitions)', url: 'https://csrc.nist.gov/glossary' },
      { label: 'CompTIA Security+ (SY0-701) official exam objectives', url: 'https://www.comptia.org/certifications/security' },
    ],
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
    references: [
      { label: 'CompTIA A+ (220-1101/1102) official exam objectives', url: 'https://www.comptia.org/certifications/a' },
      { label: 'Microsoft Learn - Windows client documentation', url: 'https://learn.microsoft.com/windows/' },
      { label: 'IANA Service Name and Transport Protocol Port Number Registry', url: 'https://www.iana.org/assignments/service-names-port-numbers' },
    ],
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
    references: [
      { label: 'MDN Web Docs (HTML, CSS, JavaScript, HTTP)', url: 'https://developer.mozilla.org/' },
      { label: 'Git official documentation', url: 'https://git-scm.com/doc' },
      { label: 'Scrum Guide (scrum.org)', url: 'https://scrumguides.org/' },
    ],
  },
]

export function getTrack(trackId) {
  return TRACKS.find((t) => t.id === trackId) || TRACKS[0]
}
