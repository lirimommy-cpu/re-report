// --- State & Storage ---
const PROFILES_KEY = 'liri_profiles';
const RECORDS_KEY = 'liri_records';
const ONBOARDING_KEY = 'hasSeenOnboarding';
const LAST_CHILD_KEY = 'lastViewedChildId';

let state = {
  currentChildId: null,
  profiles: [],
  records: [],
  currentFilter: 'all'
};

function loadStorage() {
  const p = localStorage.getItem(PROFILES_KEY);
  const r = localStorage.getItem(RECORDS_KEY);
  state.profiles = p ? JSON.parse(p) : [];
  state.records = r ? JSON.parse(r) : [];
  state.currentChildId = localStorage.getItem(LAST_CHILD_KEY);
}

function saveProfiles() { localStorage.setItem(PROFILES_KEY, JSON.stringify(state.profiles)); }
function saveRecords() { localStorage.setItem(RECORDS_KEY, JSON.stringify(state.records)); }
function saveCurrentChildId(id) { 
  state.currentChildId = id;
  localStorage.setItem(LAST_CHILD_KEY, id); 
}

// --- DOM Elements ---
const appHeader = document.getElementById('app-header');
const bottomNav = document.getElementById('bottom-nav');
const navBtns = document.querySelectorAll('.nav-btn');
const screens = document.querySelectorAll('.screen');

// Onboarding
const btnOnboardingStart = document.getElementById('btn-onboarding-start');
const sliderContainer = document.querySelector('.slider-container');
const indicators = document.querySelectorAll('.indicator');

// Header
const childSelectorContainer = document.getElementById('child-selector-container');
const selectChild = document.getElementById('select-child');
const btnAddChildHeader = document.getElementById('btn-add-child-header');

// Profile Form
const profName = document.getElementById('prof-name');
const profBirth = document.getElementById('prof-birth');
const multiTags = document.querySelectorAll('.multi-tag');
const btnSaveProfile = document.getElementById('btn-save-profile');
const btnCancelProfile = document.getElementById('btn-cancel-profile');

// Input Screen
const dateInput = document.getElementById('record-date');
const btnFavorite = document.getElementById('btn-favorite');
const textInput = document.getElementById('record-text');
const typeBtns = document.querySelectorAll('.tag-btn');
const parentNoteInput = document.getElementById('record-parent-note');
const btnSaveRecord = document.getElementById('btn-save-record');
const recentPreviewList = document.getElementById('recent-preview-list');

// List
const recordList = document.getElementById('record-list');
const btnBackup = document.getElementById('btn-backup');
const btnRestore = document.getElementById('btn-restore');
const fileRestore = document.getElementById('file-restore');

// Report
const reportEmptyState = document.getElementById('report-empty-state');
const reportContentState = document.getElementById('report-content-state');
const childNamePlaceholders = document.querySelectorAll('.child-name-ph, .child-name-ph2');

// Guide
const accHeaders = document.querySelectorAll('.acc-header');

// --- Initialization ---
function init() {
  loadStorage();
  
  const today = new Date().toISOString().split('T')[0];
  if(dateInput) dateInput.value = today;

  setupEventListeners();

  // Router
  if (!localStorage.getItem(ONBOARDING_KEY)) {
    appHeader.style.display = 'none';
    bottomNav.style.display = 'none';
    showScreen('screen-onboarding');
  } else if (state.profiles.length === 0) {
    appHeader.style.display = 'block';
    childSelectorContainer.style.display = 'none';
    bottomNav.style.display = 'none';
    showScreen('screen-profile');
  } else {
    appHeader.style.display = 'block';
    bottomNav.style.display = 'flex';
    
    // Check if last viewed child exists in stored profiles
    if (!state.currentChildId || !state.profiles.find(p => p.id === state.currentChildId)) {
      saveCurrentChildId(state.profiles[0].id);
    }
    
    updateHeaderSelector();
    switchChild(state.currentChildId);
  }
}

