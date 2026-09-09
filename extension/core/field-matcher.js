const FIELD_RULES = [
  { key: 'first_name', keywords: ['first name', 'given name', 'fname', 'first_name', 'given_name'] },
  { key: 'middle_name', keywords: ['middle name', 'mname', 'middle_name'] },
  { key: 'last_name', keywords: ['last name', 'family name', 'lname', 'last_name', 'surname'] },
  { key: 'full_name', keywords: ['full name', 'name'] },
  { key: 'email', keywords: ['email', 'e-mail', 'email address', 'email_address'] },
  { key: 'phone', keywords: ['phone', 'mobile', 'mobile number', 'contact number', 'telephone', 'cell'] },
  { key: 'address_line_1', keywords: ['address line 1', 'address 1', 'street address'] },
  { key: 'address_line_2', keywords: ['address line 2', 'address 2', 'apt', 'suite'] },
  { key: 'city', keywords: ['city', 'town'] },
  { key: 'state', keywords: ['state', 'province', 'region'] },
  { key: 'country', keywords: ['country', 'nation'] },
  { key: 'postal_code', keywords: ['postal code', 'zip code', 'zip', 'pincode', 'pin code'] },
  { key: 'linkedin_url', keywords: ['linkedin', 'linked in', 'linkedin url'] },
  { key: 'current_company', keywords: ['current company', 'employer', 'company'] },
  { key: 'current_job_title', keywords: ['job title', 'title', 'current title', 'role'] },
  { key: 'years_of_experience', keywords: ['years of experience', 'experience', 'total experience'] }
];

function classifyField(fieldData) {
  const textSignals = [
    fieldData.label,
    fieldData.placeholder,
    fieldData.name,
    fieldData.id,
    fieldData.ariaLabel,
    fieldData.autocomplete
  ].map(s => (s || '').toLowerCase());
  
  const combinedSignal = textSignals.join(' ');
  
  for (const rule of FIELD_RULES) {
    for (const keyword of rule.keywords) {
      // Look for exact keyword match within boundaries, or just direct string inclusion
      if (textSignals.some(s => s === keyword || s.includes(keyword))) {
        return {
          key: rule.key,
          confidence: 'HIGH'
        };
      }
    }
  }

  return {
    key: null,
    confidence: 'UNKNOWN'
  };
}

window.classifyField = classifyField;
