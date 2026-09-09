function triggerEvents(element) {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
}

function fillFields(classifiedFields, profile, questionnaire) {
  let filledProfile = 0;
  let filledQuestionnaire = 0;
  let skipped = 0;
  let unknown = 0;

  // Determine if there's a middle name field in this form
  const hasMiddleNameField = classifiedFields.some(f => f.classification.key === 'middle_name');
  
  // Create a working copy of profile so we can modify last_name dynamically for this specific form
  const dynamicProfile = { ...profile };
  if (!hasMiddleNameField && dynamicProfile.fallback_last_name) {
    dynamicProfile.last_name = dynamicProfile.fallback_last_name;
  }

  for (const { fieldData, classification } of classifiedFields) {
    const el = fieldData.element;
    let filled = false;

    // PRIORITY 1: Candidate Profile
    if (classification.confidence === 'HIGH' && classification.key) {
      const value = dynamicProfile[classification.key];
      if (value !== undefined && value !== null && value !== '') {
        if (fieldData.type === 'select') {
          let matchedOption = false;
          const options = Array.from(el.options);
          
          for (let opt of options) {
            if (opt.text.trim().toLowerCase() === value.toString().toLowerCase() ||
                opt.value.trim().toLowerCase() === value.toString().toLowerCase()) {
              el.value = opt.value;
              matchedOption = true;
              break;
            }
          }
          if (matchedOption) {
            triggerEvents(el);
            filledProfile++;
            filled = true;
            console.log(`[Job Autofill] Filled from profile: ${classification.key}`);
          } else {
            console.log(`[Job Autofill] No matching option for profile field: ${classification.key}`);
          }
        } 
        else if (fieldData.type === 'checkbox' || fieldData.type === 'radio') {
          // Keep skipped for complex cases in profile for now
          console.log(`[Job Autofill] Skipped complex profile field: ${classification.key}`);
        }
        else {
          el.value = value;
          triggerEvents(el);
          filledProfile++;
          filled = true;
          console.log(`[Job Autofill] Filled from profile: ${classification.key}`);
        }
      } else {
        console.log(`[Job Autofill] Profile field missing value: ${classification.key}`);
      }
    } else {
      console.log(`[Job Autofill] No profile match`);
    }

    if (filled) continue;

    // PRIORITY 2: Questionnaire Memory
    const qAnswer = window.questionnaireModule.matchQuestion(fieldData.label || fieldData.placeholder || fieldData.name, questionnaire);
    if (qAnswer !== null && qAnswer !== undefined && qAnswer !== '') {
      console.log(`[Job Autofill] Questionnaire match found`);
      
      if (fieldData.type === 'select') {
        let matchedOption = false;
        const options = Array.from(el.options);
        for (let opt of options) {
          if (opt.text.trim().toLowerCase() === qAnswer.toString().toLowerCase() ||
              opt.value.trim().toLowerCase() === qAnswer.toString().toLowerCase()) {
            el.value = opt.value;
            matchedOption = true;
            break;
          }
        }
        if (matchedOption) {
          triggerEvents(el);
          filledQuestionnaire++;
          filled = true;
          console.log(`[Job Autofill] Filled from questionnaire`);
        } else {
          console.log(`[Job Autofill] No matching option for questionnaire answer`);
        }
      }
      else if (fieldData.type === 'checkbox' || fieldData.type === 'radio') {
        // Very basic handling: if answer exactly matches the radio/check value or label
        if (el.value && el.value.trim().toLowerCase() === qAnswer.toString().toLowerCase()) {
          el.checked = true;
          triggerEvents(el);
          filledQuestionnaire++;
          filled = true;
          console.log(`[Job Autofill] Filled from questionnaire (radio/check exact value)`);
        } else if (fieldData.label && fieldData.label.trim().toLowerCase() === qAnswer.toString().toLowerCase()) {
          el.checked = true;
          triggerEvents(el);
          filledQuestionnaire++;
          filled = true;
          console.log(`[Job Autofill] Filled from questionnaire (radio/check exact label)`);
        } else {
          console.log(`[Job Autofill] Skipped complex radio/check questionnaire match`);
        }
      }
      else {
        el.value = qAnswer;
        triggerEvents(el);
        filledQuestionnaire++;
        filled = true;
        console.log(`[Job Autofill] Filled from questionnaire`);
      }
    } else {
      console.log(`[Job Autofill] No questionnaire match`);
    }

    if (!filled) {
      // PRIORITY 3: Unknown
      if (classification.key) {
        skipped++; // It was classified but we couldn't fill it (e.g. missing value, no matching option)
      } else {
        unknown++;
        console.log(`[Job Autofill] Manual review required`);
      }
    }
  }

  return { 
    filled: filledProfile + filledQuestionnaire, 
    filledProfile, 
    filledQuestionnaire, 
    skipped, 
    unknown 
  };
}

window.fillFields = fillFields;
