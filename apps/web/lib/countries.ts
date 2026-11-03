import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js/min";

export interface CountryOption {
  code: CountryCode;
  name: string;
  dialCode: string;
}

/**
 * Country list for selects. Built on the server and passed to client forms
 * as props, so server and browser render identical names.
 */
export function getCountryOptions(): CountryOption[] {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return getCountries()
    .map((code) => ({
      code,
      name: names.of(code) ?? code,
      dialCode: `+${getCountryCallingCode(code)}`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
}