// --- Event Listeners ---
function setupEventListeners() {
  // Onboarding Start
  if(btnOnboardingStart) {
    btnOnboardingStart.addEventListener('click', () => {
      localStorage.setItem(ONBOARDING_KEY, 'true');
      appHeader.style.display = 'block';
      if (state.profiles.length === 0) {
        bottomNav.style.display = 'none';
        childSelectorContainer.style.display = 'none';
        showScreen('screen-profile');
      } else {
        bottomNav.style.display = 'flex';
        updateHeaderSelector();
        switchChild(state.currentChildId || state.profiles[0].id);
      }
    });
  }

  // Onboarding Swipe Tracker
  const sliderTrack = document.getElementById('slider-track');
  const btnPrev = document.getElementById('btn-onboarding-prev');
  const btnNext = document.getElementById('btn-onboarding-next');
  let currentSlideIndex = 0;
  let startX = 0;
  let startY = 0;
  let isDragging = false;
  let isVerticalScroll = false;
  let hasDeterminedDirection = false;

  function updateSlider() {
    if(!sliderTrack) return;
    sliderTrack.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    indicators.forEach((ind, i) => ind.classList.toggle('active', i === currentSlideIndex));

    if (btnPrev && btnNext) {
      btnPrev.style.visibility = currentSlideIndex === 0 ? 'hidden' : 'visible';
      btnNext.style.visibility = currentSlideIndex === 3 ? 'hidden' : 'visible';
    }
  }

  if (sliderTrack) {
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (currentSlideIndex > 0) {
          currentSlideIndex--;
          updateSlider();
        }
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (currentSlideIndex < 3) {
          currentSlideIndex++;
          updateSlider();
        }
      });
    }

    sliderTrack.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = true;
      hasDeterminedDirection = false;
      isVerticalScroll = false;
      sliderTrack.style.transition = 'none';
    }, {passive: true});

    sliderTrack.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      const diffX = startX - x;
      const diffY = startY - y;
      
      if (!hasDeterminedDirection) {
        if (Math.abs(diffY) > Math.abs(diffX)) {
          isVerticalScroll = true;
        }
        hasDeterminedDirection = true;
      }

      if (isVerticalScroll) {
        isDragging = false;
        sliderTrack.style.transition = 'transform 0.3s ease-out';
        updateSlider();
        return;
      }
      
      if (e.cancelable) e.preventDefault(); // 수평 스와이프 시 native scroll 방지
      
      // Safari에서 offsetWidth가 오작동할 수 있으므로 window.innerWidth로 기준 너비 계산
      const trackWidth = window.innerWidth > 480 ? 480 : window.innerWidth;
      const percentDiff = (diffX / trackWidth) * 100;
      let translatePercent = -(currentSlideIndex * 100) - percentDiff;
      
      // 바운스 효과를 제한하여 범위를 넘지 않게 처리
      if (translatePercent > 10) translatePercent = 10;
      else if (translatePercent < -310) translatePercent = -310;
      
      sliderTrack.style.transform = `translateX(${translatePercent}%)`;
    }, {passive: false});

    sliderTrack.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      sliderTrack.style.transition = 'transform 0.3s ease-out';
      
      const changedTouches = e.changedTouches[0];
      if (changedTouches) {
        const diffX = startX - changedTouches.clientX;
        if (diffX > 50 && currentSlideIndex < 3) {
          currentSlideIndex++;
        } else if (diffX < -50 && currentSlideIndex > 0) {
          currentSlideIndex--;
        }
      }
      updateSlider();
    });

    // Desktop Keyboard support
    window.addEventListener('keydown', (e) => {
      if (document.getElementById('screen-onboarding').classList.contains('active')) {
        if (e.key === 'ArrowRight' && currentSlideIndex < 3) {
          currentSlideIndex++;
          updateSlider();
        } else if (e.key === 'ArrowLeft' && currentSlideIndex > 0) {
          currentSlideIndex--;
          updateSlider();
        }
      }
    });
  }

  // Navigation
  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      showScreen(btn.dataset.target);
    });
  });

  // Profile Form Multi Tags
  multiTags.forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('selected')));

  // Profile Actions
  btnSaveProfile.addEventListener('click', handleSaveProfile);
  btnCancelProfile.addEventListener('click', () => {
    if (state.profiles.length > 0) switchChild(state.currentChildId);
  });

  // Header Actions
  selectChild.addEventListener('change', (e) => switchChild(e.target.value));
  btnAddChildHeader.addEventListener('click', () => {
    resetProfileForm();
    btnCancelProfile.style.display = 'block';
    showScreen('screen-profile');
  });

  // Record Form
  btnFavorite.addEventListener('click', () => {
    btnFavorite.classList.toggle('active');
    btnFavorite.textContent = btnFavorite.classList.contains('active') ? '★' : '☆';
  });
  typeBtns.forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('selected')));
  btnSaveRecord.addEventListener('click', handleSaveRecord);

  // Backup/Restore/Premium
  btnBackup.addEventListener('click', handleBackup);
  btnRestore.addEventListener('click', () => fileRestore.click());
  fileRestore.addEventListener('change', handleRestore);
  const btnPremium = document.querySelector('.btn-premium');
  if(btnPremium) btnPremium.addEventListener('click', () => alert("프리미엄 기능은 준비 중입니다!"));

  // Guide Accordion
  accHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const item = header.parentElement;
      item.classList.toggle('open');
    });
  });

  // List Filter Chips
  const filterChips = document.querySelectorAll('.filter-chip');
  if (filterChips.length) {
    filterChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        filterChips.forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        state.currentFilter = e.currentTarget.dataset.filter;
        renderList();
      });
    });
  }

  // Go to Input from Report empty state
  document.querySelectorAll('.btn-go-input').forEach(btn => {
    btn.addEventListener('click', () => {
      showScreen('screen-input');
    });
  });

  const hintToggle = document.getElementById('hint-toggle');
  const hintBox = document.getElementById('hint-box');
  if (hintToggle && hintBox) {
    hintToggle.addEventListener('click', () => {
      hintBox.style.display = hintBox.style.display === 'none' ? 'block' : 'none';
    });
  }

  const templateCards = document.querySelectorAll('.template-card');
  if (templateCards.length) {
    templateCards.forEach(card => {
      card.addEventListener('click', () => {
        const targetId = card.dataset.target;
        const targetElem = document.getElementById(targetId);
        const template = card.dataset.template;
        if (targetElem && template) {
          targetElem.value = template;
          targetElem.focus();
          const blankIdx = template.indexOf("___");
          if (blankIdx !== -1) {
            targetElem.setSelectionRange(blankIdx, blankIdx + 3);
          }
        }
      });
    });
  }
}

