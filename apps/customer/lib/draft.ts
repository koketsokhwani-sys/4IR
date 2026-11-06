export const planIds = ["starter", "business", "booking", "store"] as const;
export type PlanId = (typeof planIds)[number];
export const fields = {
  contact_name: { label: "Your name", max: 120 },
  phone: { label: "Contact number", max: 40 },
  business_name: { label: "Business name", max: 160 },
  contact_email: { label: "Public business email", max: 254 },
  description: { label: "About your business", max: 2000 },
  website_content: { label: "Website text and contact links", max: 4000 },
  services: { label: "Services and page content", max: 4000 },
  availability: {
    label: "Appointment durations, prices and availability",
    max: 4000,
  },
  products: { label: "Product names, descriptions and prices", max: 4000 },
  delivery: { label: "Delivery and collection information", max: 2000 },
} as const;
export type Field = keyof typeof fields;
export type Draft = { plan: PlanId } & Record<Field, string>;
export function applicable(plan: PlanId, field: Field) {
  if (field === "products" || field === "delivery") return plan === "store";
  if (field === "availability") return plan === "booking";
  if (field === "services") return plan === "business" || plan === "booking";
  return true;
}
export function validateDraft(input: unknown): Draft {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Invalid draft.");
  const obj = input as Record<string, unknown>;
  if (!planIds.includes(obj.plan as PlanId))
    throw new Error("Choose one of the four packages.");
  if (Object.keys(obj).some((k) => k !== "plan" && !Object.hasOwn(fields, k)))
    throw new Error("Unexpected draft field.");
  const plan = obj.plan as PlanId;
  const result = { plan } as Draft;
  for (const key of Object.keys(fields) as Field[]) {
    const value = obj[key] ?? "";
    if (
      typeof value !== "string" ||
      value.length > fields[key].max ||
      /\u0000/.test(value)
    )
      throw new Error(`${fields[key].label} is invalid or too long.`);
    result[key] = applicable(plan, key) ? value.trim() : "";
  }
  if (!result.business_name || !result.contact_name)
    throw new Error("Enter your name and business name to save your draft.");
  if (
    result.contact_email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.contact_email)
  )
    throw new Error("Enter a valid business email.");
  return result;
}
export function credentials(
  input: Record<string, unknown>,
  passwordRequired = true,
) {
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  if (passwordRequired && (password.length < 12 || password.length > 128))
    throw new Error("Use a password between 12 and 128 characters.");
  return { email, password };
}
