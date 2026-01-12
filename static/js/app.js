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

    searchForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Get form data
        const formData = new FormData(searchForm);
        const searchData = {
            name: formData.get('name'),
            company: formData.get('company') || null,
            limit: parseInt(formData.get('limit'))
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
        if (loading) {
            btnText.style.display = 'none';
            btnLoading.style.display = 'inline';
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
        emptyState.style.display = 'none';
        resultsSection.style.display = 'block';
        resultCount.textContent = `${count} result${count !== 1 ? 's' : ''}`;

        resultsDiv.innerHTML = '';

        results.forEach(profile => {
            const card = createProfileCard(profile);
            resultsDiv.appendChild(card);
        });
    }

    function createProfileCard(profile) {
        const card = document.createElement('div');
        card.className = 'profile-card';

        const linkedinLink = profile.linkedin_url ? `
            <a href="${escapeHtml(profile.linkedin_url)}" target="_blank" rel="noopener noreferrer" class="linkedin-top">
                View LinkedIn →
            </a>
        ` : '';

        const avatarHTML = profile.photo_url ? `
            <div class="profile-avatar">
                <img src="${escapeHtml(profile.photo_url)}" alt="${escapeHtml(profile.name)}">
            </div>
        ` : `
            <div class="profile-avatar placeholder">
                ${escapeHtml(profile.name ? profile.name.charAt(0).toUpperCase() : '?')}
            </div>
        `;

        // Build skills HTML
        let skillsHTML = '';
        const allSkills = [
            ...(profile.skills.visible || []),
            ...(profile.skills.hidden || [])
        ];

        if (allSkills.length > 0) {
            skillsHTML = `
                <div class="detail-row">
                    <div class="detail-label">Skills:</div>
                    <div class="detail-value">
                        <div class="skills-container">
                            ${allSkills.map(skill =>
                                `<span class="skill-tag">${escapeHtml(skill)}</span>`
                            ).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        // Build summary HTML
        let summaryHTML = '';
        if (profile.summary) {
            summaryHTML = `
                <div class="detail-row detail-row-stack">
                    <div class="detail-label">LinkedIn Summary</div>
                    <div class="detail-value detail-value-block">${formatDescription(profile.summary)}</div>
                </div>
            `;
        }

        // Build positions HTML
        let positionsHTML = '';
        if (profile.positions && profile.positions.length > 0) {
            positionsHTML = `
                <div class="detail-row detail-row-stack">
                    <div class="detail-label">LinkedIn Roles</div>
                    <div class="detail-value">
                        <ul class="positions-list">
                            ${profile.positions.map(role => `
                                <li class="position-item">
                                    <div class="position-title">${escapeHtml(role.title)}</div>
                                    <div class="position-meta">
                                        ${escapeHtml(role.company || 'Unknown company')}
                                        ${role.period ? ` • ${escapeHtml(role.period)}` : ''}
                                        ${role.location ? ` • ${escapeHtml(role.location)}` : ''}
                                    </div>
                                    ${role.description ? `<div class="position-desc">${formatDescription(role.description)}</div>` : ''}
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        // Build education HTML
        let educationHTML = '';
        if (profile.education.length > 0) {
            educationHTML = `
                <div class="detail-row">
                    <div class="detail-label">Education:</div>
                    <div class="detail-value">
                        <ul class="education-list">
                            ${profile.education.map(edu =>
                                `<li>${escapeHtml(edu)}</li>`
                            ).join('')}
                        </ul>
                    </div>
                </div>
            `;
        }

        // Build LinkedIn link
        card.innerHTML = `
            <div class="profile-header">
                <div class="profile-id-block">
                    ${avatarHTML}
                    <div class="profile-info">
                        <h3>${escapeHtml(profile.name)}</h3>
                        <div class="profile-title">${escapeHtml(profile.title)}</div>
                        <div class="profile-company">${escapeHtml(profile.company)}</div>
                    </div>
                </div>
                ${linkedinLink}
            </div>

            <div class="profile-details">
                <div class="detail-row">
                    <div class="detail-label">Location:</div>
                    <div class="detail-value">${escapeHtml(profile.location)}</div>
                </div>

                <div class="detail-row">
                    <div class="detail-label">Experience:</div>
                    <div class="detail-value">${escapeHtml(profile.experience)}</div>
                </div>

                ${summaryHTML}
                ${positionsHTML}
                ${skillsHTML}
                ${educationHTML}
            </div>
        `;

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