function showScreen(screenId) {
  navBtns.forEach(b => b.classList.remove('active'));
  screens.forEach(s => s.classList.remove('active'));
  
  const targetBtn = Array.from(navBtns).find(b => b.dataset.target === screenId);
  if (targetBtn) targetBtn.classList.add('active');
  document.getElementById(screenId).classList.add('active');

  if (screenId === 'screen-report') generateReport();
}

function updateHeaderSelector() {
  childSelectorContainer.style.display = 'flex';
  selectChild.innerHTML = '';
  state.profiles.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    selectChild.appendChild(opt);
  });
  selectChild.value = state.currentChildId;
}

function switchChild(childId) {
  saveCurrentChildId(childId);
  selectChild.value = childId;
  bottomNav.style.display = 'flex';
  navBtns.forEach(b => b.disabled = false);
  
  const currentProfile = state.profiles.find(p => p.id === childId);
  if (currentProfile) {
    childNamePlaceholders.forEach(el => el.textContent = currentProfile.name);
  }

  showScreen('screen-input');
  renderViews();
}

// --- Profile Logic ---
function resetProfileForm() {
  profName.value = '';
  if(profBirth) profBirth.value = '';
  document.querySelectorAll('input[name="prof-gender"]').forEach(rad => rad.checked = false);
  multiTags.forEach(t => t.classList.remove('selected'));
}

function handleSaveProfile() {
  const name = profName.value.trim();
  const birth = profBirth.value;
  const gender = document.querySelector('input[name="prof-gender"]:checked')?.value;

  if (!name || !birth || !gender) {
    alert("이름, 생년월일, 성별을 모두 입력해주세요.");
    return;
  }

  const getTags = (id) => Array.from(document.querySelectorAll(`#${id} .multi-tag.selected`)).map(btn => btn.dataset.val);

  const newProfile = {
    id: 'child_' + Date.now(),
    name,
    birth,
    gender,
    traits: getTags('tags-q1'),
    interests: getTags('tags-q2'),
    hardships: getTags('tags-q3'),
    concerns: getTags('tags-q4')
  };

  state.profiles.push(newProfile);
  saveProfiles();
  
  updateHeaderSelector();
  switchChild(newProfile.id);
}

