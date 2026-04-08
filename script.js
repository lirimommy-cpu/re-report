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
// Re:리포트 Report Engine v4
// 핵심: 이름 조사 자동 처리 + 7축 복합 감지 + 부모메모 반영 + 장면 기반 문장
// ============================================================

// ── 이름 조사 처리 (받침 유무 자동 감지) ──
function nameP(name) {
  if (!name) return { neun: '아이는', ga: '아이가', ui: '아이의', e: '아이에게', call: '아이', raw: '' };
  const last = name[name.length - 1];
  const code = last.charCodeAt(0);
  const hasBatchim = code >= 44032 && (code - 44032) % 28 !== 0;
  return {
    neun: hasBatchim ? name + '이는' : name + '는',
    ga:   hasBatchim ? name + '이가' : name + '가',
    ui:   name + '의',
    e:    hasBatchim ? name + '이에게' : name + '에게',
    call: hasBatchim ? name + '이' : name,
    raw:  name
  };
}

// ── 7축 감지 ──
function detectAxes(snap) {
  const signals = {
    relation: ['친구', '같이', '혼자', '안 놀아', '왜 나는', '나만', '나랑', '나만 빼고', '나 좋아해', '누가 더', '나한테만', '싫다고'],
    compare:  ['왜 쟤는', '나는 왜', '불공평', '나만', '쟤는 돼', '비교', '공평', '왜 달라', '나도 해줘', '왜 나만 안', '더 주잖아'],
    recognize:['잘했어', '칭찬', '보여줬어', '나 잘하지', '제일', '최고', '봐봐', '봐줘', '내가 했어', '어때', '자랑'],
    selfstd:  ['내 거야', '내가 할래', '이렇게 해야', '내가 정한', '왜 그래야', '내 방식', '내가 원하는', '하기 싫어', '내가 결정', '안 바꿔'],
    emolang:  ['속상', '화났', '슬퍼', '무서워', '기분', '왜 그랬어', '울었어', '짜증', '마음이'],
    immerse:  ['계속', '또 하고 싶어', '집중', '혼자서', '끝까지', '멈추기 싫어', '안 끝났어', '더 하고 싶어', '몇 번씩'],
    confirm:  ['맞아?', '그렇지?', '나 잘했지?', '나 좋아해?', '진짜야?', '정말?', '물어봤어', '엄마도 그렇게 생각해?', '확인하려고']
  };

  const scores = { relation: 0, compare: 0, recognize: 0, selfstd: 0, emolang: 0, immerse: 0, confirm: 0 };

  snap.forEach(function(r) {
    var w = 1.0;
    if (r.favorite) w += 1.0;
    var note = (r.parentNote || '').trim();
    if (note) w += 0.8;
    var combined = ((r.text || '') + ' ' + note).toLowerCase();

    // 태그 기반 (교차 반영)
    if (r.types.includes('감정')) { scores.emolang += w * 1.2; scores.relation += w * 0.4; }
    if (r.types.includes('질문')) { scores.confirm += w * 1.3; scores.relation += w * 0.4; scores.recognize += w * 0.3; }
    if (r.types.includes('말'))   { scores.recognize += w * 0.6; scores.compare += w * 0.3; }
    if (r.types.includes('행동')) { scores.selfstd += w * 0.6; scores.immerse += w * 0.6; }

    // 텍스트 키워드 스캔
    Object.entries(signals).forEach(function(entry) {
      var axis = entry[0]; var words = entry[1];
      words.forEach(function(word) {
        if (combined.includes(word)) scores[axis] += w * 0.9;
      });
    });

    // 부모 메모 키워드 추가 가중치
    if (note) {
      var noteL = note.toLowerCase();
      if (noteL.includes('눈치') || noteL.includes('민감') || noteL.includes('예민')) scores.relation += w * 1.2;
      if (noteL.includes('비교') || noteL.includes('억울') || noteL.includes('공평')) scores.compare += w * 1.2;
      if (noteL.includes('잘 보이') || noteL.includes('칭찬') || noteL.includes('인정')) scores.recognize += w * 1.2;
      if (noteL.includes('자기') || noteL.includes('고집') || noteL.includes('방식')) scores.selfstd += w * 1.2;
      if (noteL.includes('감정') || noteL.includes('속상') || noteL.includes('마음')) scores.emolang += w * 1.2;
      if (noteL.includes('집중') || noteL.includes('몰두') || noteL.includes('혼자')) scores.immerse += w * 1.2;
      if (noteL.includes('확인') || noteL.includes('물어') || noteL.includes('의지')) scores.confirm += w * 1.2;
    }
  });

  return Object.entries(scores)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 2)
    .map(function(e) { return e[0]; });
}

