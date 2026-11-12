// All deploy-time settings in one place. VITE_* values are public by design.
const env = import.meta.env

export const CONFIG = {
  apiUrl: env.VITE_WAITLIST_API_URL || 'https://kvlietqeafjtwojkqnqa.supabase.co/functions/v1/ospod-waitlist',
  calendarUrl: (env.VITE_CALENDAR_URL || '').trim(),
  contactEmail: (env.VITE_CONTACT_EMAIL || '').trim(),
  metaPixelId: (env.VITE_META_PIXEL_ID || '').trim(),
  linkedinPartnerId: (env.VITE_LINKEDIN_PARTNER_ID || '').trim(),
  linkedinConversionId: (env.VITE_LINKEDIN_CONVERSION_ID || '').trim(),
  cap: 500,
}
