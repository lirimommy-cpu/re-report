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

// ============================================================
// Re:리포트 Report Engine v3
// 핵심: 기록 여러 개를 연결 → 반복되는 축 감지 → "이 아이다운" 문장 생성
// 7가지 축: 관계민감 / 비교공정 / 인정욕구 / 자기기준 / 감정언어 / 몰입회피 / 확인질문
// ============================================================
function detectAxes(snap) {
  // 키워드 매핑: 각 축에 해당하는 텍스트 신호들
  const signals = {
    relation: ['친구', '같이', '혼자', '안 놀아', '왜 나는', '나만', '나랑', '우리', '선생님', '엄마가', '아빠가', '나 좋아해', '싫어', '나만 빼고'],
    compare:  ['왜 쟤는', '나는 왜', '불공평', '더', '나만', '같이해야', '왜 나만', '쟤는 돼', '비교', '공평', '왜 달라', '나도 해줘'],
    recognize:['잘했어', '칭찬', '보여줬어', '나 잘하지', '1등', '제일', '최고', '못했어', '실망', '속상해', '그래도 잘함', '봐줘'],
    selfstd:  ['내 거야', '내가 할래', '이렇게 해야', '내가 정한', '왜 그래야', '규칙', '원칙', '내 방식', '싫어', '안 그러면'],
    emolang:  ['속상', '화', '슬퍼', '무서워', '기분', '말했어', '표현', '울었어', '왜 그랬어', '어떻게', '감정'],
    immerse:  ['계속', '또', '반복', '집중', '혼자', '몰두', '한 가지', '그것만', '끝까지', '멈추기 싫어', '안 끝났어'],
    confirm:  ['맞아?', '그렇지?', '나 잘했지?', '그때', '왜', '어때', '나 좋아해?', '진짜야?', '정말?', '확인', '물어봤어']
  };

  const axes = { relation: 0, compare: 0, recognize: 0, selfstd: 0, emolang: 0, immerse: 0, confirm: 0 };

  snap.forEach(r => {
    let w = 1.0;
    if (r.favorite) w += 0.8;
    if (r.parentNote && r.parentNote.trim()) w += 0.5;

    const combined = (r.text + ' ' + (r.parentNote || '')).toLowerCase();

    // 태그 기반 가중치
    if (r.types.includes('감정')) { axes.emolang += w; axes.relation += w * 0.5; }
    if (r.types.includes('질문')) { axes.confirm += w * 1.2; axes.relation += w * 0.5; }
    if (r.types.includes('말'))   { axes.emolang += w * 0.5; axes.recognize += w * 0.5; }
    if (r.types.includes('행동')) { axes.selfstd += w * 0.5; axes.immerse += w * 0.5; }

    // 텍스트 키워드 스캔
    for (const [axis, words] of Object.entries(signals)) {
      words.forEach(word => {
        if (combined.includes(word)) axes[axis] += w * 0.8;
      });
    }
  });

  // 상위 2개 축 반환 (내림차순)
  return Object.entries(axes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(e => e[0]);
}

// 축별 리포트 텍스트 라이브러리
function getAxisText(axis, name, snap, isSecond) {
  // 기록에서 실제 예시 문장 한 개 추출 (있을 경우)
  const ex = snap.find(r => {
    const t = r.text || '';
    if (axis === 'relation') return t.includes('친구') || t.includes('같이') || t.includes('혼자');
    if (axis === 'compare')  return t.includes('왜') || t.includes('나만') || t.includes('불공평') || t.includes('더');
    if (axis === 'recognize')return t.includes('잘') || t.includes('칭찬') || t.includes('보여') || t.includes('속상');
    if (axis === 'selfstd')  return t.includes('내가') || t.includes('내 거') || t.includes('싫어') || t.includes('이렇게');
    if (axis === 'emolang')  return t.includes('속상') || t.includes('화') || t.includes('슬퍼') || t.includes('기분');
    if (axis === 'immerse')  return t.includes('계속') || t.includes('또') || t.includes('혼자') || t.includes('멈추');
    if (axis === 'confirm')  return t.includes('맞아') || t.includes('그렇지') || t.includes('나 좋아') || t.includes('왜');
    return false;
  });
  const exSnippet = ex ? `"${ex.text.slice(0, 30)}${ex.text.length > 30 ? '…' : ''}"` : null;

  const texts = {
    relation: {
      highlight: `${name}이는 사람 사이의 반응을 민감하게 읽으면서 자신의 위치를 느끼려는 결이 있어요.`,
      sec1: `최근 기록에서 반복해서 보이는 장면은, ${name}이가 누군가와 함께 있을 때 자신이 어떻게 받아들여지는지를 꽤 민감하게 감지한다는 점이에요.${exSnippet ? ` 예를 들어 ${exSnippet}처럼,` : ''} 관계 속에서 자신이 포함되어 있는지 아닌지를 바로 알아채는 장면들이 여러 번 등장해요.`,
      sec2: `이 민감함은 문제가 아니라, 이 아이가 사람 사이의 흐름과 감정의 온도를 꽤 섬세하게 읽는 결이 있다는 신호예요. 관계 속에서 자신의 위치를 확인하려는 욕구가 강하게 올라오는 시기이기도 하고, ${name}이는 그 안에서 특히 "나는 여기서 받아들여지고 있는가"를 자주 묻는 편으로 읽혀요.`,
      sec3: `${name}이에게 "너랑 함께라서 좋아"라는 신호를 말이 아닌 행동으로, 조금 더 자주 보내주시면 어떨까요? 이 아이는 직접 눈으로 확인할 수 있는 관계의 신호에 특히 안정감을 느끼는 편이에요.`,
      sec4: `최근 기록에서 관계 상황이 등장하는 빈도를 이전과 비교해보면, ${name}이가 관계에서 받는 감정의 영향이 이전보다 더 선명하게 드러나고 있어요. 이 흐름은 또래와의 관계가 점점 더 중요해지는 발달 단계와 맞물려 있을 수 있어요.`,
      sec5: `관계에서 배제되거나 혼자가 되는 상황, 또는 누군가가 자신보다 다른 아이에게 더 관심을 기울이는 장면에서 감정이 크게 올라오는 패턴이 보여요.`,
      sec6: `사람의 감정을 빠르게 읽고, 상황의 분위기를 잘 파악하는 힘이 있어요. 이 감각은 훗날 관계를 잘 맺는 힘, 타인의 마음을 헤아리는 공감 능력으로 이어질 수 있는 소중한 결이에요.`,
      sec7: `혼자 남겨지거나, "나만 빠졌다"는 느낌이 드는 순간에 감정이 가장 빠르게 올라오는 편이에요. 반대로 "너랑 같이 하고 싶어"처럼 포함의 신호를 받을 때는 표정이 달라지는 장면도 보여요.`,
      sec8: `관계에서 감정이 크게 올라올 때, "그 친구가 너를 싫어하는 게 아니라 그 순간에는 다른 걸 하고 싶었던 것 같아"처럼 상황을 다르게 읽는 말을 건네주시면 도움이 돼요.`,
      sec9: `다양한 관계에서 소속감을 경험할 수 있는 기회를 조금씩 늘려주세요. 소규모 환경에서 깊이 연결되는 경험이 이 아이에게 더 잘 맞는 편이에요.`
    },
    compare: {
      highlight: `${name}이는 비교가 일어나는 상황에서 공정함에 대한 감각이 특히 예민하게 깨어나요.`,
      sec1: `최근 기록들 사이에서 반복해서 등장하는 상황은, 자신과 다른 사람 사이의 차이가 느껴지는 장면들이에요.${exSnippet ? ` ${exSnippet}처럼` : ''} "왜 저 아이는 되고 나는 안 돼?"처럼 평등하지 않다는 느낌이 올라올 때 감정이 크게 움직이는 패턴이 보여요.`,
      sec2: `이 예민함은 단순한 억울함이 아니에요. ${name}이는 자신만의 공정함의 기준이 꽤 또렷하게 자리잡고 있고, 그 기준에 맞지 않는 상황이 오면 자동으로 감정이 반응하는 편이에요. 겉으로는 투정처럼 보일 수 있지만, 그 안에는 원칙과 인정 욕구가 함께 걸려 있어요.`,
      sec3: `"맞아, 네 입장에서는 억울할 수 있겠다"처럼 결과보다 마음을 먼저 인정해주세요. 옳고 그름을 판단하기 전에 이 아이의 느낌이 먼저 받아들여졌다는 신호가 중요해요.`,
      sec4: `비교 상황에서 감정이 크게 올라오는 빈도가 최근 기록에서 더 자주 등장하고 있어요. 이것이 일시적인 흐름인지, 아니면 지속적인 패턴인지 조금 더 지켜볼 필요가 있어요.`,
      sec5: `형제자매, 친구, 또래와 비교되는 상황, 또는 규칙이 나에게만 다르게 적용되는 것처럼 느껴지는 순간에 감정이 가장 빠르게 올라와요.`,
      sec6: `공정함에 대한 감각이 살아있고, 원칙에 대한 자기 기준이 있다는 것은 훗날 정의감, 리더십 감각으로 연결될 수 있는 힘이에요.`,
      sec7: `"쟤는 되는데 나는 왜 안 돼"라는 말이 나오는 상황이나, 내 것과 남의 것이 다르다고 느껴지는 순간에 감정이 가장 크게 움직여요.`,
      sec8: `"이번엔 이렇게 됐는데, 다음엔 달라질 수 있어"처럼 지금 이 순간이 전부가 아니라는 것을 조용하게 보여주시면 도움이 돼요.`,
      sec9: `공정한 환경과 규칙이 명확한 공간에서 이 아이는 더 안정적으로 자기 힘을 발휘해요. 규칙을 미리 설명해주고, 납득할 수 있는 이유를 함께 말해주세요.`
    },
    recognize: {
      highlight: `${name}이는 잘 보이고 싶은 마음과 자기 기준이 함께 자라고 있어요.`,
      sec1: `기록들을 연결해보면, ${name}이가 무언가를 해냈을 때 또는 잘 안 됐을 때, 그 결과에 대한 주변의 반응을 꽤 신경 쓰는 모습이 자주 보여요.${exSnippet ? ` ${exSnippet}처럼` : ''} 칭찬을 받으면 눈에 띄게 기분이 달라지고, 기대만큼 인정받지 못한다고 느낄 때 감정이 올라오는 장면들이 반복돼요.`,
      sec2: `이 모습은 외부 평가에만 의존하는 것이 아니라, 자기 안에서도 기준이 생겨나고 있다는 신호예요. "잘하고 싶다"는 마음과 "인정받고 싶다"는 마음이 함께 올라오는 시기예요. ${name}이는 그 두 마음 사이에서 자기 자신을 가늠해나가고 있어 보여요.`,
      sec3: `결과보다 과정을 먼저 알아봐주세요. "해봤다는 것 자체가 대단해"처럼, 결과가 어떻든 이 아이가 시도한 것 자체에 반응해주시면 이 아이의 내면 기준이 더 단단하게 자랄 수 있어요.`,
      sec4: `최근 칭찬이나 인정에 반응하는 강도가 이전보다 달라졌나요? 기록을 보면 이 부분이 점점 더 선명한 축으로 자리잡고 있어요.`,
      sec5: `발표, 경쟁, 평가가 들어가는 상황이나, 자신이 한 것을 누군가가 봐주는 상황에서 감정이 더 크게 움직이는 편이에요.`,
      sec6: `잘하고 싶다는 동기, 인정을 통해 다음 시도로 이어지는 힘은 훗날 성취동기, 자기 향상의 힘으로 연결될 수 있는 결이에요.`,
      sec7: `기대만큼 인정받지 못한다고 느낄 때, 또는 다른 아이가 더 많이 칭찬받는 장면에서 감정이 빠르게 올라오는 편이에요.`,
      sec8: `"넌 어떤 것 같아?"라고 먼저 아이 스스로 평가하게 해주세요. 외부의 평가보다 자기 안의 기준이 먼저 자랄 수 있는 환경을 만들어주시는 것이 도움이 돼요.`,
      sec9: `성과보다 시도와 과정에 반응해주세요. "해봤다"는 것만으로도 충분하다는 경험이 쌓이면, 이 아이는 더 자유롭게 시도하는 힘을 가질 수 있어요.`
    },
    selfstd: {
      highlight: `${name}이는 자기만의 기준과 방식을 중요하게 여기는 결이 또렷하게 보여요.`,
      sec1: `기록에서 반복해서 등장하는 장면은, ${name}이가 "내가 하고 싶은 방식대로 하고 싶다"는 의지가 강하게 올라오는 순간들이에요.${exSnippet ? ` ${exSnippet}처럼` : ''} 내가 정한 것이 바뀌거나, 예상치 못하게 방식이 변경될 때 감정이 크게 올라오는 패턴이 보여요.`,
      sec2: `이 고집처럼 보이는 모습 안에는, 자기 자신에 대한 꽤 선명한 기준이 자리잡고 있어요. "내가 이것을 어떻게 할지는 내가 정하고 싶다"는 자율성의 욕구이기도 해요. 이 결은 훗날 흔들리지 않는 자기 기준이 되어줄 수 있어요.`,
      sec3: `가능한 범위에서 선택권을 주세요. 100% 자유가 아니더라도, "이 두 가지 중에 어떻게 할래?"처럼 선택할 수 있는 여지가 있을 때 이 아이는 훨씬 부드럽게 움직여요.`,
      sec4: `자기 방식에 대한 고집이 최근 기록에서 더 자주 등장하고 있어요. 환경이 바뀌었거나, 뭔가 통제할 수 없다는 느낌이 더 많이 올라오는 시기일 수 있어요.`,
      sec5: `누군가가 자신의 방식에 개입하거나, 갑자기 계획이 바뀌는 상황에서 감정이 가장 빠르게 반응해요.`,
      sec6: `자기 방식과 기준이 있다는 것은, 외부에 쉽게 흔들리지 않고 자신의 길을 걸어갈 수 있는 힘이에요. 독립적인 사고와 자기 주도의 씨앗이 여기 있어요.`,
      sec7: `"왜 내 말대로 안 해줘"처럼 통제감을 잃었다고 느끼는 순간에 감정이 가장 크게 올라와요.`,
      sec8: `이유를 설명해주세요. "이렇게 해야 해"보다 "이래서 이렇게 하는 게 더 좋을 것 같아"처럼 납득할 수 있는 이유가 함께 오면 이 아이는 더 잘 움직여요.`,
      sec9: `루틴과 예측 가능한 환경이 이 아이에게 안정감을 줘요. 갑작스러운 변경보다 미리 알려주는 것만으로도 많이 달라질 수 있어요.`
    },
    emolang: {
      highlight: `${name}이는 자신이 느끼는 것을 말로 붙잡으려는 힘이 자라고 있어요.`,
      sec1: `기록에서 눈에 띄는 점은, ${name}이가 감정이 크게 올라오는 순간에 그것을 그냥 넘기지 않고 어떤 식으로든 표현하거나 확인하려는 장면들이 반복된다는 거예요.${exSnippet ? ` ${exSnippet}처럼` : ''} 감정이 올라오는 순간을 자신도 인식하고, 그것을 밖으로 꺼내보려는 시도가 보여요.`,
      sec2: `이 모습은 감정에 압도당하는 것이 아니라, 감정을 느끼면서 그것을 어떻게 표현해야 할지 찾아가는 과정으로 읽혀요. ${name}이는 자신의 내면을 꽤 선명하게 인식하는 편이고, 그 감각이 자라고 있어 보여요.`,
      sec3: `감정에 이름을 붙여주세요. "속상했나 봐"처럼 먼저 이름을 달아주면, 이 아이가 자신의 감정을 더 선명하게 알아채어 갈 수 있어요.`,
      sec4: `감정 표현의 방식이 최근 기록에서 어떻게 달라지고 있는지 살펴보면, 이전보다 말로 표현하려는 시도가 조금씩 늘고 있는 흐름이 보여요.`,
      sec5: `억울하거나 기대가 어긋난 상황, 또는 마음의 준비가 안 된 상태에서 갑자기 전환이 일어나는 순간에 감정이 더 크게 올라오는 패턴이 있어요.`,
      sec6: `자신의 감정을 인식하고 표현하려는 힘은, 공감 능력과 자기 이해의 씨앗이에요. 이 감각이 잘 자라면, 이 아이는 자신뿐 아니라 타인의 감정도 잘 읽는 사람이 될 수 있어요.`,
      sec7: `뜻대로 안 되거나, 원하는 것을 말했는데 받아들여지지 않는 상황에서 감정이 가장 빠르게 올라와요.`,
      sec8: `"지금 어떤 기분이야?"보다 "이게 속상했겠다"처럼, 질문보다 공감의 말이 더 잘 닿아요.`,
      sec9: `감정을 말로 표현한 것에 반응해주세요. "말해줘서 고마워"처럼 표현 자체에 가치를 두면, 이 아이는 감정을 숨기지 않고 꺼내는 힘이 더 잘 자라요.`
    },
    immerse: {
      highlight: `${name}이는 자신이 흥미를 느끼는 것에 깊이 몰두하는 결이 있어요.`,
      sec1: `기록에서 반복해서 등장하는 모습은, 한번 빠져든 것에 대해 주변의 신호를 무시하고 계속하려는 장면들이에요.${exSnippet ? ` ${exSnippet}처럼` : ''} 흥미가 생기면 끝까지 하고 싶고, 중간에 끊기는 것을 받아들이기 어려워하는 패턴이 보여요.`,
      sec2: `이 몰두하는 힘은 산만한 것이 아니에요. ${name}이는 흥미를 느끼는 대상에 자신의 에너지를 집중하는 방식으로 세상을 탐구하는 아이예요. 이 결이 자라면, 깊이 파고드는 전문성의 힘이 될 수 있어요.`,
      sec3: `끝내기 전에 미리 알려주세요. "5분 있어"처럼 예고를 주면, 이 아이는 전환을 훨씬 부드럽게 받아들일 수 있어요.`,
      sec4: `특정 주제나 활동에 대한 몰입의 깊이가 최근 기록에서 더 자주 등장하고 있어요. 이 흐름이 어느 방향으로 이어지는지 눈여겨보시면 좋아요.`,
      sec5: `좋아하는 것을 하고 있을 때 끊기거나, 원하는 것을 충분히 하지 못했다고 느낄 때 감정이 크게 올라오는 패턴이 있어요.`,
      sec6: `한 가지에 깊이 집중하는 힘, 끝까지 해보려는 지속성은 훗날 깊이 있는 성취를 만들어낼 수 있는 소중한 결이에요.`,
      sec7: `"이제 그만해야 해"처럼 아직 하고 싶은데 끊기는 순간에 감정이 가장 크게 올라와요.`,
      sec8: `몰두하는 것 자체를 인정해주세요. "그거 진짜 좋아하는구나"처럼 관심을 받았다는 느낌이 먼저 오면, 전환도 더 쉬워져요.`,
      sec9: `충분히 몰두할 수 있는 시간과 공간을 조금씩 허용해주세요. 방해받지 않는 시간이 이 아이에게는 회복의 공간이기도 해요.`
    },
    confirm: {
      highlight: `${name}이는 질문을 통해 관계와 세상 사이에서 자신의 자리를 확인하려는 결이 있어요.`,
      sec1: `기록에서 가장 자주 등장하는 패턴 중 하나는, ${name}이가 일상의 여러 상황에서 "맞아?", "그렇지?", "나 잘했지?"처럼 확인을 구하는 질문들이에요.${exSnippet ? ` ${exSnippet}처럼` : ''} 단순한 정보 확인이 아니라, 자신의 판단과 감각이 받아들여지고 있는지 확인하려는 욕구처럼 읽혀요.`,
      sec2: `이 잦은 확인 질문들은 불안함이 아니라, 자기 자신에 대한 감각이 자라고 있는 신호예요. "내가 옳은 방향으로 가고 있는가"를 자꾸 물으면서 자신의 기준을 만들어가는 과정으로 읽혀요. ${name}이는 확인을 통해 세상 속에서 자신을 가늠하는 중이에요.`,
      sec3: `질문에 바로 답을 주기보다, "너는 어떻게 생각해?"라고 되물어주세요. 이 아이의 추측과 판단이 먼저 나오도록 기다려주시면, 스스로 확인하는 힘이 더 빠르게 자라요.`,
      sec4: `확인 질문의 성격이 최근 기록에서 어떻게 달라지고 있는지를 보면, 정보 확인에서 관계 확인으로 조금씩 이동하고 있는 흐름이 보여요.`,
      sec5: `새로운 상황이나 변화가 생긴 직후, 또는 자신의 행동에 대한 피드백을 받지 못했을 때 확인 질문이 더 자주 올라오는 패턴이 있어요.`,
      sec6: `"왜"를 자꾸 묻고, 확인을 반복하는 것은 지적 호기심과 관계 감수성이 함께 자라고 있다는 신호예요. 이 결이 자라면, 날카로운 질문과 깊은 통찰의 힘이 될 수 있어요.`,
      sec7: `확신이 없는 상황이나, 자신이 한 것이 맞는지 검증받지 못한 느낌이 드는 순간에 감정이 더 크게 움직여요.`,
      sec8: `"맞아, 그렇게 생각할 수 있어"처럼 판단 자체를 인정해주는 반응이 이 아이에게 안정감을 줘요. 정답보다 "네 생각도 말이 돼"가 더 잘 닿아요.`,
      sec9: `일상에서 아이의 판단을 존중하는 작은 경험들을 쌓아주세요. "네가 골랐으니까 해봐"처럼 맡겨주는 경험이 자기 확신으로 이어져요.`
    }
  };

  return texts[axis] || texts.emolang;
}

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
      if (wDesc)  wDesc.textContent  = '10개 이상부터 더 또렷한 흐름을 읽어볼 수 있어요.';
    }
    if (wCount) wCount.textContent = `지금 ${records.length}개의 기록이 모였어요`;
    if (wFill) {
      const pct = Math.min((records.length / 10) * 100, 100);
      setTimeout(() => { wFill.style.width = `${pct}%`; }, 50);
    }
    return;
  }

  if (reportContentState) reportContentState.style.display = 'block';

  // 관찰 날짜 기준 정렬 → 최근 10개
  const sorted = [...records].sort((a, b) => {
    const dA = a.date || '', dB = b.date || '';
    if (dA !== dB) return dA < dB ? -1 : 1;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
  const snap = sorted.slice(-10);
  const name = profile.name;

  // 메타 배너
  const metaEl = document.getElementById('report-meta-text');
  if (metaEl) metaEl.textContent = `최근 ${snap.length}개의 기록을 연결해 읽어본 리포트예요.`;

  // 축 감지
  const [primaryAxis, secondaryAxis] = detectAxes(snap);
  const primary = getAxisText(primaryAxis, name, snap, false);
  const secondary = getAxisText(secondaryAxis, name, snap, true);

  // 하이라이트 (주 축)
  const hlEl = document.getElementById('report-highlight-text');
  if (hlEl) hlEl.textContent = '\u201c' + primary.highlight + '\u201d';

  // 무료 섹션 1~3 (주 축)
  const fill = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  fill('report-sec-1', primary.sec1);
  fill('report-sec-2', primary.sec2);
  fill('report-sec-3', primary.sec3);

  // 프리미엄 섹션 4~9
  // 4: 변화 흐름 (주 축)
  fill('report-sec-4', primary.sec4);
  // 5: 상황별 (주 축)
  fill('report-sec-5', primary.sec5);
  // 6: 힘으로 읽기 (주 축)
  fill('report-sec-6', primary.sec6);
  // 7: 감정이 움직이는 순간 (보조 축 → 주 축 혼합)
  fill('report-sec-7', secondary ? `${primary.sec7}\n\n또한, ${secondary.sec7}` : primary.sec7);
  // 8: 도와주는 방향 (보조 축)
  fill('report-sec-8', secondary ? secondary.sec8 : primary.sec8);
  // 9: 이 힘을 자라게 하려면 (보조 축)
  fill('report-sec-9', secondary ? secondary.sec9 : primary.sec9);

  // 프리미엄 토글 버튼 연결
  const toggleBtn = document.getElementById('btn-premium-toggle');
  const premiumContent = document.getElementById('premium-content');
  if (toggleBtn && premiumContent && !toggleBtn._bound) {
    toggleBtn._bound = true;
    toggleBtn.addEventListener('click', () => {
      const isOpen = premiumContent.style.display !== 'none';
      premiumContent.style.display = isOpen ? 'none' : 'flex';
      toggleBtn.textContent = isOpen ? '펼쳐보기 ▼' : '접기 ▲';
    });
  }
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
