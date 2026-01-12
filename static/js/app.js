// Main application JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const searchForm = document.getElementById('searchForm');
    const searchBtn = document.getElementById('searchBtn');
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    const resultsSection = document.getElementById('resultsSection');
    const resultsDiv = document.getElementById('results');
    const resultCount = document.getElementById('resultCount');
    const errorMessage = document.getElementById('errorMessage');
    const emptyState = document.getElementById('emptyState');
    const modalOverlay = document.getElementById('profileModal');
    const modalClose = document.getElementById('modalClose');
    const recentContainer = document.getElementById('recentContainer');
    const recentList = document.getElementById('recentList');

    let lastResults = [];
    let modalHandlersAttached = false;
    let recentSearches = loadRecentSearches();

    renderRecentSearches();

    searchForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get form data
        const formData = new FormData(searchForm);
        const searchData = {
            name: formData.get('name'),
            company: formData.get('company') || null,
            limit: parseInt(formData.get('limit')),
            use_exa: true
        };

        // Clear previous results and errors
        hideError();
        hideResults();

        // Show loading state
        setLoading(true);

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(searchData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Search failed');
            }

            if (data.success && data.results.length > 0) {
                pushRecentSearch(searchData);
                displayResults(data.results, data.count);
            } else {
                showError('No results found. Try adjusting your search criteria.');
            }

        } catch (error) {
            showError(error.message || 'An error occurred while searching');
        } finally {
            setLoading(false);
        }
    });

    function setLoading(loading) {
        searchBtn.disabled = loading;
        searchBtn.classList.toggle('loading', loading);
        if (loading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline-flex';
        } else {
            btnText.style.display = 'inline';
            btnLoading.style.display = 'none';
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        emptyState.style.display = 'none';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }

    function hideResults() {
        resultsSection.style.display = 'none';
        resultsDiv.innerHTML = '';
    }

    function displayResults(results, count) {
        lastResults = results;
        emptyState.style.display = 'none';
        resultsSection.style.display = 'block';
        resultCount.textContent = `${count} result${count !== 1 ? 's' : ''}`;

        resultsDiv.innerHTML = '';

        results.forEach(profile => {
            const card = createProfileCard(profile);
            resultsDiv.appendChild(card);
        });

        attachModalHandlers();
    }

    function createProfileCard(profile) {
        const card = document.createElement('div');
        card.className = 'profile-row';

        const avatarHTML = profile.photo_url ? `
            <div class="avatar">
                <img src="${escapeHtml(profile.photo_url)}" alt="${escapeHtml(profile.name)}">
            </div>
        ` : `
            <div class="avatar">
                ${escapeHtml(profile.name ? profile.name.charAt(0).toUpperCase() : '?')}
            </div>
        `;

        const snippet = buildSnippet(profile);
        const location = profile.location || '';
        const titleLine = profile.title || profile.company || '';
        const linkedinButton = profile.linkedin_url ? `
            <a class="pill-button linkedin-pill" href="${escapeHtml(profile.linkedin_url)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation();">
                ${linkedinIcon(16)}<span>LinkedIn</span>
            </a>
        ` : '';

        const mainRow = document.createElement('div');
        mainRow.className = 'profile-main';
        mainRow.innerHTML = `
            <button class="caret-btn" aria-label="Toggle details" aria-expanded="false">
                <span class="caret-icon">›</span>
            </button>
            ${avatarHTML}
            <div class="profile-body">
                <div class="profile-name">
                    ${escapeHtml(profile.name)}
                    <span class="badge">${escapeHtml(profile.source || 'CoreSignal')}</span>
                </div>
                <div class="profile-title">${escapeHtml(titleLine)}</div>
                <div class="profile-location">${escapeHtml(location)}</div>
                ${snippet ? `<div class="profile-trunc">${escapeHtml(snippet)}</div>` : ''}
            </div>
            <div class="profile-actions">
                ${linkedinButton}
            </div>
        `;

        const detailPanel = document.createElement('div');
        detailPanel.className = 'detail-panel';
        detailPanel.innerHTML = buildDetailPanel(profile);
        detailPanel.style.display = 'none';

        const toggle = () => {
            const expanded = !card.classList.contains('expanded');
            card.classList.toggle('expanded', expanded);
            detailPanel.style.display = expanded ? 'block' : 'none';
            const caret = mainRow.querySelector('.caret-btn');
            if (caret) {
                caret.setAttribute('aria-expanded', expanded);
            }
        };

        mainRow.querySelector('.caret-btn').addEventListener('click', (ev) => {
            ev.stopPropagation();
            toggle();
        });

        // Allow clicking anywhere in the main row (except LinkedIn) to toggle
        mainRow.addEventListener('click', (ev) => {
            if (ev.target.closest('.linkedin-pill')) return;
            toggle();
        });

        card.appendChild(mainRow);
        card.appendChild(detailPanel);
        return card;
    }

    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    function formatDescription(desc) {
        if (!desc) return '';

        // Allow line breaks, strip other tags, then escape
        let normalized = String(desc);
        normalized = normalized.replace(/<br\s*\/?>/gi, '\n');
        normalized = normalized.replace(/<\/p>/gi, '\n');
        normalized = normalized.replace(/<p[^>]*>/gi, '');
        normalized = normalized.replace(/<[^>]+>/g, '');

        const escaped = escapeHtml(normalized);
        const withParagraphs = escaped
            .replace(/\n{2,}/g, '<br><br>')
            .replace(/\n/g, '<br>');
        return withParagraphs;
    }

    function buildSnippet(profile) {
        if (profile.summary) {
            return profile.summary.slice(0, 120) + (profile.summary.length > 120 ? '…' : '');
        }
        if (profile.positions && profile.positions.length > 0) {
            const first = profile.positions[0];
            return [first.title, first.company].filter(Boolean).join(' • ');
        }
        return '';
    }

    function buildDetailPanel(profile) {
        const uniquePositions = dedupePositions(profile.positions || []);
        const allSkills = [
            ...(profile.skills?.visible || []),
            ...(profile.skills?.hidden || [])
        ];

        const summarySection = profile.summary ? `
            <div class="detail-block highlight-summary">
                <div class="section-title">LinkedIn Summary</div>
                <div>${formatDescription(profile.summary)}</div>
            </div>
        ` : '';

        const positionsSection = uniquePositions.length ? `
            <div class="detail-block">
                <div class="section-title">Experience</div>
                <div class="list-items">
                    ${uniquePositions.map((p) => `
                        <div class="position-row">
                            <div><strong>${escapeHtml(p.title || '')}</strong>${p.company ? ` • ${escapeHtml(p.company)}` : ''}</div>
                            <div class="profile-location">${escapeHtml(p.period || '')}</div>
                            ${p.description ? `<div class="profile-trunc">${escapeHtml(p.description)}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        const skillsSection = allSkills.length ? `
            <div class="detail-block">
                <div class="section-title">Skills</div>
                <div>${allSkills.map(s => `<span class="pill">${escapeHtml(s)}</span>`).join('')}</div>
            </div>
        ` : '';

        const eduList = (profile.education || []).map((e) => {
            if (typeof e === 'string') return escapeHtml(e);
            if (e && typeof e === 'object') {
                const school = e.school || '';
                const degree = e.degree || '';
                return escapeHtml([degree, school].filter(Boolean).join(' • '));
            }
            return '';
        }).filter(Boolean);

        const educationSection = eduList.length ? `
            <div class="detail-block">
                <div class="section-title">Education</div>
                <div class="list-items">
                    ${eduList.map(item => `<div>${item}</div>`).join('')}
                </div>
            </div>
        ` : '';

        const metaLine = [
            profile.company ? escapeHtml(profile.company) : '',
            profile.location ? `<span class="strong-text">${escapeHtml(profile.location)}</span>` : '',
            profile.experience ? `<span class="strong-text">${escapeHtml(profile.experience)}</span>` : ''
        ].filter(Boolean).join(' • ');

        const linkedinLine = profile.linkedin_url ? `
            <div class="detail-block">
                <a class="pill-button linkedin-pill" href="${escapeHtml(profile.linkedin_url)}" target="_blank" rel="noopener noreferrer">
                    ${linkedinIcon(16)}<span>Open LinkedIn</span>
                </a>
            </div>
        ` : '';

        return `
            <div class="detail-block meta-line">
                ${metaLine}
            </div>
            ${summarySection}
            ${positionsSection}
            ${skillsSection}
            ${educationSection}
            ${linkedinLine}
        `;
    }

    function dedupePositions(positions) {
        const seen = new Set();
        const unique = [];
        for (const p of positions) {
            const key = `${p.title || ''}|${p.company || ''}|${p.period || ''}`;
            if (seen.has(key)) continue;
            seen.add(key);
            unique.push(p);
        }
        return unique;
    }

    function loadRecentSearches() {
        try {
            const raw = localStorage.getItem('peopleParserRecent');
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    function saveRecentSearches(list) {
        try {
            localStorage.setItem('peopleParserRecent', JSON.stringify(list));
        } catch {
            // ignore storage errors
        }
    }

    function pushRecentSearch(query) {
        const normalized = {
            name: (query.name || '').trim(),
            company: (query.company || '').trim(),
            limit: query.limit || 10
        };
        if (!normalized.name) return;

        const key = `${normalized.name.toLowerCase()}|${normalized.company.toLowerCase()}|${normalized.limit}`;
        recentSearches = recentSearches.filter((q) => {
            const qKey = `${(q.name || '').toLowerCase()}|${(q.company || '').toLowerCase()}|${q.limit}`;
            return qKey !== key;
        });

        recentSearches.unshift(normalized);
        if (recentSearches.length > 6) {
            recentSearches = recentSearches.slice(0, 6);
        }

        saveRecentSearches(recentSearches);
        renderRecentSearches();
    }

    function renderRecentSearches() {
        if (!recentContainer || !recentList) return;

        recentList.innerHTML = '';
        if (!recentSearches.length) {
            recentContainer.style.display = 'none';
            return;
        }

        recentContainer.style.display = 'grid';
        recentSearches.forEach((q) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'recent-chip';
            const label = q.company
                ? `${q.name} • ${q.company}`
                : q.name;
            chip.innerHTML = `${escapeHtml(label)} <span style="color:#6b7280;font-weight:600;">(${q.limit})</span>`;
            chip.addEventListener('click', () => {
                document.getElementById('name').value = q.name;
                document.getElementById('company').value = q.company || '';
                document.getElementById('limit').value = q.limit;
                searchForm.requestSubmit();
            });
            recentList.appendChild(chip);
        });
    }

    function attachModalHandlers() {
        if (!modalOverlay || modalHandlersAttached) return;
        modalClose.addEventListener('click', closeModal);
        modalOverlay.addEventListener('click', (e) => {
            if (e.target === modalOverlay) {
                closeModal();
            }
        });
        modalHandlersAttached = true;
    }

    function openProfileModal(profile) {
        if (!modalOverlay) return;
        const modalName = document.getElementById('modalName');
        const modalRole = document.getElementById('modalRole');
        const modalMeta = document.getElementById('modalMeta');
        const modalLinkedin = document.getElementById('modalLinkedin');
        const modalAvatar = document.getElementById('modalAvatar');
        const modalSummary = document.getElementById('modalSummary');
        const modalPositions = document.getElementById('modalPositions');
        const modalSkills = document.getElementById('modalSkills');
        const modalEducation = document.getElementById('modalEducation');

        modalName.textContent = profile.name || '';
        modalRole.textContent = profile.title || profile.company || '';
        const metaPieces = [];
        if (profile.company) metaPieces.push(escapeHtml(profile.company));
        if (profile.location) metaPieces.push(`<span class="strong-text">${escapeHtml(profile.location)}</span>`);
        if (profile.experience) metaPieces.push(`<span class="strong-text">${escapeHtml(profile.experience)}</span>`);
        modalMeta.innerHTML = metaPieces.join(' • ');
        modalLinkedin.href = profile.linkedin_url || '#';
        if (profile.linkedin_url) {
            modalLinkedin.style.display = 'inline-flex';
            modalLinkedin.innerHTML = `${linkedinIcon(16)}<span>LinkedIn</span>`;
        } else {
            modalLinkedin.style.display = 'none';
        }

        if (profile.photo_url) {
            modalAvatar.innerHTML = `<img src="${escapeHtml(profile.photo_url)}" alt="${escapeHtml(profile.name)}">`;
        } else {
            modalAvatar.textContent = profile.name ? profile.name.charAt(0).toUpperCase() : '?';
        }

        // Summary
        modalSummary.innerHTML = '';
        if (profile.summary) {
            modalSummary.innerHTML = `
                <div class="section-title">LinkedIn Summary</div>
                <div>${formatDescription(profile.summary)}</div>
            `;
            modalSummary.classList.add('highlight-summary');
            modalSummary.style.display = 'block';
        } else {
            modalSummary.style.display = 'none';
            modalSummary.classList.remove('highlight-summary');
        }

        // Positions
        modalPositions.innerHTML = '';
        if (profile.positions && profile.positions.length > 0) {
            // Deduplicate roles by title+company+period
            const seen = new Set();
            const uniquePositions = [];
            for (const p of profile.positions) {
                const key = `${p.title || ''}|${p.company || ''}|${p.period || ''}`;
                if (seen.has(key)) continue;
                seen.add(key);
                uniquePositions.push(p);
            }

            const list = uniquePositions.map((p) => `
                <div class="position-row">
                    <div><strong>${escapeHtml(p.title || '')}</strong>${p.company ? ` • ${escapeHtml(p.company)}` : ''}</div>
                    <div class="profile-location">${escapeHtml(p.period || '')}</div>
                    ${p.description ? `<div class="profile-trunc">${escapeHtml(p.description)}</div>` : ''}
                </div>
            `).join('');
            modalPositions.innerHTML = `
                <div class="section-title">Experience</div>
                <div class="list-items">${list}</div>
            `;
            modalPositions.style.display = 'block';
        } else {
            modalPositions.style.display = 'none';
        }

        // Skills
        const allSkills = [
            ...(profile.skills?.visible || []),
            ...(profile.skills?.hidden || [])
        ];
        modalSkills.innerHTML = '';
        if (allSkills.length > 0) {
            modalSkills.innerHTML = `
                <div class="section-title">Skills</div>
                <div>${allSkills.map(s => `<span class="pill">${escapeHtml(s)}</span>`).join('')}</div>
            `;
            modalSkills.style.display = 'block';
        } else {
            modalSkills.style.display = 'none';
        }

        // Education
        modalEducation.innerHTML = '';
        if (profile.education && profile.education.length > 0) {
            const eduList = profile.education.map((e) => {
                if (typeof e === 'string') return escapeHtml(e);
                if (e && typeof e === 'object') {
                    const school = e.school || '';
                    const degree = e.degree || '';
                    return escapeHtml([degree, school].filter(Boolean).join(' • '));
                }
                return '';
            }).filter(Boolean);
            modalEducation.innerHTML = `
                <div class="section-title">Education</div>
                <div class="list-items">
                    ${eduList.map(item => `<div>${item}</div>`).join('')}
                </div>
            `;
            modalEducation.style.display = 'block';
        } else {
            modalEducation.style.display = 'none';
        }

        modalOverlay.style.display = 'flex';
    }

    function linkedinIcon(size = 16) {
        return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path fill="currentColor" d="M20.5 3h-17A1.5 1.5 0 0 0 2 4.5v15A1.5 1.5 0 0 0 3.5 21h17a1.5 1.5 0 0 0 1.5-1.5v-15A1.5 1.5 0 0 0 20.5 3ZM8 18H5.5v-7H8v7ZM6.75 9.5a1.38 1.38 0 1 1 0-2.75 1.38 1.38 0 0 1 0 2.75ZM19 18h-2.5v-3.5c0-.84-.68-1.5-1.5-1.5s-1.5.66-1.5 1.5V18H11v-7h2.5v.86A3 3 0 0 1 17 10a2.99 2.99 0 0 1 3 3V18Z"/></svg>`;
    }

    function closeModal() {
        if (modalOverlay) {
            modalOverlay.style.display = 'none';
        }
    }
});

// Toggle skills visibility
function toggleSkills(profileId) {
    const hiddenSkills = document.getElementById(`hidden-skills-${profileId}`);
    const skillsContainer = document.getElementById(`skills-${profileId}`);
    const btn = event.target;

    if (hiddenSkills.style.display === 'none') {
        // Show hidden skills
        const hiddenTags = hiddenSkills.querySelectorAll('.skill-tag');
        hiddenTags.forEach(tag => {
            skillsContainer.appendChild(tag.cloneNode(true));
        });
        btn.textContent = 'Show less';
        hiddenSkills.style.display = 'block';
    } else {
        // Hide skills (restore original state)
        const allTags = skillsContainer.querySelectorAll('.skill-tag');
        const visibleCount = allTags.length - hiddenSkills.querySelectorAll('.skill-tag').length;

        // Remove extra tags
        for (let i = allTags.length - 1; i >= visibleCount; i--) {
            allTags[i].remove();
        }

        const hiddenCount = hiddenSkills.querySelectorAll('.skill-tag').length;
        btn.textContent = `Show ${hiddenCount} more`;
        hiddenSkills.style.display = 'none';
    }
}