// --- Record Logic ---
function handleSaveRecord() {
  if (!state.currentChildId) return;

  const date = dateInput.value;
  const text = textInput.value.trim();
  const parentNote = parentNoteInput.value.trim();
  const favorite = btnFavorite.classList.contains('active');
  const types = Array.from(document.querySelectorAll('.tag-btn.selected')).map(btn => btn.dataset.type);

  if (!text) {
    alert("오늘 아이에게서 기억에 남는 장면을 적어보세요.");
    return;
  }
  
  if (text.length < 10) {
    if (!confirm("아이의 반응이 나온 순간을 조금만 더 적어보면 나중에 더 잘 이해할 수 있어요.\n\n이대로 저장하시겠어요?")) {
      return;
    }
  }

  const newRecord = {
    id: 'rec_' + Date.now(),
    childId: state.currentChildId,
    date,
    text,
    types,
    parentNote,
    favorite,
    createdAt: Date.now()
  };

  state.records.unshift(newRecord);
  // toast string logic inside handleSaveRecord (Add a simple alert below saveRecords for toast)
  saveRecords();

  textInput.value = '';
  parentNoteInput.value = '';
  btnFavorite.classList.remove('active');
  btnFavorite.textContent = '☆';
  typeBtns.forEach(btn => btn.classList.remove('selected'));

  renderViews();
  // We can show a small alert or use a custom toast. User mentioned "작은 관찰 하나가 쌓였어요"
  alert("작은 관찰 하나가 쌓였어요.");
}

function getCurrentChildRecords() {
  return state.records.filter(r => r.childId === state.currentChildId);
}

function renderViews() {
  renderRecentPreview();
  renderList();
}

function renderRecentPreview() {
  const records = getCurrentChildRecords().slice(0, 2);
  recentPreviewList.innerHTML = '';
  
  if (records.length === 0) {
    recentPreviewList.innerHTML = '<p style="color:var(--color-text-mut);font-size:14px;text-align:center;">아직 남겨진 기록이 없어요.</p>';
    return;
  }

  records.forEach(record => {
    const el = document.createElement('div');
    el.className = 'record-item';
    el.style.marginBottom = '12px';
    el.style.padding = '16px';
    
    let tagsHtml = record.types.map(t => `<span class="tag-display">${t}</span>`).join('');
    
    let parentNoteHtml = '';
    if (record.parentNote) {
      parentNoteHtml = `
        <div class="parent-note-block">
          <span class="record-section-label">부모의 마음</span>
          <div class="parent-note-text">${record.parentNote}</div>
        </div>
      `;
    }
    
    el.innerHTML = `
      <div class="record-header" style="margin-bottom:8px;">
        <span class="record-date">${record.date} ${record.favorite ? '⭐' : ''}</span>
      </div>
      <span class="record-section-label">관찰 기록</span>
      <div class="record-text-content" style="font-size:14px;margin-bottom:8px;">${record.text}</div>
      <div class="record-meta">${tagsHtml}</div>
      ${parentNoteHtml}
    `;
    recentPreviewList.appendChild(el);
  });
}

