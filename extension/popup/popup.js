document.addEventListener('DOMContentLoaded', async () => {
  // Dynamic Manifest Version Display
  const versionTag = document.getElementById('extension-version-tag') || document.querySelector('.version-tag');
  if (versionTag && chrome.runtime?.getManifest) {
    versionTag.textContent = `v${chrome.runtime.getManifest().version}`;
  }

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

    // ==========================================
    // UNIFIED 2-BUTTON SYSTEM:
    // 1. Send Requests (Daily Routine + Approved Notes + Sent Sync)
    // 2. Sync The Rest (Accepted Invites + All Connections + Career History)
    // ==========================================
    const btnSendRequests = document.getElementById('btn-send-requests');
    const sendRequestsText = document.getElementById('send-requests-text');
    const sendRequestsBadge = document.getElementById('send-requests-badge');

    const btnSyncTheRest = document.getElementById('btn-sync-the-rest');
    const syncTheRestText = document.getElementById('sync-the-rest-text');
    const syncTheRestBadge = document.getElementById('sync-the-rest-badge');

    const toggleAdvanced = document.getElementById('toggle-advanced-sync');
    const advancedPanel = document.getElementById('advanced-sync-panel');

    if (toggleAdvanced && advancedPanel) {
      toggleAdvanced.addEventListener('click', () => {
        const isHidden = advancedPanel.style.display === 'none' || !advancedPanel.style.display;
        advancedPanel.style.display = isHidden ? 'grid' : 'none';
        toggleAdvanced.textContent = isHidden ? 'Hide individual controls ▴' : 'Individual sync controls ▾';
      });
    }

    // BUTTON 1: SEND REQUESTS (Opens LinkedIn Grow page for on-page ⚡ Routine)
    if (btnSendRequests) {
      btnSendRequests.addEventListener('click', () => {
        btnSendRequests.disabled = true;
        if (sendRequestsText) sendRequestsText.textContent = 'Opening Grow...';
        if (sendRequestsBadge) sendRequestsBadge.textContent = 'Active';

        const growUrl = 'https://www.linkedin.com/mynetwork/grow/';
        chrome.tabs.query({ url: '*://*.linkedin.com/*' }, (tabs) => {
          const existingGrowTab = (tabs || []).find(t => t.url && t.url.includes('mynetwork/grow'));
          if (existingGrowTab && existingGrowTab.id) {
            chrome.tabs.update(existingGrowTab.id, { active: true });
            if (existingGrowTab.windowId) {
              chrome.windows.update(existingGrowTab.windowId, { focused: true });
            }
          } else {
            chrome.tabs.create({ url: growUrl });
          }

          setTimeout(() => {
            btnSendRequests.disabled = false;
            if (sendRequestsText) sendRequestsText.textContent = 'Send Requests';
            if (sendRequestsBadge) sendRequestsBadge.textContent = 'Open Grow (⚡)';
          }, 1500);
        });
      });
    }

    // BUTTON 2: SYNC NETWORK & RADAR (Accepted Invites -> All Connections -> Career History)
    if (btnSyncTheRest) {
      btnSyncTheRest.addEventListener('click', async () => {
        btnSyncTheRest.disabled = true;

        try {
          // Phase 1/3: Accepted Invites
          if (syncTheRestText) syncTheRestText.textContent = '1/3: Checking Accepted...';
          if (syncTheRestBadge) syncTheRestBadge.textContent = 'Step 1 of 3';
          await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'SYNC_ACCEPTED_CONNECTIONS' }, (res) => {
              console.log('[Sync All] Phase 1 Accepted:', res);
              resolve(res);
            });
          });

          // Phase 2/3: All 1st-Degree Connections
          if (syncTheRestText) syncTheRestText.textContent = '2/3: All Connections...';
          if (syncTheRestBadge) syncTheRestBadge.textContent = 'Step 2 of 3';
          await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'SYNC_ALL_CONNECTIONS' }, (res) => {
              console.log('[Sync All] Phase 2 Connections:', res);
              resolve(res);
            });
          });

          // Phase 3/3: Career / Employment History for Company Radar
          if (syncTheRestText) syncTheRestText.textContent = '3/3: Career History...';
          if (syncTheRestBadge) syncTheRestBadge.textContent = 'Step 3 of 3';
          await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: 'PULL_ALL_EMPLOYMENT_HISTORY' }, (res) => {
              console.log('[Sync All] Phase 3 History:', res);
              resolve(res);
            });
          });

          // Complete!
          if (syncTheRestText) syncTheRestText.textContent = '✓ All Synced!';
          if (syncTheRestBadge) syncTheRestBadge.textContent = 'Up to Date';
        } catch (err) {
          console.error('[Sync All] Error:', err);
          if (syncTheRestText) syncTheRestText.textContent = 'Sync Finished';
        } finally {
          setTimeout(() => {
            btnSyncTheRest.disabled = false;
            if (syncTheRestText) syncTheRestText.textContent = 'Sync Network & Radar';
            if (syncTheRestBadge) syncTheRestBadge.textContent = 'Accepted • Conn • Radar';
          }, 3500);
        }
      });
    }

    // ==========================================
    // LINKEDIN VOYAGER API 1-CLICK SYNC COMMAND CENTER
    // ==========================================
    const btnSyncVoyager = document.getElementById('btn-sync-voyager');
    const syncText = document.getElementById('sync-voyager-text');
    const btnSyncSent = document.getElementById('btn-sync-sent');
    const syncSentText = document.getElementById('sync-sent-text');
    const btnSyncAllConn = document.getElementById('btn-sync-all-connections');
    const syncAllConnText = document.getElementById('sync-all-conn-text');
    const btnPullEmployment = document.getElementById('btn-pull-employment');
    const pullEmploymentText = document.getElementById('pull-employment-text');

    // 1. Sync Accepted Invites
    if (btnSyncVoyager) {
      btnSyncVoyager.addEventListener('click', () => {
        btnSyncVoyager.disabled = true;
        if (syncText) syncText.textContent = 'Syncing...';

        chrome.runtime.sendMessage({ action: 'SYNC_ACCEPTED_CONNECTIONS' }, (res) => {
          btnSyncVoyager.disabled = false;
          if (chrome.runtime.lastError) {
            if (syncText) syncText.textContent = 'Error syncing';
          } else if (res && res.updated > 0) {
            if (syncText) syncText.textContent = `✓ +${res.updated} Accepted!`;
          } else {
            if (syncText) syncText.textContent = '✓ Up to Date';
          }

          setTimeout(() => {
            if (syncText) syncText.textContent = 'Accepted Invites';
          }, 3500);
        });
      });
    }

    // 2. Sync Sent Requests (Invitations)
    if (btnSyncSent) {
      btnSyncSent.addEventListener('click', () => {
        btnSyncSent.disabled = true;
        if (syncSentText) syncSentText.textContent = 'Syncing Sent...';

        chrome.runtime.sendMessage({ action: 'SYNC_SENT_REQUESTS' }, (res) => {
          btnSyncSent.disabled = false;
          if (chrome.runtime.lastError) {
            if (syncSentText) syncSentText.textContent = 'Error syncing';
          } else if (res && res.count > 0) {
            if (syncSentText) syncSentText.textContent = `✓ Synced ${res.count}!`;
          } else if (res && res.method === 'TAB_OPENED') {
            if (syncSentText) syncSentText.textContent = '✓ Scanning Tab...';
          } else {
            if (syncSentText) syncSentText.textContent = '✓ Up to Date';
          }

          setTimeout(() => {
            if (syncSentText) syncSentText.textContent = 'Sent Requests';
          }, 3500);
        });
      });
    }

    // 3. Sync All 1st-Degree Connections
    if (btnSyncAllConn) {
      btnSyncAllConn.addEventListener('click', () => {
        btnSyncAllConn.disabled = true;
        if (syncAllConnText) syncAllConnText.textContent = 'Syncing 1st-deg...';

        chrome.runtime.sendMessage({ action: 'SYNC_ALL_CONNECTIONS' }, (res) => {
          btnSyncAllConn.disabled = false;
          if (chrome.runtime.lastError) {
            if (syncAllConnText) syncAllConnText.textContent = 'Error syncing';
          } else if (res && (res.newlyAdded > 0 || res.updated > 0)) {
            const added = res.newlyAdded || 0;
            const updated = res.updated || 0;
            if (syncAllConnText) syncAllConnText.textContent = `✓ +${added} Added (${res.total})`;
          } else if (res && res.total > 0) {
            if (syncAllConnText) syncAllConnText.textContent = `✓ ${res.total} Checked`;
          } else {
            if (syncAllConnText) syncAllConnText.textContent = '✓ Up to Date';
          }

          setTimeout(() => {
            if (syncAllConnText) syncAllConnText.textContent = 'All Connections';
          }, 4000);
        });
      });
    }

    // 4. Pull All Employment History
    if (btnPullEmployment) {
      btnPullEmployment.addEventListener('click', () => {
        btnPullEmployment.disabled = true;
        if (pullEmploymentText) pullEmploymentText.textContent = 'Pulling...';

        chrome.runtime.sendMessage({ action: 'PULL_ALL_EMPLOYMENT_HISTORY' }, (res) => {
          btnPullEmployment.disabled = false;
          if (chrome.runtime.lastError) {
            if (pullEmploymentText) pullEmploymentText.textContent = 'Error pulling';
          } else if (res && res.updated > 0) {
            if (pullEmploymentText) pullEmploymentText.textContent = `✓ Mapped ${res.updated}!`;
          } else {
            if (pullEmploymentText) pullEmploymentText.textContent = '✓ Up to Date';
          }

          setTimeout(() => {
            if (pullEmploymentText) pullEmploymentText.textContent = 'Career History';
          }, 4000);
        });
      });
    }

    // 5. Fetch Recruiter Jobs (<14d Old)
    const btnScanRecruiterJobs = document.getElementById('btn-scan-recruiter-jobs');
    const scanRecruiterJobsText = document.getElementById('scan-recruiter-jobs-text');
    const scanRecruiterJobsBadge = document.getElementById('scan-recruiter-jobs-badge');
    const recruiterJobsContainer = document.getElementById('recruiter-jobs-container');
    const recruiterJobsCount = document.getElementById('recruiter-jobs-count');
    const recruiterJobsList = document.getElementById('recruiter-jobs-list');
    const btnCopyRecruiterJobs = document.getElementById('btn-copy-recruiter-jobs');

    function renderRecruiterJobs(jobs) {
      if (!recruiterJobsContainer || !recruiterJobsList) return;
      if (!Array.isArray(jobs) || jobs.length === 0) {
        recruiterJobsContainer.style.display = 'none';
        return;
      }

      recruiterJobsContainer.style.display = 'block';
      if (recruiterJobsCount) recruiterJobsCount.textContent = jobs.length;
      recruiterJobsList.innerHTML = '';

      jobs.forEach((job) => {
        const card = document.createElement('div');
        card.style.cssText = 'background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 6px; padding: 7px 9px; font-size: 11px;';
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 4px; margin-bottom: 3px;">
            <div style="font-weight: 700; color: #a7f3d0; font-size: 11.5px;">${job.roleTitle}</div>
            <span style="font-size: 9.5px; color: #6ee7b7; background: rgba(16, 185, 129, 0.2); padding: 1px 4px; border-radius: 3px; white-space: nowrap;">${job.postTime}</span>
          </div>
          <div style="color: #94a3b8; font-size: 10px; margin-bottom: 4px;">
            👤 <span style="color: #e2e8f0; font-weight: 600;">${job.recruiterName}</span> • ${job.recruiterCompany || 'Hiring'}
          </div>
          <div style="color: #cbd5e1; font-size: 10px; line-height: 1.35; margin-bottom: 5px; max-height: 48px; overflow: hidden; text-overflow: ellipsis;">
            ${job.summary}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 4px;">
            <span style="font-size: 9px; color: #34d399;">${job.skills && job.skills.length > 0 ? job.skills.slice(0, 3).join(', ') : 'Hiring Post'}</span>
            <a href="${job.postUrl || job.recruiterProfileUrl}" target="_blank" style="color: #38bdf8; text-decoration: none; font-size: 10px; font-weight: 600;">Open Post ↗</a>
          </div>
        `;
        recruiterJobsList.appendChild(card);
      });

      if (btnCopyRecruiterJobs) {
        btnCopyRecruiterJobs.onclick = () => {
          const exportText = JSON.stringify(jobs, null, 2);
          navigator.clipboard.writeText(exportText).then(() => {
            btnCopyRecruiterJobs.textContent = '✓ Copied!';
            setTimeout(() => btnCopyRecruiterJobs.textContent = '📋 Copy All', 2000);
          });
        };
      }
    }

    // Load previously scanned recruiter jobs from local cache if present
    chrome.storage.local.get(['latestRecruiterJobs'], (res) => {
      if (res && Array.isArray(res.latestRecruiterJobs) && res.latestRecruiterJobs.length > 0) {
        renderRecruiterJobs(res.latestRecruiterJobs);
      }
    });

    if (btnScanRecruiterJobs) {
      btnScanRecruiterJobs.addEventListener('click', () => {
        btnScanRecruiterJobs.disabled = true;
        if (scanRecruiterJobsText) scanRecruiterJobsText.textContent = 'Scanning 54 Feeds...';
        if (scanRecruiterJobsBadge) scanRecruiterJobsBadge.textContent = 'Running ⏳';

        chrome.runtime.sendMessage({ action: 'FETCH_RECRUITER_JOBS_RADAR', options: { limit: 54 } }, (res) => {
          btnScanRecruiterJobs.disabled = false;
          if (scanRecruiterJobsText) scanRecruiterJobsText.textContent = 'Fetch Recruiter Posts (All)';

          if (chrome.runtime.lastError || !res || !res.success) {
            if (scanRecruiterJobsBadge) scanRecruiterJobsBadge.textContent = 'Error';
            alert((res && res.error) || 'Failed to scan recruiter feeds.');
          } else {
            if (scanRecruiterJobsBadge) scanRecruiterJobsBadge.textContent = `✓ ${res.count} Posts`;
            renderRecruiterJobs(res.jobs);
          }
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
