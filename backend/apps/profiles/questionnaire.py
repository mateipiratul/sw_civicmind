from __future__ import annotations

from typing import Any


WORK_DOMAIN_OPTIONS: list[dict[str, str]] = [
    {"value": "agriculture", "label": "Agricultură / fermier"},
    {"value": "education", "label": "Educație"},
    {"value": "health", "label": "Sănătate"},
    {"value": "it", "label": "IT / tehnologie"},
    {"value": "construction", "label": "Construcții"},
    {"value": "transport", "label": "Transport / livrări"},
    {"value": "horeca", "label": "HoReCa"},
    {"value": "retail", "label": "Retail"},
    {"value": "public_administration", "label": "Administrație publică"},
    {"value": "entrepreneur", "label": "Antreprenor / firma proprie"},
    {"value": "student", "label": "Student"},
    {"value": "retired", "label": "Pensionar"},
    {"value": "job_seeker", "label": "Șomer / in cautare de job"},
    {"value": "prefer_not_to_say", "label": "Prefer să nu spun"},
]

EMPLOYMENT_STATUS_OPTIONS: list[dict[str, str]] = [
    {"value": "employee", "label": "Angajat"},
    {"value": "freelancer_pfa", "label": "Freelancer / PFA"},
    {"value": "entrepreneur", "label": "Antreprenor"},
    {"value": "student", "label": "Student"},
    {"value": "retired", "label": "Pensionar"},
    {"value": "farmer", "label": "Agricultor / producator"},
    {"value": "unemployed", "label": "Somer"},
    {"value": "informal_seasonal", "label": "Lucrez informal / sezonier"},
    {"value": "prefer_not_to_say", "label": "Prefer sa nu spun"},
]

PERSONAL_INTEREST_OPTIONS: list[dict[str, str]] = [
    {"value": "taxes", "label": "Taxe si impozite"},
    {"value": "labour", "label": "Salarii si munca"},
    {"value": "education", "label": "Educatie"},
    {"value": "health", "label": "Sanatate"},
    {"value": "pensions", "label": "Pensii"},
    {"value": "agriculture", "label": "Agricultura"},
    {"value": "housing", "label": "Locuinte / chirii"},
    {"value": "transport", "label": "Transport"},
    {"value": "environment", "label": "Mediu"},
    {"value": "energy", "label": "Energie / facturi"},
    {"value": "justice", "label": "Justitie"},
    {"value": "civil_rights", "label": "Drepturi civile"},
    {"value": "digitalization", "label": "Digitalizare"},
    {"value": "public_safety", "label": "Siguranta publica"},
    {"value": "business", "label": "Economie / firme"},
    {"value": "family", "label": "Familie si copii"},
]

AGE_RANGE_OPTIONS: list[dict[str, str]] = [
    {"value": "under_18", "label": "Sub 18"},
    {"value": "18_24", "label": "18-24"},
    {"value": "25_34", "label": "25-34"},
    {"value": "35_49", "label": "35-49"},
    {"value": "50_64", "label": "50-64"},
    {"value": "65_plus", "label": "65+"},
]

HOUSING_STATUS_OPTIONS: list[dict[str, str]] = [
    {"value": "rent", "label": "Chirie"},
    {"value": "owner", "label": "Proprietar"},
    {"value": "with_family", "label": "Cu familia"},
    {"value": "student_housing", "label": "Camin / student housing"},
    {"value": "mortgage", "label": "Credit ipotecar"},
    {"value": "social_housing", "label": "Locuinta sociala"},
    {"value": "prefer_not_to_say", "label": "Prefer sa nu spun"},
]

MOBILITY_OPTIONS: list[dict[str, str]] = [
    {"value": "personal_car", "label": "Masina personala"},
    {"value": "public_transport", "label": "Transport public"},
    {"value": "bike_scooter", "label": "Bicicleta / trotineta"},
    {"value": "train", "label": "Tren"},
    {"value": "intercity_transport", "label": "Transport interurban"},
    {"value": "commercial_vehicle", "label": "Camion / vehicul comercial"},
    {"value": "rarely_travel", "label": "Nu folosesc des transport"},
]

EDUCATION_CONTEXT_OPTIONS: list[dict[str, str]] = [
    {"value": "student", "label": "Sunt student"},
    {"value": "pupil", "label": "Sunt elev"},
    {"value": "parent_of_student", "label": "Am copil/copii la scoala"},
    {"value": "education_worker", "label": "Lucrez in educatie"},
    {"value": "not_applicable", "label": "Nu se aplica"},
    {"value": "prefer_not_to_say", "label": "Prefer sa nu spun"},
]

ENERGY_FOCUS_OPTIONS: list[dict[str, str]] = [
    {"value": "electricity", "label": "Electricitate"},
    {"value": "gas", "label": "Gaz"},
    {"value": "central_heating", "label": "Incalzire centralizata"},
    {"value": "wood_pellets", "label": "Lemne / peleti"},
    {"value": "water_sewer", "label": "Apa si canalizare"},
    {"value": "solar_prosumer", "label": "Panouri solare / prosumator"},
    {"value": "energy_efficiency", "label": "Eficienta energetica"},
]