function renderList() {
  let records = getCurrentChildRecords();

  if (state.currentFilter === 'favorite') {
    records = records.filter(r => r.favorite);
  } else if (state.currentFilter && state.currentFilter !== 'all') {
    records = records.filter(r => r.types.includes(state.currentFilter));
  }

  recordList.innerHTML = '';

  if (records.length === 0) {
    let emptyMsg = state.currentFilter === 'all' 
      ? '아직 남겨진 기록이 없어요.<br>오늘 아이에게서 기억에 남는 장면 하나를 적어보세요.'
      : '선택한 탭에 해당하는 기록이 없어요.';
    recordList.innerHTML = `<div class="record-item" style="text-align:center;color:var(--color-text-sub); line-height: 1.6;">${emptyMsg}</div>`;
    return;
  }

  records.forEach(record => {
    const el = document.createElement('div');
    el.className = 'record-item';

    let tagsHtml = record.types.map(t => `<span class="tag-display">${t}</span>`).join('');
    
    let parentNoteHtml = '';
    if (record.parentNote) {
      parentNoteHtml = `
        <div class="parent-note-block">
          <span class="record-section-label">부모의 마음</span>
          <div class="parent-note-text">${record.parentNote}</div>
        </div>
      `;
    }

    el.innerHTML = `
      <div class="record-header">
        <span class="record-date">${record.date} ${record.favorite ? '⭐' : ''}</span>
        <div class="record-actions">
          <button class="action-btn btn-edit" data-id="${record.id}">수정</button>
          <button class="action-btn btn-delete" data-id="${record.id}">삭제</button>
        </div>
      </div>
      <span class="record-section-label">관찰 기록</span>
      <div class="record-text-content">${record.text}</div>
      <div class="record-meta">${tagsHtml}</div>
      ${parentNoteHtml}
    `;
    recordList.appendChild(el);
  });

  document.querySelectorAll('.btn-delete').forEach(btn => btn.addEventListener('click', (e) => handleDelete(e.target.dataset.id)));
  document.querySelectorAll('.btn-edit').forEach(btn => btn.addEventListener('click', (e) => handleEdit(e.target.dataset.id)));
}

function handleDelete(id) {
  if (confirm("이 기록을 지울까요?")) {
    state.records = state.records.filter(r => r.id !== id);
    saveRecords();
    renderViews();
  }
}

function handleEdit(id) {
  const record = state.records.find(r => r.id === id);
  if (!record) return;
  const newText = prompt("기록 수정하기:", record.text);
  if (newText !== null && newText.trim() !== "") {
    record.text = newText;
    saveRecords();
    renderViews();
  }
}

