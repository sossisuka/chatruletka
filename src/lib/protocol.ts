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

const regionNames = new Intl.DisplayNames(["ru"], { type: "region", fallback: "none" });
export function isCountryCode(code: string): boolean {
  return /^[A-Z]{2}$/.test(code) && !["ZZ", "EU", "UN"].includes(code) &&
    !!regionNames.of(code);
}
export function countryName(code: string): string {
  return countries.find((country) => country.code === code)?.name ??
    (isCountryCode(code) ? regionNames.of(code)! : "Не определена");
}
export function matchesCountryFilter(filter: string, country: string): boolean {
  if (filter === "all") return true;
  if (filter === "OTHER")
    return isCountryCode(country) && !countries.some((entry) => entry.code === country);
  return filter === country;
}

export type Gender = "male" | "female" | "other";
export type Profile = {
  country: string;
  lookingForCountry: string;
  gender: Gender;
};
export const defaultProfile: Profile = {
  country: "UNKNOWN",
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
    country: string;
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
