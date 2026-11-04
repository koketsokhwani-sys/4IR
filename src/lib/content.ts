export const plans = [
  {
    id: "starter",
    name: "Starter Presence",
    price: 50,
    description: "A small start. A real online presence.",
    audience: "For side hustles and new businesses",
    features: [
      "One-page website",
      "Mobile-friendly design",
      "Business details & contact links",
      "Hosting & SSL certificate",
    ],
    pages: "1 page",
    booking: false,
    store: false,
  },
  {
    id: "business",
    name: "Business Profile",
    price: 99,
    description: "Make your next first impression count.",
    audience: "For growing businesses",
    features: [
      "Up to 5 pages",
      "Services & photo gallery",
      "Contact enquiry form",
      "Hosting & SSL certificate",
    ],
    pages: "Up to 5 pages",
    booking: false,
    store: false,
  },
  {
    id: "booking",
    name: "Booking Pro",
    price: 150,
    description: "Less back and forth. More bookings.",
    audience: "For service-based businesses",
    features: [
      "Everything in Business Profile",
      "Appointment booking",
      "Services, durations & pricing",
      "Business availability",
    ],
    pages: "Up to 5 pages",
    booking: true,
    store: false,
  },
  {
    id: "store",
    name: "Online Store",
    price: 200,
    description: "Your products. Open for business.",
    audience: "For shops ready to sell online",
    features: [
      "Everything in Business Profile",
      "Product catalogue & shopping cart",
      "Product photos & pricing",
      "Delivery information",
    ],
    pages: "Up to 5 pages + shop",
    booking: false,
    store: true,
  },
] as const;
export type Plan = (typeof plans)[number];
export const examples = [
  {
    slug: "bloom-studio",
    name: "Bloom Studio",
    type: "Florist & gifting",
    plan: "Business Profile",
    theme: "bloom",
    tagline: "A little wild. A little wonderful.",
    description:
      "An expressive business website for a neighbourhood florist, with space for seasonal arrangements, a gallery and enquiries.",
  },
  {
    slug: "the-daily-grind",
    name: "The Daily Grind",
    type: "Coffee shop",
    plan: "Starter Presence",
    theme: "coffee",
    tagline: "Good coffee. Better company.",
    description:
      "A focused one-page presence for a local café, bringing its menu, opening hours and location together.",
  },
  {
    slug: "studio-form",
    name: "Studio Form",
    type: "Fitness & wellness",
    plan: "Booking Pro",
    theme: "form",
    tagline: "Make space for yourself.",
    description:
      "A calm website concept for a movement studio, with room for classes, instructors and appointment booking.",
  },
] as const;
export const faqs = [
  [
    "Is there really no setup fee?",
    "Yes. Your website package has no setup fee. You pay the monthly subscription for your chosen package. Domain registration is charged separately.",
  ],
  [
    "Do I need to have a domain already?",
    "No. You can use an existing domain or arrange a new one. Domain registration and renewal are separate from the monthly website subscription; confirm the domain cost before ordering.",
  ],
  [
    "What do I need to provide?",
    "Your business details, logo, photos and website text are a good start. Booking businesses also need services, prices and availability. Online stores need product details, prices, photographs and delivery information.",
  ],
  [
    "Can I cancel my subscription?",
    "The platform is being built with self-service cancellation. Cancellation will stop future recurring charges, and your dashboard will explain when your website service ends. Account deletion will be a separate action.",
  ],
  [
    "How will payments work?",
    "When checkout launches, you will register and verify your email before paying the first month by card through Paystack. Your subscription will activate once payment is confirmed. Checkout is not open yet.",
  ],
  [
    "Can I review my website before it goes live?",
    "Yes. The planned project workflow includes a website preview and customer review, so you can approve the design or request revisions before launch.",
  ],
] as const;
