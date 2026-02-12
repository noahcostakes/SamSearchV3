"""Company profile Pydantic schemas."""
import re
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, ValidationInfo, field_validator

# Valid US state codes
US_STATES = [
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
    "DC",
    "PR",
    "VI",
    "GU",
    "AS",
    "MP",
]

VALID_CERTIFICATIONS = [
    "8(a)",
    "HUBZone",
    "WOSB",
    "EDWOSB",
    "SDVOSB",
    "VOSB",
    "SDB",
]

VALID_CLEARANCE_LEVELS = [
    "None",
    "Confidential",
    "Secret",
    "Top Secret",
    "TS/SCI",
]

VALID_CONTRACT_TYPES = [
    "FFP",
    "T&M",
    "Cost-Plus",
    "IDIQ",
    "BPA",
    "GSA Schedule",
]


class ProfileCreate(BaseModel):
    """Schema for creating a company profile."""

    company_name: str = Field(..., min_length=2, max_length=200)

    cage_code: Optional[str] = Field(None, min_length=5, max_length=5)
    uei_number: Optional[str] = Field(None, min_length=12, max_length=12)
    duns_number: Optional[str] = Field(None, min_length=9, max_length=9)

    primary_naics: str = Field(..., min_length=6, max_length=6)
    secondary_naics: List[str] = Field(default_factory=list, max_length=10)

    core_competencies: List[str] = Field(..., min_length=1, max_length=20)
    technical_skills: List[str] = Field(default_factory=list, max_length=30)
    past_performance_keywords: List[str] = Field(default_factory=list, max_length=50)
    priority_keywords: List[str] = Field(default_factory=list, max_length=30)

    certifications: List[str] = Field(default_factory=list, max_length=10)
    clearance_level: str = Field("None")

    target_contract_min: int = Field(25000, ge=0, le=100_000_000)
    target_contract_max: int = Field(2_000_000, ge=0, le=100_000_000)
    preferred_agencies: List[str] = Field(default_factory=list, max_length=20)
    service_area: List[str] = Field(default_factory=list, max_length=55)
    max_response_days: int = Field(30, ge=1, le=365)

    contract_types_preference: List[str] = Field(default_factory=list, max_length=10)
    open_to_subcontracting: bool = True
    open_to_prime_contracting: bool = True

    blacklist_keywords: List[str] = Field(default_factory=list, max_length=50)
    requires_clearance: bool = False

    @field_validator("primary_naics")
    @classmethod
    def validate_primary_naics(cls, value: str) -> str:
        if not re.match(r"^\d{6}$", value):
            raise ValueError("NAICS code must be exactly 6 digits")
        return value

    @field_validator("secondary_naics")
    @classmethod
    def validate_secondary_naics(cls, value: List[str]) -> List[str]:
        for naics in value:
            if not re.match(r"^\d{6}$", naics):
                raise ValueError(f"Invalid NAICS code: {naics}")
        return value

    @field_validator("service_area")
    @classmethod
    def validate_service_area(cls, value: List[str]) -> List[str]:
        validated: List[str] = []
        for state in value:
            normalized = state.upper()
            if normalized not in US_STATES:
                raise ValueError(f"Invalid state code in service area: {normalized}")
            validated.append(normalized)
        return validated

    @field_validator("certifications")
    @classmethod
    def validate_certifications(cls, value: List[str]) -> List[str]:
        for cert in value:
            if cert not in VALID_CERTIFICATIONS:
                raise ValueError(f"Invalid certification: {cert}")
        return value

    @field_validator("target_contract_max")
    @classmethod
    def validate_contract_range(cls, value: int, info: ValidationInfo) -> int:
        min_value = info.data.get("target_contract_min")
        if min_value is not None and value < min_value:
            raise ValueError("Max contract value must be >= min value")
        return value

    @field_validator("core_competencies")
    @classmethod
    def validate_competencies(cls, value: List[str]) -> List[str]:
        cleaned = [item.strip() for item in value if item.strip()]
        if not cleaned:
            raise ValueError("At least one core competency is required")
        return cleaned

    @field_validator("clearance_level")
    @classmethod
    def validate_clearance_level(cls, value: str) -> str:
        if value not in VALID_CLEARANCE_LEVELS:
            raise ValueError(
                f"Invalid clearance level: {value}. Must be one of {VALID_CLEARANCE_LEVELS}"
            )
        return value

    @field_validator("contract_types_preference")
    @classmethod
    def validate_contract_types(cls, value: List[str]) -> List[str]:
        for contract_type in value:
            if contract_type not in VALID_CONTRACT_TYPES:
                raise ValueError(
                    f"Invalid contract type: {contract_type}. Must be one of {VALID_CONTRACT_TYPES}"
                )
        return value

    @field_validator("cage_code")
    @classmethod
    def validate_cage_code(cls, value: Optional[str]) -> Optional[str]:
        if value and not re.match(r"^[A-Z0-9]{5}$", value.upper()):
            raise ValueError("CAGE code must be 5 alphanumeric characters")
        return value.upper() if value else None

    @field_validator("uei_number")
    @classmethod
    def validate_uei(cls, value: Optional[str]) -> Optional[str]:
        if value and not re.match(r"^[A-Z0-9]{12}$", value.upper()):
            raise ValueError("UEI must be 12 alphanumeric characters")
        return value.upper() if value else None

    @field_validator("duns_number")
    @classmethod
    def validate_duns(cls, value: Optional[str]) -> Optional[str]:
        if value and not re.match(r"^\d{9}$", value):
            raise ValueError("DUNS number must be 9 digits")
        return value


