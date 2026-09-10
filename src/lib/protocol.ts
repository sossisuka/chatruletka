export const countries = [
  { code: "RU", name: "Россия", flag: "🇷🇺" },
  { code: "BY", name: "Беларусь", flag: "🇧🇾" },
  { code: "KZ", name: "Казахстан", flag: "🇰🇿" },
  { code: "UA", name: "Украина", flag: "🇺🇦" },
  { code: "DE", name: "Германия", flag: "🇩🇪" },
  { code: "US", name: "США", flag: "🇺🇸" },
  { code: "GB", name: "Великобритания", flag: "🇬🇧" },
  { code: "TR", name: "Турция", flag: "🇹🇷" },
  { code: "OTHER", name: "Другая страна", flag: "🌍" },
] as const;

export type Gender = "male" | "female" | "other";
export type Profile = {
  country: string;
  lookingForCountry: string;
  gender: Gender;
};
export const defaultProfile: Profile = {
  country: "RU",
  lookingForCountry: "all",
  gender: "other",
};
export type Stats = {
  online: number;
  searching: number;
  conversations: number;
};
export type Match = {
  sessionId: string;
  initiator: boolean;
  peer: Pick<Profile, "country" | "gender">;
};
export type Signal = {
  sessionId: string;
  description?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};
export type ChatMessage = {
  id: string;
  sessionId: string;
  text: string;
  mine: boolean;
  sentAt: number;
};
export type Ack = { ok: boolean; error?: string };
export type ServerEvents = {
  ready: (data: {
    iceServers: RTCIceServer[];
    relayConfigured: boolean;
  }) => void;
  stats: (stats: Stats) => void;
  waiting: () => void;
  matched: (match: Match) => void;
  signal: (signal: Signal) => void;
  message: (message: ChatMessage) => void;
  "peer-left": (data: { sessionId: string; reason: string }) => void;
  "server-error": (message: string) => void;
};
export type ClientEvents = {
  search: (profile: Profile, ack: (result: Ack) => void) => void;
  stop: () => void;
  next: (
    data: { sessionId: string; block?: boolean },
    ack: (result: Ack) => void,
  ) => void;
  signal: (signal: Signal) => void;
  message: (
    data: { sessionId: string; text: string },
    ack: (result: Ack) => void,
  ) => void;
};
