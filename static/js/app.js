const STORAGE_KEY_COMPLETED = 'earthol_completed';
const STORAGE_KEY_VISITS = 'earthol_visits';

const SLOGANS = [
    "你的一生，皆是成就。",
    "把平凡的日子，酿成发光的勋章",
    "每一步都算数，每一刻都值得铭记",
    "你走过的路，终将成为你的徽章",
    "人生这场游戏，成就由你定义",
    "活着，就是不断解锁的过程",
    "世界是地图，你是唯一的玩家",
    "每一刻，都是成就",
    "人生即成就",
    "你的故事，你的勋章",
    "把时光穿成串，每一颗都闪亮",
    "在名为人生的游戏里，收集所有高光时刻"
];

let allAchievements = [];
let currentPage = 1;
const PAGE_SIZE = 24;

function loadCompleted() {
    try {
        const data = localStorage.getItem(STORAGE_KEY_COMPLETED);
        return data ? new Set(JSON.parse(data)) : new Set();
    } catch (e) {
        return new Set();
    }
}

function saveCompleted(ids) {
    localStorage.setItem(STORAGE_KEY_COMPLETED, JSON.stringify([...ids]));
}

function loadVisits() {
    try {
        const data = localStorage.getItem(STORAGE_KEY_VISITS);
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {}
    return { total: 0, today: 0, lastDate: '' };
}

function recordVisit() {
    const visits = loadVisits();
    const today = new Date().toISOString().split('T')[0];

    visits.total = (visits.total || 0) + 1;

    if (visits.lastDate !== today) {
        visits.today = 1;
        visits.lastDate = today;
    } else {
        visits.today = (visits.today || 0) + 1;
    }

    localStorage.setItem(STORAGE_KEY_VISITS, JSON.stringify(visits));
    return visits;
}

function getRandomSlogan() {
    return SLOGANS[Math.floor(Math.random() * SLOGANS.length)];
}

document.addEventListener('DOMContentLoaded', function() {
    const visits = recordVisit();
    updateVisitStats(visits);

    const sloganEl = document.getElementById('page-slogan');
    if (sloganEl) {
        sloganEl.textContent = getRandomSlogan();
    }

    renderSVGIcons();
    initAchievementCards();
    initFilterSearch();
    initStickyStats();

    fetch('static/data/achievements.json')
        .then(r => r.json())
        .then(data => {
            allAchievements = data;
            filterAchievements(1);
            updateStatsDisplay();
        })
        .catch(e => {
            console.error('加载成就数据失败:', e);
        });
});

function updateStatsDisplay() {
    const completed = loadCompleted();
    const total = allAchievements.length;
    const count = completed.size;
    const rate = total > 0 ? Math.round(count / total * 1000) / 10 : 0;

    const statsValue = document.getElementById('stats-value');
    const navStatsText = document.getElementById('nav-stats-text');
    const progressFill = document.getElementById('progress-fill');
    const countLabel = document.getElementById('count-label');

    if (statsValue) statsValue.textContent = `${count} / ${total} · ${rate}%`;
    if (navStatsText) navStatsText.textContent = `${count} / ${total} · ${rate}%`;
    if (progressFill) progressFill.style.width = `${rate}%`;
    if (countLabel) countLabel.textContent = `共 ${total} 个成就`;
}

function updateVisitStats(visits) {
    const el = document.getElementById('visit-stats');
    if (el) {
        el.textContent = `总访问 ${visits.total} · 今日 ${visits.today}`;
    }
}

function renderSVGIcons() {
    if (typeof generateSVG !== 'function') {
        console.warn('[EarthOL] generateSVG not available, skipping SVG icon render');
        return;
    }
    const parser = new DOMParser();
    const iconContainers = document.querySelectorAll('[data-svg-icon]');
    iconContainers.forEach(container => {
        const iconName = container.dataset.svgIcon;
        const card = container.closest('.achievement-card');
        const rarity = card ? (card.dataset.rarity || 'silver') : 'silver';

        try {
            const svgString = generateSVG(iconName, rarity);
            if (!svgString || !svgString.includes('<svg')) {
                console.warn('[EarthOL] Invalid SVG string for icon:', iconName);
                return;
            }
            const doc = parser.parseFromString(svgString, 'image/svg+xml');
            const svg = doc.querySelector('svg');
            if (svg) {
                container.innerHTML = '';
                container.appendChild(svg);
            } else {
                console.warn('[EarthOL] Failed to parse SVG for icon:', iconName);
            }
        } catch (e) {
            console.error('[EarthOL] SVG render error for icon:', iconName, e);
        }
    });
}

function initAchievementCards() {
    const cards = document.querySelectorAll('.achievement-card');

    cards.forEach(card => {
        const checkbox = card.querySelector('input[type="checkbox"]');
        const cardId = parseInt(card.dataset.id);

        card.addEventListener('click', function(e) {
            if (e.target === checkbox || e.target.closest('.card-checkbox')) return;
            toggleAchievement(cardId, this);
        });

        checkbox.addEventListener('change', function(e) {
            e.stopPropagation();
            const card = this.closest('.achievement-card');
            toggleAchievement(cardId, card);
        });
    });
}

function toggleAchievement(id, cardElement) {
    const completed = loadCompleted();
    const willComplete = !completed.has(id);

    if (willComplete) {
        completed.add(id);
    } else {
        completed.delete(id);
    }
    saveCompleted(completed);

    if (willComplete) {
        cardElement.classList.add('completed');
        cardElement.querySelector('input[type="checkbox"]').checked = true;
        cardElement.querySelector('.check-text').textContent = '已拥有';
        cardElement.style.transition = 'box-shadow 0.6s';
        cardElement.style.boxShadow = '0 0 60px rgba(184,134,11,0.6)';
        setTimeout(() => {
            cardElement.style.boxShadow = '';
        }, 800);
    } else {
        cardElement.classList.remove('completed');
        cardElement.querySelector('input[type="checkbox"]').checked = false;
        cardElement.querySelector('.check-text').textContent = '未拥有';
    }

    updateStatsDisplay();
}

function initFilterSearch() {
    const filterSelect = document.getElementById('filter-select');
    const sortSelect = document.getElementById('sort-select');
    const searchInput = document.getElementById('search-input');
    const achievementsList = document.getElementById('achievements-list');

    if (!filterSelect || !searchInput || !achievementsList) return;

    let searchTimer;

    filterSelect.addEventListener('change', () => filterAchievements(1));
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => filterAchievements(1), 180);
    });
    if (sortSelect) {
        sortSelect.addEventListener('change', () => filterAchievements(1));
    }
}

