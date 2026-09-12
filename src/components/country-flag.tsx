import Image from "next/image";
import { Globe2 } from "lucide-react";
import { isCountryCode } from "@/lib/protocol";

export function CountryFlag({ code }: { code: string }) {
  if (!isCountryCode(code))
    return <Globe2 className="country-flag country-globe" aria-hidden="true" />;

  return (
    <Image
      className="country-flag"
      src={`https://flagcdn.com/${code.toLowerCase()}.svg`}
      width={22}
      height={22}
      alt=""
      aria-hidden="true"
      unoptimized
    />
  );
}
