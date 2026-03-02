import { useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { useBlocker } from "react-router-dom"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Trash2 } from "lucide-react"

import { PageHeader } from "@/components/layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"
import { useProfile, useUpdateProfile } from "@/hooks/useProfile"
import type { CompanyProfileUpdate } from "@/services/api"
import { US_STATES_FULL, CERTIFICATIONS_FULL, CLEARANCE_LEVELS, CONTRACT_TYPES } from "@/types"

const profileSchema = z.object({
  company_name: z.string().min(2, "Company name must be at least 2 characters").optional(),
  
  cage_code: z.string().length(5).optional().or(z.literal("")),
  uei_number: z.string().length(12).optional().or(z.literal("")),
  duns_number: z.string().length(9).optional().or(z.literal("")),
  
  primary_naics: z.string().length(6, "NAICS code must be exactly 6 digits").optional(),
  secondary_naics: z.array(z.object({ value: z.string().length(6) })).optional(),
  
  core_competencies: z.array(z.object({ value: z.string().min(1) })).optional(),
  technical_skills: z.array(z.object({ value: z.string().min(1) })).optional(),
  
  past_performance_keywords: z.array(z.object({ value: z.string().min(1) })).optional(),
  priority_keywords: z.array(z.object({ value: z.string().min(1) })).optional(),
  
  certifications: z.array(z.string()).optional(),
  clearance_level: z.string().optional(),
  
  target_contract_min: z.coerce.number().int().min(0).optional(),
  target_contract_max: z.coerce.number().int().min(0).optional(),
  preferred_agencies: z.array(z.object({ value: z.string().min(1) })).optional(),
  service_area: z.array(z.string()).optional(),
  max_response_days: z.coerce.number().int().min(1).max(365).optional(),
  
  contract_types_preference: z.array(z.string()).optional(),
  open_to_subcontracting: z.boolean().optional(),
  open_to_prime_contracting: z.boolean().optional(),
  
  blacklist_keywords: z.array(z.object({ value: z.string().min(1) })).optional(),
  requires_clearance: z.boolean().optional(),
})

type ProfileFormData = z.infer<typeof profileSchema>