class ProfileUpdate(BaseModel):
    """Schema for updating a company profile (all fields optional)."""

    company_name: Optional[str] = Field(None, min_length=2, max_length=200)

    cage_code: Optional[str] = Field(None, min_length=5, max_length=5)
    uei_number: Optional[str] = Field(None, min_length=12, max_length=12)
    duns_number: Optional[str] = Field(None, min_length=9, max_length=9)

    primary_naics: Optional[str] = Field(None, min_length=6, max_length=6)
    secondary_naics: Optional[List[str]] = None

    core_competencies: Optional[List[str]] = None
    technical_skills: Optional[List[str]] = None
    past_performance_keywords: Optional[List[str]] = None
    priority_keywords: Optional[List[str]] = None

    certifications: Optional[List[str]] = None
    clearance_level: Optional[str] = None

    target_contract_min: Optional[int] = Field(None, ge=0, le=100_000_000)
    target_contract_max: Optional[int] = Field(None, ge=0, le=100_000_000)
    preferred_agencies: Optional[List[str]] = None
    service_area: Optional[List[str]] = None
    max_response_days: Optional[int] = Field(None, ge=1, le=365)

    contract_types_preference: Optional[List[str]] = None
    open_to_subcontracting: Optional[bool] = None
    open_to_prime_contracting: Optional[bool] = None

    blacklist_keywords: Optional[List[str]] = None
    requires_clearance: Optional[bool] = None

    @field_validator("primary_naics")
    @classmethod
    def validate_primary_naics(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and not re.match(r"^\d{6}$", value):
            raise ValueError("NAICS code must be exactly 6 digits")
        return value

    @field_validator("secondary_naics")
    @classmethod
    def validate_secondary_naics(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return value
        for naics in value:
            if not re.match(r"^\d{6}$", naics):
                raise ValueError(f"Invalid NAICS code: {naics}")
        return value

    @field_validator("service_area")
    @classmethod
    def validate_service_area(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return value
        validated: List[str] = []
        for state in value:
            normalized = state.upper()
            if normalized not in US_STATES:
                raise ValueError(f"Invalid state code in service area: {normalized}")
            validated.append(normalized)
        return validated

    @field_validator("certifications")
    @classmethod
    def validate_certifications(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return value
        for cert in value:
            if cert not in VALID_CERTIFICATIONS:
                raise ValueError(f"Invalid certification: {cert}")
        return value

    @field_validator("clearance_level")
    @classmethod
    def validate_clearance_level(cls, value: Optional[str]) -> Optional[str]:
        if value is not None and value not in VALID_CLEARANCE_LEVELS:
            raise ValueError(
                f"Invalid clearance level: {value}. Must be one of {VALID_CLEARANCE_LEVELS}"
            )
        return value

    @field_validator("contract_types_preference")
    @classmethod
    def validate_contract_types(
        cls, value: Optional[List[str]]
    ) -> Optional[List[str]]:
        if value is None:
            return value
        for contract_type in value:
            if contract_type not in VALID_CONTRACT_TYPES:
                raise ValueError(
                    f"Invalid contract type: {contract_type}. Must be one of {VALID_CONTRACT_TYPES}"
                )
        return value

    @field_validator("cage_code")
    @classmethod
    def validate_cage_code(cls, value: Optional[str]) -> Optional[str]:
        if value and not re.match(r"^[A-Z0-9]{5}$", value.upper()):
            raise ValueError("CAGE code must be 5 alphanumeric characters")
        return value.upper() if value else None

    @field_validator("uei_number")
    @classmethod
    def validate_uei(cls, value: Optional[str]) -> Optional[str]:
        if value and not re.match(r"^[A-Z0-9]{12}$", value.upper()):
            raise ValueError("UEI must be 12 alphanumeric characters")
        return value.upper() if value else None

    @field_validator("duns_number")
    @classmethod
    def validate_duns(cls, value: Optional[str]) -> Optional[str]:
        if value and not re.match(r"^\d{9}$", value):
            raise ValueError("DUNS number must be 9 digits")
        return value

    @field_validator("target_contract_max")
    @classmethod
    def validate_contract_range(cls, value: Optional[int], info: ValidationInfo) -> Optional[int]:
        if value is None:
            return value
        min_value = info.data.get("target_contract_min")
        if min_value is not None and value < min_value:
            raise ValueError("Max contract value must be >= min value")
        return value


class ProfileResponse(BaseModel):
    """Schema for profile response."""

    id: str
    user_id: str
    company_name: str

    cage_code: Optional[str]
    uei_number: Optional[str]
    duns_number: Optional[str]

    primary_naics: str
    secondary_naics: List[str]

    core_competencies: List[str]
    technical_skills: List[str]
    past_performance_keywords: List[str]
    priority_keywords: List[str]

    certifications: List[str]
    clearance_level: str

    target_contract_min: int
    target_contract_max: int
    preferred_agencies: List[str]
    service_area: List[str]
    max_response_days: int

    contract_types_preference: List[str]
    open_to_subcontracting: bool
    open_to_prime_contracting: bool

    blacklist_keywords: List[str]
    requires_clearance: bool

    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True
