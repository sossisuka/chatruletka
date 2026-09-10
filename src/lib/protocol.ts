export const countries = [
  { code: "RU", name: "Россия" },
  { code: "BY", name: "Беларусь" },
  { code: "KZ", name: "Казахстан" },
  { code: "UA", name: "Украина" },
  { code: "DE", name: "Германия" },
  { code: "US", name: "США" },
  { code: "GB", name: "Великобритания" },
  { code: "TR", name: "Турция" },
  { code: "OTHER", name: "Другая страна" },
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
