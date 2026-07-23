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

  // In-memory cache of fetched test HTML (keyed by source URL) so re-opening a
  // test in the same session is instant — no network at all.
  const contentCache = new Map();
  // Derive the local pre-bundled content path from a source URL:
  // https://practicepteonline.com/ielts-reading-test-27/ -> content/ielts-reading-test-27.html
  function localContentPath(url) {
    const slug = String(url).replace(/[\/#?]+$/, '').split('/').pop();
    return slug ? `content/${slug}.html` : null;
  }

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
  let ensureDrawCanvases = null; // set up by the drawing engine; re-attaches pane canvases
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

    let html = null;
    let lastError = null;

    // 1) In-memory cache — instant on repeat opens within a session.
    if (contentCache.has(url)) {
      html = contentCache.get(url);
    }

    // 2) Local pre-bundled content — served by the CDN/host, fast and with no
    //    per-user rate limit, so many people can use the app at once. Falls back
    //    to the live proxies below only when a test hasn't been bundled.
    if (!html) {
      const localPath = localContentPath(url);
      if (localPath) {
        try {
          const r = await fetch(localPath);
          if (r.ok) {
            const text = await r.text();
            if (text && text.length > 250) html = text;
          }
        } catch (err) { /* not bundled — fall through to proxies */ }
      }
    }

    // 3) Live fetch via CORS proxies (fallback for un-bundled tests).
    if (!html) {
      const proxies = [
        (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
        (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u) => `https://thingproxy.freeboard.io/fetch/${u}`
      ];
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
    }

    if (html) contentCache.set(url, html);

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
          // New content height — re-attach/resize drawing canvases if active.
          if (ensureDrawCanvases) setTimeout(ensureDrawCanvases, 50);
        } catch (err) {
          console.error("Parse error:", err);
          loadingSpinner.innerHTML = `
            <div style="text-align:center; padding: 40px;">
              <p style="color: #ff6b6b; font-size: 1rem; margin-bottom: 12px;">Error parsing test content</p>
              <p style="color: var(--text-muted); font-size: 0.85rem;">${err.message}</p>
            </div>
          `;
        }
      } else if (type === 'writing') {
        const content = parseWritingContent(html, testInfo);
        testContent.innerHTML = content || '<p style="padding:20px">Could not parse writing test.</p>';
        testContent.style.display = 'block';
        loadingSpinner.style.display = 'none';
        testBody.style.display = 'block';
        testSplit.style.display = 'none';
        testContainer.classList.remove('split-active');
        bindWritingTest();
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

    // Fix images (diagrams, charts, tables-as-images) so they load in BOTH
    // panes: resolve lazy-load attributes, make URLs absolute, and route
    // through the wsrv.nl proxy to bypass hotlink protection.
    root.querySelectorAll('img').forEach(img => {
      const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original');
      const curSrc = img.getAttribute('src') || '';
      if (dataSrc && (!curSrc || curSrc.includes('data:') || curSrc.includes('placeholder'))) {
        img.setAttribute('src', dataSrc);
      }
      let src = img.getAttribute('src') || '';
      if (src && !src.startsWith('http') && !src.startsWith('data:')) {
        src = 'https://practicepteonline.com' + (src.startsWith('/') ? '' : '/') + src;
        img.setAttribute('src', src);
      }
      ['srcset', 'data-srcset', 'data-src', 'data-lazy-src', 'loading', 'crossorigin', 'width', 'height']
        .forEach(a => img.removeAttribute(a));
      src = img.getAttribute('src') || '';
      if (src && src.startsWith('http') && !src.includes('wsrv.nl')) {
        img.setAttribute('src', `https://wsrv.nl/?url=${encodeURIComponent(src)}`);
      }
    });

    // Every block in original order, tagged with which pane it belongs to.
    // Kept as objects so a misclassified block can be re-tagged later
    // (e.g. a passage title swept into the question side).
    const contentEntries = []; // {html, text, q, hasImg}
    let inQuestions = false;
    let reachedAnswers = false;
    let lastQuestionEnd = 0;    // highest question number we've seen so far
    let groupEnd = 0;           // end number of the current question group
    let maxSeenQ = 0;           // highest question/blank number seen in this group
    let chooseEndLetter = null; // "Choose TWO letters, A-E" → 'E'
    let lettersDone = false;    // that final option letter has appeared
    let groupImgSeen = false;   // group contains an image (diagram labelling)
    let singleQGroup = false;   // header was singular "Question N" (no range)

    // Some tests wrap the ENTIRE test (all passages + questions) in one giant
    // <div>, so root.children would be a single block and nothing could be
    // separated. Descend into container divs that hold multiple block-level
    // children to recover a flat list of real blocks. Tests whose blocks are
    // already direct <p>/<h*> children are unaffected (we never descend into
    // a <p>, <table>, etc.).
    function flattenBlocks(parent) {
      const out = [];
      Array.from(parent.children).forEach(ch => {
        const tag = (ch.tagName || '').toLowerCase();
        if (tag === 'div' || tag === 'section' || tag === 'article') {
          const blockKids = Array.from(ch.children).filter(c =>
            /^(p|h[1-6]|div|section|article|table|figure|ul|ol|blockquote|img)$/i.test(c.tagName || ''));
          if (blockKids.length >= 2) {
            out.push(...flattenBlocks(ch));
            return;
          }
        }
        out.push(ch);
      });
      return out;
    }
    const children = flattenBlocks(root);

    // Helper: does this element look like the start of a new passage?
    function looksLikeNewPassageStart(el, text) {
      const t = text.trim();
      if (!t) return false;
      // Gap-fill markers ("(32) ……", "______") mean question content (summary/
      // notes/table completion), never a passage start
      if (/[.…_]{4,}/.test(t)) return false;
      if (/\(\d{1,2}\)\s*[.…_]/.test(t)) return false;
      // Skip blocks that are obviously question-related
      if (/Questions?\s+\d/i.test(t)) return false;
      if (/^\s*[\(\[]?\d{1,2}[\.\)\]]?\s+\S/.test(t)) return false;
      if (/^(Choose|Match|Complete|Write|Look at|Do the following|Which|Using)\b/i.test(t)) return false;
      // Instruction sentences that merely mention the passage
      // ("Reading Passage 3 has eight paragraphs, A-H. Which paragraph…")
      if (/\bhas\s+\w+\s+(paragraphs|sections)\b/i.test(t)) return false;
      if (/answer\s+sheet|in\s+boxes\s+\d/i.test(t)) return false;

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
      // Summary/notes bodies contain gap markers — they are question content
      if (/[.…_]{4,}/.test(t)) return false;
      if (/\(\d{1,2}\)\s*[.…_]/.test(t)) return false;
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

    // Index of the LAST block that opens a question group. The ambiguous
    // answer-key heuristics below must never fire BEFORE this point — a
    // matching-headings list like "1. Paragraph A2. Paragraph B3. Paragraph C"
    // looks exactly like a concatenated answer key but is real question
    // content with more "Questions N-M" groups still to come.
    let lastQHeaderIdx = -1;
    children.forEach((c, ci) => {
      const ct = (c.textContent || '');
      if (/Questions?\s+\d{1,2}\s*[-–—]\s*\d{1,2}/i.test(ct) ||
          /Questions?\s+\d{1,2}\s+and\s+\d{1,2}/i.test(ct)) {
        lastQHeaderIdx = ci;
      }
    });

    for (let ci = 0; ci < children.length; ci++) {
      const topEl = children[ci];
      const wholeText = ((topEl.textContent || '')).trim();
      const pastLastGroup = ci > lastQHeaderIdx;

      // Detect answer/explanation section — stop processing. Checked on the
      // WHOLE element (before any <br>-splitting) so the concatenated
      // answer-key pattern can't be broken apart and missed.
      if (/^Explanations?:/i.test(wholeText) ||
          /^Questions?\s+\d+[\s-]+\d+\s+are\s+of/i.test(wholeText)) {
        reachedAnswers = true;
      }
      // "Show Answers" / "Answer Key" / "Answers:" marker (often a standalone block)
      if (/^(?:Show\s+)?Answers?(?:\s+Key)?:?\s*$/i.test(wholeText)) {
        reachedAnswers = true;
      }
      // Concatenated answer block ("1. tomatoes2. urban centres3. energy..."
      // or "1. False\n2. True\n...") — three sequential numbered short items.
      // Only valid AFTER the final question group, else it catches matching
      // lists ("1. Paragraph A2. Paragraph B…").
      if (pastLastGroup &&
          /^\s*1\s*[\.\)]\s*\S[^]{0,40}?\s*2\s*[\.\)]\s*\S[^]{0,40}?\s*3\s*[\.\)]\s*\S/.test(wholeText)) {
        reachedAnswers = true;
      }
      // Single-line "1. True/False/..." answer block
      if (pastLastGroup &&
          /^\s*1\.\s*(True|False|Not\s*Given|Yes|No)\b/im.test(topEl.textContent || '') && wholeText.length < 20) {
        reachedAnswers = true;
      }
      if (reachedAnswers) continue;

      // "Cambridge IELTS Tests 1 to 17" is a watermark this site prints
      // between every passage — a reliable separator. Drop it AND use it to
      // end the current question group so the next passage's title and prose
      // flip back to the passage pane instead of leaking into the questions.
      if (/^Cambridge\s+IELTS\s+Tests?\b/i.test(wholeText) && wholeText.length < 80) {
        inQuestions = false;
        continue;
      }

      // A question-zone <p> often glues many lines with <br>: the group
      // header, statements, options — and sometimes the START OF THE NEXT
      // PASSAGE. Split those so each line is classified on its own;
      // ordinary passage paragraphs are left intact.
      let parts = [topEl];
      if (topEl.querySelector && topEl.querySelector('br') &&
          (inQuestions || /Questions?\s+\d/i.test(wholeText))) {
        const segs = topEl.innerHTML.split(/<br\s*\/?>/i);
        if (segs.length > 1) {
          const segEls = [];
          segs.forEach(seg => {
            const tmp = tmpDoc.createElement('p');
            tmp.innerHTML = seg;
            if ((tmp.textContent || '').trim() || tmp.querySelector('img')) segEls.push(tmp);
          });
          if (segEls.length) parts = segEls;
        }
      }

      for (const el of parts) {
      const text = el.textContent || '';
      const tt = text.trim();

      // Check if this element starts a NEW question section.
      // Match "Questions X-Y" range, "Questions X and Y" pair, or singular "Question X".
      const qGroupMatch = text.match(/Questions?\s+(\d{1,2})\s*[-–—]\s*(\d{1,2})/i)
        || text.match(/Questions?\s+(\d{1,2})\s+and\s+(\d{1,2})/i)
        || text.match(/(?:^|\b)Question\s+(\d{1,2})(?!\s*[-–—\d])/i);
      let justFlipped = false;
      if (qGroupMatch) {
        inQuestions = true;
        const lastNum = qGroupMatch[2] ? parseInt(qGroupMatch[2]) : parseInt(qGroupMatch[1]);
        lastQuestionEnd = Math.max(lastQuestionEnd, lastNum);
        groupEnd = lastNum;
        maxSeenQ = 0;
        chooseEndLetter = null;
        lettersDone = false;
        groupImgSeen = false;
        singleQGroup = !qGroupMatch[2];
      } else if (inQuestions) {
        // Track evidence that the current group's numbered questions/blanks
        // have actually appeared ("34.", "(34)", "34 ……"). Until the group is
        // complete, its content (summary bodies, word lists, tables) must NOT
        // be handed back to the passage pane.
        const leadNum = tt.match(/^\s*[\(\[]?(\d{1,2})[\.\)\]]?\s+/);
        if (leadNum) {
          const n = parseInt(leadNum[1]);
          if (n >= 1 && n <= 40) maxSeenQ = Math.max(maxSeenQ, n);
        }
        let nm;
        const parenNumRe = /\((\d{1,2})\)/g;
        while ((nm = parenNumRe.exec(tt)) !== null) {
          const n = parseInt(nm[1]);
          if (n >= 1 && n <= 40) maxSeenQ = Math.max(maxSeenQ, n);
        }
        const gapNumRe = /\b(\d{1,2})\s*[.…_]{3,}/g;
        while ((nm = gapNumRe.exec(tt)) !== null) {
          const n = parseInt(nm[1]);
          if (n >= 1 && n <= 40) maxSeenQ = Math.max(maxSeenQ, n);
        }
        // Statements are often glued into ONE block ("…TV Dinner. 13. The US
        // frozen…" / "12 Swanson Foods…") — scan the whole text, not just the
        // leading number, or the gate below never opens and the next passage
        // gets swept into the questions pane.
        const inlineNumRe = /\b(\d{1,2})[\.\)]\s*[A-Z(“"']/g;
        while ((nm = inlineNumRe.exec(tt)) !== null) {
          const n = parseInt(nm[1]);
          if (n >= 1 && n <= 40) maxSeenQ = Math.max(maxSeenQ, n);
        }
        const bareNumRe = /(?:^|\s)(\d{1,2})\s+[A-Z]/g;
        while ((nm = bareNumRe.exec(tt)) !== null) {
          const n = parseInt(nm[1]);
          if (n >= 1 && n <= 40) maxSeenQ = Math.max(maxSeenQ, n);
        }

        // "Choose TWO letters, A-E" groups have no numbered lines — they are
        // complete once the final option letter (E) has appeared.
        const chooseM = tt.match(/Choose\s+(?:ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN)\s+letters?[,\s]*\(?([A-H])\s*(?:[-–—~]|to\s)\s*([B-K])/i);
        if (chooseM) chooseEndLetter = chooseM[2].toUpperCase();
        // Same for single-answer MC: "Choose the correct letter, A, B, C or D."
        // (a lone "Question 13" group has no numbered lines either)
        if (!chooseM && !chooseEndLetter) {
          const mcDecl = tt.match(/Choose\s+the\s+correct\s+letters?\b.{0,40}?\s+or\s+([A-K])\b/i);
          if (mcDecl) chooseEndLetter = mcDecl[1].toUpperCase();
        }
        // Single-question title / matching-from-list groups declare a letter
        // RANGE — "Write the appropriate letter A-E in box 28", "Choose the
        // appropriate letter A-D". These have no numbered line (the number is
        // only in the "Question 28" header), so maxSeenQ never reaches groupEnd
        // and the next passage would leak in. Treat the group as complete once
        // the last listed option letter appears.
        if (!chooseEndLetter) {
          const letterRange = tt.match(/\bletters?\s+\(?([A-H])\s*(?:[-–—~]|to\s)\s*([B-K])\b/i);
          if (letterRange && letterRange[2].charCodeAt(0) > letterRange[1].charCodeAt(0) &&
              letterRange[2].charCodeAt(0) - letterRange[1].charCodeAt(0) <= 10) {
            chooseEndLetter = letterRange[2].toUpperCase();
          }
        }
        if (chooseEndLetter && !lettersDone) {
          const endRe = new RegExp('(?:^|[\\s,;:.])' + chooseEndLetter + '\\s+\\S');
          if (endRe.test(tt)) lettersDone = true;
        }
        // Single-question title/MC groups (e.g. "Question 26: From the list
        // below choose the most suitable title…") have no numbered line and may
        // NOT declare a letter range. Their options stream as short bare lines
        // "A …", "B …", "C …". Seeing the SECOND option (B or later) confirms the
        // stem + options are present, so the group is complete and a following
        // passage title can flip back out instead of leaking in.
        if (singleQGroup && !lettersDone) {
          const optM = tt.match(/^\s*([A-K])\s+\S/);
          if (optM && optM[1] >= 'B' && tt.length < 150) lettersDone = true;
        }

        // Diagram/flow-chart groups number their blanks inside an image —
        // once an image has appeared, treat the group as complete.
        if (el.querySelector && el.querySelector('img')) groupImgSeen = true;

        // Are we transitioning back to a passage?
        const groupSatisfied = maxSeenQ >= groupEnd || lettersDone || groupImgSeen;
        // Only a STANDALONE "READING PASSAGE 2" line is an unconditional
        // passage start — instructions like "Reading Passage 3 has eight
        // paragraphs, A-H. Which paragraph…" must stay with the questions.
        const strongPassageStart = /^\s*(READING\s+)?PASSAGE\s+(\d+|ONE|TWO|THREE|I{1,3})\s*[:.\-–—]?\s*$/i.test(tt);
        if (strongPassageStart ||
            (groupSatisfied && (looksLikeNewPassageStart(el, text) || looksLikeProsePassage(el, text)))) {
          inQuestions = false;
          justFlipped = true;
        }
      }

      if (inQuestions) {
        contentEntries.push({
          html: el.outerHTML,
          text: tt,
          q: true,
          hasImg: !!(el.querySelector && el.querySelector('img'))
        });
      } else {
        // We just flipped back to passage prose — the new passage's short
        // title (and possibly a subtitle) may have been swept into the
        // question side. Pull trailing title-like blocks back out.
        if (justFlipped) {
          let moved = 0;
          for (let k = contentEntries.length - 1; k >= 0 && moved < 2; k--) {
            const en = contentEntries[k];
            if (!en.q || en.hasImg) break;
            const s = en.text || '';
            if (!s || s.length >= 150) break;
            if (/Questions?\s+\d/i.test(s)) break;
            if (/^\s*[\(\[]?\d{1,2}[\.\)\]]?\s/.test(s)) break;
            if (/^[A-K][\.\)]?\s/.test(s)) break;
            if (/[.…_]{4,}/.test(s) || /\(\d{1,2}\)/.test(s)) break;
            if (/^(Choose|Match|Complete|Write|Look\s+at|Do\s+the|Which|Using|In\s+boxes|NB|List\s+of)\b/i.test(s)) break;
            if (/\b(TRUE|FALSE|NOT\s*GIVEN|YES|NO)\b/.test(s)) break;
            en.q = false;
            moved++;
          }
        }
        contentEntries.push({ html: el.outerHTML, text: tt, q: false, hasImg: false });
      }
      }
    }

    // Wrap question blocks on the passage side so they're visually distinct
    let passageHTML = contentEntries
      .map(en => en.q ? `<div class="passage-question-block">${en.html}</div>` : en.html)
      .join('');
    const questionsRawHTML = contentEntries.filter(en => en.q).map(en => en.html).join('');

    // Build interactive questions
    const questionsHTML = buildInteractiveQuestions(questionsRawHTML, answersData);

    return { passage: passageHTML, questions: questionsHTML };
  }

  // ---- Build Interactive Question Fields ----
  function buildInteractiveQuestions(rawHTML, answers) {
    const tmpDoc = new DOMParser().parseFromString('<div>' + rawHTML + '</div>', 'text/html');
    const root = tmpDoc.body.firstChild;
    const topChildren = Array.from(root.children);

    // Walk DOM and collect block-level units, preserving order.
    // Each block records its normalized text, any images it contains, and the
    // index of its top-level ancestor (used to recover original HTML — tables,
    // images, layout — when rendering notes/summary groups).
    const blocks = [];

    function imgsOf(el) {
      if (!el || !el.querySelectorAll) return [];
      const all = el.tagName === 'IMG' ? [el] : Array.from(el.querySelectorAll('img'));
      // Skip data: URLs — lazy-load placeholder pixels, not real diagrams
      return all
        .filter(im => !(im.getAttribute('src') || '').startsWith('data:'))
        .map(im => im.outerHTML);
    }

    function pushBlock(el, topIdx) {
      // If the element contains <br> separators, split it into per-line blocks
      // so that "9. ...<br/>10. ...<br/>11. ..." becomes 3 separate question blocks.
      if (el.querySelector && el.querySelector('br')) {
        const segments = el.innerHTML.split(/<br\s*\/?>/i);
        segments.forEach(seg => {
          const tmp = el.ownerDocument.createElement('div');
          tmp.innerHTML = seg;
          const txt = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
          const imgs = imgsOf(tmp);
          if (txt || imgs.length) blocks.push({ el: tmp, text: txt, imgs, topIdx });
        });
        return;
      }
      const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
      const imgs = imgsOf(el);
      if (txt || imgs.length) blocks.push({ el, text: txt, imgs, topIdx });
    }

    function walk(parent, inheritedTop) {
      Array.from(parent.children).forEach(child => {
        const topIdx = (inheritedTop === undefined) ? topChildren.indexOf(child) : inheritedTop;
        const tag = child.tagName.toLowerCase();
        if (['p','li','h1','h2','h3','h4','h5','h6','blockquote','td','th'].includes(tag)) {
          pushBlock(child, topIdx);
        } else if (['ul','ol','table','tbody','thead','tr','section','article'].includes(tag)) {
          walk(child, topIdx);
        } else if (tag === 'figure' || tag === 'img') {
          pushBlock(child, topIdx);
        } else if (tag === 'div') {
          const hasBlockKids = Array.from(child.children).some(c =>
            ['p','li','div','ul','ol','table','h1','h2','h3','h4','h5','h6','blockquote','figure'].includes(c.tagName.toLowerCase())
          );
          if (hasBlockKids) walk(child, topIdx);
          else pushBlock(child, topIdx);
        }
      });
    }
    walk(root, undefined);

    // If no blocks found, fall back to splitting the raw text by <br>
    if (blocks.length === 0) {
      const fallback = root.innerHTML.split(/<br\s*\/?>/i);
      fallback.forEach(chunk => {
        const tmp = new DOMParser().parseFromString(chunk, 'text/html');
        const txt = (tmp.body.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt) blocks.push({ el: null, text: txt, imgs: [], topIdx: -1 });
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

    // The source sometimes omits a group header entirely (e.g. diagram
    // labelling whose question numbers 20-26 exist only inside the image).
    // Insert a synthetic group for any numeric gap between consecutive
    // headers so those answer boxes still exist.
    for (let i = 0; i < groups.length - 1; i++) {
      const gapStart = groups[i].end + 1;
      const gapEnd = groups[i + 1].start - 1;
      if (gapStart <= gapEnd && gapEnd - gapStart < 15) {
        groups.splice(i + 1, 0, {
          start: gapStart,
          end: gapEnd,
          blockIdx: groups[i + 1].blockIdx,
          title: 'Questions ' + (gapStart === gapEnd ? gapStart : gapStart + '-' + gapEnd),
          synthetic: true
        });
        i++;
      }
    }
    const strayTexts = {}; // numbered lines that belong to a synthetic group

    let html = '';
    // Images placed between a group's last question and the next group header
    // (diagrams are often laid out just above "Questions 20-26") are carried
    // over to the group they belong to.
    let pendingGroupImgs = [];
    groups.forEach((grp, gi) => {
      const startIdx = grp.blockIdx;
      const endIdx = (gi < groups.length - 1) ? groups[gi + 1].blockIdx : blocks.length;
      const grpBlocks = blocks.slice(startIdx, endIdx);
      const inheritedImgs = pendingGroupImgs;
      pendingGroupImgs = [];

      // Synthetic group (header missing from the source): render the
      // inherited diagram image and an answer box per question.
      if (grp.synthetic) {
        html += `<div class="question-group">`;
        html += `<div class="question-group-title">${escapeHTML(grp.title)}</div>`;
        if (inheritedImgs.length) {
          html += `<div class="question-group-images">${inheritedImgs.join('')}</div>`;
        }
        for (let q = grp.start; q <= grp.end; q++) {
          const answer = answers[q] || '';
          const qText = (strayTexts[q] || '').replace(/(?:\.{3,}|_{3,})/g, '_______').trim();
          html += `<div class="question-item" data-q="${q}" data-answer="${escapeAttr(answer)}">`;
          html += `<span class="question-number">${q}</span>`;
          html += `<div class="question-text">`;
          if (qText) html += `<div class="q-statement">${escapeHTML(qText)}</div>`;
          html += `<input type="text" class="answer-input" data-q="${q}" placeholder="Answer for (${q})...">`;
          html += `</div></div>`;
        }
        html += `</div>`;
        return; // continue forEach
      }

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
      // No numbered blocks at all — the whole group is instruction + options
      const noNumbered = firstQIdx === grpBlocks.length;

      // Instruction = blocks between title block (index 0) and first question
      const instructionBlocks = grpBlocks.slice(1, firstQIdx);
      const instructionText = instructionBlocks.map(b => b.text).join(' ');

      // ---- Letters declared by the instruction ----
      // "Choose TWO letters, A-E" / "A~E" / "A to E" / "researcher, A, B or C"
      let declaredLetters = [];
      const rangeDecl = instructionText.match(/\b([A-H])\s*(?:[-–—~]|to\s)\s*([B-K])\b/);
      if (rangeDecl && rangeDecl[2].charCodeAt(0) > rangeDecl[1].charCodeAt(0) &&
          rangeDecl[2].charCodeAt(0) - rangeDecl[1].charCodeAt(0) <= 10) {
        for (let c = rangeDecl[1].charCodeAt(0); c <= rangeDecl[2].charCodeAt(0); c++) {
          declaredLetters.push(String.fromCharCode(c));
        }
      }
      if (declaredLetters.length === 0) {
        // Tolerate the source typo "A. B, C or D" and the Oxford comma
        // "A, B, or C" (test sources use both)
        const orDecl = instructionText.match(/\b([A-K](?:\s*[.,]\s*[A-K])+)\s*[.,]?\s+or\s+([A-K])\b/);
        if (orDecl) {
          declaredLetters = orDecl[1].split(/\s*[.,]\s*/).map(s => s.trim()).concat(orDecl[2]);
        }
      }

      // Detect question type from the instruction text + early question samples.
      // Use generous lookups so detection succeeds even when option lists wrap to new paragraphs.
      const detectionText = [
        instructionText,
        grpBlocks.slice(firstQIdx, firstQIdx + 4).map(b => b.text).join(' ')
      ].join(' ');
      const isTFNG = /\bTRUE\b[\s\S]{0,300}\bFALSE\b[\s\S]{0,300}\bNOT\s*GIVEN\b/i.test(detectionText)
        || /statements?\s+agree\s+with\s+the\s+(information|claims|views)/i.test(detectionText) && /\bTRUE\b/i.test(detectionText);
      const isYNNG = !isTFNG && (/\bYES\b[\s\S]{0,300}\bNO\b[\s\S]{0,300}\bNOT\s*GIVEN\b/i.test(detectionText)
        || (/claims|views|opinions/i.test(detectionText) && /\bYES\b/i.test(detectionText) && /\bNOT\s*GIVEN\b/i.test(detectionText)));
      let isMC = /Choose\s+the\s+(?:correct|appropriate|right|best)\s+letters?\b/i.test(detectionText);
      // "Choose TWO/THREE letters, A-E" — a group answered by a set of letters
      const isMultiSelect = !isMC && /\bChoose\s+(TWO|THREE|FOUR|FIVE|SIX|SEVEN)\s+letters?\b/i.test(detectionText);
      let isMatching = /Match\s+(each|the)\b|List\s+of\s+People|list\s+of\s+(headings|theories|researchers|findings|people|names|dates|scientists|writers|experts|statements|countries)/i.test(detectionText);
      const isSectionMatch = /Which\s+(section|paragraph)/i.test(detectionText);
      const isSentenceEnd = /Complete\s+each\s+sentence.*?ending/i.test(detectionText);

      // ---- Embedded-blanks detection ----
      // If no block in this group starts with a numbered question, but the group's
      // text contains placeholders like "(7) ........" inline, this is a
      // "Complete the notes/table/summary" gap-fill style. Render the whole
      // notes block as the prompt and show numbered inputs below.
      const groupFullText = grpBlocks.slice(1).map(b => b.text).join(' ');
      let isEmbeddedBlanks = false;
      if (firstQIdx === grpBlocks.length && !isMultiSelect) {
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
        // Render the notes/table/summary as a single prompt. Prefer the
        // ORIGINAL top-level elements between this group's title and the next
        // group — that preserves tables, images and flow-chart layout exactly
        // as they appear on the source page.
        let notesHTML = '';
        const titleTop = grpBlocks[0].topIdx;
        const nextTop = (gi < groups.length - 1 && blocks[groups[gi + 1].blockIdx].topIdx >= 0)
          ? blocks[groups[gi + 1].blockIdx].topIdx
          : topChildren.length;
        if (titleTop >= 0 && nextTop > titleTop + 1) {
          // Blocks that share the title's top element (split by <br>) would be
          // skipped by the element slice — re-add their content first.
          const sameTopExtras = grpBlocks.slice(1)
            .filter(b => b.topIdx === titleTop && b.el)
            .map(b => `<p>${b.el.innerHTML}</p>`)
            .join('');
          const els = topChildren.slice(titleTop + 1, nextTop).filter(el => {
            const t = (el.textContent || '').trim();
            if (/^\s*Example\b/i.test(t)) return false;
            if (/^\s*Cambridge\s+IELTS\s+Tests?\b/i.test(t)) return false;
            return true;
          });
          notesHTML = sameTopExtras + els.map(el => el.outerHTML).join('');
        }
        if (!notesHTML.trim()) {
          notesHTML = grpBlocks.slice(1)
            .map(b => {
              if (!b.el) return `<p>${escapeHTML(b.text)}</p>`;
              // Split <br>-blocks live in throwaway <div>s — re-wrap in <p>
              if (b.el.tagName === 'DIV') return `<p>${b.el.innerHTML}</p>`;
              return b.el.outerHTML;
            })
            .join('');
        }

        // Word list inside the notes ("A. nurture  B. organs …" or bare
        // "A nurture") → offer letter dropdowns instead of free-text inputs.
        const wordList = [];
        let expectLetter = 'A';
        grpBlocks.slice(1).forEach(b => {
          const m = b.text.match(/^\s*([A-K])[\.\)]?\s+(\S.*)$/);
          if (m && m[1] === expectLetter && !/^\s*\d/.test(m[2]) &&
              m[2].length < 120 &&
              (declaredLetters.length === 0 || declaredLetters.includes(m[1]))) {
            wordList.push({ letter: m[1], text: m[2].trim() });
            expectLetter = String.fromCharCode(expectLetter.charCodeAt(0) + 1);
          }
        });
        if (wordList.length < 2 && declaredLetters.length >= 2) {
          for (const b of grpBlocks.slice(1)) {
            const split = splitBareLetterSeq(b.text, declaredLetters);
            if (split) {
              wordList.length = 0;
              wordList.push(...split.entries);
              break;
            }
          }
        }
        const useSelect = wordList.length >= 2 ||
          (declaredLetters.length >= 2 && /list\s+of\s+words/i.test(instructionText));
        const selLetters = wordList.length >= 2 ? wordList.map(w => w.letter) : declaredLetters;

        html += `<div class="question-group">`;
        html += `<div class="question-group-title">${escapeHTML(grp.title)}</div>`;
        if (inheritedImgs.length) {
          html += `<div class="question-group-images">${inheritedImgs.join('')}</div>`;
        }
        html += `<div class="question-group-instruction embedded-notes">${notesHTML}</div>`;

        for (let q = grp.start; q <= grp.end; q++) {
          const answer = answers[q] || '';
          html += `<div class="question-item" data-q="${q}" data-answer="${escapeAttr(answer)}">`;
          html += `<span class="question-number">${q}</span>`;
          html += `<div class="question-text">`;
          if (useSelect && selLetters.length) {
            html += `<select class="answer-select" data-q="${q}"><option value="">Select</option>`;
            selLetters.forEach((l, li) => {
              const w = (wordList[li] && wordList[li].letter === l) ? wordList[li].text : '';
              html += `<option value="${l}"${w ? ` data-text="${escapeAttr(w)}"` : ''}>${l}${w ? '. ' + escapeHTML(w) : ''}</option>`;
            });
            html += `</select>`;
          } else {
            html += `<input type="text" class="answer-input" data-q="${q}" placeholder="Answer for (${q})...">`;
          }
          html += `</div></div>`;
        }
        html += `</div>`;
        return; // continue forEach
      }

      // Walk ALL grpBlocks (after the title) to extract:
      //   - numbered questions      → qTexts[N]
      //   - images                  → qImgs[N] / instrImgs (diagrams, charts)
      //   - "List of X" header      → enters list-collection mode
      //   - letter entries A./B.    → matchingList (for List of People/etc.)
      //   - bare letter entries A x → matchingList (researchers, endings, TWO-letter options)
      //   - Roman numeral entries i/ii/iii… → matchingList (for List of Headings)
      //   - "Example…" lines        → skipped (don't pollute question text)
      //   - other blocks            → appended to current question text
      const qTexts = {};
      const qImgs = {};
      const instrImgs = inheritedImgs.slice();
      const matchingList = []; // [{letter, text}]
      let listFromInstructions = false; // list already visible in the instruction box
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

      for (let bi = 1; bi < grpBlocks.length; bi++) {
        const b = grpBlocks[bi];

        // Skip worked-example hints between numbered questions in heading-match groups:
        //   "Example Answer", "Example:", "Example)", "Example  Paragraph A  vii"
        //   "Paragraph A  vii"  /  "Section D  ix"  (no explicit Example prefix)
        if (/^\s*Example\b/i.test(b.text)) continue;
        if (/^\s*(Paragraph|Section|Passage)\s+[A-K]\s+[ivx]+\s*$/i.test(b.text)) continue;
        // Skip site footer/watermark text like "Cambridge IELTS Test 1 to 17"
        if (/^\s*Cambridge\s+IELTS\s+Tests?\b/i.test(b.text)) continue;

        // Images stay with the question being built, or with the group
        // instruction if no question is open yet (diagram/chart prompts).
        // An image AFTER the group's final question belongs to the NEXT
        // group — diagrams often sit right above the next "Questions" header.
        if (b.imgs && b.imgs.length) {
          if (curQ !== null && curQ === grp.end && gi < groups.length - 1) {
            pendingGroupImgs.push(...b.imgs);
          } else if (curQ !== null) {
            (qImgs[curQ] = qImgs[curQ] || []).push(...b.imgs);
          } else {
            instrImgs.push(...b.imgs);
          }
          if (!b.text) continue;
        }

        // Numbered question start
        const numM = b.text.match(/^\s*[\(\[]?(\d{1,2})[\.\)\]]?\s+(.*)$/);
        if (numM) {
          const n = parseInt(numM[1]);
          if (n >= grp.start && n <= grp.end) {
            flush();
            curQ = n; curParts = numM[2] ? [numM[2]] : [];
            collectingList = false;
            continue;
          }
          // A numbered line that belongs to a missing-header (synthetic)
          // group — keep its text for that group, never glue it onto the
          // current question.
          if (n >= 1 && n <= 40 && groups.some(g => g.synthetic && n >= g.start && n <= g.end)) {
            flush();
            curQ = null;
            strayTexts[n] = numM[2] || '';
            continue;
          }
        }

        // "List of X" header — switch to list-collection mode
        const headerM = b.text.match(/^\s*List\s+of\s+\w+/i);
        if (headerM) {
          flush();
          curQ = null;
          collectingList = true;
          b._listEntry = true;
          if (bi < firstQIdx) listFromInstructions = true;
          const rest = b.text.replace(/^\s*List\s+of\s+\w+\s*[:.\-]?\s*/i, '');
          if (rest) {
            // Letter form
            const reA = /([A-K])[\.\)]\s+(.+?)(?=\s+[A-K][\.\)]\s|$)/g;
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
            // Bare letters glued after the header ("List of Researchers A Galton B …")
            if (matchingList.length === 0 && declaredLetters.length >= 2) {
              const split = splitBareLetterSeq(rest, declaredLetters);
              if (split) matchingList.push(...split.entries);
            }
          }
          continue;
        }

        // Single letter entry "A. text" or "A) text".
        // Never collected while a multiple-choice question is open — those
        // lines are the question's own options (the MC extractor handles them).
        const letM = b.text.match(/^\s*([A-K])[\.\)]\s+(.+)$/);
        if (letM) {
          const canCollect = collectingList || ((!isMC || noNumbered) && (curQ === null || curQ === grp.end));
          if (canCollect) {
            flush();
            curQ = null;
            collectingList = true;
            matchingList.push({ letter: letM[1], text: letM[2].trim() });
            b._listEntry = true;
            if (bi < firstQIdx) listFromInstructions = true;
            continue;
          }
        }

        // Bare letter entry "A text" (no period) — used by researcher lists,
        // sentence endings and "Choose TWO letters" statements. Guarded: the
        // letter must be declared by the instruction (or follow a "List of"
        // header), must run in sequence A, B, C…, and the first entry needs
        // the NEXT block to continue the sequence — so a sentence that merely
        // starts with the article "A" is never mistaken for a list.
        const bareM = b.text.match(/^\s*([A-K])\s+(\S.+)$/);
        if (bareM) {
          const letter = bareM[1];
          const last = matchingList[matchingList.length - 1];
          const mixedRoman = last && !/^[A-K]$/.test(last.letter);
          const expected = (last && /^[A-K]$/.test(last.letter))
            ? String.fromCharCode(last.letter.charCodeAt(0) + 1)
            : 'A';
          const inDeclared = declaredLetters.length === 0 ? collectingList : declaredLetters.includes(letter);
          const canCollect = collectingList || ((!isMC || noNumbered) && (curQ === null || curQ === grp.end));
          // List entries are short; a 300+ char "entry" is a leaked passage
          // paragraph that happens to start with the next letter (A-H
          // paragraph labels) — never absorb those.
          const plausibleLength = bareM[2].length < 300;
          if (!mixedRoman && canCollect && inDeclared && letter === expected && plausibleLength) {
            let ok = collectingList || matchingList.length > 0;
            if (!ok) {
              const nxt = String.fromCharCode(letter.charCodeAt(0) + 1);
              for (let bj = bi + 1; bj < grpBlocks.length; bj++) {
                const t2 = grpBlocks[bj].text;
                if (!t2) continue;
                ok = new RegExp('^\\s*' + nxt + '[\\.\\)]?\\s+\\S').test(t2);
                break;
              }
            }
            if (ok) {
              flush();
              curQ = null;
              collectingList = true;
              matchingList.push({ letter, text: bareM[2].trim() });
              b._listEntry = true;
              if (bi < firstQIdx) listFromInstructions = true;
              continue;
            }
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
            b._listEntry = true;
            if (bi < firstQIdx) listFromInstructions = true;
            continue;
          }
        }

        // Continuation of current numbered question
        if (curQ !== null) curParts.push(b.text);
      }
      flush();

      // Multi-select (or no-numbered MC) options glued into one instruction
      // block: "Which TWO statements …? A Its membership… B It demands…"
      if ((isMultiSelect || (isMC && noNumbered)) &&
          matchingList.length === 0 && declaredLetters.length >= 2) {
        for (const b of instructionBlocks) {
          const dotted = [];
          const reDot = /([A-K])[\.\)]\s+(.+?)(?=\s+[A-K][\.\)]\s|$)/g;
          let lm;
          while ((lm = reDot.exec(b.text)) !== null) {
            dotted.push({ letter: lm[1], text: lm[2].trim() });
          }
          const seqOK = dotted.length >= 2 && dotted.every((d, di) =>
            d.letter.charCodeAt(0) === dotted[0].letter.charCodeAt(0) + di);
          if (seqOK) {
            b._instrOverride = b.text.substring(0, b.text.search(/[A-K][\.\)]\s/)).trim();
            b._listEntry = true;
            matchingList.push(...dotted);
            listFromInstructions = true;
            break;
          }
          const split = splitBareLetterSeq(b.text, declaredLetters);
          if (split) {
            b._instrOverride = split.before;
            b._listEntry = true;
            matchingList.push(...split.entries);
            listFromInstructions = true;
            break;
          }
        }
      }

      // ---- "Choose the most suitable title/heading from the list" ----
      // A single-question group whose options A-E live in the instruction with
      // no declared letter range. Two source layouts: (A) each option is its own
      // block "A The global decline…", "B Concern…"; (B) all glued into one block
      // "…Reading Passage 2.A The global…levelsB Concern…". Pull them into a
      // dropdown either way.
      if (matchingList.length === 0 && (noNumbered || grp.start === grp.end)) {
        const titleListRe = /from\s+the\s+list|most\s+suitable\s+(?:title|heading)|suitable\s+(?:title|heading)\s+for/i;
        const hasTitleWording = instructionBlocks.some(b => titleListRe.test(b.text));
        if (hasTitleWording) {
          // Layout A: consecutive bare-letter option blocks
          const opts = [];
          let expect = 'A'.charCodeAt(0);
          const consumed = [];
          instructionBlocks.forEach(b => {
            const m = b.text.match(/^\s*([A-K])\s+(\S.*)$/);
            if (m && m[1].charCodeAt(0) === expect && m[2].trim().length < 120) {
              opts.push({ letter: m[1], text: m[2].trim() });
              consumed.push(b);
              expect++;
            }
          });
          if (opts.length >= 2) {
            matchingList.push(...opts);
            consumed.forEach(b => { b._instrOverride = ''; });  // hide from instruction
            isMatching = true;
          } else {
            // Layout B: all options glued into one block
            for (const b of instructionBlocks) {
              if (!titleListRe.test(b.text)) continue;
              let best = null;
              for (let endC = 'H'.charCodeAt(0); endC >= 'C'.charCodeAt(0); endC--) {
                const letters = [];
                for (let c = 'A'.charCodeAt(0); c <= endC; c++) letters.push(String.fromCharCode(c));
                const split = splitGluedLetterSeq(b.text, letters);
                if (split && split.before &&
                    split.entries.every(e => e.text.length > 1 && e.text.length < 120)) {
                  best = split; break;
                }
              }
              if (best) {
                b._instrOverride = best.before;
                matchingList.push(...best.entries);
                isMatching = true;
                break;
              }
            }
          }
        }
      }

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

      // ---- Confirm / promote multiple-choice by CONTENT ----
      // Source wording is inconsistent ("Choose the correct/appropriate letters
      // A-D"), and the same "appropriate letter A-H" phrasing is used by some
      // matching-from-list groups. The reliable signal is whether EACH question
      // carries its own inline A…B…C(…D) option sequence. Count them and let the
      // content decide: promote a missed MC group, demote a false positive
      // (matching-from-list) so it keeps its shared dropdown.
      if (!isMultiSelect && !isTFNG && !isYNNG && !isSectionMatch && !isSentenceEnd) {
        let qWithOwnOptions = 0, qTotal = 0;
        for (let q = grp.start; q <= grp.end; q++) {
          if (!qTexts[q]) continue;
          qTotal++;
          if (splitBareLetterSeq(qTexts[q], ['A', 'B', 'C'])) qWithOwnOptions++;
        }
        const mostHaveOwnOptions = qTotal > 0 && qWithOwnOptions >= Math.ceil(qTotal / 2);
        if (mostHaveOwnOptions && !isMatching) {
          isMC = true;                 // each question has its own options → MC
        } else if (isMC && qWithOwnOptions === 0 && !noNumbered) {
          isMC = false;                // wording said MC but no inline options on
                                       // any numbered question → it's matching-
                                       // from-list; restore dropdown. (noNumbered
                                       // MC keeps its options in the instruction.)
        }
      }

      // ---- Two-letter-code classification legend ----
      // "Match each exhibit with the collection type … Write the appropriate
      // letters in boxes 7-12" uses TWO-letter codes (AT, EC, FA, SE, TS) with
      // Title-case labels, glued onto the last question's text. The single-letter
      // extractor can't see them, so detect the run of "XX Title Case" pairs,
      // pull them into the option list, and strip the legend off the question.
      // Requires >=3 DISTINCT two-uppercase codes each followed by a Title-case
      // label — acronym runs ("US EU NATO") and prose never satisfy this.
      if (!isMC && !isMultiSelect && matchingList.length === 0) {
        const codePairRe = /\b([A-Z]{2})\s+([A-Z][a-z]+(?:\s+(?:of\s+|the\s+|and\s+)?[A-Z][a-z]+)*)/g;
        let legendQ = -1, legendStart = -1, codes = null;
        for (let q = grp.end; q >= grp.start; q--) {
          const txt = qTexts[q];
          if (!txt) continue;
          codePairRe.lastIndex = 0;
          const pairs = [];
          let m;
          while ((m = codePairRe.exec(txt)) !== null) {
            pairs.push({ letter: m[1], text: m[2].trim(), index: m.index });
          }
          const distinct = new Set(pairs.map(p => p.letter));
          if (pairs.length >= 3 && distinct.size >= 3) {
            legendQ = q; legendStart = pairs[0].index; codes = pairs;
            break;
          }
        }
        if (codes) {
          const seen = new Set();
          codes.forEach(c => {
            if (seen.has(c.letter)) return;
            seen.add(c.letter);
            matchingList.push({ letter: c.letter, text: c.text });
          });
          qTexts[legendQ] = qTexts[legendQ].substring(0, legendStart)
            .replace(/\s*(Collection\s+)?Types?\s*$/i, '')
            .trim();
          isMatching = true;
        }
      }

      // ---- Strip trailing matching-list text from the last question ----
      // Only strip if followed by 2+ letter entries — avoids killing the prose
      // phrase "list of personal possessions" that's part of the question text.
      // Never strip from multiple-choice groups: the final MC question keeps
      // its own "A. … B. … C. …" options, which the MC extractor consumes.
      if (!isMC && matchingList.length === 0 && qTexts[grp.end]) {
        let lastTxt = qTexts[grp.end];
        let trailStart = -1;
        // Pattern A: "List of X" header followed by "A. word B. word ..."
        const listHeaderM = lastTxt.match(/\bList\s+of\s+\w+\s+([A-K])[\.\)]\s/i);
        if (listHeaderM) {
          trailStart = listHeaderM.index;
        } else {
          const letters = [...lastTxt.matchAll(/\b([A-K])[\.\)]\s+\S/g)];
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
          const re = /([A-K])[\.\)]\s+(.+?)(?=\s+[A-K][\.\)]\s|$)/g;
          let lm;
          while ((lm = re.exec(trail)) !== null) {
            matchingList.push({ letter: lm[1], text: lm[2].trim() });
          }
        }
      }

      // ---- Split a trailing BARE-letter list glued to the last question ----
      // Sentence endings often follow the final question with no punctuation:
      // "…degradation A may improve… B may contain… C may not be…"
      if (!isMC && !isMultiSelect && matchingList.length === 0 &&
          declaredLetters.length >= 3 && qTexts[grp.end]) {
        const split = splitBareLetterSeq(qTexts[grp.end], declaredLetters);
        if (split && split.before) {
          qTexts[grp.end] = split.before;
          matchingList.push(...split.entries);
        }
      }

      // A successfully extracted lettered list with plain statement questions
      // means "match the statement to the list" even without explicit wording.
      if (!isMatching && !isTFNG && !isYNNG && !isMC && !isMultiSelect &&
          !isSectionMatch && matchingList.length >= 2) {
        isMatching = true;
      }

      html += `<div class="question-group">`;
      html += `<div class="question-group-title">${escapeHTML(grp.title)}</div>`;

      // Instruction box. Multi-select / group-level MC option statements are
      // excluded — they are rendered as selectable options on each question.
      const optionsAsGroup = isMultiSelect || (isMC && noNumbered);
      const instructionHTML = instructionBlocks
        .filter(b => !(optionsAsGroup && b._listEntry))
        // Drop duplicate "Questions 27-29" header echoes
        .filter(b => !/^\s*Questions?\s+\d{1,2}\s*(?:[-–—~]\s*\d{1,2}|and\s+\d{1,2})?\s*$/i.test(b.text))
        .map(b => {
          const t = (b._instrOverride !== undefined) ? b._instrOverride : b.text;
          return t ? `<p>${escapeHTML(t)}</p>` : '';
        })
        .join('');
      if (instructionHTML) {
        html += `<div class="question-group-instruction">${instructionHTML}</div>`;
      }
      // Diagram/chart images that belong to this group's prompt
      if (instrImgs.length) {
        html += `<div class="question-group-images">${instrImgs.join('')}</div>`;
      }

      // Render the matching list above the question items — but only when it
      // is NOT already shown word-for-word inside the instruction box (the
      // matching-headings list used to appear twice).
      if (matchingList.length > 0 && !listFromInstructions && !isMultiSelect) {
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
        : (declaredLetters.length > 0 ? declaredLetters : 'ABCDEFGH'.split(''));

      const groupHasImgs = instrImgs.length > 0 || Object.keys(qImgs).length > 0;
      const multiAttr = (isMultiSelect && (matchingList.length > 0 || declaredLetters.length > 0))
        ? ` data-multi="${grp.start}-${grp.end}"` : '';

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

        html += `<div class="question-item" data-q="${q}" data-answer="${escapeAttr(answer)}"${multiAttr}>`;
        html += `<span class="question-number">${q}</span>`;
        html += `<div class="question-text">`;

        // Render the statement. The "(question text unavailable)" note is only
        // shown when nothing else gives the question context — multi-select
        // options and diagram images are self-explanatory.
        const hasOwnOptions = (isMultiSelect && matchingList.length > 0)
          || (isMC && mcOptions.length > 0)
          || (isMC && noNumbered && matchingList.length > 0)
          // single title/heading-from-list question: the options box is the context
          || (isMatching && matchingList.length > 0 && grp.start === grp.end);
        if (qText) {
          html += `<div class="q-statement">${escapeHTML(qText)}</div>`;
        } else if (!hasOwnOptions && !groupHasImgs) {
          html += `<div class="q-statement"><em style="color:var(--text-muted);">(question text unavailable)</em></div>`;
        }
        if (qImgs[q] && qImgs[q].length) {
          html += `<div class="q-images">${qImgs[q].join('')}</div>`;
        }

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
        } else if (isMultiSelect && matchingList.length > 0) {
          // "Choose TWO letters" — every question in the group offers the same
          // statements; answers are graded as a set (any order).
          html += `<div class="answer-options">`;
          matchingList.forEach(opt => {
            html += `<label class="answer-option"><input type="radio" name="q${q}" value="${opt.letter}"> ${opt.letter}. ${escapeHTML(opt.text)}</label>`;
          });
          html += `</div>`;
        } else if (isMC && mcOptions.length > 0) {
          html += `<div class="answer-options">`;
          mcOptions.forEach(opt => {
            html += `<label class="answer-option"><input type="radio" name="q${q}" value="${opt.letter}"> ${opt.letter}. ${escapeHTML(opt.text)}</label>`;
          });
          html += `</div>`;
        } else if (isMC && noNumbered && matchingList.length > 0) {
          // MC group whose stem + options all live in the instruction text
          // (e.g. a single "Question 13" block with options A-D)
          html += `<div class="answer-options">`;
          matchingList.forEach(opt => {
            html += `<label class="answer-option"><input type="radio" name="q${q}" value="${opt.letter}"> ${opt.letter}. ${escapeHTML(opt.text)}</label>`;
          });
          html += `</div>`;
        } else if (isMultiSelect && declaredLetters.length > 0) {
          // Options couldn't be parsed — at least offer the declared letters
          html += ` <select class="answer-select" data-q="${q}"><option value="">Select</option>`;
          declaredLetters.forEach(l => { html += `<option value="${l}">${l}</option>`; });
          html += `</select>`;
        } else if (isSectionMatch || isMatching || isSentenceEnd) {
          html += ` <select class="answer-select" data-q="${q}"><option value="">Select</option>`;
          availLetters.forEach((l, li) => {
            const entry = (matchingList.length > li && matchingList[li].letter === l) ? matchingList[li].text : '';
            html += `<option value="${l}"${entry ? ` data-text="${escapeAttr(entry)}"` : ''}>${l}</option>`;
          });
          html += `</select>`;
        } else {
          // Fill in blank
          const ph = qText ? 'Your answer...' : `Answer for (${q})...`;
          html += ` <input type="text" class="answer-input" data-q="${q}" placeholder="${ph}">`;
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

  // Split text like "stem A first option B second option C third option" into
  // the stem and lettered entries, given the exact sequence of letters to look
  // for. Returns null unless EVERY letter is found, in order — this strictness
  // is what makes bare-letter parsing safe (the article "A" alone never has a
  // full B…F sequence behind it).
  function splitBareLetterSeq(text, letters) {
    if (!text || !letters || letters.length < 2) return null;
    const positions = [];
    let searchFrom = 0;
    for (const L of letters) {
      const re = new RegExp('(?:^|[\\s,;:])' + L + '\\s+(?=\\S)', 'g');
      re.lastIndex = searchFrom;
      const m = re.exec(text);
      if (!m) return null;
      const letterPos = m.index + m[0].indexOf(L);
      positions.push({ letterPos, textStart: m.index + m[0].length });
      searchFrom = m.index + m[0].length;
    }
    const entries = positions.map((p, i) => ({
      letter: letters[i],
      text: text.substring(p.textStart, i + 1 < positions.length ? positions[i + 1].letterPos : text.length).trim()
    }));
    if (entries.some(e => !e.text)) return null;
    return { before: text.substring(0, positions[0].letterPos).trim(), entries };
  }

  // Like splitBareLetterSeq, but for option letters GLUED to the previous word
  // with no separator: "…Passage 2.A The global…levelsB Concern…developmentsC…".
  // The letter need not be preceded by a boundary; it just has to be followed by
  // whitespace then a Title-case/number start. Used for "choose the most
  // suitable title/heading from the list" single questions.
  function splitGluedLetterSeq(text, letters) {
    if (!text || !letters || letters.length < 2) return null;
    const positions = [];
    let searchFrom = 0;
    for (const L of letters) {
      const re = new RegExp(L + '\\s+(?=[A-Z0-9])', 'g');
      re.lastIndex = searchFrom;
      const m = re.exec(text);
      if (!m) return null;
      positions.push({ letterPos: m.index, textStart: m.index + m[0].length });
      searchFrom = m.index + m[0].length;
    }
    const entries = positions.map((p, i) => ({
      letter: letters[i],
      text: text.substring(p.textStart, i + 1 < positions.length ? positions[i + 1].letterPos : text.length).trim()
    }));
    if (entries.some(e => !e.text)) return null;
    return { before: text.substring(0, positions[0].letterPos).trim(), entries };
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
        const multiGroups = {}; // "21-22" -> [{item, expected, user}]

        questionsContent.querySelectorAll('.question-item[data-answer]').forEach(item => {
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

          // "Choose TWO letters" groups are graded as a set, in any order
          if (item.dataset.multi) {
            const key = item.dataset.multi;
            (multiGroups[key] = multiGroups[key] || []).push({ item, expected, user: userAnswer });
            return;
          }

          let isCorrect = userAnswer === expected;
          // Letter dropdowns may carry the option's full text (word lists) —
          // accept the answer whether the key stores the letter or the word.
          if (!isCorrect && select && select.selectedIndex > 0) {
            const optText = (select.options[select.selectedIndex].getAttribute('data-text') || '').toLowerCase().trim();
            if (optText && optText === expected) isCorrect = true;
          }
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

        // Grade multi-select ("Choose TWO letters") groups: each expected
        // letter may appear in any of the group's boxes, used at most once.
        // The answer key may store letters per box ("B" / "D") or the combined
        // set on every box ("B, D") — normalize to one pool of unique letters.
        Object.values(multiGroups).forEach(entries => {
          const pool = [];
          entries.forEach(e => {
            const letters = e.expected.split(/[^a-j]+/i).filter(s => /^[a-k]$/i.test(s));
            if (letters.length) {
              letters.forEach(l => { if (!pool.includes(l)) pool.push(l); });
            } else if (e.expected && !pool.includes(e.expected)) {
              pool.push(e.expected);
            }
          });
          const poolLabel = pool.map(l => l.toUpperCase()).join(', ');
          entries.forEach(e => {
            let ok = false;
            const idx = e.user ? pool.indexOf(e.user) : -1;
            if (idx !== -1) { ok = true; pool.splice(idx, 1); }
            if (ok) correct++;

            e.item.querySelectorAll('.answer-option').forEach(opt => {
              const r = opt.querySelector('input[type="radio"]');
              opt.classList.remove('correct-option', 'incorrect-option');
              if (r && r.checked) opt.classList.add(ok ? 'correct-option' : 'incorrect-option');
            });
            const sel = e.item.querySelector('.answer-select');
            if (sel) {
              sel.style.borderColor = ok ? '#2b8a3e' : '#e03131';
              sel.style.background = ok ? '#ebfbee' : '#fff5f5';
            }
            if (!ok) {
              e.item.title = 'Correct letters (any order): ' + poolLabel;
            }
          });
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
        questionsContent.querySelectorAll('.question-item').forEach(i => { i.title = ''; });
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

  // ---- Parse Writing Content (interactive: prompt + answer box per task) ----
  function parseWritingContent(html, testInfo) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    [
      'script','style','header','footer','nav','.social-share','.post-navigation',
      '.comments','.sidebar','ins','.adsbygoogle','.entry-meta','.post-meta',
      '.breadcrumbs','.related-posts','.sharedaddy','.jp-relatedposts','.wpulike',
      '.entry-footer','.author-info','.post-tags','noscript','.noprint'
    ].forEach(sel => { try { doc.querySelectorAll(sel).forEach(el => el.remove()); } catch(e) {} });

    let contentEl = doc.querySelector('.entry-content') || doc.querySelector('.post-content') ||
                    doc.querySelector('article') || doc.querySelector('main') || doc.body;
    if (!contentEl) return null;

    let rawHTML = contentEl.innerHTML
      .replace(/\(adsbygoogle\s*=\s*window\.adsbygoogle\s*\|\|\s*\[\]\)\.push\(\{[^}]*\}\);?/g, '')
      .replace(/<ins[^>]*class="adsbygoogle"[^>]*>[\s\S]*?<\/ins>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<p>\s*<\/p>/gi, '');

    const tmp = new DOMParser().parseFromString('<div>' + rawHTML + '</div>', 'text/html');
    const root = tmp.body.firstChild;

    // Fix images (lazy-load, absolute URLs, proxy) and drop data: placeholders
    root.querySelectorAll('img').forEach(img => {
      const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original');
      const curSrc = img.getAttribute('src') || '';
      if (dataSrc && (!curSrc || curSrc.includes('data:') || curSrc.includes('placeholder'))) img.setAttribute('src', dataSrc);
      let src = img.getAttribute('src') || '';
      if (src.startsWith('data:')) { img.remove(); return; }
      if (src && !src.startsWith('http')) {
        src = 'https://practicepteonline.com' + (src.startsWith('/') ? '' : '/') + src;
        img.setAttribute('src', src);
      }
      ['srcset','data-srcset','data-src','data-lazy-src','loading','crossorigin','width','height']
        .forEach(a => img.removeAttribute(a));
      src = img.getAttribute('src') || '';
      if (src.startsWith('http') && !src.includes('wsrv.nl')) {
        img.setAttribute('src', `https://wsrv.nl/?url=${encodeURIComponent(src)}`);
      }
    });

    // Flatten into segments before splitting. Some tests glue BOTH tasks (and
    // the Task-1 chart) into ONE <p> separated by <br> — e.g. "Task 1: …<br>
    // <img><br>Task 2: …" (test 107) or "<img><br>Task 2: …" (test 102). If we
    // assigned by whole block, the second task's text and/or the chart would
    // land in the wrong task. Split every block on <br> so each part is judged
    // on its own.
    const segments = [];
    Array.from(root.children).forEach(el => {
      const html = el.innerHTML || '';
      if (/<br\s*\/?>/i.test(html)) {
        html.split(/<br\s*\/?>/i).forEach(part => {
          const d = tmp.createElement('div');
          d.innerHTML = part;
          if ((d.textContent || '').trim() || d.querySelector('img,table')) segments.push(d);
        });
      } else {
        segments.push(el);
      }
    });

    // Split segments into Task 1 / Task 2. Markers appear as "Task N", but the
    // source also uses the typos "Test N" and occasionally "Part N".
    const tasks = [[], []];
    let cur = -1;
    segments.forEach(el => {
      const t = (el.textContent || '').trim();
      if (/^(?:Task|Test|Part)\s*1\b/i.test(t)) cur = 0;
      else if (/^(?:Task|Test|Part)\s*2\b/i.test(t)) cur = 1;
      // Stop at footer/copyright noise
      if (/Copyright\s*©|Privacy\s+Policy|Practicepteonline/i.test(t)) { cur = -1; return; }

      // In Academic IELTS the chart/table is ALWAYS a Task-1 visual — Task 2 is
      // pure essay text. So route every image/table to Task 1 no matter which
      // block it was glued into (fixes the chart appearing under Task 2).
      const imgs = Array.from(el.querySelectorAll('img')).map(i => i.outerHTML);
      const tables = Array.from(el.querySelectorAll('table')).map(tb => tb.outerHTML);
      if (imgs.length || tables.length) {
        tasks[0].push(`<div class="writing-figure">${imgs.join('')}${tables.join('')}</div>`);
      }

      if (cur < 0) return;
      // Drop the leading "Task/Test N:" label and the "Write at least N words"
      // boilerplate — both are shown in our own standardised header.
      const stripped = t
        .replace(/^(?:Task|Test|Part)\s*[12]\b\s*:?\s*/i, '')
        .replace(/Write\s+at\s+le\w+\s+\d+\s+words\.?/ig, '')
        .replace(/Write\s+a\s+report\s+for\s+a\s+university\s+lecturer[^.]*\./ig, '')
        .trim();
      if (stripped) tasks[cur].push(`<p>${escapeHTML(stripped)}</p>`);
    });

    // Fallback: if markers were missing, dump everything into Task 1.
    if (tasks[0].length === 0 && tasks[1].length === 0) {
      tasks[0].push(root.innerHTML);
    }

    return buildWritingHTML(tasks, testInfo);
  }

  function buildWritingHTML(tasks, testInfo) {
    const tid = (testInfo && testInfo.id) || 'w';
    const part = (n, minutes, words, blocks) => {
      const saved = '';
      const promptHTML = blocks.length ? blocks.join('') : '<p>(Prompt unavailable)</p>';
      return `
        <div class="writing-part" data-part="${n}"${n === 2 ? ' style="display:none"' : ''}>
          <div class="writing-instruction">
            <h3>Academic Writing Part ${n}</h3>
            <p>You should spend about ${minutes} minutes on this task. Write at least ${words} words.</p>
          </div>
          <div class="writing-split">
            <div class="writing-prompt">${promptHTML}</div>
            <div class="writing-answer">
              <textarea class="writing-textarea" data-test="${escapeAttr(tid)}" data-part="${n}" data-min="${words}"
                placeholder="Type your answer here...">${saved}</textarea>
              <div class="writing-wordcount">Word Count: <span class="wc-num">0</span>
                <span class="wc-target"> / ${words} words</span></div>
            </div>
          </div>
        </div>`;
    };

    return `
      <div class="writing-test">
        <div class="writing-tabs">
          <button class="writing-tab active" data-part="1">Part 1</button>
          <button class="writing-tab" data-part="2">Part 2</button>
        </div>
        ${part(1, 20, 150, tasks[0])}
        ${part(2, 40, 250, tasks[1])}
      </div>`;
  }

  // ---- Bind Writing Test interactivity (tabs, word count, persistence) ----
  function bindWritingTest() {
    const wt = testContent.querySelector('.writing-test');
    if (!wt) return;

    // Tab switching
    wt.querySelectorAll('.writing-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const p = tab.dataset.part;
        wt.querySelectorAll('.writing-tab').forEach(t => t.classList.toggle('active', t === tab));
        wt.querySelectorAll('.writing-part').forEach(part => {
          part.style.display = part.dataset.part === p ? '' : 'none';
        });
      });
    });

    // Word count + persistence per textarea
    const countWords = (s) => {
      const m = s.trim().match(/\S+/g);
      return m ? m.length : 0;
    };
    wt.querySelectorAll('.writing-textarea').forEach(ta => {
      const key = `ielts_writing_${ta.dataset.test}_p${ta.dataset.part}`;
      const min = parseInt(ta.dataset.min);
      const wcNum = ta.closest('.writing-answer').querySelector('.wc-num');
      const update = () => {
        const n = countWords(ta.value);
        wcNum.textContent = n;
        wcNum.classList.toggle('wc-met', n >= min);
      };
      // restore saved draft
      try { const v = localStorage.getItem(key); if (v) ta.value = v; } catch(e) {}
      update();
      ta.addEventListener('input', () => {
        update();
        try { localStorage.setItem(key, ta.value); } catch(e) {}
      });
    });
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
  // One canvas is injected INTO each scrolling pane (passage + questions) and
  // sized to the pane's full scroll height. Because the canvas lives inside
  // the scroll container, strokes scroll WITH the text — exactly like the
  // highlighter — instead of floating over a fixed viewport overlay.
  const drawColorInput = document.getElementById('draw-color');
  const drawSizeSelect = document.getElementById('draw-size');
  const drawClearBtn = document.getElementById('draw-clear');
  const legacyCanvas = document.getElementById('draw-canvas');
  if (legacyCanvas) legacyCanvas.style.display = 'none'; // replaced by per-pane canvases

  let isDrawing = false;
  let drawMode = false;
  let eraserMode = false;
  let activeCtx = null; // context of the pane currently being drawn on

  function drawPanes() {
    return Array.from(document.querySelectorAll('.split-pane-content'));
  }

  // Create or resize a canvas inside each pane, preserving any existing
  // drawing across resizes.
  function ensurePaneCanvases() {
    drawPanes().forEach(pane => {
      let canvas = pane.querySelector(':scope > canvas.pane-draw-canvas');
      const w = pane.clientWidth;
      const h = Math.max(pane.scrollHeight, pane.clientHeight);
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.className = 'pane-draw-canvas';
        pane.appendChild(canvas);
        bindCanvas(canvas);
      }
      if (canvas.width !== w || canvas.height !== h) {
        const ctx = canvas.getContext('2d');
        let saved = null;
        try {
          if (canvas.width > 0 && canvas.height > 0) {
            saved = ctx.getImageData(0, 0, canvas.width, canvas.height);
          }
        } catch (e) {}
        canvas.width = w;
        canvas.height = h;
        if (saved) ctx.putImageData(saved, 0, 0);
      }
      canvas.classList.toggle('active', drawMode && !eraserMode);
      canvas.classList.toggle('eraser-active', drawMode && eraserMode);
    });
  }
  // expose for the test-loader so canvases re-attach when content changes
  ensureDrawCanvases = ensurePaneCanvases;

  function getCanvasCoords(canvas, e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function strokeStyleFor(ctx) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const size = parseInt(drawSizeSelect.value);
    if (eraserMode) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = size * 4;
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = size;
      ctx.strokeStyle = drawColorInput.value;
    }
  }

  function bindCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    const start = (clientX, clientY) => {
      isDrawing = true;
      activeCtx = ctx;
      const pos = getCanvasCoords(canvas, { clientX, clientY });
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };
    const move = (clientX, clientY) => {
      if (!isDrawing || !drawMode || activeCtx !== ctx) return;
      const pos = getCanvasCoords(canvas, { clientX, clientY });
      strokeStyleFor(ctx);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };
    canvas.addEventListener('mousedown', (e) => { if (drawMode) start(e.clientX, e.clientY); });
    canvas.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
    canvas.addEventListener('touchstart', (e) => {
      if (!drawMode) return;
      e.preventDefault();
      start(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
      if (!isDrawing || !drawMode) return;
      e.preventDefault();
      move(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
  }

  // End a stroke regardless of which canvas the pointer is over.
  ['mouseup', 'touchend'].forEach(ev =>
    document.addEventListener(ev, () => { isDrawing = false; activeCtx = null; }));

  window.addEventListener('resize', () => { if (drawMode) ensurePaneCanvases(); });

  function enableDrawCanvas(eraser) {
    drawMode = true;
    eraserMode = eraser;
    document.body.classList.add('draw-mode');
    ensurePaneCanvases();
  }

  function disableDrawCanvas() {
    drawMode = false;
    eraserMode = false;
    isDrawing = false;
    activeCtx = null;
    document.body.classList.remove('draw-mode');
    drawPanes().forEach(pane => {
      const c = pane.querySelector(':scope > canvas.pane-draw-canvas');
      if (c) c.classList.remove('active', 'eraser-active');
    });
  }

  // Clear drawing on every pane
  drawClearBtn.addEventListener('click', () => {
    drawPanes().forEach(pane => {
      const c = pane.querySelector(':scope > canvas.pane-draw-canvas');
      if (c) c.getContext('2d').clearRect(0, 0, c.width, c.height);
    });
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
