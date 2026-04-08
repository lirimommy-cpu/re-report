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


// ── 다중 예시 추출 (즐겨찾기 우선) ──
// pickBestExamples: 완전 문장 기록만 반환 (잘린 따옴표 인용 금지)
// 30자 이하 기록만 인용 허용 → 그 이상은 null 반환 후 해석 안에 자연스럽게 녹이기
function pickBestExamples(snap, keywords, maxCount) {
  var max = maxCount || 2;
  var matched = snap.filter(function(r) {
    return keywords.some(function(kw) { return (r.text || "").includes(kw); });
  });
  matched.sort(function(a,b) { return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0); });
  // 30자 이하 완전 문장만 인용 허용 (그 외는 null)
  return matched.slice(0, max).map(function(r) {
    var t = (r.text || "").trim();
    return (t.length <= 30) ? ('“' + t + '”') : null;
  });
}

// pickSceneHint: 기록에서 장면 유형 힌트를 자연어로 추출 (직접 인용 없음)
function pickSceneHint(snap, keywords) {
  var matched = snap.filter(function(r) {
    return keywords.some(function(kw) { return (r.text || "").includes(kw); });
  });
  matched.sort(function(a,b) { return (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0); });
  if (!matched.length) return null;
  var r = matched[0];
  var tags = (r.types || []);
  var tag = tags.includes('질문') ? '질문이 나온 순간'
    : tags.includes('감정') ? '감정이 올라온 순간'
    : tags.includes('행동') ? '특정 행동이 나탈 순간'
    : '어떤 장면';
  return tag;
}

// ── 가장 의미 있는 부모 메모 추출 ──
function getStrongestParentNote(snap) {
  var notes = snap.filter(function(r) { return (r.parentNote || "").trim().length > 5; });
  if (!notes.length) return null;
  notes.sort(function(a,b) {
    var lA = (a.parentNote||"").length + (a.favorite ? 20 : 0);
    var lB = (b.parentNote||"").length + (b.favorite ? 20 : 0);
    return lB - lA;
  });
  return notes[0].parentNote.trim();
}