// ── 기록에서 구체적 예시 추출 ──
function pickExample(snap, keywords) {
  var r = snap.find(function(rec) {
    return keywords.some(function(kw) { return (rec.text || '').includes(kw); });
  });
  if (!r) return null;
  var t = r.text;
  return '\u201c' + t.slice(0, 36) + (t.length > 36 ? '\u2026' : '') + '\u201d';
}

// ── 기록 패턴 요약 (3개 기록 연결) ──
function buildPatternSummary(snap, axis) {
  var axisKeywords = {
    relation: ['친구', '같이', '혼자', '나만', '나랑'],
    compare:  ['왜', '나만', '불공평', '비교', '공평', '나도'],
    recognize:['잘', '칭찬', '보여', '봐줘', '제일', '자랑'],
    selfstd:  ['내가', '내 거', '싫어', '내 방식', '내가 정'],
    emolang:  ['속상', '화', '슬퍼', '기분', '울었'],
    immerse:  ['계속', '또', '끝까지', '혼자서', '집중'],
    confirm:  ['맞아', '그렇지', '나 좋아', '진짜야', '정말']
  };
  var kws = axisKeywords[axis] || [];
  var matched = snap.filter(function(r) {
    return kws.some(function(kw) { return (r.text || '').includes(kw); });
  }).slice(0, 3);
  if (matched.length < 2) return null;
  return matched.map(function(r) {
    return '\u201c' + r.text.slice(0, 24) + (r.text.length > 24 ? '\u2026' : '') + '\u201d';
  }).join(', ');
}

