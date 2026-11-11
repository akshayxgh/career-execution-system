document.addEventListener('DOMContentLoaded', async () => {
  const statusText = document.getElementById('status-text');
  const btnImport = document.getElementById('btn-import');
  const fileInput = document.getElementById('import-file');
  
  const qStatusText = document.getElementById('q-status-text');
  const btnImportQ = document.getElementById('btn-import-q');
  const fileInputQ = document.getElementById('import-questionnaire');

  const siteBadge = document.getElementById('site-badge');
  const btnFill = document.getElementById('btn-fill');
  const summaryDiv = document.getElementById('fill-summary');
  const summaryEngine = document.getElementById('summary-engine');
  const summaryText = document.getElementById('summary-text');

  let profileLoaded = false;

  function updateFillButton() {
    btnFill.disabled = !profileLoaded;
  }

  // 1. Detect Active Tab and Site Engine
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { action: "GET_SITE_INFO" }, (response) => {
      if (chrome.runtime.lastError || !response) {
        siteBadge.textContent = "Refresh page to detect";
        siteBadge.className = "site-badge detecting";
        return;
      }

      siteBadge.textContent = response.adapterName;
      if (response.isDedicated) {
        siteBadge.className = "site-badge dedicated";
      } else {
        siteBadge.className = "site-badge generic";
      }
    });
  }

  // 2. Check if profile and questionnaire are already loaded
  chrome.storage.local.get(['normalizedProfile', 'questionnaire'], (result) => {
    if (result.normalizedProfile) {
      statusText.textContent = 'Loaded ✓';
      statusText.style.color = '#059669';
      btnImport.textContent = 'Update Profile';
      profileLoaded = true;
    } else {
      statusText.textContent = 'Not Loaded';
      statusText.style.color = '#dc2626';
      profileLoaded = false;
    }

    if (result.questionnaire && Array.isArray(result.questionnaire)) {
      qStatusText.textContent = `Loaded ✓ (${result.questionnaire.length} Qs)`;
      qStatusText.style.color = '#059669';
    } else {
      qStatusText.textContent = 'Not Loaded';
      qStatusText.style.color = '#dc2626';
    }

    updateFillButton();
  });

  // 3. Handle Profile import
  btnImport.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        console.log("[Job Autofill] Profile loaded from file");
        
        const normalized = window.mapProfile(json);
        
        chrome.storage.local.set({ normalizedProfile: normalized }, () => {
          statusText.textContent = 'Loaded ✓';
          statusText.style.color = '#059669';
          btnImport.textContent = 'Update Profile';
          profileLoaded = true;
          updateFillButton();
          console.log("[Job Autofill] Normalized profile saved to storage");
        });
      } catch (err) {
        console.error("[Job Autofill] Error parsing JSON:", err);
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  });

  // 4. Handle Questionnaire import
  btnImportQ.addEventListener('click', () => {
    fileInputQ.click();
  });

  fileInputQ.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (!Array.isArray(json)) {
          throw new Error("Questionnaire must be an array of objects.");
        }
        
        console.log(`[Job Autofill] Questionnaire loaded from file (${json.length} questions)`);
        
        chrome.storage.local.set({ questionnaire: json }, () => {
          qStatusText.textContent = `Loaded ✓ (${json.length} Qs)`;
          qStatusText.style.color = '#059669';
          console.log("[Job Autofill] Questionnaire saved to storage");
        });
      } catch (err) {
        console.error("[Job Autofill] Error parsing JSON:", err);
        alert("Failed to parse Questionnaire JSON file. " + err.message);
      }
    };
    reader.readAsText(file);
  });

  // 5. Handle Fill Form button click
  btnFill.addEventListener('click', async () => {
    btnFill.disabled = true;
    summaryDiv.classList.add('hidden');
    
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) {
      updateFillButton();
      return;
    }

    chrome.tabs.sendMessage(activeTab.id, { action: "FILL_FORM" }, (response) => {
      updateFillButton();
      if (chrome.runtime.lastError) {
        console.error("[Job Autofill] Error sending message:", chrome.runtime.lastError);
        alert("Please refresh the job application tab (F5) so the autofill engine is connected.");
        return;
      }
      
      if (response && response.summary) {
        const s = response.summary;
        summaryEngine.textContent = `Engine: ${s.adapterName || 'Generic'}`;
        summaryText.innerHTML = `
          <strong>Total Filled:</strong> ${s.filled || 0}<br>
          &nbsp;&nbsp;• Profile fields: ${s.filledProfile || 0}<br>
          &nbsp;&nbsp;• Questionnaire: ${s.filledQuestionnaire || 0}<br>
          <strong>Skipped:</strong> ${s.skipped || 0}<br>
          <strong>Manual Review:</strong> ${s.unknown || 0}
        `;
        summaryDiv.classList.remove('hidden');
      }
    });
  });

    // ==========================================
    // DAILY ROUTINE COMMAND CENTER (LINKEDIN & LIVE CLOUD)
    // ==========================================
    const btnOpenLinkedIn = document.getElementById('btn-open-linkedin-grow');
    const linkedinRoutineSub = document.getElementById('linkedin-routine-sub');
    const LIVE_MYCES_API = 'https://myces.vercel.app';

    // Check live MYCES for approved pending connection actions
    fetch(`${LIVE_MYCES_API}/api/agent/actions?status=APPROVED&action_type=SEND_CONNECTION`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const approved = (data.actions || []).filter(a => a.status === 'APPROVED');
        if (approved.length > 0 && linkedinRoutineSub) {
          linkedinRoutineSub.textContent = `⚡ ${approved.length} approved invites ready in MYCES`;
          linkedinRoutineSub.style.color = '#15803d';
          linkedinRoutineSub.style.fontWeight = '600';
        }
      })
      .catch(() => {
        // Fallback to local dev if offline
        fetch('http://localhost:5173/api/agent/actions?status=APPROVED&action_type=SEND_CONNECTION')
          .then(res => res.json())
          .then(data => {
            const approved = (data.actions || []).filter(a => a.status === 'APPROVED');
            if (approved.length > 0 && linkedinRoutineSub) {
              linkedinRoutineSub.textContent = `⚡ ${approved.length} approved invites ready (local)`;
            }
          })
          .catch(() => {});
      });

    if (btnOpenLinkedIn) {
      btnOpenLinkedIn.addEventListener('click', () => {
        btnOpenLinkedIn.disabled = true;
        btnOpenLinkedIn.textContent = '⏳ Checking...';

        // 1. First check and dispatch all approved outreach messages
        chrome.runtime.sendMessage({ action: 'GET_APPROVED_MESSAGES' }, async (res) => {
          const actions = (res && res.actions) || [];

          if (actions.length > 0) {
            for (let i = 0; i < actions.length; i++) {
              const act = actions[i];
              const pUrl = (act.payload && act.payload.recipient_profile_url) || '';
              let c = ((act.payload && act.payload.content) || '').trim();
              c = c.replace(/^["'“”‘’`\s]+|["'“”‘’`\s]+$/g, '').trim();
              const n = (act.payload && act.payload.recipient_name) || 'Connection';

              btnOpenLinkedIn.textContent = `⚡ Sending (${i + 1}/${actions.length})...`;

              await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                  action: 'DISPATCH_LINKEDIN_MESSAGE',
                  actionId: act.id,
                  recipientUrl: pUrl,
                  content: c,
                  recipientName: n
                }, () => {
                  setTimeout(resolve, 3500); // Human-like spacing
                });
              });
            }

            btnOpenLinkedIn.textContent = `✅ All ${actions.length} Sent!`;
            if (typeof loadApprovedMessages === 'function') loadApprovedMessages();
            await new Promise((r) => setTimeout(r, 1500));
          }

          // 2. Open LinkedIn Grow network to continue routine
          chrome.tabs.create({ url: 'https://www.linkedin.com/mynetwork/grow/' });
          btnOpenLinkedIn.disabled = false;
          btnOpenLinkedIn.textContent = 'Launch ⚡';
        });
      });
    }

    // ==========================================
    // LINKEDIN VOYAGER API 1-CLICK SYNC
    // ==========================================
    const btnSyncVoyager = document.getElementById('btn-sync-voyager');
    const syncText = document.getElementById('sync-voyager-text');

    if (btnSyncVoyager) {
      btnSyncVoyager.addEventListener('click', () => {
        btnSyncVoyager.disabled = true;
        if (syncText) syncText.textContent = 'Syncing via Voyager API...';

        chrome.runtime.sendMessage({ action: 'SYNC_ACCEPTED_CONNECTIONS' }, (res) => {
          btnSyncVoyager.disabled = false;
          if (chrome.runtime.lastError) {
            if (syncText) syncText.textContent = 'Error syncing';
          } else if (res && res.updated > 0) {
            if (syncText) syncText.textContent = `✓ Synced ${res.updated} Accepted!`;
          } else {
            if (syncText) syncText.textContent = '✓ Already Up to Date';
          }

          setTimeout(() => {
            if (syncText) syncText.textContent = 'Sync Accepted Invites';
          }, 3500);
        });
      });
    }

    // ==========================================
    // NAUKRI 1-CLICK HEADER ICON BUMPER (SPACE SAVER)
    // ==========================================
    const btnNaukriBump = document.getElementById('btn-naukri-bump');

    if (btnNaukriBump) {
      btnNaukriBump.addEventListener('click', () => {
        btnNaukriBump.disabled = true;
        btnNaukriBump.classList.add('spinning');
        btnNaukriBump.title = "Bumping Naukri profile timestamp in background...";

        chrome.runtime.sendMessage({ action: "BUMP_NAUKRI_PROFILE" }, (response) => {
          btnNaukriBump.classList.remove('spinning');
          btnNaukriBump.disabled = false;

          if (chrome.runtime.lastError || !response || !response.success) {
            btnNaukriBump.textContent = "❌";
            const err = (response && response.error) || (chrome.runtime.lastError && chrome.runtime.lastError.message) || "Failed to update Naukri profile. Make sure you are logged into naukri.com";
            btnNaukriBump.title = err;
            alert(err);
            setTimeout(() => {
              btnNaukriBump.textContent = "🔄";
              btnNaukriBump.title = "1-Click Bump Naukri Profile Timestamp";
            }, 3000);
            return;
          }

          // Success!
          btnNaukriBump.textContent = "✅";
          btnNaukriBump.title = `Updated to Variant ${response.updatedTo}! Timestamp refreshed on Naukri.`;
          setTimeout(() => {
            btnNaukriBump.textContent = "🔄";
            btnNaukriBump.title = "1-Click Bump Naukri Profile Timestamp";
          }, 4000);
        });
      });
    }

    // ==========================================
    // APPROVED OUTREACH MESSAGES 1-CLICK DISPATCH
    // ==========================================
    const approvedSection = document.getElementById('approved-outreach-section');
    const approvedCountEl = document.getElementById('approved-msg-count');
    const approvedListEl = document.getElementById('approved-msg-list');
    const btnRefreshApproved = document.getElementById('btn-refresh-approved');
    const btnDispatchAll = document.getElementById('btn-dispatch-all');

    function loadApprovedMessages() {
      if (!approvedSection || !approvedListEl) return;
      chrome.runtime.sendMessage({ action: 'GET_APPROVED_MESSAGES' }, (res) => {
        if (chrome.runtime.lastError || !res || !res.actions || res.actions.length === 0) {
          approvedSection.style.display = 'none';
          if (btnDispatchAll) btnDispatchAll.style.display = 'none';
          return;
        }

        const actions = res.actions;
        approvedSection.style.display = 'block';
        if (approvedCountEl) approvedCountEl.textContent = actions.length;
        if (btnDispatchAll) {
          btnDispatchAll.style.display = actions.length > 1 ? 'block' : 'none';
          btnDispatchAll.textContent = `🚀 Send All (${actions.length})`;
        }
        approvedListEl.innerHTML = '';

        actions.forEach((act) => {
          const item = document.createElement('div');
          item.className = 'approved-msg-card';

          const name = (act.payload && act.payload.recipient_name) || 'Connection';
          const role = (act.payload && act.payload.recipient_role) || 'LinkedIn Contact';
          const profileUrl = (act.payload && act.payload.recipient_profile_url) || '';
          let content = ((act.payload && act.payload.content) || '').trim();
          content = content.replace(/^["'“”‘’`\s]+|["'“”‘’`\s]+$/g, '').trim();

          item.innerHTML = `
            <div class="approved-msg-info">
              <div class="approved-msg-name">
                <span>👤</span> <span>${name}</span>
              </div>
              <div class="approved-msg-role">
                ${role}
              </div>
            </div>
            <button class="myces-send-btn" data-id="${act.id}">
              ⚡ Send
            </button>
          `;

          const sendBtn = item.querySelector('.myces-send-btn');
          sendBtn.addEventListener('click', () => {
            sendBtn.disabled = true;
            sendBtn.textContent = '⏳ Sending...';

            chrome.runtime.sendMessage({
              action: 'DISPATCH_LINKEDIN_MESSAGE',
              actionId: act.id,
              recipientUrl: profileUrl,
              content: content,
              recipientName: name
            }, (dispRes) => {
              if (chrome.runtime.lastError || !dispRes || !dispRes.success) {
                sendBtn.disabled = false;
                sendBtn.textContent = '❌ Retry';
                alert((dispRes && dispRes.error) || 'Failed to dispatch message');
              } else {
                sendBtn.textContent = '✅ Sent!';
                sendBtn.style.background = '#059669';
                setTimeout(() => loadApprovedMessages(), 2000);
              }
            });
          });

          approvedListEl.appendChild(item);
        });

        // Setup Send All
        if (btnDispatchAll) {
          btnDispatchAll.onclick = async () => {
            btnDispatchAll.disabled = true;
            btnDispatchAll.textContent = '⏳ Dispatching...';

            for (let i = 0; i < actions.length; i++) {
              const act = actions[i];
              const pUrl = (act.payload && act.payload.recipient_profile_url) || '';
              let c = ((act.payload && act.payload.content) || '').trim();
              c = c.replace(/^["'“”‘’`\s]+|["'“”‘’`\s]+$/g, '').trim();
              const n = (act.payload && act.payload.recipient_name) || 'Connection';

              btnDispatchAll.textContent = `⏳ Sending (${i + 1}/${actions.length})...`;
              await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                  action: 'DISPATCH_LINKEDIN_MESSAGE',
                  actionId: act.id,
                  recipientUrl: pUrl,
                  content: c,
                  recipientName: n
                }, () => {
                  setTimeout(resolve, 3500); // Friendly spacing between tabs
                });
              });
            }

            btnDispatchAll.textContent = '✅ All Sent!';
            setTimeout(() => {
              btnDispatchAll.disabled = false;
              loadApprovedMessages();
            }, 2500);
          };
        }
      });
    }

    loadApprovedMessages();
    if (btnRefreshApproved) {
      btnRefreshApproved.addEventListener('click', loadApprovedMessages);
    }
});