PUBLIC_SERVICE_OPTIONS: list[dict[str, str]] = [
    {"value": "public_healthcare", "label": "Sanatate publica"},
    {"value": "public_education", "label": "Educatie publica"},
    {"value": "local_administration", "label": "Administratie locala"},
    {"value": "anaf_taxes", "label": "Taxe si ANAF"},
    {"value": "justice", "label": "Justitie"},
    {"value": "police_safety", "label": "Politie / siguranta"},
    {"value": "documents_digital", "label": "Acte si digitalizare"},
    {"value": "eu_funds", "label": "Fonduri europene"},
    {"value": "social_assistance", "label": "Asistenta sociala"},
]


PROFILE_QUESTIONNAIRE: dict[str, list[dict[str, str]]] = {
    "work_domains": WORK_DOMAIN_OPTIONS,
    "employment_statuses": EMPLOYMENT_STATUS_OPTIONS,
    "personal_interest_areas": PERSONAL_INTEREST_OPTIONS,
    "age_ranges": AGE_RANGE_OPTIONS,
    "housing_statuses": HOUSING_STATUS_OPTIONS,
    "mobility_modes": MOBILITY_OPTIONS,
    "education_contexts": EDUCATION_CONTEXT_OPTIONS,
    "energy_focus_options": ENERGY_FOCUS_OPTIONS,
    "public_service_options": PUBLIC_SERVICE_OPTIONS,
}


WORK_DOMAIN_TO_INTERESTS: dict[str, list[str]] = {
    "agriculture": ["agricultura"],
    "education": ["educatie"],
    "health": ["sanatate"],
    "it": ["it"],
    "construction": ["munca", "social"],
    "transport": ["munca", "administratie"],
    "horeca": ["munca"],
    "retail": ["munca"],
    "public_administration": ["administratie"],
    "entrepreneur": ["fiscal", "munca"],
    "student": ["educatie"],
    "retired": ["pensii", "sanatate"],
    "job_seeker": ["munca", "social"],
}

EMPLOYMENT_STATUS_TO_INTERESTS: dict[str, list[str]] = {
    "employee": ["munca"],
    "freelancer_pfa": ["fiscal", "munca"],
    "entrepreneur": ["fiscal", "munca"],
    "student": ["educatie"],
    "retired": ["pensii", "sanatate"],
    "farmer": ["agricultura"],
    "unemployed": ["munca", "social"],
    "informal_seasonal": ["munca", "social"],
}

PERSONAL_INTEREST_TO_INTERESTS: dict[str, list[str]] = {
    "taxes": ["fiscal"],
    "labour": ["munca"],
    "education": ["educatie"],
    "health": ["sanatate"],
    "pensions": ["pensii"],
    "agriculture": ["agricultura"],
    "housing": ["social"],
    "transport": ["administratie", "social"],
    "environment": ["mediu"],
    "energy": ["mediu", "social"],
    "justice": ["justitie"],
    "civil_rights": ["justitie", "social"],
    "digitalization": ["it", "administratie"],
    "public_safety": ["justitie"],
    "business": ["fiscal", "munca"],
    "family": ["social", "educatie"],
}

AGE_RANGE_TO_INTERESTS: dict[str, list[str]] = {
    "under_18": ["educatie", "social"],
    "18_24": ["educatie", "munca"],
    "25_34": ["munca", "social"],
    "35_49": ["munca", "social"],
    "50_64": ["munca", "pensii"],
    "65_plus": ["pensii", "sanatate"],
}

HOUSING_TO_INTERESTS: dict[str, list[str]] = {
    "rent": ["social"],
    "owner": ["social"],
    "with_family": ["social"],
    "student_housing": ["educatie", "social"],
    "mortgage": ["social", "fiscal"],
    "social_housing": ["social"],
}

MOBILITY_TO_INTERESTS: dict[str, list[str]] = {
    "personal_car": ["fiscal", "social"],
    "public_transport": ["administratie", "social"],
    "bike_scooter": ["mediu", "social"],
    "train": ["administratie", "social"],
    "intercity_transport": ["administratie"],
    "commercial_vehicle": ["munca", "fiscal"],
}

EDUCATION_CONTEXT_TO_INTERESTS: dict[str, list[str]] = {
    "student": ["educatie"],
    "pupil": ["educatie"],
    "parent_of_student": ["educatie", "social"],
    "education_worker": ["educatie", "munca"],
}

ENERGY_TO_INTERESTS: dict[str, list[str]] = {
    "electricity": ["social", "mediu"],
    "gas": ["social", "mediu"],
    "central_heating": ["social"],
    "wood_pellets": ["social", "mediu"],
    "water_sewer": ["social", "administratie"],
    "solar_prosumer": ["mediu", "fiscal"],
    "energy_efficiency": ["mediu", "social"],
}