// --- AI Mock Engine (Warm, Strengths-focused Tone) ---
function generateReport() {
  const records = getCurrentChildRecords();
  const profile = state.profiles.find(p => p.id === state.currentChildId);

  const waitingState = document.getElementById('report-waiting-state');
  
  if (waitingState) waitingState.style.display = 'none';
  if (reportContentState) reportContentState.style.display = 'none';

  if (!profile || records.length < 10) {
    if (waitingState) waitingState.style.display = 'flex';
    
    const wIcon = document.getElementById('waiting-icon');
    const wTitle = document.getElementById('waiting-title');
    const wDesc = document.getElementById('waiting-desc');
    const wCount = document.getElementById('waiting-count');
    const wFill = document.getElementById('waiting-progress-fill');
    
    if (records.length < 5) {
      if(wIcon) wIcon.textContent = '🌱';
      if(wTitle) wTitle.textContent = '아직 아이를 읽어볼 만큼의 기록이 충분하지 않아요.';
      if(wDesc) wDesc.textContent = '작은 순간 몇 개만 더 남겨보세요.';
    } else {
      if(wIcon) wIcon.textContent = '🌿';
      if(wTitle) wTitle.textContent = '기록이 조금씩 쌓이고 있어요.';
      if(wDesc) wDesc.innerHTML = '10개 이상부터 더 또렷한 흐름을 읽어볼 수 있어요.';
    }
    
    if(wCount) wCount.textContent = `지금 ${records.length}개의 기록이 모였어요`;
    if(wFill) {
      const pct = Math.min((records.length / 10) * 100, 100);
      setTimeout(() => { wFill.style.width = `${pct}%`; }, 50);
    }
    
    return;
  }

  if (reportContentState) reportContentState.style.display = 'block';

  let emotionCount = 0; let actionCount = 0; let talkCount = 0; let questionCount = 0;
  
  records.slice(0, 30).forEach(r => {
    let weight = 1.0;
    if (Date.now() - r.createdAt < (7*24*60*60*1000)) weight += 0.5;
    if (r.favorite) weight += 0.5;
    if (r.parentNote) weight += 1.0;

    if (r.types.includes("감정")) emotionCount += weight;
    if (r.types.includes("행동")) actionCount += weight;
    if (r.types.includes("말")) talkCount += weight;
    if (r.types.includes("질문")) questionCount += weight;
  });

  const maxType = Math.max(emotionCount, actionCount, talkCount, questionCount);
  let sec1, sec2, sec3;

  if (maxType === emotionCount) {
    sec1 = `최근 남겨주신 기록을 보면, 우리 ${profile.name}이는 뜻대로 되지 않는 순간이나 낯선 환경에 놓였을 때 기분이 어떻게 변하는지 다양한 표정과 몸짓으로 드러내는 장면들이 반복해서 나타나요.`;
    sec2 = `이런 모습들은 단순히 투정을 부리는 것이 아니라, 스스로 올라오는 낯선 감정들을 숨기지 않고 밖으로 꺼내어 표현하려는 시도들로 읽힙니다.\n특히 평소 [${profile.concerns[0] || '감정'}]에 대해 세심하게 반응해주신 덕분에 자신의 내면을 꽤 선명하게 인지하고 있어요.`;
    sec3 = "상황을 서둘러 해결하기보다, 먼저 자신의 감정을 살피고 꺼내놓는 방식으로 세상을 받아들이고 있어요.";
  } else if (maxType === actionCount) {
    sec1 = `요즘 우리 ${profile.name}이는 새로운 놀이나 낯선 공간을 마주했을 때, 주저하기보다 일단 먼저 손과 발로 부딪히며 탐색해 보는 장면들이 유독 자주 관찰됩니다.`;
    sec2 = "자꾸 넘어지면서도 다시 해보는 이런 반복은, 머리로 이해하기보다 직접 겪은 실패와 성공의 감각을 통해 진짜 내 것을 만들어가려는 아이만의 훌륭한 강점이에요.";
    sec3 = "설명으로 듣고 끝내기보다는, 온몸으로 직접 부딪혀가며 원리를 파악하는 방식으로 일상을 탐험하고 있어요.";
  } else if (maxType === questionCount && questionCount > 0) {
    sec1 = `최근 기록 속에 가장 많이 보이는 모습은, 일상의 당연해 보이는 현상이나 주변 사람들의 행동에 대해 무심코 넘기지 않고 이유를 되묻거나 꼼꼼히 확인하는 장면들이에요.`;
    sec2 = "이 상황에서 보이는 이런 잦은 질문들은 반항이나 단순한 호기심을 넘어, 퍼즐 조각 같은 세상의 조각들을 연결해 자기만의 지식과 원리로 단단하게 엮어보려는 지적 탐구심의 단서랍니다.";
    sec3 = "보이는 현상을 그저 수용하기보다, 관계와 세상 속에서 이유를 묻고 확인하며 자신만의 세계를 넓히고 있어요.";
  } else {
    sec1 = `요즘 ${profile.name}이의 기록에서는, 무언가가 마음대로 되지 않거나 누군가의 도움이 필요한 상황에서 울음으로 터뜨리기보다 자기가 원하는 바를 단어로 연결해 전달하려는 장면들이 눈에 띄게 반복되고 있어요.`;
    sec2 = "이런 모습은 감정에 압도당하기 쉬운 순간에도 어떤 말을 써야 타인과 갈등을 조율하고 상황을 납득시킬 수 있을지 고민하는, 아주 치열하고 사회적인 성장의 과정으로 이해할 수 있습니다.";
    sec3 = "어려운 상황에서도 말로 충분히 표현하고 조율하며 단단하게 안전감을 찾아가고 있어요.";
  }

  document.getElementById('report-sec-1').textContent = sec1;
  document.getElementById('report-sec-2').textContent = sec2;
  document.getElementById('report-sec-3-summary').textContent = sec3;
}

// --- Backup & Restore ---
function handleBackup() {
  if (state.profiles.length === 0) {
    alert("백업할 데이터가 없어요.");
    return;
  }
  const dump = { profiles: state.profiles, records: state.records };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dump, null, 2));
  const el = document.createElement('a');
  el.setAttribute("href", dataStr);
  el.setAttribute("download", `rereport_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(el); el.click(); el.remove();
}

function handleRestore(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const dump = JSON.parse(event.target.result);
      if (!dump.profiles || !dump.records) throw new Error("파일 형식을 확인해주세요.");
      
      if (confirm("불러온 데이터로 모아보시겠어요?")) {
        // 기존 데이터에 병합 또는 덮어쓰기 로직 (여기서는 덮어쓰기 단순화)
        state.profiles = dump.profiles;
        state.records = dump.records;
        saveProfiles(); saveRecords();
        alert("기록을 성공적으로 불러왔어요.");
        location.reload();
      }
    } catch(err) {
      alert("올바르지 않은 파일입니다.");
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// Start App
init();
