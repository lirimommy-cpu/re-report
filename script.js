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

// --- AI Report Engine v2 ---
// 정렬 기준: 1순위 관찰날짜(date), 2순위 생성시간(createdAt)
// 구조: 장면 → 반복 → 해석 (연령 맥락 + 아이 고유 결)
// 섹션: 하이라이트 / 1.요즘 이런 모습 / 2.이렇게 이해 / 3.단서
function generateReport() {
  const records = getCurrentChildRecords();
  const profile = state.profiles.find(p => p.id === state.currentChildId);

  const waitingState = document.getElementById('report-waiting-state');
  if (waitingState) waitingState.style.display = 'none';
  if (reportContentState) reportContentState.style.display = 'none';

  if (!profile || records.length < 10) {
    if (waitingState) waitingState.style.display = 'flex';
    const wIcon  = document.getElementById('waiting-icon');
    const wTitle = document.getElementById('waiting-title');
    const wDesc  = document.getElementById('waiting-desc');
    const wCount = document.getElementById('waiting-count');
    const wFill  = document.getElementById('waiting-progress-fill');
    if (records.length < 5) {
      if (wIcon)  wIcon.textContent  = '🌱';
      if (wTitle) wTitle.textContent = '아직 아이를 읽어볼 만큼의 기록이 충분하지 않아요.';
      if (wDesc)  wDesc.textContent  = '작은 순간 몇 개만 더 남겨보세요.';
    } else {
      if (wIcon)  wIcon.textContent  = '🌿';
      if (wTitle) wTitle.textContent = '기록이 조금씩 쌓이고 있어요.';
      if (wDesc)  wDesc.innerHTML    = '10개 이상부터 더 또렷한 흐름을 읽어볼 수 있어요.';
    }
    if (wCount) wCount.textContent = `지금 ${records.length}개의 기록이 모였어요`;
    if (wFill) {
      const pct = Math.min((records.length / 10) * 100, 100);
      setTimeout(() => { wFill.style.width = `${pct}%`; }, 50);
    }
    return;
  }

  if (reportContentState) reportContentState.style.display = 'block';

  // ── 관찰 날짜 기준 정렬 → 최근 10개 snapshot ──
  const sorted = [...records].sort((a, b) => {
    const dA = a.date || '', dB = b.date || '';
    if (dA !== dB) return dA < dB ? -1 : 1;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
  const snap = sorted.slice(-10);

  // ── 태그 가중치 집계 ──
  let eC = 0, aC = 0, tC = 0, qC = 0;
  snap.forEach(r => {
    let w = 1.0;
    if (r.favorite) w += 0.5;
    if (r.parentNote && r.parentNote.trim()) w += 1.0;
    if (r.types.includes('감정')) eC += w;
    if (r.types.includes('행동')) aC += w;
    if (r.types.includes('말'))   tC += w;
    if (r.types.includes('질문')) qC += w;
  });

  const name = profile.name;
  const max = Math.max(eC, aC, tC, qC);

  // ── 메타 배너 ──
  const metaEl = document.getElementById('report-meta-text');
  if (metaEl) metaEl.textContent = '최근 10개의 기록 흐름을 바탕으로 읽어본 리포트예요.';

  // ── 패턴별 문장 생성 ──
  let highlight, sec1, sec2, sec3;

  if (max === eC && eC > 0) {
    highlight = `${name}이는 자신에게 올라오는 감정을 숨기지 않고 꺼내보려는 힘이 있어요.`;
    sec1 = `최근 남겨주신 기록들을 보면, ${name}이는 뜻대로 되지 않는 순간이나 낯선 상황에 놓였을 때 기분이 어떻게 달라지는지 표정이나 몸짓으로 꽤 또렷하게 드러내는 장면들이 반복해서 나타나요. 이 시기 아이들에게 감정이 크게 올라오는 건 비교적 자연스럽게 보이는 모습이기도 해요. 그 안에서도 ${name}이는 그 감정을 안으로 눌러두기보다, 표현을 통해 스스로 인식하고 밖으로 꺼내보려는 결이 더 선명하게 보여요.`;
    sec2 = `단순히 투정처럼 보일 수 있지만, 이 장면들은 올라오는 낯선 감정을 숨기지 않고 표현하려는 시도들로 읽혀요. 발달적으로 흔한 장면일 수 있지만, ${name}이는 그 안에서 감정을 말이나 몸짓으로 붙잡아보려는 힘도 함께 자라고 있어 보여요. 겉으로는 예민하게 보일 수 있지만, 그 안에는 자신의 내면을 꽤 선명하게 인식하고 있다는 단서가 함께 보여요.`;
    sec3 = `${name}이를 관찰할 때, 감정이 올라오는 순간 "그게 속상했나 봐"처럼 먼저 이름을 붙여주시면 어떨까요? 직접 해결해주는 것보다, 이 아이가 자신의 감정을 더 선명하게 알아채어 갈 수 있는 작은 경험이 쌓여요.`;

  } else if (max === aC && aC > 0) {
    highlight = `${name}이는 몸으로 직접 부딪히며 세상을 파악해가는 방식을 갖고 있어요.`;
    sec1 = `요즘 ${name}이는 새로운 놀이나 낯선 공간을 마주했을 때, 주저하기보다 일단 손과 발로 직접 탐색해보는 장면들이 반복해서 관찰돼요. 잘 안 되는 상황에서도 다시 시도하는 모습이 자주 보여요. 이 시기에 몸으로 직접 해보려는 충동이 강한 건 자연스럽게 보이기도 하지만, ${name}이는 그 안에서 포기보다 재도전을 선택하는 흐름이 유독 더 일관되게 보여요.`;
    sec2 = `자꾸 넘어지면서도 다시 해보는 반복은, 머리로 이해하기보다 직접 겪은 실패와 성공의 감각을 통해 자기 것을 만들어가려는 방식으로 읽혀요. 겉으로는 고집처럼 보일 수 있지만, 그 안에는 스스로 결론에 도달하고 싶다는 자기 주도적인 탐구심이 함께 걸려 있어 보여요.`;
    sec3 = `${name}이를 관찰할 때, 실패하는 장면에서 바로 도와주기보다 "어떻게 하면 될 것 같아?"라고 물어봐 주시면 어떨까요? 이 아이가 스스로 방법을 찾아가는 흐름을 더 잘 드러낼 수 있어요.`;

  } else if (max === qC && qC > 0) {
    highlight = `${name}이는 눈앞의 장면을 그냥 넘기지 않고 이유를 찾으려는 힘이 있어요.`;
    sec1 = `최근 기록 속에 가장 자주 보이는 모습은, 일상의 당연해 보이는 현상이나 주변 사람들의 행동에 대해 무심코 지나치지 않고 이유를 되묻거나 꼼꼼히 확인하는 장면들이에요. 이 시기에 확인하고 싶은 질문들이 자주 올라오는 건 자연스럽기도 해요. 그 안에서도 ${name}이는 답을 들은 뒤 다음 질문으로 이어가거나, 관계 속 자신의 위치를 확인하려는 질문이 더 반복적으로 보여요.`;
    sec2 = `이 잦은 질문들은 단순한 호기심이나 반항을 넘어, 자신이 보고 느끼는 것들 사이의 연결고리를 찾아 스스로의 세계를 만들어가려는 지적 탐구심의 단서랍니다. 발달적으로 흔한 장면일 수 있지만, ${name}이는 그 안에서 보이는 현상을 그냥 수용하기보다 이유를 붙잡아보려는 결이 더 선명하게 보여요.`;
    sec3 = `${name}이의 질문에 "왜 그럴까? 너는 어떻게 생각해?"라고 되물어보세요. 답을 바로 주는 것보다, 아이가 스스로 생각을 이어갈 수 있는 공간을 열어주는 것이 이 아이의 탐구심이 더 잘 피어나는 방향이에요.`;

  } else {
    highlight = `${name}이는 자신이 원하는 걸 말로 표현하고 연결하려는 힘이 자라고 있어요.`;
    sec1 = `요즘 ${name}이의 기록에서는, 무언가가 마음대로 되지 않거나 누군가의 도움이 필요한 상황에서 울음보다 먼저 말로 자기 상황을 설명하거나 요청하려는 장면들이 반복되고 있어요. 이 시기에 자기 주장이 강해지는 건 자연스러운 흐름이기도 해요. 그 안에서도 ${name}이는 감정을 터뜨리는 것보다 말로 연결하려는 시도가 더 자주 보여요.`;
    sec2 = `감정에 압도당하기 쉬운 순간에도 어떤 말을 써야 타인과 상황을 조율할 수 있는지 찾아가는 이 모습은, 아이 나름의 사회적인 성장의 과정으로 이해해볼 수 있어요. 겉으로는 고집처럼 보일 수 있지만, 그 안에는 자신의 뜻을 납득 가능한 언어로 전달하고픈 욕구가 함께 걸려 있어 보여요.`;
    sec3 = `${name}이가 말로 표현하려 할 때, 끊기 전에 끝까지 들어주시는 것만으로도 아이가 말의 힘을 믿게 되는 경험이 쌓여요. "그래서 어떻게 하고 싶었어?"라는 질문 하나가 좋은 관찰의 시작이 될 수 있어요.`;
  }

  // ── DOM 삽입 ──
  const hlEl = document.getElementById('report-highlight-text');
  if (hlEl) hlEl.textContent = '\u201c' + highlight + '\u201d';

  const s1 = document.getElementById('report-sec-1');
  const s2 = document.getElementById('report-sec-2');
  const s3 = document.getElementById('report-sec-3');
  if (s1) s1.textContent = sec1;
  if (s2) s2.textContent = sec2;
  if (s3) s3.textContent = sec3;
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
