/** Current year, cached so the footer stays prerenderable under Cache Components. */
export async function CopyrightYear() {
  "use cache";
  return <>{new Date().getFullYear()}</>;
}