// ── 축별 리포트 텍스트 라이브러리 v5b ──
// 개선: 직접 인용 금지 → 해석 안에 자연스럽게 녹이기 + 양면 해석 + 불릿 관찰 질문
function getAxisText(axis, secondaryAxis, n, snap) {
  var kwMap = {
    relation: ['친구', '같이', '혼자', '나만', '나만 빼고', '나 좋아해'],
    compare:  ['왜', '나만', '불공평', '비교', '안 해줘', '쟤는'],
    recognize:['칭찬', '봐줘', '제일', '자랑', '잘했어', '봐봐', '어때'],
    selfstd:  ['내가 할래', '내 거', '내가 정', '싫어', '내가 결정', '이렇게 해야'],
    emolang:  ['속상', '화났', '슬퍼', '기분', '울었', '짜증'],
    immerse:  ['계속', '끝까지', '혼자서', '더 하고', '또 하', '집중'],
    confirm:  ['맞아?', '그렇지?', '나 좋아해?', '진짜야?', '정말?', '나 잘했지?']
  };
  var exs = pickBestExamples(snap, kwMap[axis] || [], 2);
  var ex1 = exs[0] || null;  // 30자 이하 완전 문장일 때만 non-null
  var ex2 = exs[1] || null;
  var parentNote = getStrongestParentNote(snap);
  // 부모 메모: 잘린 인용 금지 → 의미 방향을 언어로 재구성
  var pn = parentNote
    ? '\n\n부모의 눈에도 비슷한 결이 포착된 기록이 있어요. 이 감각이 리포트가 읽어낸 방향과 맞닿아 있어요.'
    : '';

  var secLabel = {
    relation:  '관계 안에서의 반응',
    compare:   '비교와 공정함의 감각',
    recognize: '잘 보이고 싶은 마음',
    selfstd:   '자기만의 기준',
    emolang:   '감정을 말로 붙잡으려는 힘',
    immerse:   '깊이 몰두하는 결',
    confirm:   '확인을 통해 자리를 가늠하는 결'
  }[secondaryAxis] || '';

  var T = {
    // ─────────────────────────────────────────── relation ──
    relation: {
      highlight: n.neun + ' 관계 안에서 자신이 어떻게 받아들여지는지를 꽤 선명하게 감지하면서,\n' + (secLabel ? secLabel + '도 함께 움직이고 있어 보여요.' : '자기 안의 결도 함께 움직이고 있어 보여요.'),
      sec1: '요즘 ' + n.ui + ' 기록을 연결해보면,\n누군가의 반응이 조금만 달라져도 금방 알아채거나, 자신이 관계 안에서 어떤 위치에 있는지를 자주 확인하려는 장면이 반복해서 등장해요.\n\n' + (ex1 ? ex1 + '처럼,\n이런 순간에 반응이 선명하게 올라오는 흐름이 여러 기록 사이에 이어져 있어요.' : '관계 안에서의 신호에 민감하게 반응하는 흐름이 여러 기록 사이에 이어져 있어요.') + (ex2 ? '\n\n' + ex2 + '와 같은 장면에서도\n비슷한 결이 다른 상황에서 다시 드러나고 있어요.' : '') + (secLabel ? '\n\n그 안에서 ' + secLabel + '이 함께 걸려 있는 장면도 보여요.' : '') + pn,
      sec2: '이런 모습을 단순히 "눈치가 빠르다"거나 "예민하다"는 말로만 읽으면 절반만 보이게 돼요.\n\n이 시기에는 또래 사이에서 자신이 어떻게 받아들여지는지를 점점 더 의식하게 되는 흐름이 자연스럽게 나타나기도 해요. 그 안에서도 ' + n.call + '는 관계 안의 온도 변화를 더 빠르고 선명하게 감지하는 편이에요.\n\n다르게 보면, 사람을 세밀하게 읽는 감각과 관계의 흐름을 배려하는 힘이 함께 자라고 있다는 신호로도 읽혀요.',
      sec3: n.call + '의 반응을 볼 때,\n겉으로 드러난 행동보다 그 행동 뒤에 걸려 있는 감각을 함께 읽어보면 어떨까요.\n\n\u2022 "이 순간 ' + n.call + '는 자신이 받아들여지고 있다고 느꼈을까, 아닐까?"\n\u2022 "관계 안에서 지금 어떤 위치라고 느끼고 있었을까?"\n\u2022 "이 반응 뒤에는 어떤 사람이 되고 싶다는 마음이 함께 있었을까?"\n\n이 질문들이 ' + n.call + '를 훨씬 더 정확하게 읽게 해줄 수 있어요.',
      sec4: '기록이 쌓이면서 더 선명해진 것은, 처음에는 단발적인 예민함처럼 보였던 반응들이 사실 일관된 패턴을 가지고 있다는 점이에요.\n\n관계에서 자신이 어떻게 받아들여지는지를 확인하려는 욕구가 여러 상황에서 반복해서 드러나고 있어요. 이 흐름이 더 선명하게 보이기 시작했다는 것은, 그만큼 기록이 연결되고 있다는 신호예요.',
      sec5: '이 아이는 특히 이런 상황에서 더 선명하게 반응해요:\n\u2022 다른 아이가 더 많은 관심을 받는 장면\n\u2022 "나만 빠진 건 아닐까"라는 감각이 올라오는 순간\n\u2022 관계에서 자신의 위치가 흔들린다고 느낄 때\n\u2022 누군가의 태도가 조금만 달라도 빠르게 감지할 때\n\n반대로, 관계 안에서 자신이 환영받고 있다고 느끼는 순간에는 이 아이의 따뜻하고 배려 있는 결이 훨씬 안정적으로 드러나요.',
      sec6: '사람 사이의 감정과 분위기를 빠르게 읽는 능력이 이 아이 안에 있어 보여요.\n\n이 감각이 자라면, 누군가 힘들 때 가장 먼저 알아채는 사람이 되거나, 관계의 결을 세밀하게 읽어 자연스럽게 연결하는 힘으로 이어질 수 있어요. 지금은 예민함으로 드러나고 있지만, 방향이 자라면 깊은 공감 능력이 돼요.',
      sec7: '감정이 가장 크게 움직이는 순간:\n\u2022 "쟤랑 더 친하게 지내는 것 같아"라는 느낌이 들 때\n\u2022 자신이 포함되지 않는 계획이나 대화를 목격할 때\n\u2022 기대했던 관심이 오지 않거나 무시된 것처럼 느껴질 때\n\u2022 관계에서 자신의 위치가 갑자기 흔들린다고 감지될 때\n\n이런 겉으로 드러나는 반응들 뒤에는, "나는 이 관계에서 괜찮은 위치에 있는가"라는 감각이 함께 걸려 있을 수 있어요.',
      sec8: '행동을 바로 고쳐주기보다, 그 행동 뒤에 걸려 있는 마음을 먼저 다뤄주는 방식이 더 잘 맞을 수 있어요.\n\n\u2022 "왜 또 그래?"보다 \u2192 "그 순간 섭섭했겠다"\n\u2022 바로 해결하기보다 \u2192 "나는 알고 있어"라는 신호 먼저\n\u2022 상황을 다르게 읽는 시각 조용히 건네기: "그 친구가 싫어하는 게 아니라 그 순간엔 다른 걸 하고 싶었던 것 같아"\n\n"너랑 있어서 좋아"라는 말은 행동으로 자주 보여주는 게 이 아이에게 더 잘 닿아요.',
      sec9: '이 힘은 소수의 사람과 깊이 연결되는 경험 안에서 더 잘 자라요.\n\n\u2022 넓은 관계보다 한두 명과 깊이 연결되는 경험\n\u2022 자기 위치가 안정적으로 느껴지는 관계 한두 쌍\n\u2022 "이렇게 볼 수도 있어"처럼 상황을 다르게 읽는 연습\n\n지금 이 아이에게 필요한 건 더 많은 관계가 아니라, 더 안심할 수 있는 관계예요.'
    },
    // ─────────────────────────────────────────── compare ──
    compare: {
      highlight: n.neun + ' 비교가 일어나는 순간, 공정함에 대한 감각이 빠르게 깨어나면서,\n' + (secLabel ? secLabel + '도 함께 자라고 있어 보여요.' : '자기 안의 원칙도 함께 선명해지고 있어 보여요.'),
      sec1: n.call + '의 기록 안에서 반복되는 패턴 하나가 선명하게 보여요.\n자신과 다른 사람 사이의 차이를 감지하는 순간, "이건 공평하지 않다"는 반응이 꽤 빠르게 올라오는 장면이에요.\n\n' + (ex1 ? ex1 + '처럼,\n이런 장면에서 감정이 더 크게 움직이는 흐름이 여러 기록에 걸쳐 이어지고 있어요.' : '"왜 저 아이는 되는데 나는 안 돼?"처럼 비교 상황에서 감정이 더 크게 움직이는 흐름이 이어지고 있어요.') + (ex2 ? '\n\n' + ex2 + '와 같은 장면에서도\n공정함에 대한 기준이 또렷하게 드러나고 있어요.' : '') + (secLabel ? '\n\n그 안에서 ' + secLabel + '이 함께 걸려 있는 흐름도 보여요.' : '') + pn,
      sec2: '투정이나 욕심으로만 보면 이 반응의 절반밖에 보이지 않아요.\n\n이 시기에 비교 상황이 많아지고, "왜 나만"이라는 감각이 올라오는 건 흔하게 보이는 흐름이기도 해요. 그 안에서도 ' + n.call + '는 자기 나름의 원칙이 이미 꽤 또렷하게 자리잡은 편이에요. 그 원칙에 어긋나는 상황이 오면 감정이 자동으로 반응하는 구조로 읽혀요.\n\n다르게 보면, 이 반응 안에는 원칙에 대한 감각과 인정 욕구가 함께 작동하고 있어요.',
      sec3: n.call + '의 "왜 나만"이라는 말을 들을 때,\n그 말 뒤에 무엇이 걸려 있는지 함께 가늠해보면 어떨까요.\n\n\u2022 "이 순간 ' + n.call + '가 느끼는 불공평함은 무엇일까?"\n\u2022 "이 아이 안에 있는 원칙은 무엇이고, 그게 어긋났다고 느끼는 걸까?"\n\u2022 "이유를 설명해주면, 또는 기준이 같아진다면 달라질까?"\n\n이 질문들이 ' + n.call + '를 더 정확하게 읽는 데 도움이 돼요.',
      sec4: '기록이 쌓이면서 보이는 건, 단순히 자기 것을 더 원하는 것이 아니라 "기준이 같아야 한다"는 감각이 일관되게 자리잡고 있다는 점이에요.\n\n초반에는 억울한 반응처럼 보였던 것들이, 기록이 연결되면서 자기 원칙에 대한 선명한 감각으로 읽히기 시작해요.',
      sec5: '이 아이는 특히 이런 상황에서 더 선명하게 반응해요:\n\u2022 형제, 친구와 비교되는 장면\n\u2022 규칙이나 기준이 자신에게만 다르게 적용된다고 느낄 때\n\u2022 노력한 것이 덜 인정받는다고 느끼는 순간\n\u2022 이유 없이 차별받는다고 느낄 때\n\n반대로, 공정하게 대우받거나 이유가 설명될 때 이 아이의 납득하는 힘이 훨씬 안정적으로 드러나요.',
      sec6: '공정함에 대한 감각이 살아있다는 것은, 이 아이 안의 중요한 힘이에요.\n\n이 결이 자라면 원칙을 지키는 힘, 부당함을 알아채는 감각, 팀 안에서 공평하게 이끄는 리더십으로 이어질 수 있어요. 지금의 "왜 나만"이라는 말 안에는, 평등과 원칙에 대한 섬세한 감각이 함께 자라고 있어요.',
      sec7: '감정이 가장 크게 움직이는 순간:\n\u2022 "쟤는 되는데 나는 왜 안 돼"라는 말이 나오는 상황\n\u2022 자신의 실수는 지적되고 다른 사람의 실수는 넘어갈 때\n\u2022 노력한 것보다 결과 평가가 낮다고 느낄 때\n\u2022 규칙이 이유 없이 강요될 때\n\n이런 순간의 투정 뒤에는, "내 기준이 무시당했다"는 느낌이 함께 걸려 있어요.',
      sec8: '감정이 올라온 순간에 판단을 먼저 내리기보다, 기준이 어긋났다는 마음을 먼저 다뤄주세요.\n\n\u2022 "그건 원래 그래"보다 \u2192 "그 입장에서는 억울할 수 있어"\n\u2022 결과 판단보다 \u2192 이유를 먼저 설명해주기\n\u2022 규칙은 미리, 일관되게, 이유와 함께 알려주기\n\u2022 "다음엔 달라질 수 있어"처럼 지금이 전부가 아님을 조용히 보여주기',
      sec9: '이 힘은 자기 기준을 스스로 정할 수 있는 환경에서 더 잘 자라요.\n\n\u2022 비교되지 않는 자기만의 영역에서 성취를 쌓는 경험\n\u2022 규칙이 명확하고 이유가 함께 오는 환경\n\u2022 "네가 정했으니까 해봐"처럼 자기 기준으로 판단해볼 수 있는 작은 경험들\n\n이 경험들이 쌓일수록, 비교보다 자기 자신을 기준으로 삼는 힘이 자라요.'
    },
    // ─────────────────────────────────────────── recognize ──
    recognize: {
      highlight: n.neun + ' 잘 보이고 싶은 마음과 자기 기준이 함께 자라면서,\n' + (secLabel ? secLabel + '도 함께 움직이고 있어 보여요.' : '두 가지 힘이 동시에 올라오는 시기에 있어 보여요.'),
      sec1: '기록 여러 개를 연결해 읽어보면,\n무언가를 해냈거나 잘 안 됐을 때, 주변이 어떻게 반응하는지에 꽤 민감하게 반응하는 장면들이 반복해서 나타나요.\n\n' + (ex1 ? ex1 + '처럼,\n칭찬이 오면 눈에 띄게 달라지고, 기대한 반응이 오지 않을 때 감정이 올라오는 흐름이 여러 기록에 걸쳐 이어져 있어요.' : '칭찬이 오면 눈에 띄게 달라지고, 기대한 반응이 오지 않을 때 감정이 올라오는 흐름이 이어져 있어요.') + (ex2 ? '\n\n' + ex2 + '처럼\n잘 보이고 싶다는 마음이 또 다른 각도에서도 드러나고 있어요.' : '') + (secLabel ? '\n\n그 안에서 ' + secLabel + '이 함께 걸려 있는 장면도 보여요.' : '') + pn,
      sec2: '칭찬에 반응한다는 것만으로는 이 아이를 절반만 읽게 돼요.\n\n이 시기에는 주변의 평가에 더 크게 반응하면서 동시에 자기 안의 기준도 만들어가는 흐름이 자연스럽게 보이기도 해요. ' + n.call + '는 "잘하고 싶다"는 마음과 "알아줬으면 좋겠다"는 마음이 함께 올라오는 편이에요. 그 두 마음 사이에서 자기 자신을 가늠해나가고 있는 것처럼 읽혀요.\n\n외부 평가에 의존하는 것처럼 보일 수 있지만, 그 안에는 자기 기준이 자라고 있다는 신호가 함께 있어요.',
      sec3: n.call + '의 반응을 볼 때,\n칭찬 여부보다 그 순간 ' + n.call + '의 내면이 무엇을 원했는지를 함께 가늠해보면 어떨까요.\n\n\u2022 "이 순간 ' + n.call + '는 어떻게 보이고 싶었을까?"\n\u2022 "잘하고 싶은 마음이 걸려 있었을까, 아니면 알아줬으면 하는 마음이 더 컸을까?"\n\u2022 "결과가 아니라 과정에 먼저 반응해주면 달라질까?"\n\n이 질문들이 ' + n.call + '를 더 정확하게 읽게 해줄 수 있어요.',
      sec4: '기록이 쌓이면서 보이는 건, 인정을 바라는 방식이 조금씩 달라지고 있다는 점이에요.\n\n초기에 칭찬을 받으면 좋아했던 것과 달리, 최근에는 스스로 "어때?", "나 잘했지?"라고 먼저 꺼내거나 자신이 한 것을 더 적극적으로 보여주려는 흐름이 더 자주 보여요. 자기 안의 기준이 자라고 있다는 신호이기도 해요.',
      sec5: '이 아이는 특히 이런 상황에서 더 선명하게 반응해요:\n\u2022 자신이 한 것을 누군가가 봐주거나 반응해주는 상황\n\u2022 발표, 경쟁, 평가가 들어가는 맥락\n\u2022 기대보다 적은 피드백이 왔을 때\n\u2022 같은 것을 했는데 다른 아이가 더 많이 칭찬받을 때\n\n반대로, 과정을 구체적으로 알아봐줄 때 이 아이는 더 자유롭게 시도해요.',
      sec6: '잘하고 싶다는 동기가 강하고, 인정을 통해 다음 시도로 이어가는 힘이 이 아이 안에 있어 보여요.\n\n이 결이 자라면 성취를 향해 자기 자신을 밀어붙이는 힘, 그리고 타인의 노력도 알아보는 감각으로 연결될 수 있어요. 지금의 "봐줘"는 훗날 "해냈어"로 이어지는 씨앗이에요.',
      sec7: '감정이 가장 크게 움직이는 순간:\n\u2022 기대했던 칭찬이나 인정이 오지 않을 때\n\u2022 열심히 했는데 결과가 기대에 못 미칠 때\n\u2022 다른 아이가 더 많이 칭찬받는 장면을 볼 때\n\u2022 자신이 한 것이 지나쳐질 때\n\n이런 반응들 뒤에는, "나는 충분히 인정받고 있는가"라는 질문이 함께 걸려 있을 수 있어요.',
      sec8: '결과보다 시도와 과정에 먼저 반응해주세요.\n\n\u2022 "당연하지"보다 \u2192 "이런 부분을 잘했어"처럼 구체적으로\n\u2022 "넌 어떤 것 같아?"라고 먼저 물어보기\n\u2022 실패했을 때 \u2192 "괜찮아, 해봤잖아"처럼 시도 자체를 가치 있게 여기기\n\n잘한 행동을 크게 평가하기보다, ' + n.call + '가 느낀 마음과 선택 자체를 조용히 짚어주는 방식이 더 편안하게 닿아요.',
      sec9: '이 힘은 결과보다 과정이 인정받는 경험 안에서 더 잘 자라요.\n\n\u2022 "잘했어"보다 "이렇게 해봤구나"처럼 과정을 알아봐주기\n\u2022 "넌 어떻게 느꼈어?"라고 먼저 물어보기\n\u2022 실패해도 다시 시도해볼 수 있는 환경\n\n이 경험들이 쌓일수록, 외부 평가보다 자기 자신을 기준으로 삼는 힘이 자라요.'
    },
    // ─────────────────────────────────────────── selfstd ──
    selfstd: {
      highlight: n.neun + ' 하고 싶은 방향이 분명한 만큼,\n자기 안의 기준과 선택 욕구가 일찍 자라고 있는 아이로 보여요.' + (secLabel ? '\n' + secLabel + '도 함께 드러나는 아이예요.' : ''),
      sec1: n.call + '에 관한 기록에서 눈에 띄는 흐름이 있어요.\n자기가 정한 방식이나 순서가 깨질 때, 또는 스스로 결정하고 싶은데 개입이 들어올 때, 반응이 유독 선명하게 올라오는 장면이에요.\n\n' + (ex1 ? ex1 + '처럼,\n이런 순간에 반응이 강하게 올라오는 흐름이 여러 기록에 걸쳐 이어져 있어요.' : '자기 방식이 개입받는 순간에 반응이 강하게 올라오는 흐름이 여러 기록에 걸쳐 이어져 있어요.') + (ex2 ? '\n\n' + ex2 + '처럼\n또 다른 상황에서도 비슷한 결이 드러나고 있어요.' : '') + (secLabel ? '\n\n그 안에서 ' + secLabel + '이 함께 걸려 있는 장면도 보여요.' : '') + pn,
      sec2: '고집이 세다거나 말을 안 듣는다는 말만으로는 이 아이의 절반밖에 보이지 않아요.\n\n이 시기에는 스스로 선택하고, 자기 방식대로 해보고 싶은 욕구가 자연스럽게 커지기도 해요. 그 안에서도 ' + n.call + '는 그 욕구가 조금 더 선명하고 강하게 드러나는 편이에요. 자기 방식이 개입받을 때 특히 크게 반응하는 패턴이 반복해서 보여요.\n\n다르게 보면, 이 안에는 자기 주도성의 씨앗, 독립적으로 판단하는 힘이 일찍 자라고 있다는 신호가 들어 있어요.',
      sec3: n.call + '가 강하게 반응할 때,\n"왜 이렇게 말을 안 듣지?"보다 그 반응 안에 무엇이 걸려 있는지를 함께 보면 어떨까요.\n\n\u2022 "지금 ' + n.call + '가 지키고 싶은 게 무엇일까?"\n\u2022 "어떤 부분에서 개입당했다고 느끼는 걸까?"\n\u2022 "선택지를 주거나 이유를 먼저 설명해주면 달라질까?"\n\n이 질문들이 ' + n.call + '를 훨씬 더 정확하게 읽는 데 도움이 돼요.',
      sec4: '기록이 쌓이면서 보이는 건, 자기 방식에 대한 의지가 점점 더 구체적인 언어로 표현되고 있다는 점이에요.\n\n초기에는 그냥 "싫어"처럼 반응이었다면, 최근에는 "이렇게 해야 돼" 또는 "내가 정한 거야"처럼 이유를 가진 주장으로 이어지는 패턴이 보여요. 자아가 더 선명해지고 있다는 신호예요.',
      sec5: '이 아이는 특히 이런 상황에서 더 선명하게 반응해요:\n\u2022 자신이 정한 방식이 갑자기 바뀌거나 개입될 때\n\u2022 아직 완성하지 않은 것을 중간에 끊어야 할 때\n\u2022 이유를 설명받지 못한 채 규칙이 강요될 때\n\u2022 예측하지 못한 상황 변화가 생겼을 때\n\n반대로, 선택권이 주어지고 자신이 결정할 수 있는 상황에서는 이 아이의 자기 주도적인 결이 훨씬 안정적으로 드러나요.',
      sec6: '외부에 쉽게 흔들리지 않는 자기 기준이 있다는 것은, 이 아이 안의 중요한 힘이에요.\n\n이 결이 자라면 독립적인 판단력, 자기 방식의 강점을 아는 자기 인식, 그리고 주변의 압력에도 자기 길을 걸어가는 힘으로 연결될 수 있어요.',
      sec7: '감정이 가장 크게 움직이는 순간:\n\u2022 "왜 내 말대로 안 해줘"라는 말이 나오는 상황\n\u2022 자신이 준비되지 않은 상태에서 갑자기 전환을 요구받을 때\n\u2022 자신이 정한 계획이 이유 없이 바뀔 때\n\u2022 선택권 없이 강요되는 순간\n\n이런 순간의 반응 뒤에는, "왜 나는 결정할 수 없어?"라는 자율성 욕구가 함께 걸려 있어요.',
      sec8: '이유를 먼저 설명해주세요.\n\n\u2022 "이렇게 해야 해"보다 \u2192 "이래서 이렇게 하는 게 나을 것 같아"\n\u2022 전환이 필요하면 \u2192 "5분 뒤에"처럼 미리 예고하기\n\u2022 "이거랑 이거 중에 어떻게 할래?"처럼 선택지 주기\n\u2022 "그렇게 하고 싶었구나"처럼 방식을 먼저 인정하기\n\n납득할 수 있는 이유와 선택권이 함께 오면, 이 아이는 훨씬 부드럽게 움직여요.',
      sec9: '이 힘은 자신이 결정할 수 있는 작은 영역들이 있는 환경에서 더 잘 자라요.\n\n\u2022 예측 가능한 루틴과 흐름이 있는 환경\n\u2022 "네가 정했으니까 해봐"처럼 자율성을 존중받는 경험\n\u2022 자신의 방식이 틀리지 않았다는 경험\n\n이 경험들이 쌓일수록, 바뀌어야 할 때도 자기 기준으로 판단하고 납득할 수 있는 힘이 자라요.'
    },
    // ─────────────────────────────────────────── emolang ──
    // 샘플A "감정이 빠르게 올라오는 아이" + "버텨보려는 힘" 반영
    emolang: {
      highlight: n.neun + ' 감정이 올라오는 순간에도\n자기 안에서 버텨보려는 움직임이 함께 자라고 있는 아이로 보여요.' + (secLabel ? '\n' + secLabel + '도 함께 드러나는 아이예요.' : ''),
      sec1: '기록을 날짜 순으로 연결해 읽어보면,\n마음대로 되지 않거나 억울하다고 느끼는 순간에 감정이 꽤 빠르게 올라오는 장면이 자주 보여요.\n\n' + (ex1 ? ex1 + '처럼,\n이런 순간에 감정이 빠르게 커지는 흐름이 여러 기록에 걸쳐 이어지고 있어요.' : '억울함이나 좌절이 올라오는 순간에 감정이 빠르게 커지는 흐름이 여러 기록에 걸쳐 이어지고 있어요.') + (ex2 ? '\n\n' + ex2 + '처럼\n비슷한 흐름이 또 다른 상황에서도 드러나고 있어요.' : '') + '\n\n그런데 그 안을 조금 더 들여다보면,\n단순히 감정이 큰 아이라기보다, 그 감정 안에서 어떻게든 버텨보려는 움직임도 함께 보이는 아이로 읽혀요.' + pn,
      sec2: '이 반응을 "예민하다"거나 "감정 조절이 안 된다"는 말로만 보면 이 아이를 좁게 읽게 돼요.\n\n이 시기에는 원하는 것과 현실 사이의 차이를 견디는 일이 아직 어렵고, 감정이 생각보다 훨씬 빠르게 몸으로 먼저 올라오기도 해요. 그 안에서도 ' + n.call + '는 그 감정이 없는 방향으로 가기보다, 감정을 다루는 방식을 아직 찾아가는 중으로 읽혀요.\n\n겉으로는 "왜 이렇게 금방 화가 나지?"처럼 보일 수 있지만, 그 안에는 억울함, 좌절감, 이해받고 싶은 마음이 함께 걸려 있어요.',
      sec3: n.call + '의 반응을 볼 때,\n"왜 이렇게까지 화가 날까?"보다 그 감정 안에 무엇이 걸려 있는지를 함께 가늠해보면 어떨까요.\n\n\u2022 "지금 ' + n.call + '에게 무엇이 무너졌다고 느껴졌을까?"\n\u2022 "억울함과 좌절 중 지금은 어느 쪽이 더 클까?"\n\u2022 "버텨보려는 시도가 있었는데 내가 못 봤던 건 아닐까?"\n\n이 질문들이 ' + n.call + '의 반응을 조금 더 다르게 읽게 해줄 수 있어요.',
      sec4: '기록이 쌓이면서 보이는 건, 감정이 올라오는 장면 자체는 여전히 선명하지만\n그 감정이 무조건 행동으로만 터지기보다 조금씩 말이나 표정, 버티는 모습으로도 나타나기 시작하는 흐름이 있어요.\n\n감정이 사라진 것이 아니라, 그 감정을 다루는 방식이 아주 조금씩 넓어지고 있는 변화로 읽혀요.',
      sec5: '이 아이는 특히 이런 상황에서 반응이 더 크게 나타나요:\n\u2022 기다려야 하거나 원하는 것을 바로 못 하는 상황\n\u2022 갑자기 계획이 바뀌는 상황\n\u2022 억울하다고 느끼는 상황\n\u2022 자기 마음을 아무도 못 알아주는 상황\n\u2022 이미 마음이 꽉 찬 상태에서 추가 자극이 들어올 때\n\n이런 장면에서 겉으로 드러나는 반응 뒤에는, "내 마음이 너무 큰데 지금 이걸 어떻게 해야 할지 모르겠다"는 혼란이 함께 있을 수 있어요.',
      sec6: '이 아이는 감정의 크기가 큰 만큼, 자기 안에서 일어나는 변화를 선명하게 느끼는 아이일 수 있어요.\n\n감정의 크기 자체가 문제라기보다, 그 감정을 다루는 도구가 아직 자라고 있는 중으로 읽는 게 더 정확할 수 있어요. 이 감각이 잘 다뤄지면, 공감, 몰입, 표현의 힘으로 이어질 수 있어요.',
      sec7: '감정이 가장 크게 움직이는 순간:\n\u2022 원하는 흐름이 끊길 때\n\u2022 억울하다고 느낄 때\n\u2022 자기 감정을 아무도 못 알아줄 때\n\u2022 이미 마음이 꽉 찬 상태에서 추가 자극이 들어올 때\n\n겉으로는 작은 일처럼 보여도, 실제로는 그 순간까지 쌓여 있던 마음이 함께 터지는 경우도 많을 수 있어요.',
      sec8: '이 아이에게는 감정이 이미 커진 뒤에 설명하기보다,\n감정이 커지기 직전과 직후를 다르게 도와주는 방식이 더 잘 맞을 수 있어요.\n\n\u2022 "울지 마"보다 \u2192 "너무 속상했구나"\n\u2022 "왜 또 그래?"보다 \u2192 "이건 네가 원한 흐름이 아니었구나"\n\u2022 "그 정도로 화낼 일이 아니야"보다 \u2192 "그게 진짜 싫었겠다"\n\n감정의 크기를 먼저 인정해주면, 이 아이도 자기 감정을 조금 더 안전하게 느낄 수 있어요.',
      sec9: '이 아이는 감정을 줄이는 방향보다,\n감정을 다루는 힘을 키우는 방향이 더 중요해 보여요.\n\n\u2022 감정이 올라오기 전에 미리 예고받는 경험\n\u2022 "지금 내 마음이 어느 정도인지" 말로 표현해보는 경험\n\u2022 감정이 커져도 관계가 끊기지 않는 안전감\n\u2022 버텨낸 순간을 조용히 알아봐주는 경험\n\n감정을 크게 느끼는 힘이 잘 다뤄지면, 공감, 몰입, 표현의 힘으로 이어질 수 있어요.'
    },
    // ─────────────────────────────────────────── immerse ──
    // 샘플B "조용하지만 예민한 아이" 각도 반영
    immerse: {
      highlight: n.neun + ' 흥미를 느끼는 것에 깊이 들어가거나,\n자기 속도로 확인하면서 움직이는 결이 있어 보여요.' + (secLabel ? '\n' + secLabel + '도 함께 드러나는 아이예요.' : ''),
      sec1: '기록 전반에 걸쳐 반복적으로 등장하는 장면이 있어요.\n한 번 빠져든 것을 끝까지 하고 싶고, 끊기면 크게 반응하는 흐름이에요. 또는 새로운 것 앞에서 바로 뛰어들기보다 충분히 보고 자기 속도로 들어오는 장면이 반복해서 등장해요.\n\n' + (ex1 ? ex1 + '처럼,\n이런 장면이 여러 기록에 걸쳐 이어지고 있어요.' : '이런 흐름이 여러 기록에 걸쳐 이어지고 있어요.') + (ex2 ? '\n\n' + ex2 + '처럼\n또 다른 상황에서도 비슷한 결이 드러나고 있어요.' : '') + (secLabel ? '\n\n그 안에서 ' + secLabel + '이 함께 걸려 있는 장면도 보여요.' : '') + pn,
      sec2: '단순히 고집이 세거나 적응이 느린 아이라는 말로는 이 아이의 절반밖에 보이지 않아요.\n\n이 시기에 좋아하는 것에 집중하는 힘이 강하거나, 새로운 환경에서 먼저 충분히 살펴보고 들어오는 흐름은 자연스럽게 보이기도 해요. 그 안에서도 ' + n.call + '는 그 흐름이 조금 더 선명하고 일관된 편이에요.\n\n다르게 보면, 바로 뛰어드는 대신 먼저 읽고, 한 번에 반응하기보다 충분히 살펴보는 힘이 자라고 있다는 신호로도 읽혀요.',
      sec3: n.call + '의 반응을 볼 때,\n"왜 바로 안 하지?" 또는 "왜 이렇게 집착하지?"보다 그 행동 안에 무엇이 걸려 있는지를 함께 가늠해보면 어떨까요.\n\n\u2022 "지금 ' + n.call + '가 하고 있는 것이 얼마나 중요한 흐름인가?"\n\u2022 "충분히 마무리할 시간을 줬는가?"\n\u2022 "자기 속도로 들어올 시간이 있었는가?"\n\n이 질문들이 ' + n.call + '를 훨씬 더 정확하게 읽게 해줄 수 있어요.',
      sec4: '기록이 쌓이면서 보이는 건, 몰입의 대상이 더 구체적으로 보이기 시작했다는 점이에요.\n\n다양한 상황에서 같은 패턴이 반복되면서, 이것이 단순한 기질이 아니라 이 아이만의 탐구 방식임이 더 선명하게 드러나고 있어요.',
      sec5: '이 아이는 특히 이런 상황에서 더 선명하게 반응해요:\n\u2022 좋아하는 것을 하고 있을 때 갑자기 끊어야 할 때\n\u2022 충분히 하기 전에 다음으로 전환해야 할 때\n\u2022 자기 속도를 기다려주지 않는 분위기\n\u2022 준비 없이 바로 참여해야 하는 상황\n\n반대로, 충분한 시간이 주어지거나 먼저 볼 수 있는 여유가 있을 때 이 아이는 훨씬 안정적으로 들어와요.',
      sec6: '한 가지에 깊이 집중하거나, 충분히 살펴본 뒤 자기 방식으로 들어오는 힘이 이 아이 안에 있어 보여요.\n\n이 결이 자라면 신중함, 관찰력, 깊은 몰입으로 이어질 수 있어요. 지금의 느림은 단순한 소극성이 아니라, 세상을 조금 더 세밀하게 받아들이는 방식일 수 있어요.',
      sec7: '감정이 가장 크게 움직이는 순간:\n\u2022 아직 하고 싶은데 "이제 그만"이라는 말이 올 때\n\u2022 자기 속도를 기다려주지 않는 분위기\n\u2022 준비 없이 바로 참여해야 하는 상황\n\u2022 안에서 꽤 많은 감각이 오가는데 겉으로 표현하기 어려운 순간\n\n겉으로는 조용해 보여도, 안에서는 꽤 피곤하고 긴장된 상태가 쌓일 수 있어요.',
      sec8: '이 아이에게는 "왜 안 해?" 또는 "이제 그만"보다,\n먼저 익숙해질 시간, 또는 충분히 마무리할 시간을 주는 방식이 더 잘 맞을 수 있어요.\n\n\u2022 끝내기 5분 전에 예고하기\n\u2022 "그거 진짜 좋아하는구나"처럼 몰입 자체를 인정해주기\n\u2022 바로 참여시키기보다 먼저 보기 허용하기\n\u2022 불편함을 말로 못 꺼낼 때 먼저 대신 언어화해주기',
      sec9: '이 힘은 방해받지 않고 충분히 몰두하거나 자기 속도로 들어올 수 있는 환경에서 더 잘 자라요.\n\n\u2022 적응할 시간을 충분히 주는 환경\n\u2022 준비할 수 있는 예고가 있는 환경\n\u2022 자신의 속도로 완성해가는 경험, 인정받는 경험\n\n이 경험들이 쌓일수록 이 힘은 깊이와 안정감으로 이어질 가능성이 커 보여요.'
    },
    // ─────────────────────────────────────────── confirm ──
    confirm: {
      highlight: n.neun + ' 질문과 확인을 통해 자기 위치를 가늠하면서,\n' + (secLabel ? secLabel + '도 함께 자라는 아이로 보여요.' : '자기 기준을 만들어가는 아이로 보여요.'),
      sec1: n.call + '의 기록에서 자주 등장하는 질문의 흐름이 있어요.\n"맞아?", "나 잘했지?", "나 좋아해?"처럼 자신의 감각이나 판단이 받아들여지는지 확인하려는 장면이 반복해서 나타나요.\n\n' + (ex1 ? ex1 + '처럼,\n이런 확인 질문이 여러 기록에 걸쳐 이어지고 있어요.' : '단순한 정보 확인이 아니라, 관계 안에서 자신의 위치를 가늠하려는 욕구로 읽히는 장면들이 여러 기록에 이어져 있어요.') + (ex2 ? '\n\n' + ex2 + '와 같은 장면에서도\n비슷한 흐름이 또 다른 각도에서 드러나고 있어요.' : '') + (secLabel ? '\n\n그 안에서 ' + secLabel + '이 함께 걸려 있는 장면도 보여요.' : '') + pn,
      sec2: '의존적이거나 확신이 없다는 말만으로는 이 아이를 좁게 읽게 돼요.\n\n이 시기에는 자기 판단과 기준이 자라면서 동시에 외부의 확인도 필요해지는 흐름이 자연스럽게 보이기도 해요. 그 안에서도 ' + n.call + '는 관계 안에서 자신의 위치를 가늠하는 데 이 확인 방식을 더 자주, 더 선명하게 사용하는 편이에요.\n\n다르게 보면, "내가 옳은 방향으로 있는가"를 자꾸 물으면서 자기 기준을 만들어가는 과정으로도 읽혀요.',
      sec3: n.call + '의 확인 질문을 들을 때,\n그 질문이 정보를 원하는 건지, 아니면 관계 안에서의 위치를 확인하려는 건지를 함께 가늠해보면 어떨까요.\n\n\u2022 "지금 이 질문 뒤에 어떤 마음이 걸려 있을까?"\n\u2022 "답을 주기 전에 ' + n.call + '의 생각을 먼저 물어볼 수 있을까?"\n\u2022 "판단을 맡겨주면 스스로 결정할 수 있을까?"\n\n이 질문들이 ' + n.call + '를 더 정확하게 읽는 데 도움이 돼요.',
      sec4: '기록이 쌓이면서 보이는 건, 확인 질문의 성격이 조금씩 달라지고 있다는 점이에요.\n\n초기에는 단순히 정보를 확인하는 질문이었다면, 최근에는 관계 안에서 자신이 어떤 위치인지를 확인하려는 질문이 더 자주 등장하고 있어요.',
      sec5: '이 아이는 특히 이런 상황에서 더 선명하게 반응해요:\n\u2022 자신의 행동이나 판단에 대한 피드백이 오지 않을 때\n\u2022 새로운 상황이 시작되거나 환경이 바뀔 때\n\u2022 혼자 결정을 내려야 하는 상황\n\u2022 질문을 했는데 원하는 답이 오지 않을 때\n\n반대로, 자신의 판단이 인정받는 상황에서 이 아이는 더 자신 있게 움직여요.',
      sec6: '"왜"를 자꾸 묻고 반복적으로 확인하는 것은, 이 아이 안의 강점의 씨앗이에요.\n\n이 결이 자라면 날카로운 질문력, 확신을 가지고 판단하는 힘, 그리고 관계 안에서 자신의 위치를 정확하게 읽는 감수성으로 이어질 수 있어요.',
      sec7: '감정이 가장 크게 움직이는 순간:\n\u2022 확신이 없는 상황에서 결정을 혼자 내려야 할 때\n\u2022 자신이 한 것이 받아들여졌는지 모르는 상태가 길어질 때\n\u2022 관계에서 신호가 애매하게 느껴질 때\n\u2022 질문을 했는데 원하는 답이 오지 않을 때\n\n이런 순간들 뒤에는, "나의 감각과 판단이 맞는가"를 확인하고 싶은 마음이 함께 걸려 있어요.',
      sec8: '자신의 판단을 인정해주세요.\n\n\u2022 "맞아, 그렇게 생각할 수 있어"처럼 판단 자체를 인정해주기\n\u2022 바로 답을 주기보다 "너는 어떻게 생각해?"라고 먼저 물어보기\n\u2022 확인 질문을 귀찮게 여기지 않기 → 자기 위치를 가늠하고 싶다는 신호로 읽기\n\u2022 "네가 골랐으니까 해봐"처럼 판단을 맡겨주기',
      sec9: '이 힘은 자신의 판단이 존중받는 경험이 반복되는 환경에서 더 잘 자라요.\n\n\u2022 정답을 말해주기보다 함께 생각하는 대화\n\u2022 틀려도 배우는 경험이 안전한 환경\n\u2022 "네가 결정했어, 해봐"처럼 맡겨지는 경험\n\n이 경험들이 쌓일수록, 확인보다 확신이 먼저 오는 방향으로 자라요.'
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
  var primary   = getAxisText(primaryAxis,   secondaryAxis, n, snap);
  var secondary = getAxisText(secondaryAxis, primaryAxis,   n, snap);

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
