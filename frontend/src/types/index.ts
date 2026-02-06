/**
 * TypeScript types for the SAM.gov AI Search application.
 */

// User types
export interface User {
  id: string
  email: string
  is_active: boolean
  is_verified: boolean
  has_sam_api_key: boolean
  sam_api_key_expires_at: string | null
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

// Profile types
export interface CompanyProfile {
  id: string
  user_id: string
  company_name: string
  
  // SAM.gov Registration
  cage_code?: string
  uei_number?: string
  duns_number?: string
  
  // NAICS
  primary_naics: string
  secondary_naics: string[]
  
  // Capabilities
  core_competencies: string[]
  technical_skills: string[]
  
  // Past Performance
  past_performance_keywords: string[]
  priority_keywords: string[]
  
  // Certifications & Clearance
  certifications: string[]
  clearance_level: string
  
  // Preferences
  target_contract_min: number
  target_contract_max: number
  preferred_agencies: string[]
  service_area: string[]
  max_response_days: number
  
  // Contract Preferences
  contract_types_preference: string[]
  open_to_subcontracting: boolean
  open_to_prime_contracting: boolean
  
  // Constraints
  blacklist_keywords: string[]
  requires_clearance: boolean
  
  created_at: string
  updated_at: string | null
}

export interface ProfileFormData {
  company_name: string
  employee_count: number
  annual_revenue?: number
  headquarters_state: string
  primary_naics: string
  secondary_naics: string[]
  core_competencies: string[]
  technical_skills: string[]
  industry_experience_years: number
  certifications: string[]
  target_contract_min: number
  target_contract_max: number
  preferred_agencies: string[]
  service_area: string[]
  max_response_days: number
  blacklist_keywords: string[]
  requires_clearance: boolean
}

// Search types
export interface SearchRequest {
  days_back: number
}

export interface SearchStartResponse {
  job_id: string
  search_id: string
  status: string
  check_status_url: string
}

export interface SearchStatusResponse {
  status: string
  progress: number
  total_opportunities?: number
  results?: SearchResults
  error?: string
}

export interface SearchResults {
  totalRecords: number
  opportunities: Opportunity[]
  searchParams: { days_back: number }
  high_relevance_count: number
  medium_relevance_count: number
  low_relevance_count: number
}

export interface Opportunity {
  noticeId: string
  title: string
  solicitationNumber?: string
  department?: string
  subTier?: string
  office?: string
  postedDate?: string
  responseDeadLine?: string
  archiveDate?: string
  type?: string
  baseType?: string
  typeOfSetAsideDescription?: string
  naicsCode?: string
  description?: string
  placeOfPerformance?: {
    city?: string
    state?: string
    zip?: string
  }
  score?: AIScore
}

export interface AIScore {
  relevance: number
  confidence: number
  recommendation: 'bid' | 'watch' | 'skip'
  reasoning: string
  strengths: string[]
  weaknesses: string[]
  key_requirements: string[]
}

// Saved opportunity types
export interface SavedOpportunity {
  id: string
  user_id: string
  notice_id: string
  solicitation_number: string | null
  title: string
  agency: string | null
  posted_date: string | null
  response_deadline: string | null
  relevance_score: number
  ai_analysis: AIScore | null
  recommendation: string | null
  user_notes: string | null
  user_status: 'saved' | 'pursuing' | 'passed'
  opportunity_data: Opportunity
  created_at: string
  updated_at: string | null
}

// Search history
export interface SearchHistory {
  id: string
  search_params: { days_back: number }
  total_results: number
  high_relevance_count: number
  medium_relevance_count: number
  low_relevance_count: number
  job_status: string
  created_at: string
}

// API Error
export interface ApiError {
  detail: string
}

// Constants
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP',
] as const

export const CERTIFICATIONS = [
  '8(a)',
  'HUBZone',
  'WOSB',
  'EDWOSB',
  'SDVOSB',
  'VOSB',
  'SDB',
] as const