function filterAchievements(page) {
    const filterSelect = document.getElementById('filter-select');
    const sortSelect = document.getElementById('sort-select');
    const searchInput = document.getElementById('search-input');

    if (!filterSelect || !allAchievements.length) return;

    const filter = filterSelect.value;
    const search = searchInput ? searchInput.value.trim() : '';
    const sort = sortSelect ? sortSelect.value : 'default';
    const completed = loadCompleted();

    let filtered = allAchievements.filter(ach => {
        if (search) {
            const s = search.toLowerCase();
            if (!ach.title.toLowerCase().includes(s) && !ach.description.toLowerCase().includes(s)) {
                return false;
            }
        }
        if (filter === 'completed' && !completed.has(ach.id)) return false;
        if (filter === 'uncompleted' && completed.has(ach.id)) return false;
        if (filter === 'gold' && ach.rarity !== 'gold') return false;
        if (filter === 'silver' && ach.rarity !== 'silver') return false;
        if (filter === 'copper' && ach.rarity !== 'copper') return false;
        return true;
    });

    if (sort === 'rate_desc') {
        filtered.sort((a, b) => b.unlock_rate - a.unlock_rate);
    } else if (sort === 'rate_asc') {
        filtered.sort((a, b) => a.unlock_rate - b.unlock_rate);
    } else if (sort === 'rarity') {
        const order = { gold: 0, silver: 1, copper: 2 };
        filtered.sort((a, b) => (order[a.rarity] || 3) - (order[b.rarity] || 3));
    }

    const total = filtered.length;
    const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);
    currentPage = Math.min(Math.max(page, 1), totalPages);
    const start = (currentPage - 1) * PAGE_SIZE;

    const pageItems = filtered.slice(start, start + PAGE_SIZE).map(ach => ({
        ...ach,
        completed: completed.has(ach.id)
    }));

    renderAchievements(pageItems);
    renderPagination({ total, page: currentPage, total_pages: totalPages }, filterAchievements);

    const countLabel = document.getElementById('count-label');
    if (countLabel) {
        countLabel.textContent = `找到 ${total} 个成就`;
    }
}

