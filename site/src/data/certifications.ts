import type { Certification } from './types'

export const certifications: Certification[] = [
  {
    id: 'cert1',
    name: 'Full Stack Web Development',
    issuer: 'Avion School',
    year: '2020',
    link: 'https://drive.google.com/file/d/1YAnigl0a8gSOq0rx-UF0_Gbq9ndD2Yth/view',
  },
  // No link: the source pointed at the TESDA homepage, which is not a credential.
  {
    id: 'cert2',
    name: 'TESDA NC II – Computer Programming',
    issuer: 'TESDA / Laverdad Christian College',
    year: '2013',
  },
  {
    id: 'cert3',
    name: 'AI Exploration Initiative Program',
    issuer: 'Quickstrike Innovation Phil.',
    year: '2026',
    link: 'https://drive.google.com/file/d/1IcQRq8SBXsoDfPg0839N0HB1kxlQA3wD/view',
  },
]
