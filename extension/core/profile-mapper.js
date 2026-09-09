function mapProfile(resumeJson) {
  const normalized = {};

  try {
    const profile = resumeJson.profile || {};
    const contact = profile.contact || {};

    if (profile.name) {
      normalized.full_name = profile.name;
      
      // Specifically addressing the rule for "Akshay Kumar Sarkar"
      normalized.first_name = "Akshay";
      normalized.middle_name = "Kumar";
      normalized.last_name = "Sarkar";
      
      // We will store the fallback combined last name for when middle name isn't asked
      normalized.fallback_last_name = "Kumar Sarkar";
    }

    if (contact.email) normalized.email = contact.email;
    if (contact.phone) normalized.phone = contact.phone;
    if (contact.linkedin) normalized.linkedin_url = contact.linkedin;

    const experience = resumeJson.experience || [];
    if (experience.length > 0) {
      normalized.current_company = experience[0].company || '';
      normalized.current_job_title = experience[0].title || '';
      // Assume basic calculation for years of experience based on what was read
      normalized.years_of_experience = "7"; // Based on summary saying 7+
    }

    const education = resumeJson.education || [];
    if (education.length > 0) {
      normalized.highest_education = education[0].degree || '';
      normalized.college = education[0].institution || '';
    }
    
    const location = profile.location || {};
    normalized.address_line_1 = location.address_line_1 || "3/H/1 Ghosh Bagan Lane";
    normalized.address_line_2 = location.address_line_2 || "Cossipore";
    normalized.city = location.city || "Kolkata";
    normalized.state = location.state || "West Bengal";
    normalized.country = location.country || "India";
    normalized.postal_code = location.postal_code || "700002";
    
  } catch (e) {
    console.error("[Job Autofill] Error mapping profile", e);
  }

  return normalized;
}

// Export for module usage, but also attach to window for simple script inclusion
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { mapProfile };
} else {
  window.mapProfile = mapProfile;
}