export const NOTICE_TYPES = [
  { code: 'p', name: 'Presolicitation' },
  { code: 'o', name: 'Solicitation' },
  { code: 'k', name: 'Combined Synopsis/Solicitation' },
  { code: 'r', name: 'Sources Sought' },
  { code: 's', name: 'Special Notice' },
  { code: 'g', name: 'Sale of Surplus Property' },
  { code: 'a', name: 'Award Notice' },
  { code: 'u', name: 'Justification and Approval' },
  { code: 'i', name: 'Intent to Bundle' },
  { code: 'l', name: 'Fair Opportunity / Limited Sources Justification' },
] as const

export const SET_ASIDE_TYPES = [
  { code: 'SBA', name: 'Total Small Business Set-Aside' },
  { code: 'SBP', name: 'Partial Small Business Set-Aside' },
  { code: '8A', name: '8(a) Set-Aside' },
  { code: '8AN', name: '8(a) Sole Source' },
  { code: 'HZC', name: 'HUBZone Set-Aside' },
  { code: 'HZS', name: 'HUBZone Sole Source' },
  { code: 'SDVOSBC', name: 'SDVOSB Set-Aside' },
  { code: 'SDVOSBS', name: 'SDVOSB Sole Source' },
  { code: 'WOSB', name: 'WOSB Set-Aside' },
  { code: 'WOSBSS', name: 'WOSB Sole Source' },
  { code: 'EDWOSB', name: 'EDWOSB Set-Aside' },
  { code: 'EDWOSBSS', name: 'EDWOSB Sole Source' },
  { code: 'LAS', name: 'Local Area Set-Aside' },
  { code: 'IEE', name: 'Indian Economic Enterprise' },
  { code: 'ISBEE', name: 'Indian Small Business Economic Enterprise' },
  { code: 'BICiv', name: 'Buy Indian Set-Aside' },
  { code: 'VSA', name: 'Veteran-Owned Small Business Set-Aside' },
  { code: 'VSS', name: 'Veteran-Owned Small Business Sole Source' },
] as const

export const US_STATES_FULL = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'VI', name: 'Virgin Islands' },
  { code: 'GU', name: 'Guam' },
  { code: 'AS', name: 'American Samoa' },
  { code: 'MP', name: 'Northern Mariana Islands' },
] as const

export const CERTIFICATIONS_FULL = [
  { code: '8(a)', name: '8(a) Business Development Program' },
  { code: 'HUBZone', name: 'Historically Underutilized Business Zone' },
  { code: 'WOSB', name: 'Women-Owned Small Business' },
  { code: 'EDWOSB', name: 'Economically Disadvantaged WOSB' },
  { code: 'SDVOSB', name: 'Service-Disabled Veteran-Owned Small Business' },
  { code: 'VOSB', name: 'Veteran-Owned Small Business' },
  { code: 'SDB', name: 'Small Disadvantaged Business' },
] as const

export const CLEARANCE_LEVELS = [
  { code: 'None', name: 'No Clearance Required' },
  { code: 'Confidential', name: 'Confidential' },
  { code: 'Secret', name: 'Secret' },
  { code: 'Top Secret', name: 'Top Secret' },
  { code: 'TS/SCI', name: 'Top Secret/Sensitive Compartmented Information' },
] as const

export const CONTRACT_TYPES = [
  { code: 'FFP', name: 'Firm Fixed Price' },
  { code: 'T&M', name: 'Time and Materials' },
  { code: 'Cost-Plus', name: 'Cost-Plus' },
  { code: 'IDIQ', name: 'Indefinite Delivery/Indefinite Quantity' },
  { code: 'BPA', name: 'Blanket Purchase Agreement' },
  { code: 'GSA Schedule', name: 'GSA Schedule' },
] as const

export type USState = typeof US_STATES[number]
export type Certification = typeof CERTIFICATIONS[number]
export type NoticeType = typeof NOTICE_TYPES[number]
export type SetAsideType = typeof SET_ASIDE_TYPES[number]