PUBLIC_SERVICE_TO_INTERESTS: dict[str, list[str]] = {
    "public_healthcare": ["sanatate"],
    "public_education": ["educatie"],
    "local_administration": ["administratie"],
    "anaf_taxes": ["fiscal"],
    "justice": ["justitie"],
    "police_safety": ["justitie"],
    "documents_digital": ["it", "administratie"],
    "eu_funds": ["administratie", "fiscal"],
    "social_assistance": ["social"],
}

WORK_DOMAIN_TO_PERSONAS: dict[str, list[str]] = {
    "agriculture": ["agricultor"],
    "education": ["angajat"],
    "health": ["pacient"],
    "it": ["it", "angajat"],
    "entrepreneur": ["antreprenor"],
    "student": ["student"],
    "retired": ["pensionar"],
    "job_seeker": ["angajat"],
}

EMPLOYMENT_STATUS_TO_PERSONAS: dict[str, list[str]] = {
    "employee": ["angajat"],
    "freelancer_pfa": ["pfa"],
    "entrepreneur": ["antreprenor"],
    "student": ["student"],
    "retired": ["pensionar"],
    "farmer": ["agricultor"],
    "unemployed": ["angajat"],
    "informal_seasonal": ["angajat"],
}

EDUCATION_CONTEXT_TO_PERSONAS: dict[str, list[str]] = {
    "student": ["student"],
    "parent_of_student": ["parinte"],
}

PUBLIC_SERVICE_TO_PERSONAS: dict[str, list[str]] = {
    "public_healthcare": ["pacient"],
}


def _option_values(options: list[dict[str, str]]) -> set[str]:
    return {option["value"] for option in options}


VALID_SINGLE_VALUE_FIELDS: dict[str, set[str]] = {
    "work_domain": _option_values(WORK_DOMAIN_OPTIONS),
    "employment_status": _option_values(EMPLOYMENT_STATUS_OPTIONS),
    "age_range": _option_values(AGE_RANGE_OPTIONS),
    "housing_status": _option_values(HOUSING_STATUS_OPTIONS),
}

VALID_MULTI_VALUE_FIELDS: dict[str, set[str]] = {
    "personal_interest_areas": _option_values(PERSONAL_INTEREST_OPTIONS),
    "mobility_modes": _option_values(MOBILITY_OPTIONS),
    "education_context": _option_values(EDUCATION_CONTEXT_OPTIONS),
    "energy_focus": _option_values(ENERGY_FOCUS_OPTIONS),
    "public_service_focus": _option_values(PUBLIC_SERVICE_OPTIONS),
}


def derive_profile_interests(profile_data: dict[str, Any]) -> list[str]:
    tags: set[str] = set(profile_data.get("interests") or [])

    tags.update(WORK_DOMAIN_TO_INTERESTS.get(profile_data.get("work_domain") or "", []))
    tags.update(EMPLOYMENT_STATUS_TO_INTERESTS.get(profile_data.get("employment_status") or "", []))
    tags.update(AGE_RANGE_TO_INTERESTS.get(profile_data.get("age_range") or "", []))
    tags.update(HOUSING_TO_INTERESTS.get(profile_data.get("housing_status") or "", []))

    for value in profile_data.get("personal_interest_areas", []):
        tags.update(PERSONAL_INTEREST_TO_INTERESTS.get(value, []))
    for value in profile_data.get("mobility_modes", []):
        tags.update(MOBILITY_TO_INTERESTS.get(value, []))
    for value in profile_data.get("education_context", []):
        tags.update(EDUCATION_CONTEXT_TO_INTERESTS.get(value, []))
    for value in profile_data.get("energy_focus", []):
        tags.update(ENERGY_TO_INTERESTS.get(value, []))
    for value in profile_data.get("public_service_focus", []):
        tags.update(PUBLIC_SERVICE_TO_INTERESTS.get(value, []))

    return sorted(tags)


def derive_persona_tags(profile_data: dict[str, Any]) -> list[str]:
    tags: set[str] = set(profile_data.get("persona_tags") or [])

    tags.update(WORK_DOMAIN_TO_PERSONAS.get(profile_data.get("work_domain") or "", []))
    tags.update(EMPLOYMENT_STATUS_TO_PERSONAS.get(profile_data.get("employment_status") or "", []))

    for value in profile_data.get("education_context", []):
        tags.update(EDUCATION_CONTEXT_TO_PERSONAS.get(value, []))
    for value in profile_data.get("public_service_focus", []):
        tags.update(PUBLIC_SERVICE_TO_PERSONAS.get(value, []))

    return sorted(tags)


def is_questionnaire_completed(profile_data: dict[str, Any]) -> bool:
    required_single_values: list[Any] = [
        profile_data.get("county"),
        profile_data.get("work_domain"),
        profile_data.get("employment_status"),
        profile_data.get("age_range"),
        profile_data.get("housing_status"),
    ]
    if not all(required_single_values):
        return False

    required_lists: tuple[Any, ...] = (
        profile_data.get("personal_interest_areas", []),
        profile_data.get("mobility_modes", []),
        profile_data.get("education_context", []),
        profile_data.get("energy_focus", []),
        profile_data.get("public_service_focus", []),
    )
    return all(isinstance(values, list) and len(values) > 0 for values in required_lists)
