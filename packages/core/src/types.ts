export interface Speaker {
  name: string;
  title: string;
  company: string;
  profileUrl?: string;
}

export interface Session {
  id: string;
  url: string;
  title: string;
  date: string;
  time: string;
  stage: string;
  tags: string[];
  speakers: Speaker[];
  description: string;
  type: 'session' | 'event';
}

export interface AgendaDay {
  date: string;
  sessions: Session[];
}

export interface ParsedData {
  sessions: Session[];
  speakers: Speaker[];
  agenda: AgendaDay[];
  event: string;
  scrapedAt: string;
}
