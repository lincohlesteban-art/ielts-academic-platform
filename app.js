/* ============================================================
   IELTS Academic Practice Platform — Application Logic
   ============================================================ */

(function () {
  'use strict';

  // ---- State ----
  let currentTool = 'cursor';
  let currentColor = null;
  let timerSeconds = 3600; // 60 minutes
  let timerInterval = null;
  let timerRunning = false;
  let answersVisible = false;
  let currentTestId = null;
  let activeFilter = 'all';

  // ---- DOM References ----
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarNav = document.getElementById('sidebar-nav');
  const sidebarSearchInput = document.getElementById('sidebar-search-input');
  const welcomeScreen = document.getElementById('welcome-screen');
  const testContainer = document.getElementById('test-container');
  const testBreadcrumb = document.getElementById('test-breadcrumb');
  const testTitle = document.getElementById('test-title');
  const testContent = document.getElementById('test-content');
  const testBody = document.getElementById('test-body');
  const loadingSpinner = document.getElementById('loading-spinner');
  const testSplit = document.getElementById('test-split');
  const passageContent = document.getElementById('passage-content');
  const questionsContent = document.getElementById('questions-content');
  const contextMenu = document.getElementById('context-menu');
  const timerDisplay = document.getElementById('timer-display');
  const timerStartBtn = document.getElementById('timer-start');
  const timerResetBtn = document.getElementById('timer-reset');
  const toolClear = document.getElementById('tool-clear');
  const toolAnswers = document.getElementById('tool-answers');

  // ---- Initialize ----
  function init() {
    buildSidebar();
    bindToolbar();
    bindTimer();
    bindSidebar();
    bindContextMenu();
    bindFilters();
    // Restore last test if any
    const lastTest = localStorage.getItem('ielts_last_test');
    if (lastTest) {
      const parts = lastTest.split('|');
      if (parts.length === 4) {
        loadTest(parseInt(parts[0]), parts[1], parseInt(parts[2]), parts[3]);
      }
    }
  }

  // ---- Build Sidebar ----
  function buildSidebar() {
    sidebarNav.innerHTML = '';
    IELTS_DATA.forEach(bookData => {
      const group = document.createElement('div');
      group.className = 'book-group';
      group.dataset.book = bookData.book;

      const header = document.createElement('div');
      header.className = 'book-header';
      header.innerHTML = `
        <span class="book-number">${bookData.book}</span>
        <div class="book-info">
          <div class="book-name">${bookData.label}</div>
          <div class="book-year">${bookData.year}</div>
        </div>
        <svg class="book-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      `;

      const testsDiv = document.createElement('div');
      testsDiv.className = 'book-tests';

      // Reading
      if (bookData.tests.reading && bookData.tests.reading.length > 0) {
        const section = createTestSection('Reading', 'reading', bookData.book, bookData.tests.reading, bookData.label);
        testsDiv.appendChild(section);
      }

      // Listening
      if (bookData.tests.listening && bookData.tests.listening.length > 0) {
        const section = createTestSection('Listening', 'listening', bookData.book, bookData.tests.listening, bookData.label);
        testsDiv.appendChild(section);
      }

      // Writing
      if (bookData.tests.writing && bookData.tests.writing.length > 0) {
        const section = createTestSection('Writing', 'writing', bookData.book, bookData.tests.writing, bookData.label);
        testsDiv.appendChild(section);
      }

      header.addEventListener('click', () => {
        group.classList.toggle('open');
      });

      group.appendChild(header);
      group.appendChild(testsDiv);
      sidebarNav.appendChild(group);
    });
  }

  function createTestSection(label, type, bookNum, tests, bookLabel) {
    const frag = document.createDocumentFragment();
    const sectionLabel = document.createElement('div');
    sectionLabel.className = `test-section-label section-${type}`;
    sectionLabel.textContent = label;
    frag.appendChild(sectionLabel);

    tests.forEach((test, idx) => {
      const link = document.createElement('div');
      link.className = 'test-link';
      link.dataset.type = type;
      link.dataset.id = test.id;
      link.dataset.url = test.url;
      link.dataset.book = bookNum;
      link.dataset.idx = idx;
      link.dataset.bookLabel = bookLabel;
      link.dataset.testName = test.name;

      link.innerHTML = `
        <span class="test-link-icon ${type}"></span>
        <span class="test-link-name">${test.name}</span>
      `;

      link.addEventListener('click', () => {
        loadTest(bookNum, type, idx, test.url);
        // On mobile, close sidebar
        if (window.innerWidth <= 768) {
          sidebar.classList.add('collapsed');
        }
      });

      frag.appendChild(link);
    });

    return frag;
  }

  // ---- Filters ----
  function bindFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        applyFilters();
      });
    });
  }

  function applyFilters() {
    const searchTerm = sidebarSearchInput.value.toLowerCase().trim();
    const bookGroups = sidebarNav.querySelectorAll('.book-group');

    bookGroups.forEach(group => {
      let anyVisible = false;

      // Filter section labels and test links
      const sectionLabels = group.querySelectorAll('.test-section-label');
      sectionLabels.forEach(label => {
        const type = label.classList.contains('section-reading') ? 'reading' :
                     label.classList.contains('section-listening') ? 'listening' : 'writing';
        const shouldShow = activeFilter === 'all' || activeFilter === type;
        label.style.display = shouldShow ? '' : 'none';
      });

      const links = group.querySelectorAll('.test-link');
      links.forEach(link => {
        const type = link.dataset.type;
        const name = (link.dataset.testName || '').toLowerCase();
        const bookLabel = (link.dataset.bookLabel || '').toLowerCase();
        const matchFilter = activeFilter === 'all' || activeFilter === type;
        const matchSearch = !searchTerm || name.includes(searchTerm) || bookLabel.includes(searchTerm) || type.includes(searchTerm);
        const visible = matchFilter && matchSearch;
        link.style.display = visible ? '' : 'none';
        if (visible) anyVisible = true;
      });

      group.style.display = anyVisible ? '' : 'none';
      if (searchTerm && anyVisible) {
        group.classList.add('open');
      }
    });
  }

  // ---- Sidebar Events ----
  function bindSidebar() {
    const backdrop = document.getElementById('sidebar-backdrop');

    function openSidebar() {
      sidebar.classList.add('open');
      backdrop.classList.add('visible');
    }
    function closeSidebar() {
      sidebar.classList.remove('open');
      backdrop.classList.remove('visible');
    }

    sidebarToggle.addEventListener('click', () => {
      if (sidebar.classList.contains('open')) closeSidebar();
      else openSidebar();
    });

    backdrop.addEventListener('click', closeSidebar);

    // Close sidebar when a test link is clicked
    sidebarNav.addEventListener('click', (e) => {
      if (e.target.closest('.test-link')) {
        closeSidebar();
      }
    });

    sidebarSearchInput.addEventListener('input', () => {
      applyFilters();
    });
  }

  // ---- Load Test ----
  async function loadTest(bookNum, type, testIdx, url) {
    // Update active link
    const allLinks = sidebarNav.querySelectorAll('.test-link');
    allLinks.forEach(l => l.classList.remove('active'));
    const activeLink = sidebarNav.querySelector(`.test-link[data-url="${url}"]`);
    if (activeLink) activeLink.classList.add('active');

    // Open the book group
    const bookGroup = sidebarNav.querySelector(`.book-group[data-book="${bookNum}"]`);
    if (bookGroup) bookGroup.classList.add('open');

    // Find book data
    const bookData = IELTS_DATA.find(b => b.book === bookNum);
    const testList = bookData.tests[type];
    const testInfo = testList[testIdx];

    // Show test container, hide welcome
    welcomeScreen.style.display = 'none';
    testContainer.style.display = 'block';

    // Set header
    testBreadcrumb.textContent = `${bookData.label} • ${type.charAt(0).toUpperCase() + type.slice(1)}`;
    testTitle.textContent = testInfo.name;

    // Show loading, hide content
    testBody.style.display = 'block'; // Make sure the container is visible for the spinner
    loadingSpinner.style.display = 'flex';
    testContent.style.display = 'none';
    testContent.innerHTML = '';
    testSplit.style.display = 'none';
    passageContent.innerHTML = '';
    questionsContent.innerHTML = '';
    answersVisible = false;

    // Save last test
    currentTestId = testInfo.id;
    localStorage.setItem('ielts_last_test', `${bookNum}|${type}|${testIdx}|${url}`);

    // Fetch content using CORS proxies with fallback
    const proxies = [
      (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
      (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      (u) => `https://thingproxy.freeboard.io/fetch/${u}`
    ];

    let html = null;
    let lastError = null;

    for (const makeProxy of proxies) {
      try {
        const proxyUrl = makeProxy(url);
        const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        html = await response.text();
        if (html && html.length > 500) break;
      } catch (err) {
        lastError = err;
        html = null;
      }
    }

    if (html) {
      if (type === 'reading') {
        try {
          const result = parseReadingContent(html, testInfo);
          passageContent.innerHTML = result.passage;
          questionsContent.innerHTML = result.questions;
          loadingSpinner.style.display = 'none';
          testBody.style.display = 'none';
          testSplit.style.display = 'flex';
          testContainer.classList.add('split-active');
          bindSplitDivider();
          bindAnswerChecking();
        } catch (err) {
          console.error("Parse error:", err);
          loadingSpinner.innerHTML = `
            <div style="text-align:center; padding: 40px;">
              <p style="color: #ff6b6b; font-size: 1rem; margin-bottom: 12px;">Error parsing test content</p>
              <p style="color: var(--text-muted); font-size: 0.85rem;">${err.message}</p>
            </div>
          `;
        }
      } else {
        const content = parseTestContent(html, type, testInfo);
        testContent.innerHTML = content;
        testContent.style.display = 'block';
        loadingSpinner.style.display = 'none';
        testBody.style.display = 'block';
        testSplit.style.display = 'none';
        testContainer.classList.remove('split-active');
      }
      document.getElementById('main-content').scrollTop = 0;
    } else {
      loadingSpinner.innerHTML = `
        <div style="text-align:center; padding: 40px;">
          <p style="color: #ff6b6b; font-size: 1rem; margin-bottom: 12px;">Could not load test content</p>
          <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 16px;">${lastError ? lastError.message : 'All proxies failed'}</p>
          <a href="${url}" target="_blank" rel="noopener" 
             style="display:inline-flex; align-items:center; gap:6px; color:white; background:var(--accent-primary); padding:10px 20px; border-radius:8px; text-decoration:none; font-size:0.9rem; font-weight:600;">
            Open on IELTS Master
          </a>
        </div>
      `;
    }
  }

  // ---- Parse Reading Content (split passage + questions) ----
  function parseReadingContent(html, testInfo) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Remove unwanted elements
    const removeSelectors = [
      'script','style','header','footer','nav','.social-share','.post-navigation',
      '.comments','.sidebar','ins','.adsbygoogle','.entry-meta','.post-meta',
      '.breadcrumbs','.related-posts','.sharedaddy','.jp-relatedposts','.wpulike',
      '.entry-footer','.author-info','.post-tags','noscript','.noprint',
      'iframe[src*="youtube"]','iframe[src*="google"]','.cookie','.popup','#cookie','.gdpr'
    ];
    removeSelectors.forEach(sel => {
      try { doc.querySelectorAll(sel).forEach(el => el.remove()); } catch(e) {}
    });

    let contentEl = doc.querySelector('.entry-content') || doc.querySelector('.post-content') ||
                    doc.querySelector('.elementor-widget-theme-post-content') ||
                    doc.querySelector('article') || doc.querySelector('main') || doc.body;
    if (!contentEl) return { passage: '<p>Could not parse.</p>', questions: '' };

    // Extract answers FIRST from the full text before removing the section.
    // Anchor on the "Show Answers" / "Answer Key" / "Answers:" marker that
    // practicepteonline.com puts at the end of every test, then read the
    // numbered list that follows. Falls back to "1. True/False/..." anchor
    // for older tests that don't have the marker.
    let answersData = {};
    const fullText = contentEl.textContent || '';
    let answerStart = fullText.search(/\b(?:Show\s+)?Answers?(?:\s+Key)?\s*:?\s*(?=1\s*[\.\)])/i);
    if (answerStart < 0) {
      answerStart = fullText.search(/\n\s*1\.\s*(?:True|False|Not\s*Given|Yes|No)\b/i);
    }
    if (answerStart > 0) {
      let answerSection = fullText.substring(answerStart)
        .replace(/^\s*(?:Show\s+)?Answers?(?:\s+Key)?\s*:?\s*/i, '');
      // The answer list may be either line-separated or all glued together
      // (e.g. "1. tomatoes2. urban centres3. energy..."). Use a tolerant regex.
      const answerRegex = /\b(\d{1,2})\s*[\.\)]\s*([^\d][^\d\n]*?)(?=\s*\d{1,2}\s*[\.\)]|$)/g;
      let am;
      while ((am = answerRegex.exec(answerSection)) !== null) {
        const qNum = parseInt(am[1]);
        const val = am[2].trim();
        if (val.length > 40) break;
        if (qNum >= 1 && qNum <= 40) answersData[qNum] = val;
      }
    }

    // Now work with the HTML to separate passages from questions
    let rawHTML = contentEl.innerHTML;
    rawHTML = rawHTML.replace(/\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\(\{[^}]*\}\);?/g, '');
    rawHTML = rawHTML.replace(/<ins[^>]*class="adsbygoogle"[^>]*>[\s\S]*?<\/ins>/gi, '');
    rawHTML = rawHTML.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    rawHTML = rawHTML.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    rawHTML = rawHTML.replace(/<p>\s*<\/p>/gi, '');

    // Parse into a temp DOM to walk element by element
    const tmpDoc = new DOMParser().parseFromString('<div>' + rawHTML + '</div>', 'text/html');
    const root = tmpDoc.body.firstChild;

    let passageParts = [];      // passage paragraphs only
    let questionParts = [];     // raw question HTML (used to build interactive form)
    let allContentParts = [];   // passage + raw questions (in original document order)
    let inQuestions = false;
    let reachedAnswers = false;
    let lastQuestionEnd = 0; // highest question number we've seen so far

    const children = Array.from(root.children);

    // Helper: does this element look like the start of a new passage?
    function looksLikeNewPassageStart(el, text) {
      const t = text.trim();
      if (!t) return false;
      // Skip blocks that are obviously question-related
      if (/Questions?\s+\d/i.test(t)) return false;
      if (/^\s*[\(\[]?\d{1,2}[\.\)\]]?\s+\S/.test(t)) return false;
      if (/^(Choose|Match|Complete|Write|Look at|Do the following|Which|Using)\b/i.test(t)) return false;

      // Explicit passage marker
      if (/^\s*(READING\s+)?PASSAGE\s+(\d+|ONE|TWO|THREE|I{1,3})\b/i.test(t)) return true;

      // Heading element with short title
      if (/^h[1-6]$/i.test(el.tagName) && t.length < 200) return true;

      // Centered <p> with short title — this is the reliable cue on practicepteonline.com
      // (each passage's title uses style="text-align: center" with bold title text)
      const styleAttr = (el.getAttribute && (el.getAttribute('style') || '')) || '';
      if (/text-align\s*:\s*center/i.test(styleAttr) && t.length > 4 && t.length < 200) return true;

      return false;
    }

    // Helper: does this question section appear to be done?
    // True when the block doesn't look like a question/instruction and is prose-like.
    function looksLikeProsePassage(el, text) {
      const t = text.trim();
      if (!t || t.length < 200) return false;
      if (/Questions?\s+\d{1,2}\s*[-–—]\s*\d{1,2}/i.test(t)) return false;
      if (/Questions?\s+\d{1,2}\s+and\s+\d{1,2}/i.test(t)) return false;
      if (/^\s*[\(\[]?\d{1,2}[\.\)\]]?\s+\S/.test(t)) return false; // numbered question
      if (/\bTRUE\b.{0,80}\bFALSE\b/i.test(t)) return false;
      if (/\bYES\b.{0,80}\bNO\b.{0,80}\bNOT\s*GIVEN\b/i.test(t)) return false;
      // Instruction prefix
      if (/^(Use\s+the|Read\s+the|Choose|Match|Complete|Write|Look\s+at|Do\s+the\s+following|Which\s+(paragraph|section|of)|Using|In\s+boxes|NB\b)/i.test(t)) return false;
      // Anywhere in the text — strong instruction signals
      if (/\b(your\s+answer\s+sheet|in\s+boxes\s+\d|Reading\s+Passage\s+\d|listed\s+[A-H]\s*[-–—]\s*[A-H]|listed\s+\d+\s*[-–—]\s*\d+)\b/i.test(t)) return false;
      const sentenceCount = (t.match(/[\.!?]\s+[A-Z]/g) || []).length;
      return sentenceCount >= 2;
    }

    for (const el of children) {
      const text = el.textContent || '';

      // Detect answer/explanation section — stop processing
      const tt = text.trim();
      if (/^Explanations?:/i.test(tt) ||
          /^Questions?\s+\d+[\s-]+\d+\s+are\s+of/i.test(tt)) {
        reachedAnswers = true;
      }
      // "Show Answers" / "Answer Key" / "Answers:" marker (often a standalone block)
      if (/^(?:Show\s+)?Answers?(?:\s+Key)?:?\s*$/i.test(tt)) {
        reachedAnswers = true;
      }
      // Concatenated answer block ("1. tomatoes2. urban centres3. energy..."
      // or "1. False\n2. True\n...") — three sequential numbered short items
      // at the start of the block is unmistakable.
      if (/^\s*1\s*[\.\)]\s*\S[^]{0,40}?\s*2\s*[\.\)]\s*\S[^]{0,40}?\s*3\s*[\.\)]\s*\S/.test(tt)) {
        reachedAnswers = true;
      }
      // Single-line "1. True/False/..." answer block
      if (/^\s*1\.\s*(True|False|Not\s*Given|Yes|No)\b/im.test(text) && tt.length < 20) {
        reachedAnswers = true;
      }
      if (reachedAnswers) continue;

      // Check if this element starts a NEW question section.
      // Match "Questions X-Y" range, "Questions X and Y" pair, or singular "Question X".
      const qGroupMatch = text.match(/Questions?\s+(\d{1,2})\s*[-–—]\s*(\d{1,2})/i)
        || text.match(/Questions?\s+(\d{1,2})\s+and\s+(\d{1,2})/i)
        || text.match(/(?:^|\b)Question\s+(\d{1,2})(?!\s*[-–—\d])/i);
      if (qGroupMatch) {
        inQuestions = true;
        const lastNum = qGroupMatch[2] ? parseInt(qGroupMatch[2]) : parseInt(qGroupMatch[1]);
        lastQuestionEnd = Math.max(lastQuestionEnd, lastNum);
      } else if (inQuestions) {
        // Are we transitioning back to a passage?
        if (looksLikeNewPassageStart(el, text) || looksLikeProsePassage(el, text)) {
          inQuestions = false;
        }
      }

      if (inQuestions) {
        questionParts.push(el.outerHTML);
        // Wrap question blocks on the passage side so they're visually distinct
        allContentParts.push(`<div class="passage-question-block">${el.outerHTML}</div>`);
      } else {
        passageParts.push(el.outerHTML);
        allContentParts.push(el.outerHTML);
      }
    }

    let passageHTML = allContentParts.join('');
    const questionsRawHTML = questionParts.join('');

    // Build interactive questions
    const questionsHTML = buildInteractiveQuestions(questionsRawHTML, answersData);

    return { passage: passageHTML, questions: questionsHTML };
  }

  // ---- Build Interactive Question Fields ----
  function buildInteractiveQuestions(rawHTML, answers) {
    const tmpDoc = new DOMParser().parseFromString('<div>' + rawHTML + '</div>', 'text/html');
    const root = tmpDoc.body.firstChild;

    // Walk DOM and collect block-level units, preserving order.
    // Each block has its trimmed/normalized text. This lets us match
    // numbered questions reliably without relying on a flattened string.
    const blocks = [];
    function pushBlock(el) {
      // If the element contains <br> separators, split it into per-line blocks
      // so that "9. ...<br/>10. ...<br/>11. ..." becomes 3 separate question blocks.
      if (el.querySelector && el.querySelector('br')) {
        const segments = el.innerHTML.split(/<br\s*\/?>/i);
        segments.forEach(seg => {
          const tmp = el.ownerDocument.createElement('div');
          tmp.innerHTML = seg;
          const txt = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
          if (txt) blocks.push({ el: tmp, text: txt });
        });
        return;
      }
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (txt) blocks.push({ el, text: txt });
    }
    function walk(parent) {
      Array.from(parent.children).forEach(child => {
        const tag = child.tagName.toLowerCase();
        if (['p','li','h1','h2','h3','h4','h5','h6','blockquote','td','th'].includes(tag)) {
          pushBlock(child);
        } else if (['ul','ol','table','tbody','thead','tr','section','article'].includes(tag)) {
          walk(child);
        } else if (tag === 'div') {
          const hasBlockKids = Array.from(child.children).some(c =>
            ['p','li','div','ul','ol','table','h1','h2','h3','h4','h5','h6','blockquote'].includes(c.tagName.toLowerCase())
          );
          if (hasBlockKids) walk(child);
          else pushBlock(child);
        }
      });
    }
    walk(root);

    // If no blocks found, fall back to splitting the raw text by <br>
    if (blocks.length === 0) {
      const fallback = root.innerHTML.split(/<br\s*\/?>/i);
      fallback.forEach(chunk => {
        const tmp = new DOMParser().parseFromString(chunk, 'text/html');
        const txt = (tmp.body.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt) blocks.push({ el: null, text: txt });
      });
    }

    // Find group markers — must appear at the START of the block, otherwise
    // they're just instruction text mentioning a range (e.g. "spend 20 min
    // on Questions 14-26"), not the actual group header. Three forms supported:
    //   "Questions X-Y"   (range)
    //   "Questions X and Y"  (pair)
    //   "Question X"      (singular, single question)
    const groups = [];
    blocks.forEach((b, i) => {
      let start, end, title;
      const rangeM = b.text.match(/^\s*Questions?\s+(\d{1,2})\s*[-–—]\s*(\d{1,2})/i);
      const pairM = !rangeM && b.text.match(/^\s*Questions?\s+(\d{1,2})\s+and\s+(\d{1,2})/i);
      const singleM = !rangeM && !pairM && b.text.match(/^\s*Question\s+(\d{1,2})(?!\s*[-–—\d])/i);
      if (rangeM)      { start = parseInt(rangeM[1]); end = parseInt(rangeM[2]); title = rangeM[0]; }
      else if (pairM)  { start = parseInt(pairM[1]);  end = parseInt(pairM[2]);  title = pairM[0]; }
      else if (singleM){ start = end = parseInt(singleM[1]);                      title = singleM[0]; }
      else return;
      if (start >= 1 && end <= 40 && start <= end) {
        if (!groups.some(g => g.start === start && g.end === end)) {
          groups.push({ start, end, blockIdx: i, title });
        }
      }
    });

    if (groups.length === 0) {
      return rawHTML + buildAnswerBar(answers);
    }

    let html = '';
    groups.forEach((grp, gi) => {
      const startIdx = grp.blockIdx;
      const endIdx = (gi < groups.length - 1) ? groups[gi + 1].blockIdx : blocks.length;
      const grpBlocks = blocks.slice(startIdx, endIdx);

      // Find first block that is a numbered question matching grp.start.
      // A question block starts with: "1.", "1)", "[1]", or "1 ".
      // We deliberately do NOT match "(1)" — parenthesized numbers are
      // overwhelmingly used for embedded blanks (in notes/tables/summaries),
      // not as question numbers, and falsely matching them swallows
      // surrounding cell content into the question text.
      const numberedAt = (b, n) => {
        if (new RegExp('^\\s*\\(' + n + '\\)').test(b.text)) return false;
        return new RegExp('^\\s*\\[?' + n + '[\\.\\)\\]]?\\s+').test(b.text);
      };

      let firstQIdx = grpBlocks.findIndex((b, i) => i > 0 && numberedAt(b, grp.start));
      if (firstQIdx === -1) firstQIdx = grpBlocks.length;

      // ---- Embedded-blanks detection ----
      // If no block in this group starts with a numbered question, but the group's
      // text contains placeholders like "(7) ........" inline, this is a
      // "Complete the notes/table/summary" gap-fill style. Render the whole
      // notes block as the prompt and show numbered inputs below.
      const groupFullText = grpBlocks.slice(1).map(b => b.text).join(' ');
      let isEmbeddedBlanks = false;
      if (firstQIdx === grpBlocks.length) {
        const blankMarkers = [];
        // Match the blank that follows the number — regular dots (.....),
        // Unicode horizontal ellipsis (…), underscores (_____), or any
        // mix of these gap-filler characters.
        for (let n = grp.start; n <= grp.end; n++) {
          const re = new RegExp(
            '\\(' + n + '\\)\\s*[\\.\\u2026_]+|' +
            '\\b' + n + '\\s*[\\.\\u2026]{2,}'
          );
          if (re.test(groupFullText)) blankMarkers.push(n);
        }
        if (blankMarkers.length >= 2) isEmbeddedBlanks = true;
      }

      if (isEmbeddedBlanks) {
        // Render the full notes/table content (HTML preserved) as a single prompt
        const notesHTML = grpBlocks.slice(1)
          .map(b => {
            if (!b.el) return `<p>${escapeHTML(b.text)}</p>`;
            // Split <br>-blocks live in throwaway <div>s — re-wrap in <p>
            if (b.el.tagName === 'DIV') return `<p>${b.el.innerHTML}</p>`;
            return b.el.outerHTML;
          })
          .join('');

        html += `<div class="question-group">`;
        html += `<div class="question-group-title">${escapeHTML(grp.title)}</div>`;
        html += `<div class="question-group-instruction embedded-notes">${notesHTML}</div>`;

        for (let q = grp.start; q <= grp.end; q++) {
          const answer = answers[q] || '';
          html += `<div class="question-item" data-q="${q}" data-answer="${escapeAttr(answer)}">`;
          html += `<span class="question-number">${q}</span>`;
          html += `<div class="question-text">`;
          html += `<input type="text" class="answer-input" data-q="${q}" placeholder="Answer for (${q})...">`;
          html += `</div></div>`;
        }
        html += `</div>`;
        return; // continue forEach
      }

      // Instruction = blocks between title block (index 0) and first question
      const instructionBlocks = grpBlocks.slice(1, firstQIdx);
      const instructionText = instructionBlocks.map(b => b.text).join(' ');
      const instructionHTML = instructionBlocks.map(b => `<p>${escapeHTML(b.text)}</p>`).join('');

      // Walk ALL grpBlocks (after the title) to extract:
      //   - numbered questions   → qTexts[N]
      //   - "List of X" header   → enters list-collection mode
      //   - letter entries A./B. → matchingList (for List of People/etc.)
      //   - Roman numeral entries i/ii/iii… → matchingList (for List of Headings)
      //   - "Example…" lines     → skipped (don't pollute question text)
      //   - other blocks         → appended to current question text
      const qTexts = {};
      const matchingList = []; // [{letter, text}]
      let curQ = null;
      let curParts = [];
      let collectingList = false;

      const flush = () => {
        if (curQ !== null) {
          qTexts[curQ] = curParts.join(' ').replace(/\s+/g, ' ').trim();
        }
      };

      // Valid lowercase Roman numerals 1–30 (and a few uppercase variants)
      const ROMAN_RE = /^(i{1,3}|iv|v|vi{1,3}|ix|x|xi{1,3}|xiv|xv|xvi{1,3}|xix|xx|xxi{1,3}|xxiv|xxv|xxvi{1,3}|xxix|xxx)$/i;

      grpBlocks.slice(1).forEach(b => {
        // Skip worked-example hints between numbered questions in heading-match groups:
        //   "Example Answer", "Example:", "Example)", "Example  Paragraph A  vii"
        //   "Paragraph A  vii"  /  "Section D  ix"  (no explicit Example prefix)
        if (/^\s*Example\b/i.test(b.text)) return;
        if (/^\s*(Paragraph|Section|Passage)\s+[A-J]\s+[ivx]+\s*$/i.test(b.text)) return;
        // Skip site footer/watermark text like "Cambridge IELTS Test 1 to 17"
        if (/^\s*Cambridge\s+IELTS\s+Tests?\b/i.test(b.text)) return;

        // Numbered question start
        const numM = b.text.match(/^\s*[\(\[]?(\d{1,2})[\.\)\]]?\s+(.*)$/);
        if (numM) {
          const n = parseInt(numM[1]);
          if (n >= grp.start && n <= grp.end) {
            flush();
            curQ = n; curParts = numM[2] ? [numM[2]] : [];
            collectingList = false;
            return;
          }
        }

        // "List of X" header — switch to list-collection mode
        const headerM = b.text.match(/^\s*List\s+of\s+\w+/i);
        if (headerM) {
          flush();
          curQ = null;
          collectingList = true;
          const rest = b.text.replace(/^\s*List\s+of\s+\w+\s*[:.\-]?\s*/i, '');
          if (rest) {
            // Letter form
            const reA = /([A-H])[\.\)]\s+(.+?)(?=\s+[A-H][\.\)]\s|$)/g;
            let lm;
            while ((lm = reA.exec(rest)) !== null) {
              matchingList.push({ letter: lm[1], text: lm[2].trim() });
            }
            // Roman numeral form (only if no letter entries found inline)
            if (matchingList.length === 0) {
              const reR = /\b([ivx]+)\s+(.+?)(?=\s+[ivx]+\s+\S|$)/gi;
              let rm;
              while ((rm = reR.exec(rest)) !== null) {
                if (ROMAN_RE.test(rm[1])) {
                  matchingList.push({ letter: rm[1].toLowerCase(), text: rm[2].trim() });
                }
              }
            }
          }
          return;
        }

        // Single letter entry "A. text" or "A) text"
        const letM = b.text.match(/^\s*([A-H])[\.\)]\s+(.+)$/);
        if (letM) {
          if (collectingList || curQ === null || curQ === grp.end) {
            flush();
            curQ = null;
            collectingList = true;
            matchingList.push({ letter: letM[1], text: letM[2].trim() });
            return;
          }
        }

        // Roman numeral entry "i text" / "ii text" / "iv text" / "viii text"
        const romM = b.text.match(/^\s*([ivx]+)\s+(\S.+)$/i);
        if (romM && ROMAN_RE.test(romM[1])) {
          if (collectingList || curQ === null || curQ === grp.end) {
            flush();
            curQ = null;
            collectingList = true;
            matchingList.push({ letter: romM[1].toLowerCase(), text: romM[2].trim() });
            return;
          }
        }

        // Continuation of current numbered question
        if (curQ !== null) curParts.push(b.text);
      });
      flush();

      // ---- Split inline-mashed numbered questions ----
      // Source HTML sometimes lists "27 text 28.text 29.text" or even
      // "income15. examples" all in one paragraph without <br>. Split on
      // the next expected number using a permissive boundary: previous char
      // must NOT be a digit (so we don't break "1234"), and the number must
      // be followed by . or ) and then a letter (with optional whitespace).
      for (let q = grp.start; q <= grp.end; q++) {
        if (!qTexts[q]) continue;
        let txt = qTexts[q];
        let curN = q;
        while (curN < grp.end) {
          const nextN = curN + 1;
          if (qTexts[nextN]) break;
          const re = new RegExp('(?:^|[^0-9])(' + nextN + ')[\\.\\)]\\s*(?=[A-Za-z])');
          const mm = txt.match(re);
          if (mm) {
            // mm.index points at start of match; offset to start of number
            const numStart = mm.index + (mm[0].length - mm[1].length - 2); // back up over ". " or ")"
            // Simpler: find the actual number position
            const idxOfNum = txt.indexOf(mm[1], mm.index);
            const before = txt.substring(0, idxOfNum).trim();
            const after = txt.substring(idxOfNum)
              .replace(new RegExp('^' + nextN + '[\\.\\)]\\s*'), '').trim();
            qTexts[curN] = before;
            qTexts[nextN] = after;
            txt = after;
            curN = nextN;
          } else {
            break;
          }
        }
      }

      // ---- Strip trailing matching-list text from the last question ----
      // Only strip if followed by 2+ letter entries — avoids killing the prose
      // phrase "list of personal possessions" that's part of the question text.
      if (matchingList.length === 0 && qTexts[grp.end]) {
        let lastTxt = qTexts[grp.end];
        let trailStart = -1;
        // Pattern A: "List of X" header followed by "A. word B. word ..."
        const listHeaderM = lastTxt.match(/\bList\s+of\s+\w+\s+([A-H])[\.\)]\s/i);
        if (listHeaderM) {
          trailStart = listHeaderM.index;
        } else {
          const letters = [...lastTxt.matchAll(/\b([A-H])[\.\)]\s+\S/g)];
          if (letters.length >= 2) {
            for (let i = 0; i < letters.length - 1; i++) {
              if (letters[i+1][1].charCodeAt(0) === letters[i][1].charCodeAt(0) + 1) {
                trailStart = letters[i].index;
                break;
              }
            }
          }
        }
        if (trailStart > 0) {
          const trail = lastTxt.substring(trailStart)
            .replace(/^\s*List\s+of\s+\w+\s*[:.\-]?\s*/i, '');
          qTexts[grp.end] = lastTxt.substring(0, trailStart).trim();
          const re = /([A-H])[\.\)]\s+(.+?)(?=\s+[A-H][\.\)]\s|$)/g;
          let lm;
          while ((lm = re.exec(trail)) !== null) {
            matchingList.push({ letter: lm[1], text: lm[2].trim() });
          }
        }
      }

      // Detect question type from the instruction text + early question samples.
      // Use generous lookups so detection succeeds even when option lists wrap to new paragraphs.
      const detectionText = [
        instructionText,
        qBlocks.slice(0, 4).map(b => b.text).join(' ')
      ].join(' ');
      const isTFNG = /\bTRUE\b[\s\S]{0,300}\bFALSE\b[\s\S]{0,300}\bNOT\s*GIVEN\b/i.test(detectionText)
        || /statements?\s+agree\s+with\s+the\s+(information|claims|views)/i.test(detectionText) && /\bTRUE\b/i.test(detectionText);
      const isYNNG = !isTFNG && (/\bYES\b[\s\S]{0,300}\bNO\b[\s\S]{0,300}\bNOT\s*GIVEN\b/i.test(detectionText)
        || (/claims|views|opinions/i.test(detectionText) && /\bYES\b/i.test(detectionText) && /\bNOT\s*GIVEN\b/i.test(detectionText)));
      const isMC = /Choose\s+the\s+correct\s+letter/i.test(detectionText);
      const isMatching = /Match\s+each|List\s+of\s+People|list\s+of\s+(headings|theories|researchers|findings)/i.test(detectionText);
      const isSectionMatch = /Which\s+(section|paragraph)/i.test(detectionText);
      const isSentenceEnd = /Complete\s+each\s+sentence.*?ending/i.test(detectionText);

      html += `<div class="question-group">`;
      html += `<div class="question-group-title">${escapeHTML(grp.title)}</div>`;
      if (instructionHTML) {
        html += `<div class="question-group-instruction">${instructionHTML}</div>`;
      }

      // Render matching list (e.g., "List of People") above the question items.
      if (matchingList.length > 0) {
        html += `<div class="matching-list">`;
        html += `<div class="matching-list-title">List of options</div>`;
        html += `<ul class="matching-list-items">`;
        matchingList.forEach(item => {
          html += `<li><span class="ml-letter">${item.letter}</span> ${escapeHTML(item.text)}</li>`;
        });
        html += `</ul></div>`;
      }

      // Determine letters available in the dropdown for matching questions
      const availLetters = matchingList.length > 0
        ? matchingList.map(i => i.letter)
        : 'ABCDEFGH'.split('');

      for (let q = grp.start; q <= grp.end; q++) {
        const answer = answers[q] || '';
        let qText = qTexts[q] || '';

        // Strip trailing T/F/NG or Y/N/NG option text from question
        if (isTFNG) {
          qText = qText.replace(/\s*(TRUE|FALSE|NOT\s*GIVEN)(\s+(TRUE|FALSE|NOT\s*GIVEN))*\s*$/gi, '').trim();
        } else if (isYNNG) {
          qText = qText.replace(/\s*(YES|NO|NOT\s*GIVEN)(\s+(YES|NO|NOT\s*GIVEN))*\s*$/gi, '').trim();
        }
        // Convert dotted blanks to underscore line
        qText = qText.replace(/(?:\.{3,}|_{3,})/g, '_______').trim();

        // Multiple choice: extract A./B./C./D. options inline.
        // Handles two forms found in source HTML:
        //   - With period:    "stem... A. opt1 B. opt2 C. opt3 D. opt4"
        //   - Bare letter:    "stem... A opt1 B opt2 C opt3 D opt4"
        let mcOptions = [];
        if (isMC) {
          // 1) Try period/paren form first
          const optMatch = qText.match(/^(.*?)\s*(?=\bA[\.\)]\s)/s);
          if (optMatch && optMatch[1].length < qText.length) {
            const stem = optMatch[1].trim();
            const optPart = qText.substring(stem.length);
            const parts = optPart.split(/\b([A-E])[\.\)]\s*/);
            qText = stem;
            for (let i = 1; i < parts.length; i += 2) {
              mcOptions.push({ letter: parts[i], text: (parts[i + 1] || '').trim() });
            }
          }
          // 2) Bare-letter fallback: find positions where A, B, C (and D, E)
          //    appear as standalone single letters in sequence
          if (mcOptions.length === 0) {
            const positionsOf = (letter) => {
              const re = new RegExp('(^|\\s)' + letter + '(\\s+\\S)', 'g');
              const out = []; let m;
              while ((m = re.exec(qText)) !== null) {
                out.push(m.index + (m[1] ? m[1].length : 0));
              }
              return out;
            };
            const aP = positionsOf('A'), bP = positionsOf('B'),
                  cP = positionsOf('C'), dP = positionsOf('D'), eP = positionsOf('E');
            for (let i = aP.length - 1; i >= 0; i--) {
              const a = aP[i];
              const b = bP.find(p => p > a); if (!b) continue;
              const c = cP.find(p => p > b); if (!c) continue;
              const d = dP.find(p => p > c);
              const e = eP.find(p => p > (d || c));
              const seq = [{ letter: 'A', pos: a }, { letter: 'B', pos: b }, { letter: 'C', pos: c }];
              if (d) seq.push({ letter: 'D', pos: d });
              if (e) seq.push({ letter: 'E', pos: e });
              const stem = qText.slice(0, a).trim();
              const opts = [];
              for (let k = 0; k < seq.length; k++) {
                const start = seq[k].pos + 2; // skip "A " (letter + space)
                const end = (k + 1 < seq.length) ? seq[k+1].pos : qText.length;
                opts.push({ letter: seq[k].letter, text: qText.substring(start, end).trim() });
              }
              if (opts.length >= 3) {
                qText = stem;
                mcOptions = opts;
                break;
              }
            }
          }
        }

        html += `<div class="question-item" data-q="${q}" data-answer="${escapeAttr(answer)}">`;
        html += `<span class="question-number">${q}</span>`;
        html += `<div class="question-text">`;

        // ALWAYS render the statement (even if empty, render placeholder to keep layout)
        const statementHTML = qText
          ? escapeHTML(qText)
          : `<em style="color:var(--text-muted);">(question text unavailable)</em>`;
        html += `<div class="q-statement">${statementHTML}</div>`;

        if (isTFNG) {
          html += `<div class="answer-options">`;
          ['TRUE', 'FALSE', 'NOT GIVEN'].forEach(opt => {
            html += `<label class="answer-option"><input type="radio" name="q${q}" value="${opt}"> ${opt}</label>`;
          });
          html += `</div>`;
        } else if (isYNNG) {
          html += `<div class="answer-options">`;
          ['YES', 'NO', 'NOT GIVEN'].forEach(opt => {
            html += `<label class="answer-option"><input type="radio" name="q${q}" value="${opt}"> ${opt}</label>`;
          });
          html += `</div>`;
        } else if (isMC && mcOptions.length > 0) {
          html += `<div class="answer-options">`;
          mcOptions.forEach(opt => {
            html += `<label class="answer-option"><input type="radio" name="q${q}" value="${opt.letter}"> ${opt.letter}. ${escapeHTML(opt.text)}</label>`;
          });
          html += `</div>`;
        } else if (isSectionMatch || isMatching || isSentenceEnd) {
          html += ` <select class="answer-select" data-q="${q}"><option value="">Select</option>`;
          availLetters.forEach(l => { html += `<option value="${l}">${l}</option>`; });
          html += `</select>`;
        } else {
          // Fill in blank
          html += ` <input type="text" class="answer-input" data-q="${q}" placeholder="Your answer...">`;
        }

        html += `</div></div>`;
      }
      html += `</div>`;
    });

    html += buildAnswerBar(answers);
    return html;
  }

  function escapeHTML(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function escapeAttr(s) {
    return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function buildAnswerBar(answers) {
    const total = Object.keys(answers).length;
    return `
      <div class="check-answers-bar">
        <button class="btn-check-answers" id="btn-check-answers">Check Answers</button>
        <button class="btn-reset-answers" id="btn-reset-answers">Reset</button>
        <span class="score-display" id="score-display"></span>
      </div>
    `;
  }

  // ---- Bind Split Divider ----
  function bindSplitDivider() {
    const divider = document.getElementById('split-divider');
    const passage = document.getElementById('split-passage');
    const questions = document.getElementById('split-questions');
    let isDragging = false;

    divider.addEventListener('mousedown', (e) => {
      isDragging = true;
      divider.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const container = testSplit;
      const rect = container.getBoundingClientRect();
      const offset = e.clientX - rect.left;
      const pct = (offset / rect.width) * 100;
      if (pct > 20 && pct < 80) {
        passage.style.flex = 'none';
        passage.style.width = pct + '%';
        questions.style.flex = '1';
      }
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        divider.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  // ---- Bind Answer Checking ----
  function bindAnswerChecking() {
    // Radio option selection styling
    questionsContent.querySelectorAll('.answer-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const radio = opt.querySelector('input[type="radio"]');
        if (radio) {
          radio.checked = true;
          const name = radio.name;
          document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
            r.closest('.answer-option').classList.remove('selected');
          });
          opt.classList.add('selected');
        }
      });
    });

    const checkBtn = document.getElementById('btn-check-answers');
    const resetBtn = document.getElementById('btn-reset-answers');
    const scoreDisplay = document.getElementById('score-display');

    if (checkBtn) {
      checkBtn.addEventListener('click', () => {
        let correct = 0, total = 0;
        questionsContent.querySelectorAll('.question-item[data-answer]').forEach(item => {
          const q = item.dataset.q;
          const expected = (item.dataset.answer || '').toLowerCase().trim();
          if (!expected) return;
          total++;

          let userAnswer = '';
          const radio = item.querySelector('input[type="radio"]:checked');
          const input = item.querySelector('.answer-input');
          const select = item.querySelector('.answer-select');
          if (radio) userAnswer = radio.value.toLowerCase().trim();
          else if (input) userAnswer = input.value.toLowerCase().trim();
          else if (select) userAnswer = select.value.toLowerCase().trim();

          const isCorrect = userAnswer === expected;
          if (isCorrect) correct++;

          // Visual feedback
          if (radio) {
            item.querySelectorAll('.answer-option').forEach(opt => {
              const r = opt.querySelector('input[type="radio"]');
              opt.classList.remove('correct-option', 'incorrect-option');
              if (r && r.value.toLowerCase().trim() === expected) opt.classList.add('correct-option');
              else if (r && r.checked && !isCorrect) opt.classList.add('incorrect-option');
            });
          } else if (input) {
            input.classList.remove('correct', 'incorrect');
            input.classList.add(isCorrect ? 'correct' : 'incorrect');
            if (!isCorrect) input.title = `Correct: ${item.dataset.answer}`;
          } else if (select) {
            select.style.borderColor = isCorrect ? '#2b8a3e' : '#e03131';
            select.style.background = isCorrect ? '#ebfbee' : '#fff5f5';
            if (!isCorrect) select.title = `Correct: ${item.dataset.answer}`;
          }
        });
        if (scoreDisplay) scoreDisplay.textContent = `Score: ${correct} / ${total}`;
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        questionsContent.querySelectorAll('.answer-input').forEach(i => {
          i.value = ''; i.className = 'answer-input'; i.title = '';
        });
        questionsContent.querySelectorAll('input[type="radio"]').forEach(r => { r.checked = false; });
        questionsContent.querySelectorAll('.answer-option').forEach(o => {
          o.classList.remove('selected', 'correct-option', 'incorrect-option');
        });
        questionsContent.querySelectorAll('.answer-select').forEach(s => {
          s.value = ''; s.style.borderColor = ''; s.style.background = ''; s.title = '';
        });
        if (scoreDisplay) scoreDisplay.textContent = '';
      });
    }
  }

  // ---- Parse Test Content (listening/writing — single pane) ----
  function parseTestContent(html, type, testInfo) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Extract audio URLs from the page BEFORE removing elements
    let audioUrls = [];
    // Find direct .mp3 links
    doc.querySelectorAll('a[href*=".mp3"]').forEach(a => {
      audioUrls.push(a.href);
    });
    // Find audio source elements
    doc.querySelectorAll('audio source, audio[src]').forEach(el => {
      const src = el.getAttribute('src') || el.src;
      if (src) audioUrls.push(src);
    });
    // Find links to audio in text
    const mp3Match = html.match(/https?:\/\/[^\s"'<>]+\.mp3/gi);
    if (mp3Match) {
      mp3Match.forEach(u => {
        if (!audioUrls.includes(u)) audioUrls.push(u);
      });
    }

    // Remove unwanted elements
    const removeSelectors = [
      'script', 'style', 'header', 'footer', 'nav',
      '.social-share', '.post-navigation', '.comments',
      '.sidebar', 'ins', '.adsbygoogle', '.entry-meta',
      '.post-meta', '.breadcrumbs', '.related-posts',
      '.sharedaddy', '.jp-relatedposts', '.wpulike',
      '.entry-footer', '.author-info', '.post-tags',
      'iframe[src*="youtube"]', 'iframe[src*="google"]',
      '.cookie', '.popup', '#cookie', '.gdpr',
      'noscript', '.noprint'
    ];
    removeSelectors.forEach(sel => {
      try { doc.querySelectorAll(sel).forEach(el => el.remove()); } catch(e) {}
    });

    // Try to find main content area
    let contentEl = doc.querySelector('.entry-content') ||
                    doc.querySelector('.post-content') ||
                    doc.querySelector('article .content') ||
                    doc.querySelector('article') ||
                    doc.querySelector('.content-area') ||
                    doc.querySelector('main');

    if (!contentEl) contentEl = doc.body;
    if (!contentEl) return '<p>Could not parse test content.</p>';

    let rawHTML = contentEl.innerHTML;

    // Clean up ad-related scripts and insertions
    rawHTML = rawHTML.replace(/\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\(\{[^}]*\}\);?/g, '');
    rawHTML = rawHTML.replace(/<ins[^>]*class="adsbygoogle"[^>]*>[\s\S]*?<\/ins>/gi, '');
    rawHTML = rawHTML.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    rawHTML = rawHTML.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    rawHTML = rawHTML.replace(/<p>\s*<\/p>/gi, '');
    rawHTML = rawHTML.replace(/Share this:[\s\S]*?<\/div>/gi, '');
    rawHTML = rawHTML.replace(/Like this:[\s\S]*?<\/div>/gi, '');

    // For listening tests, convert any bare .mp3 links in content to audio players
    if (type === 'listening') {
      rawHTML = rawHTML.replace(
        /<a[^>]*href="([^"]*\.mp3)"[^>]*>[^<]*<\/a>/gi,
        ''
      );
    }

    // --- Fix images: lazy-loading, relative URLs, proxy through wsrv.nl ---
    const tempDoc = new DOMParser().parseFromString('<div>' + rawHTML + '</div>', 'text/html');
    const tempRoot = tempDoc.body.firstChild;

    tempRoot.querySelectorAll('img').forEach(img => {
      // Convert data-src / data-lazy-src to src (lazy loading fix)
      const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original');
      if (dataSrc && (!img.src || img.src.includes('data:') || img.src.includes('placeholder'))) {
        img.setAttribute('src', dataSrc);
      }

      // Make relative URLs absolute
      let src = img.getAttribute('src') || '';
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        src = 'https://practicepteonline.com' + (src.startsWith('/') ? '' : '/') + src;
        img.setAttribute('src', src);
      }

      // Remove problematic attributes
      img.removeAttribute('srcset');
      img.removeAttribute('data-srcset');
      img.removeAttribute('data-src');
      img.removeAttribute('data-lazy-src');
      img.removeAttribute('loading');
      img.removeAttribute('crossorigin');

      // Route through wsrv.nl image proxy to bypass CORS/hotlink restrictions
      src = img.getAttribute('src') || '';
      if (src && src.startsWith('http') && !src.includes('wsrv.nl')) {
        img.setAttribute('src', `https://wsrv.nl/?url=${encodeURIComponent(src)}`);
      }
    });

    // Wrap tables in responsive wrappers
    tempRoot.querySelectorAll('table').forEach(table => {
      const wrapper = tempDoc.createElement('div');
      wrapper.className = 'table-wrapper';
      table.parentNode.insertBefore(wrapper, table);
      wrapper.appendChild(table);
    });

    rawHTML = tempRoot.innerHTML;

    let output = '';

    // Inject audio player for listening tests
    if (type === 'listening') {
      // Build audio URL - prefer from data, fallback to extracted
      let audioSrc = null;
      if (testInfo && testInfo.audio) {
        audioSrc = `https://practicepteonline.com/wp-content/uploads/audio/${testInfo.audio}.mp3`;
      } else if (audioUrls.length > 0) {
        audioSrc = audioUrls[0];
      }

      if (audioSrc) {
        output += `
          <div class="audio-wrapper">
            <label>🎧 Listening Audio</label>
            <audio controls preload="metadata" class="ielts-audio-player" style="width:100%;">
              <source src="${audioSrc}" type="audio/mpeg">
              Your browser does not support audio. <a href="${audioSrc}" target="_blank">Download audio</a>
            </audio>
          </div>
        `;
      }
    }

    output += `<div class="parsed-test-content">`;
    output += rawHTML;
    output += '</div>';

    return output;
  }

  // ---- Toolbar Binding ----
  function bindToolbar() {
    const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
    toolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        const color = btn.dataset.color;

        // Deactivate all tool buttons
        toolBtns.forEach(b => b.classList.remove('active'));

        if (tool === 'cursor') {
          currentTool = 'cursor';
          currentColor = null;
          btn.classList.add('active');
        } else if (tool === 'highlight') {
          currentTool = 'highlight';
          currentColor = color;
          btn.classList.add('active');
        } else if (tool === 'underline') {
          currentTool = 'underline';
          currentColor = null;
          btn.classList.add('active');
        } else if (tool === 'strikethrough') {
          currentTool = 'strikethrough';
          currentColor = null;
          btn.classList.add('active');
        } else if (tool === 'draw') {
          currentTool = 'draw';
          currentColor = null;
          btn.classList.add('active');
          enableDrawCanvas(false);
        } else if (tool === 'eraser') {
          currentTool = 'eraser';
          currentColor = null;
          btn.classList.add('active');
          enableDrawCanvas(true);
        }

        // Disable canvas when switching to non-draw tools
        if (tool !== 'draw' && tool !== 'eraser') {
          disableDrawCanvas();
        }

        // Update cursor style
        updateCursor();
      });
    });

    // Clear all marks
    toolClear.addEventListener('click', () => {
      if (confirm('Clear all highlights and marks?')) {
        clearAllMarks();
      }
    });

    // Toggle answers
    toolAnswers.addEventListener('click', () => {
      answersVisible = !answersVisible;
      toolAnswers.classList.toggle('active', answersVisible);
      const answerContainers = testContent.querySelectorAll('.answers-container');
      answerContainers.forEach(c => c.classList.toggle('visible', answersVisible));
      const answerKeys = testContent.querySelectorAll('.answer-key');
      answerKeys.forEach(k => k.classList.toggle('visible', answersVisible));
      const explanations = testContent.querySelectorAll('.explanations-container');
      explanations.forEach(e => e.classList.toggle('visible', answersVisible));
    });

    // Text selection for marking
    document.addEventListener('mouseup', handleTextSelection);
    document.addEventListener('touchend', handleTextSelection);
  }

  function updateCursor() {
    const cursorStyle = currentTool === 'cursor' ? 'text' : 'crosshair';
    [testContent, passageContent, questionsContent].forEach(el => {
      if (el) el.style.cursor = cursorStyle;
    });
  }

  function handleTextSelection(e) {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      contextMenu.style.display = 'none';
      return;
    }

    // Check if selection is within any content area (single-pane or split-pane)
    const range = selection.getRangeAt(0);
    const ancestor = range.commonAncestorContainer;
    const inContent = (testContent && testContent.contains(ancestor)) ||
                      (passageContent && passageContent.contains(ancestor)) ||
                      (questionsContent && questionsContent.contains(ancestor));
    if (!inContent) return;

    if (currentTool === 'cursor') {
      showContextMenu(e, selection);
    } else {
      applyMark(selection, currentTool, currentColor);
    }
  }

  function showContextMenu(e, selection) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    contextMenu.style.display = 'flex';
    contextMenu.style.left = `${rect.left + rect.width / 2 - 120}px`;
    contextMenu.style.top = `${rect.top - 44}px`;

    // Prevent going off screen
    const cmRect = contextMenu.getBoundingClientRect();
    if (cmRect.left < 8) contextMenu.style.left = '8px';
    if (cmRect.top < 60) {
      contextMenu.style.top = `${rect.bottom + 8}px`;
    }
  }

  function bindContextMenu() {
    contextMenu.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const action = btn.dataset.action;
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
          contextMenu.style.display = 'none';
          return;
        }

        if (action === 'remove') {
          removeMarksFromSelection(selection);
        } else if (action.startsWith('highlight-')) {
          const colorMap = {
            'highlight-yellow': '#ffe066',
            'highlight-green': '#69db7c',
            'highlight-blue': '#74c0fc',
            'highlight-pink': '#ffa8a8'
          };
          applyMark(selection, 'highlight', colorMap[action]);
        } else if (action === 'underline') {
          applyMark(selection, 'underline');
        } else if (action === 'strikethrough') {
          applyMark(selection, 'strikethrough');
        }

        contextMenu.style.display = 'none';
      });
    });

    // Hide context menu on click elsewhere
    document.addEventListener('mousedown', (e) => {
      if (!contextMenu.contains(e.target)) {
        contextMenu.style.display = 'none';
      }
    });
  }

  // ---- Marking Functions ----
  function applyMark(selection, tool, color) {
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);

    // Don't apply inside inputs
    if (range.commonAncestorContainer.closest && range.commonAncestorContainer.closest('input, textarea')) return;

    try {
      const span = document.createElement('span');
      if (tool === 'highlight') {
        span.className = 'ielts-highlight';
        span.style.backgroundColor = color;
        span.style.color = '#1a1a2e';
      } else if (tool === 'underline') {
        span.className = 'ielts-underline';
      } else if (tool === 'strikethrough') {
        span.className = 'ielts-strikethrough';
      }

      // Click to remove
      span.addEventListener('click', function (e) {
        if (currentTool === 'cursor') {
          e.stopPropagation();
          const parent = this.parentNode;
          while (this.firstChild) {
            parent.insertBefore(this.firstChild, this);
          }
          parent.removeChild(this);
          parent.normalize();
        }
      });

      range.surroundContents(span);
      selection.removeAllRanges();
    } catch (e) {
      // surroundContents can fail on partial element selections
      // Fall back to extracting text nodes
      try {
        const fragment = range.extractContents();
        const span = document.createElement('span');
        if (tool === 'highlight') {
          span.className = 'ielts-highlight';
          span.style.backgroundColor = color;
          span.style.color = '#1a1a2e';
        } else if (tool === 'underline') {
          span.className = 'ielts-underline';
        } else if (tool === 'strikethrough') {
          span.className = 'ielts-strikethrough';
        }
        span.appendChild(fragment);
        span.addEventListener('click', function (ev) {
          if (currentTool === 'cursor') {
            ev.stopPropagation();
            const parent = this.parentNode;
            while (this.firstChild) {
              parent.insertBefore(this.firstChild, this);
            }
            parent.removeChild(this);
            parent.normalize();
          }
        });
        range.insertNode(span);
        selection.removeAllRanges();
      } catch (e2) {
        console.warn('Could not apply mark:', e2);
      }
    }

    contextMenu.style.display = 'none';
  }

  function removeMarksFromSelection(selection) {
    if (!selection || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const parent = container.nodeType === 3 ? container.parentElement : container;

    const marks = parent.querySelectorAll('.ielts-highlight, .ielts-underline, .ielts-strikethrough');
    marks.forEach(mark => {
      const p = mark.parentNode;
      while (mark.firstChild) {
        p.insertBefore(mark.firstChild, mark);
      }
      p.removeChild(mark);
      p.normalize();
    });

    selection.removeAllRanges();
  }

  function clearAllMarks() {
    [testContent, passageContent, questionsContent].forEach(container => {
      if (!container) return;
      container.querySelectorAll('.ielts-highlight, .ielts-underline, .ielts-strikethrough').forEach(mark => {
        const parent = mark.parentNode;
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
        parent.removeChild(mark);
        parent.normalize();
      });
    });
  }

  // ---- Timer ----
  function bindTimer() {
    timerStartBtn.addEventListener('click', toggleTimer);
    timerResetBtn.addEventListener('click', resetTimer);
    updateTimerDisplay();
  }

  function toggleTimer() {
    if (timerRunning) {
      clearInterval(timerInterval);
      timerRunning = false;
      timerStartBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>';
    } else {
      timerRunning = true;
      timerStartBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
      timerInterval = setInterval(() => {
        timerSeconds--;
        if (timerSeconds <= 0) {
          timerSeconds = 0;
          clearInterval(timerInterval);
          timerRunning = false;
          timerDisplay.classList.add('danger');
          alert('⏰ Time is up! Your 60 minutes are over.');
        }
        updateTimerDisplay();
      }, 1000);
    }
  }

  function resetTimer() {
    clearInterval(timerInterval);
    timerRunning = false;
    timerSeconds = 3600;
    timerDisplay.className = 'timer-display';
    timerStartBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5,3 19,12 5,21"/></svg>';
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const mins = Math.floor(timerSeconds / 60);
    const secs = timerSeconds % 60;
    timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    if (timerSeconds <= 300 && timerSeconds > 60) {
      timerDisplay.className = 'timer-display warning';
    } else if (timerSeconds <= 60) {
      timerDisplay.className = 'timer-display danger';
    }
  }

  // ===== DRAWING CANVAS ENGINE =====
  const drawCanvas = document.getElementById('draw-canvas');
  const drawCtx = drawCanvas.getContext('2d');
  const drawColorInput = document.getElementById('draw-color');
  const drawSizeSelect = document.getElementById('draw-size');
  const drawClearBtn = document.getElementById('draw-clear');
  const mainContent = document.getElementById('main-content');
  let isDrawing = false;
  let drawMode = false;
  let eraserMode = false;

  function resizeCanvas() {
    // Fixed viewport overlay — match viewport size
    const headerH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 56;
    const w = window.innerWidth;
    const h = window.innerHeight - headerH;
    // Save drawing
    let savedData = null;
    try {
      if (drawCanvas.width > 0 && drawCanvas.height > 0) {
        savedData = drawCtx.getImageData(0, 0, drawCanvas.width, drawCanvas.height);
      }
    } catch(e) {}
    drawCanvas.width = w;
    drawCanvas.height = h;
    // Restore
    if (savedData) {
      drawCtx.putImageData(savedData, 0, 0);
    }
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  function enableDrawCanvas(eraser) {
    drawMode = true;
    eraserMode = eraser;
    document.body.classList.add('draw-mode');
    resizeCanvas(); // update size before drawing
    if (eraser) {
      drawCanvas.classList.remove('active');
      drawCanvas.classList.add('eraser-active');
    } else {
      drawCanvas.classList.remove('eraser-active');
      drawCanvas.classList.add('active');
    }
  }

  function disableDrawCanvas() {
    drawMode = false;
    eraserMode = false;
    isDrawing = false;
    document.body.classList.remove('draw-mode');
    drawCanvas.classList.remove('active', 'eraser-active');
  }

  // Get coordinates relative to the canvas
  function getCanvasCoords(e) {
    const rect = drawCanvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  // Mouse events
  drawCanvas.addEventListener('mousedown', (e) => {
    if (!drawMode) return;
    isDrawing = true;
    const pos = getCanvasCoords(e);
    drawCtx.beginPath();
    drawCtx.moveTo(pos.x, pos.y);
  });

  drawCanvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || !drawMode) return;
    const pos = getCanvasCoords(e);

    drawCtx.lineWidth = parseInt(drawSizeSelect.value);
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';

    if (eraserMode) {
      drawCtx.globalCompositeOperation = 'destination-out';
      drawCtx.lineWidth = parseInt(drawSizeSelect.value) * 4;
      drawCtx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      drawCtx.globalCompositeOperation = 'source-over';
      drawCtx.strokeStyle = drawColorInput.value;
    }

    drawCtx.lineTo(pos.x, pos.y);
    drawCtx.stroke();
  });

  drawCanvas.addEventListener('mouseup', () => { isDrawing = false; });
  drawCanvas.addEventListener('mouseleave', () => { isDrawing = false; });

  // Touch events
  drawCanvas.addEventListener('touchstart', (e) => {
    if (!drawMode) return;
    e.preventDefault();
    isDrawing = true;
    const touch = e.touches[0];
    const pos = getCanvasCoords(touch);
    drawCtx.beginPath();
    drawCtx.moveTo(pos.x, pos.y);
  }, { passive: false });

  drawCanvas.addEventListener('touchmove', (e) => {
    if (!isDrawing || !drawMode) return;
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getCanvasCoords(touch);

    drawCtx.lineWidth = parseInt(drawSizeSelect.value);
    drawCtx.lineCap = 'round';
    drawCtx.lineJoin = 'round';

    if (eraserMode) {
      drawCtx.globalCompositeOperation = 'destination-out';
      drawCtx.lineWidth = parseInt(drawSizeSelect.value) * 4;
      drawCtx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      drawCtx.globalCompositeOperation = 'source-over';
      drawCtx.strokeStyle = drawColorInput.value;
    }

    drawCtx.lineTo(pos.x, pos.y);
    drawCtx.stroke();
  }, { passive: false });

  drawCanvas.addEventListener('touchend', () => { isDrawing = false; });

  // Clear drawing
  drawClearBtn.addEventListener('click', () => {
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  });

  // Escape exits draw mode
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawMode) {
      disableDrawCanvas();
      document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
      document.getElementById('tool-cursor').classList.add('active');
      currentTool = 'cursor';
      updateCursor();
    }
  });

  // ---- Start ----
  init();
})();