// ── 축별 리포트 텍스트 라이브러리 v4 ──
function getAxisText(axis, n, snap) {
  var kwMap = {
    relation: ['친구', '같이', '혼자', '나만'],
    compare:  ['왜', '나만', '불공평', '비교'],
    recognize:['칭찬', '봐줘', '제일', '자랑', '잘했어'],
    selfstd:  ['내가 할래', '내 거', '내가 정', '싫어'],
    emolang:  ['속상', '화났', '슬퍼', '기분'],
    immerse:  ['계속', '끝까지', '혼자서', '더 하고'],
    confirm:  ['맞아?', '그렇지?', '나 좋아해?', '진짜야?']
  };
  var ex = pickExample(snap, kwMap[axis] || []);
  var pattern = buildPatternSummary(snap, axis);

  var T = {
    relation: {
      highlight: n.neun + ' 관계 안에서 자신이 어떻게 받아들여지는지를 예민하게 감지하는 결이 있어요.',
      sec1: '최근 기록들을 연결해보면, ' + (pattern ? pattern + '처럼 ' : '') + '누군가와 함께 있는 상황에서 자신이 포함되어 있는지 아닌지를 빠르게 알아채는 장면이 반복돼요. "나만 빠진 건 아닐까", "이 사람은 나를 좋아하는 걸까"라는 감각이 올라오는 순간에 반응이 커지는 패턴이에요.',
      sec2: '이 민감함은 결함이 아니라, 사람 사이의 감정 온도와 분위기를 꽤 섬세하게 읽는 결이에요. 관계 안에서 자신의 위치가 불확실하게 느껴질 때 감정이 더 크게 올라오고, 반대로 "나랑 있고 싶어"라는 신호를 받으면 표정이 확 달라지는 장면이 있어요.' + (ex ? ' ' + ex : ''),
      sec3: '관계에서 감정이 크게 올라올 때, 해결보다 "맞아, 그 순간 섭섭했겠다"처럼 그 감각 자체를 인정해주시면 ' + n.e + ' 더 잘 닿아요.',
      sec4: '최근 기록에서 관계 맥락이 등장하는 기록이 특히 많아요. 또래와의 관계에서 받는 감정 신호가 이 아이에게 미치는 영향이 이전보다 더 두드러지는 흐름이에요.',
      sec5: '다른 아이가 더 많은 관심을 받는 장면, 혼자 남겨진 느낌이 드는 순간, 또는 "나는 빠졌어"라는 감각이 올라올 때 감정이 가장 빠르게 반응해요.',
      sec6: '사람의 감정과 분위기를 빠르게 읽는 감각은, 누군가 힘들 때 가장 먼저 알아챌 수 있는 힘이 될 수 있어요. 관계의 결을 세밀하게 읽는 아이예요.',
      sec7: '"나만 빠졌다"는 느낌이 들 때, 또는 자신에게만 관심이 덜 주어진다고 느끼는 상황에서 감정이 특히 크게 올라와요.',
      sec8: '"그 친구가 싫어하는 게 아니라 그 순간엔 다른 걸 하고 싶었던 것 같아"처럼, 상황을 다르게 읽는 시각을 조용히 건네주세요.',
      sec9: '소그룹에서 한 명과 충분히 연결되는 경험이 ' + n.e + ' 더 잘 맞아요. 넓은 관계보다 깊은 연결이 안정감을 줘요.'
    },
    compare: {
      highlight: n.neun + ' 비교가 일어나는 순간, 공정함에 대한 감각이 유독 빠르게 깨어나는 편이에요.',
      sec1: '기록을 연결해보면, ' + (pattern ? pattern + '처럼 ' : '') + '"왜 저 아이는 되는데 나는 안 돼?", "나만 이래?"처럼 자신과 다른 사람의 차이가 느껴지는 상황에서 감정이 크게 올라오는 장면이 반복적으로 등장해요.',
      sec2: '이 반응은 단순한 억울함이 아니라, 자기 나름의 공정성 기준이 이미 꽤 또렷하게 자리잡고 있다는 신호예요.' + (ex ? ' ' + ex : '') + ' 겉으로는 투정처럼 보일 수 있지만, 그 안에는 원칙과 인정 욕구가 함께 걸려 있어요.',
      sec3: '"맞아, 그 입장에서는 억울할 수 있어"처럼 결과보다 감각을 먼저 인정해주세요. 판단보다 인정이 먼저예요.',
      sec4: '비교 상황에서 감정이 올라오는 패턴이 기록에서 일관되게 등장해요. 특정 관계에서만 나타나는지, 전반적으로 보이는지 흐름을 관찰해보시면 좋아요.',
      sec5: '형제, 친구, 또래와 비교되는 장면, 또는 "왜 나만 안 돼?"라는 말이 나오는 순간에 감정이 가장 빠르게 올라와요.',
      sec6: '공정함에 대한 감각이 살아있다는 것은, 훗날 정의감과 원칙에 대한 감각으로 이어질 수 있는 결이에요.',
      sec7: '"쟤는 되는데 나는 왜 안 돼"라는 말이 나오거나, 내 것과 남의 것이 달라 보이는 순간에 특히 크게 반응해요.',
      sec8: '"이번엔 이렇게 됐어. 다음엔 달라질 수 있어"처럼 지금이 전부가 아님을 조용하게 보여주세요.',
      sec9: '규칙이 명확하고 이유를 설명해주는 환경에서 이 아이는 더 안정적으로 반응해요.'
    },
    recognize: {
      highlight: n.neun + ' 잘 보이고 싶은 마음과 자기 기준이 함께 자라는 시기에 있어요.',
      sec1: '기록을 연결해보면, ' + (pattern ? pattern + '처럼 ' : '') + '무언가를 해냈을 때 주변의 반응을 꽤 신경 쓰는 장면이 반복돼요. 칭찬이 오면 눈에 띄게 기분이 달라지고, 기대한 반응이 오지 않을 때 감정이 올라오는 흐름이 있어요.',
      sec2: '"잘하고 싶다"는 마음과 "알아줬으면 좋겠다"는 마음이 함께 올라오는 시기예요.' + (ex ? ' ' + ex : '') + ' 그 두 마음 사이에서 자기 자신을 가늠해나가는 중으로 읽혀요.',
      sec3: '결과보다 시도에 반응해주세요. "해봤다는 것 자체가 좋아"처럼, 성과보다 과정에 닿는 말이 이 아이에게 더 잘 작동해요.',
      sec4: '인정 반응에 대한 민감도가 기록에서 꾸준히 등장하고 있어요. 이 패턴이 어떤 상황에서 더 두드러지는지 살펴보시면 좋아요.',
      sec5: '발표, 경쟁, 또는 자신이 한 것을 누군가가 봐주는 상황에서 감정이 더 크게 움직이는 편이에요.',
      sec6: '잘하고 싶다는 동기가 강하다는 것은, 다음 시도로 이어지는 힘이 있다는 뜻이에요.',
      sec7: '기대만큼 인정받지 못하거나, 다른 아이가 더 많은 칭찬을 받는 장면에서 감정이 빠르게 올라오는 편이에요.',
      sec8: '"넌 어떤 것 같아?"라고 먼저 물어봐주세요. 외부 평가보다 내 안의 기준이 먼저 자랄 수 있는 경험이 필요해요.',
      sec9: '"해봤다"는 것 자체에 반응해주는 경험이 쌓이면, 이 아이는 더 자유롭게 시도할 수 있어요.'
    },
    selfstd: {
      highlight: n.neun + ' 자기만의 방식과 기준을 지키려는 결이 꽤 또렷하게 보여요.',
      sec1: '기록을 연결해보면, ' + (pattern ? pattern + '처럼 ' : '') + '"내가 하고 싶은 방식대로 해야 한다"는 의지가 올라오는 장면이 반복돼요. 내가 정한 것이 바뀌거나, 예상치 못한 방향으로 흐를 때 감정이 크게 올라오는 패턴이에요.',
      sec2: '이 고집처럼 보이는 모습 안에는, 꽤 선명한 자기 기준이 자리잡고 있어요.' + (ex ? ' ' + ex : '') + ' "이건 내가 결정하고 싶다"는 자율성의 욕구이기도 해요.',
      sec3: '"이 두 가지 중에 어떻게 할래?"처럼 선택지를 주세요. 선택권이 있으면 훨씬 부드럽게 움직여요.',
      sec4: '자기 방식에 대한 의지가 기록에서 꾸준히 등장하고 있어요. 어떤 상황에서 더 강하게 올라오는지 패턴을 보면 도움이 될 수 있어요.',
      sec5: '누군가 자신의 방식에 개입하거나, 갑자기 계획이 바뀌는 순간에 감정이 가장 빠르게 반응해요.',
      sec6: '외부에 쉽게 흔들리지 않는 자기 기준은, 훗날 독립적인 사고의 힘이 돼요.',
      sec7: '"왜 내 말대로 안 해줘"처럼 통제감을 잃었다고 느끼는 순간에 감정이 가장 크게 올라와요.',
      sec8: '"이렇게 해야 해"보다 "이래서 이게 더 나을 것 같아"처럼 납득할 수 있는 이유를 함께 주세요.',
      sec9: '예측 가능한 루틴이 있을 때 이 아이는 더 안정적으로 자기 힘을 발휘해요.'
    },
    emolang: {
      highlight: n.neun + ' 감정이 올라오는 순간, 그것을 말로 붙잡으려는 시도가 반복해서 보여요.',
      sec1: '기록을 연결해보면, ' + (pattern ? pattern + '처럼 ' : '') + '감정이 크게 올라오는 순간에 그냥 넘기지 않고 표현하거나 확인하려는 장면이 여러 번 등장해요. 속상함, 억울함이 올라오는 순간을 스스로도 알아채고, 그것을 밖으로 꺼내보려는 흐름이 있어요.',
      sec2: '이 모습은 감정에 압도당하는 것이 아니에요.' + (ex ? ' ' + ex : '') + ' 느끼는 것을 어떻게 표현해야 할지 찾아가는 과정으로 읽혀요. 자기 내면을 꽤 또렷하게 인식하는 편이에요.',
      sec3: '감정에 먼저 이름을 붙여주세요. "속상했구나"처럼 이름을 달아주면, 이 아이가 자신의 감각을 더 선명하게 알아차릴 수 있어요.',
      sec4: '감정을 말로 꺼내려는 시도가 최근 기록에서 꾸준히 나타나고 있어요. 어떤 상황에서 더 빠르게 올라오는지 패턴이 보여요.',
      sec5: '억울하거나 기대가 어긋난 순간, 또는 준비가 안 된 상태에서 갑자기 전환이 일어날 때 감정이 더 크게 올라오는 편이에요.',
      sec6: '자신의 감정 변화를 알아채는 감각은, 타인의 마음을 읽는 힘으로도 이어질 수 있어요.',
      sec7: '원하는 것을 말했는데 받아들여지지 않는 상황, 또는 감정이 올라왔는데 아무도 알아채지 못하는 순간에 특히 크게 반응해요.',
      sec8: '"어떤 기분이야?"보다 "그게 속상했겠다"처럼 질문보다 공감이 더 잘 닿아요.',
      sec9: '감정을 꺼냈을 때 반응해주세요. "말해줘서 고마워"처럼 표현 자체에 가치를 두면, 이 아이는 감정을 숨기지 않고 꺼내는 힘이 더 잘 자라요.'
    },
    immerse: {
      highlight: n.neun + ' 흥미를 느끼는 것에 깊이 몰두하고, 끊기면 크게 반응하는 결이 있어요.',
      sec1: '기록을 연결해보면, ' + (pattern ? pattern + '처럼 ' : '') + '한번 빠져든 것을 끝까지 하고 싶고, 중간에 끊기는 것을 받아들이기 어려워하는 장면이 반복돼요. 흥미가 생기면 끊임없이 돌아오려는 흐름이 있어요.',
      sec2: '이 몰두하는 힘은 산만함이 아니에요.' + (ex ? ' ' + ex : '') + ' 흥미를 느끼는 대상에 에너지를 집중하는 방식으로 세상을 탐구하는 스타일이에요.',
      sec3: '끝내기 전에 미리 알려주세요. "5분 뒤"처럼 예고가 있으면 전환이 훨씬 부드러워요.',
      sec4: '특정 활동이나 주제에 대한 몰입이 기록에서 꾸준히 등장하고 있어요.',
      sec5: '좋아하는 것을 하고 있을 때 끊기거나, 충분히 하지 못했다고 느낄 때 감정이 크게 올라와요.',
      sec6: '한 가지에 깊이 집중하는 힘, 끝까지 해보려는 지속성은 훗날 깊이 있는 성취의 씨앗이에요.',
      sec7: '"이제 그만"처럼 아직 하고 싶은데 끊기는 순간에 감정이 가장 크게 올라와요.',
      sec8: '"그거 진짜 좋아하는구나"처럼 관심받았다는 느낌이 오면, 전환도 더 쉬워요.',
      sec9: '방해받지 않고 몰두할 수 있는 시간이 이 아이에게는 회복의 공간이기도 해요.'
    },
    confirm: {
      highlight: n.neun + ' 질문과 확인을 통해 관계 안에서 자신의 위치를 자주 가늠하려는 결이 있어요.',
      sec1: '기록을 연결해보면, ' + (pattern ? pattern + '처럼 ' : '') + '"맞지?", "나 잘했지?", "나 좋아해?"처럼 자신의 감각이나 판단이 받아들여지는지 확인하려는 질문이 반복해서 등장해요. 단순한 정보 확인이 아니라, 관계 안에서 자신의 위치를 가늠하려는 욕구로 읽혀요.',
      sec2: '이 반복적인 확인은 불안의 신호가 아니에요.' + (ex ? ' ' + ex : '') + ' "내가 옳은 방향으로 있는가"를 자꾸 물으면서 자기 기준을 만들어가는 과정이에요.',
      sec3: '질문에 바로 답을 주기보다, "너는 어떻게 생각해?"라고 되물어보세요. 스스로 확인하는 힘이 더 빠르게 자라요.',
      sec4: '확인 질문의 빈도와 내용이 최근 기록에서 일관되게 등장하고 있어요. 어떤 맥락에서 더 자주 나타나는지 살펴보시면 좋아요.',
      sec5: '새로운 상황이 생기거나, 자신의 행동에 대한 피드백이 없을 때 확인하려는 질문이 더 자주 올라와요.',
      sec6: '"왜"를 묻고, 반복해서 확인하는 것은 지적 호기심과 관계 감수성이 함께 자라고 있다는 신호예요.',
      sec7: '확신이 없거나, 자신이 한 것이 받아들여졌는지 불확실한 순간에 감정이 더 크게 움직여요.',
      sec8: '"네 생각도 말이 돼"처럼 판단 자체를 인정해주는 반응이 이 아이에게 더 잘 닿아요.',
      sec9: '"네가 골랐으니까 해봐"처럼 판단을 맡겨주는 경험이 쌓이면 자기 확신이 조금씩 생겨요.'
    }
  };

  return T[axis] || T.emolang;
}