function renderAchievements(achievements) {
    const container = document.getElementById('achievements-list');
    if (!container) return;

    container.innerHTML = achievements.map(ach => {
        const trophy = getTrophy(ach.rarity);
        return `
        <div class="achievement-card ${ach.completed ? 'completed' : ''}"
             data-id="${ach.id}"
             data-rarity="${ach.rarity}"
             data-icon="${ach.icon}">
            <div class="card-icon" data-svg-icon="${ach.icon}"></div>
            <div class="card-content">
                <h3 class="card-title">${escapeHTML(ach.title)}</h3>
                <p class="card-desc">${escapeHTML(ach.description)}</p>
                <div class="card-rate">
                    <span class="rate-icon">${trophy}</span>
                    <span class="rate-text">${ach.unlock_rate}% 的玩家拥有此成就</span>
                </div>
            </div>
            <label class="card-checkbox">
                <input type="checkbox" ${ach.completed ? 'checked' : ''}>
                <span class="checkmark"></span>
                <span class="check-text">${ach.completed ? '已拥有' : '未拥有'}</span>
            </label>
        </div>
        `;
    }).join('');

    renderSVGIcons();
    initAchievementCards();
}

function renderPagination(result, onPageChange) {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;

    if (result.total_pages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    const pages = Array.from({ length: result.total_pages }, (_, index) => index + 1)
        .filter(page => page === 1 || page === result.total_pages || Math.abs(page - result.page) <= 1);
    const buttons = [];
    let previousPage = 0;
    pages.forEach(page => {
        if (page - previousPage > 1) buttons.push('<span class="pagination-ellipsis">…</span>');
        buttons.push(`<button class="page-button ${page === result.page ? 'active' : ''}" data-page="${page}" ${page === result.page ? 'aria-current="page"' : ''}>${page}</button>`);
        previousPage = page;
    });

    pagination.innerHTML = `
        <button class="page-button page-step" data-page="${result.page - 1}" ${result.page === 1 ? 'disabled' : ''}>上一页</button>
        ${buttons.join('')}
        <button class="page-button page-step" data-page="${result.page + 1}" ${result.page === result.total_pages ? 'disabled' : ''}>下一页</button>`;
    pagination.querySelectorAll('[data-page]').forEach(button => {
        button.addEventListener('click', () => {
            const page = Number(button.dataset.page);
            if (page >= 1 && page <= result.total_pages) {
                onPageChange(page);
                document.getElementById('achievements-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

function escapeHTML(value) {
    const element = document.createElement('div');
    element.textContent = value;
    return element.innerHTML;
}

function getTrophy(rarity) {
    switch (rarity) {
        case 'gold': return '🥇';
        case 'silver': return '🥈';
        case 'copper': return '🥉';
        default: return '🏆';
    }
}

function showToast(message) {
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 2000);
}

document.addEventListener('DOMContentLoaded', () => {
    const rippleButtons = document.querySelectorAll('.ripple-btn, .nav-btn, .stats-card');

    rippleButtons.forEach(button => {
        if (window.getComputedStyle(button).position === 'static') {
            button.style.position = 'relative';
        }

        button.addEventListener('click', function (e) {
            const oldRipple = this.querySelector('.ripple');
            if (oldRipple) { oldRipple.remove(); }

            const ripple = document.createElement('span');
            ripple.classList.add('ripple');

            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);

            ripple.style.width = ripple.style.height = `${size}px`;

            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.left = `${x}px`;
            ripple.style.top = `${y}px`;

            this.appendChild(ripple);

            ripple.addEventListener('animationend', () => {
                ripple.remove();
            });
        });
    });
});

function initStickyStats() {
    const navStats = document.getElementById('nav-stats');
    const statsCard = document.querySelector('.header .stats-card');

    if (!navStats || !statsCard) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                navStats.classList.add('visible');
            } else {
                navStats.classList.remove('visible');
            }
        });
    }, { threshold: 0 });

    observer.observe(statsCard);
}