export function ProfilePage() {
  const { data: profile, isLoading } = useProfile()
  const updateProfileMutation = useUpdateProfile()

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: profile
      ? {
          company_name: profile.company_name || "",
          
          primary_naics: profile.primary_naics || "",
          secondary_naics: profile.secondary_naics?.map((code) => ({ value: code })) || [],
          
          core_competencies: profile.core_competencies?.map((comp) => ({ value: comp })) || [],
          technical_skills: profile.technical_skills?.map((skill) => ({ value: skill })) || [],
          
          certifications: profile.certifications || [],
          clearance_level: profile.clearance_level || "None",
          
          target_contract_min: profile.target_contract_min || 25000,
          target_contract_max: profile.target_contract_max || 2000000,
          preferred_agencies: profile.preferred_agencies?.map((agency) => ({ value: agency })) || [],
          service_area: profile.service_area || [],
          max_response_days: profile.max_response_days || 30,
          
          blacklist_keywords: profile.blacklist_keywords?.map((kw) => ({ value: kw })) || [],
          requires_clearance: profile.requires_clearance || false,
          
          cage_code: profile.cage_code || "",
          uei_number: profile.uei_number || "",
          duns_number: profile.duns_number || "",
          
          past_performance_keywords: profile.past_performance_keywords?.map((kw) => ({ value: kw })) || [],
          priority_keywords: profile.priority_keywords?.map((kw) => ({ value: kw })) || [],
          
          contract_types_preference: profile.contract_types_preference || [],
          open_to_subcontracting: profile.open_to_subcontracting ?? true,
          open_to_prime_contracting: profile.open_to_prime_contracting ?? true,
        }
      : {
          target_contract_min: 25000,
          target_contract_max: 2000000,
          max_response_days: 30,
          requires_clearance: false,
          certifications: [],
          service_area: [],
          secondary_naics: [],
          core_competencies: [],
          technical_skills: [],
          preferred_agencies: [],
          blacklist_keywords: [],
          clearance_level: "None",
          cage_code: "",
          uei_number: "",
          duns_number: "",
          past_performance_keywords: [],
          priority_keywords: [],
          contract_types_preference: [],
          open_to_subcontracting: true,
          open_to_prime_contracting: true,
        },
  })

  const { fields: secondaryNaicsFields, append: appendNaics, remove: removeNaics } = useFieldArray({
    control,
    name: "secondary_naics",
  })

  const { fields: competencyFields, append: appendCompetency, remove: removeCompetency } = useFieldArray({
    control,
    name: "core_competencies",
  })

  const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({
    control,
    name: "technical_skills",
  })
  
  const { fields: pastPerfFields, append: appendPastPerf, remove: removePastPerf } = useFieldArray({
    control,
    name: "past_performance_keywords",
  })
  
  const { fields: priorityFields, append: appendPriority, remove: removePriority } = useFieldArray({
    control,
    name: "priority_keywords",
  })

  const { fields: agencyFields, append: appendAgency, remove: removeAgency } = useFieldArray({
    control,
    name: "preferred_agencies",
  })

  const { fields: blacklistFields, append: appendBlacklist, remove: removeBlacklist } = useFieldArray({
    control,
    name: "blacklist_keywords",
  })

  // Warn user about unsaved changes when navigating away
  const blocker = useBlocker(isDirty)
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  const selectedCertifications = watch("certifications") || []
  const selectedContractTypes = watch("contract_types_preference") || []
  const serviceArea = watch("service_area") || []

  const onSubmit = (data: ProfileFormData) => {
    const submitData: CompanyProfileUpdate = {
      company_name: data.company_name,
      
      cage_code: data.cage_code || undefined,
      uei_number: data.uei_number || undefined,
      duns_number: data.duns_number || undefined,
      
      primary_naics: data.primary_naics,
      secondary_naics: data.secondary_naics?.map((n) => n.value).filter(Boolean) || [],
      
      core_competencies: data.core_competencies?.map((c) => c.value).filter(Boolean) || [],
      technical_skills: data.technical_skills?.map((s) => s.value).filter(Boolean) || [],
      
      past_performance_keywords: data.past_performance_keywords?.map((k) => k.value).filter(Boolean) || [],
      priority_keywords: data.priority_keywords?.map((k) => k.value).filter(Boolean) || [],
      
      certifications: data.certifications || [],
      clearance_level: data.clearance_level || "None",
      
      target_contract_min: data.target_contract_min,
      target_contract_max: data.target_contract_max,
      preferred_agencies: data.preferred_agencies?.map((a) => a.value).filter(Boolean) || [],
      service_area: data.service_area || [],
      max_response_days: data.max_response_days,
      
      contract_types_preference: data.contract_types_preference || [],
      open_to_subcontracting: data.open_to_subcontracting ?? true,
      open_to_prime_contracting: data.open_to_prime_contracting ?? true,
      
      blacklist_keywords: data.blacklist_keywords?.map((k) => k.value).filter(Boolean) || [],
      requires_clearance: data.requires_clearance,
    }
    
    // Remove undefined/null/empty values
    Object.keys(submitData).forEach((key) => {
      const typedKey = key as keyof CompanyProfileUpdate
      if (
        submitData[typedKey] === undefined ||
        submitData[typedKey] === null ||
        submitData[typedKey] === ""
      ) {
        delete submitData[typedKey]
      }
    })
    
    updateProfileMutation.mutate(submitData)
  }

  const toggleCertification = (cert: string) => {
    const current = selectedCertifications || []
    if (current.includes(cert)) {
      setValue(
        "certifications",
        current.filter((c) => c !== cert),
        { shouldDirty: true }
      )
    } else {
      setValue("certifications", [...current, cert], { shouldDirty: true })
    }
  }
  
  const toggleContractType = (type: string) => {
    const current = selectedContractTypes || []
    if (current.includes(type)) {
      setValue(
        "contract_types_preference",
        current.filter((t) => t !== type),
        { shouldDirty: true }
      )
    } else {
      setValue("contract_types_preference", [...current, type], { shouldDirty: true })
    }
  }

  const toggleServiceArea = (state: string) => {
    const current = serviceArea || []
    if (current.includes(state)) {
      setValue(
        "service_area",
        current.filter((s) => s !== state),
        { shouldDirty: true }
      )
    } else {
      setValue("service_area", [...current, state], { shouldDirty: true })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Qualification Data"
        title="Company Profile"
        description="Configure your company details to improve AI scoring quality."
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Your company's core details
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                placeholder="Acme Corporation"
                {...register("company_name")}
                aria-invalid={errors.company_name ? "true" : "false"}
              />
              {errors.company_name && (
                <p className="text-sm text-destructive">{errors.company_name.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* NAICS Codes */}
        <Card>
          <CardHeader>
            <CardTitle>NAICS Codes</CardTitle>
            <CardDescription>
              Primary and secondary NAICS codes for your business (6-digit codes)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primary_naics">Primary NAICS Code</Label>
              <Input
                id="primary_naics"
                placeholder="541511"
                maxLength={6}
                {...register("primary_naics")}
                aria-invalid={errors.primary_naics ? "true" : "false"}
              />
              {errors.primary_naics && (
                <p className="text-sm text-destructive">{errors.primary_naics.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Example: 541511 (Custom Computer Programming Services)
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Secondary NAICS Codes (Optional)</Label>
              {secondaryNaicsFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="541512"
                    maxLength={6}
                    {...register(`secondary_naics.${index}.value` as const)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeNaics(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendNaics({ value: "" })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Secondary NAICS
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Capabilities */}
        <Card>
          <CardHeader>
            <CardTitle>Capabilities & Skills</CardTitle>
            <CardDescription>
              Your company's core competencies and technical skills
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Core Competencies</Label>
              {competencyFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="e.g., Software Development, Cloud Migration"
                    {...register(`core_competencies.${index}.value` as const)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCompetency(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendCompetency({ value: "" })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Competency
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Technical Skills (Optional)</Label>
              {skillFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="e.g., AWS, Python, Kubernetes"
                    {...register(`technical_skills.${index}.value` as const)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSkill(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendSkill({ value: "" })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Technical Skill
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Contract Preferences</CardTitle>
            <CardDescription>
              Set your preferred contract size and search parameters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="target_contract_min">Minimum Contract Value ($)</Label>
                <Input
                  id="target_contract_min"
                  type="number"
                  placeholder="25000"
                  {...register("target_contract_min")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="target_contract_max">Maximum Contract Value ($)</Label>
                <Input
                  id="target_contract_max"
                  type="number"
                  placeholder="2000000"
                  {...register("target_contract_max")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_response_days">Maximum Response Time (Days)</Label>
              <Input
                id="max_response_days"
                type="number"
                placeholder="30"
                {...register("max_response_days")}
              />
              <p className="text-xs text-muted-foreground">
                Only show opportunities with at least this many days to respond
              </p>
            </div>

            <div className="space-y-2">
              <Label>Service Area States</Label>
              <Select
                onValueChange={(value) => toggleServiceArea(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Add states where you can work..." />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES_FULL.filter(s => !serviceArea.includes(s.code)).map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name} ({state.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 mt-2">
                {serviceArea.map((code) => {
                  const state = US_STATES_FULL.find(s => s.code === code)
                  return (
                    <Button
                      key={code}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => toggleServiceArea(code)}
                    >
                      {state?.name || code}
                      <Trash2 className="ml-2 h-3 w-3" />
                    </Button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred Agencies (Optional)</Label>
              {agencyFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="e.g., Department of Defense, NASA"
                    {...register(`preferred_agencies.${index}.value` as const)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeAgency(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendAgency({ value: "" })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Preferred Agency
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Certifications */}
        <Card>
          <CardHeader>
            <CardTitle>Certifications</CardTitle>
            <CardDescription>
              Select all certifications your company holds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {CERTIFICATIONS_FULL.map((cert) => (
                <div key={cert.code} className="flex items-start space-x-3">
                  <Checkbox
                    id={cert.code}
                    checked={selectedCertifications.includes(cert.code)}
                    onCheckedChange={() => toggleCertification(cert.code)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={cert.code}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {cert.code}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {cert.name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Constraints */}
        <Card>
          <CardHeader>
            <CardTitle>Search Constraints</CardTitle>
            <CardDescription>
              Keywords to exclude and security requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Blacklist Keywords (Optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Opportunities containing these keywords will be filtered out
              </p>
              {blacklistFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="e.g., weapons, overseas deployment"
                    {...register(`blacklist_keywords.${index}.value` as const)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBlacklist(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendBlacklist({ value: "" })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Blacklist Keyword
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="requires_clearance"
                checked={watch("requires_clearance") || false}
                onCheckedChange={(checked) => 
                  setValue("requires_clearance", checked === true, { shouldDirty: true })
                }
              />
              <label
                htmlFor="requires_clearance"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Only show opportunities that require security clearance
              </label>
            </div>
          </CardContent>
        </Card>

        {/* SAM.gov Registration */}
        <Card>
          <CardHeader>
            <CardTitle>SAM.gov Registration</CardTitle>
            <CardDescription>
              Your SAM.gov registration identifiers (optional but recommended)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cage_code">CAGE Code</Label>
              <Input
                id="cage_code"
                placeholder="1A2B3"
                maxLength={5}
                {...register("cage_code")}
                aria-invalid={errors.cage_code ? "true" : "false"}
              />
              {errors.cage_code && (
                <p className="text-sm text-destructive">{errors.cage_code.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                5-character Commercial and Government Entity Code
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="uei_number">UEI Number</Label>
              <Input
                id="uei_number"
                placeholder="ABC123DEF456"
                maxLength={12}
                {...register("uei_number")}
                aria-invalid={errors.uei_number ? "true" : "false"}
              />
              {errors.uei_number && (
                <p className="text-sm text-destructive">{errors.uei_number.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                12-character Unique Entity Identifier (replaces DUNS)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duns_number">DUNS Number</Label>
              <Input
                id="duns_number"
                placeholder="123456789"
                maxLength={9}
                {...register("duns_number")}
                aria-invalid={errors.duns_number ? "true" : "false"}
              />
              {errors.duns_number && (
                <p className="text-sm text-destructive">{errors.duns_number.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                9-digit Data Universal Numbering System number (legacy)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Past Performance & Priority Keywords */}
        <Card>
          <CardHeader>
            <CardTitle>Search Keywords</CardTitle>
            <CardDescription>
              Keywords from your past work and high-priority terms for better matching
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Past Performance Keywords</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Keywords from your past contract work to improve AI matching
              </p>
              {pastPerfFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="e.g., cybersecurity assessment, cloud migration"
                    {...register(`past_performance_keywords.${index}.value` as const)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePastPerf(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendPastPerf({ value: "" })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Past Performance Keyword
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Priority Keywords</Label>
              <p className="text-xs text-muted-foreground mb-2">
                High-priority keywords that boost opportunity relevance scores
              </p>
              {priorityFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <Input
                    placeholder="e.g., AI/ML, zero trust architecture"
                    {...register(`priority_keywords.${index}.value` as const)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removePriority(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendPriority({ value: "" })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Priority Keyword
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security & Contract Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Security & Contract Preferences</CardTitle>
            <CardDescription>
              Your clearance level and preferred contract types
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="clearance_level">Security Clearance Level</Label>
              <select
                id="clearance_level"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                {...register("clearance_level")}
              >
                {CLEARANCE_LEVELS.map((level) => (
                  <option key={level.code} value={level.code}>
                    {level.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Your highest security clearance level
              </p>
            </div>

            <div className="space-y-2">
              <Label>Preferred Contract Types</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select the contract types you prefer to work with
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {CONTRACT_TYPES.map((type) => (
                  <div key={type.code} className="flex items-start space-x-3">
                    <Checkbox
                      id={`contract-${type.code}`}
                      checked={selectedContractTypes.includes(type.code)}
                      onCheckedChange={() => toggleContractType(type.code)}
                    />
                    <label
                      htmlFor={`contract-${type.code}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {type.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="open_to_subcontracting"
                  checked={watch("open_to_subcontracting") ?? true}
                  onCheckedChange={(checked) => 
                    setValue("open_to_subcontracting", checked === true, { shouldDirty: true })
                  }
                />
                <label
                  htmlFor="open_to_subcontracting"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Open to subcontracting opportunities
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="open_to_prime_contracting"
                  checked={watch("open_to_prime_contracting") ?? true}
                  onCheckedChange={(checked) => 
                    setValue("open_to_prime_contracting", checked === true, { shouldDirty: true })
                  }
                />
                <label
                  htmlFor="open_to_prime_contracting"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Open to prime contracting opportunities
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          {isDirty ? (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">Unsaved changes</p>
          ) : null}
          <Button
            type="submit"
            size="lg"
            disabled={updateProfileMutation.isPending}
          >
            {updateProfileMutation.isPending ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Saving Profile...
              </>
            ) : (
              "Save Profile"
            )}
          </Button>
        </div>
      </form>

      {/* Navigation blocker dialog */}
      {blocker.state === "blocked" ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold">Unsaved changes</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You have unsaved profile changes. Are you sure you want to leave this page?
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => blocker.reset?.()}>
                Stay on page
              </Button>
              <Button variant="destructive" onClick={() => blocker.proceed?.()}>
                Leave without saving
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