function generateReport() {
  var records = getCurrentChildRecords();
  var profile = state.profiles.find(function(p) { return p.id === state.currentChildId; });

  var waitingState = document.getElementById('report-waiting-state');
  if (waitingState) waitingState.style.display = 'none';
  if (reportContentState) reportContentState.style.display = 'none';

  if (!profile || records.length < 10) {
    if (waitingState) waitingState.style.display = 'flex';
    var wIcon  = document.getElementById('waiting-icon');
    var wTitle = document.getElementById('waiting-title');
    var wDesc  = document.getElementById('waiting-desc');
    var wCount = document.getElementById('waiting-count');
    var wFill  = document.getElementById('waiting-progress-fill');
    if (records.length < 5) {
      if (wIcon)  wIcon.textContent  = '🌱';
      if (wTitle) wTitle.textContent = '아직 아이를 읽어볼 만큼의 기록이 충분하지 않아요.';
      if (wDesc)  wDesc.textContent  = '작은 순간 몇 개만 더 남겨보세요.';
    } else {
      if (wIcon)  wIcon.textContent  = '🌿';
      if (wTitle) wTitle.textContent = '기록이 조금씩 쌓이고 있어요.';
      if (wDesc)  wDesc.textContent  = '10개 이상부터 더 또렷한 흐름을 읽어볼 수 있어요.';
    }
    if (wCount) wCount.textContent = '지금 ' + records.length + '개의 기록이 모였어요';
    if (wFill) {
      var pct = Math.min((records.length / 10) * 100, 100);
      setTimeout(function() { wFill.style.width = pct + '%'; }, 50);
    }
    return;
  }

  if (reportContentState) reportContentState.style.display = 'block';

  var sorted = records.slice().sort(function(a, b) {
    var dA = a.date || '', dB = b.date || '';
    if (dA !== dB) return dA < dB ? -1 : 1;
    return (a.createdAt || 0) - (b.createdAt || 0);
  });
  var snap = sorted.slice(-10);
  var n = nameP(profile.name);

  var metaEl = document.getElementById('report-meta-text');
  if (metaEl) metaEl.textContent = '최근 ' + snap.length + '개의 기록을 연결해 읽어본 리포트예요.';

  var axes = detectAxes(snap);
  var primaryAxis   = axes[0];
  var secondaryAxis = axes[1];
  var primary   = getAxisText(primaryAxis,   n, snap);
  var secondary = getAxisText(secondaryAxis, n, snap);

  var hlEl = document.getElementById('report-highlight-text');
  if (hlEl) hlEl.textContent = primary.highlight;

  function fill(id, text) { var el = document.getElementById(id); if (el) el.textContent = text; }
  fill('report-sec-1', primary.sec1);
  fill('report-sec-2', primary.sec2);
  fill('report-sec-3', primary.sec3);
  fill('report-sec-4', primary.sec4);
  fill('report-sec-5', primary.sec5);
  fill('report-sec-6', primary.sec6);
  fill('report-sec-7', secondary ? primary.sec7 + '\n\n또한, ' + secondary.sec7 : primary.sec7);
  fill('report-sec-8', secondary ? secondary.sec8 : primary.sec8);
  fill('report-sec-9', secondary ? secondary.sec9 : primary.sec9);

  var toggleBtn = document.getElementById('btn-premium-toggle');
  var premiumContent = document.getElementById('premium-content');
  if (toggleBtn && premiumContent && !toggleBtn._bound) {
    toggleBtn._bound = true;
    toggleBtn.addEventListener('click', function() {
      var isOpen = premiumContent.style.display !== 'none';
      premiumContent.style.display = isOpen ? 'none' : 'flex';
      toggleBtn.textContent = isOpen ? '펼쳐보기 \u25bc' : '접기 \u25b2';
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
