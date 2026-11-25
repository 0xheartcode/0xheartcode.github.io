// Global state for tracking loading state
let initialDataLoaded = false;

// Global variables for tracking navigation state
let currentScreen = 'main';
let selectedItemIndex = 0;
let menuItems = [];
let pages = {};

// Projects view mode (SIMPLE = big, name-only) and guided-tour state
let projectsSimpleView = false;
let tourActive = false;
let tourPaused = false;
let tourPage = '';
let tourPriorSimple = false;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Fire a Umami custom event (safe no-op if Umami is blocked or not loaded)
function track(event, data) {
    if (window.umami) {
        try { data ? umami.track(event, data) : umami.track(event); } catch (e) {}
    }
}

// Function to update which menu items we're tracking based on current page
function updateSelectableItems() {
    // Get all menu items in the current screen
    const currentPage = pages[currentScreen];
    if (!currentPage) return;
    
    // This is a critical part - we need to select all interactive menu items
    // Including both navigation items AND pagination buttons that aren't disabled
    menuItems = Array.from(currentPage.querySelectorAll('.menu-item:not(.disabled)'));
    
    // Reset selection if needed
    if (selectedItemIndex >= menuItems.length) {
        selectedItemIndex = 0;
    }
    
    // Apply initial selection
    updateSelection();
}

// Function to update the visual selection
function updateSelection() {
    // Remove selection from all items
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Add selection to current item
    if (menuItems.length > 0) {
        menuItems[selectedItemIndex].classList.add('selected');
    }
}

// Slugify a skill name to match the generated skills/<slug>.html filenames
function skillSlug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
// Open a dedicated skill page listing the projects that use it
function goToSkillPage(skill) {
    track('skill_view', { skill: skill });
    window.location.href = 'skills/' + skillSlug(skill) + '.html';
}

// Hook used by the cross-page guided tour (tour.js) to switch SPA screens
window.__tourShowScreen = function (page) {
    navigateToPage(page);
    currentScreen = page;
    selectedItemIndex = 0;
    updateSelectableItems();
};

// Toggle the projects screen between SIMPLE (big, name-only) and FULL views
// Apply the SIMPLE/FULL view to the projects list (class + button label only)
function applyViewMode(simple) {
    projectsSimpleView = simple;
    document.body.classList.toggle('simple-view', simple);
    const btn = document.getElementById('view-fab-btn');
    if (btn) btn.textContent = simple ? '▦ SIMPLE' : '▦ FULL';
}
// User action: apply + persist (shared with project detail pages) + track
function setSimpleView(simple) {
    applyViewMode(simple);
    try { localStorage.setItem('view-mode', simple ? 'simple' : 'full'); } catch (e) {}
    track('view_mode', { mode: simple ? 'simple' : 'full' });
}

// Banner + bottom progress bar shown during the guided tour
function showTourBanner(on) {
    let b = document.getElementById('tour-banner');
    let p = document.getElementById('tour-progress');
    if (on) {
        if (!b) {
            b = document.createElement('div');
            b.id = 'tour-banner';
            document.body.appendChild(b);
        }
        if (!p) {
            p = document.createElement('div');
            p.id = 'tour-progress';
            p.innerHTML = '<div id="tour-progress-fill"></div>';
            document.body.appendChild(p);
        }
        updateTourBanner();
    } else {
        if (b) b.remove();
        if (p) p.remove();
    }
}

function updateTourBanner() {
    const b = document.getElementById('tour-banner');
    if (!b) return;
    const where = (tourPage || 'main').toUpperCase();
    b.textContent = tourPaused
        ? '❚❚ TOUR PAUSED · ' + where + ' · any key = resume, click = stop'
        : '▶ GUIDED TOUR · ' + where + ' · any key = pause, click = stop';
}

function setTourProgress(frac) {
    const fill = document.getElementById('tour-progress-fill');
    if (fill) fill.style.width = (Math.max(0, Math.min(1, frac)) * 100) + '%';
}

// A pausable wait that drives the bottom progress bar; resolves false if the tour was stopped
function tourDwell(ms) {
    return new Promise((resolve) => {
        let elapsed = 0;
        const tick = 50;
        setTourProgress(0);
        const id = setInterval(() => {
            if (!tourActive) { clearInterval(id); resolve(false); return; }
            if (tourPaused) return;
            elapsed += tick;
            setTourProgress(elapsed / ms);
            if (elapsed >= ms) { clearInterval(id); resolve(true); }
        }, tick);
    });
}

async function gotoTourPage(page) {
    tourPage = page;
    await navigateToPage(page);
    currentScreen = page;
    selectedItemIndex = 0;
    updateSelectableItems();
    updateTourBanner();
}

// Hands-free guided tour: cycle through the screens in simple view
async function startGuidedTour() {
    if (tourActive) { stopGuidedTour(); return; }
    tourActive = true;
    tourPaused = false;
    track('guide_tour');
    tourPriorSimple = projectsSimpleView;
    applyViewMode(true);
    const fabEl = document.getElementById('view-fab');
    if (fabEl) fabEl.classList.add('tour-hidden');
    showTourBanner(true);
    await gotoTourPage('main');
    const sequence = ['projects', 'skills', 'contact', 'about', 'main'];
    for (const page of sequence) {
        const ok = await tourDwell(4000);
        if (!ok || !tourActive) return;
        await gotoTourPage(page);
    }
    if (tourActive) {
        const ok = await tourDwell(3000);
        if (ok) stopGuidedTour();
    }
}

function toggleTourPause() {
    if (!tourActive) return;
    tourPaused = !tourPaused;
    updateTourBanner();
}

function stopGuidedTour() {
    if (!tourActive) return;
    tourActive = false;
    tourPaused = false;
    tourPage = '';
    showTourBanner(false);
    applyViewMode(tourPriorSimple);
    const fabEl = document.getElementById('view-fab');
    if (fabEl) fabEl.classList.remove('tour-hidden');
}

// Function to navigate to selected item
function navigateToSelected() {
    if (menuItems.length > 0) {
        const selectedItem = menuItems[selectedItemIndex];

        // Case 0: Skill tile -> open that skill's page
        if (selectedItem.dataset.skill) {
            goToSkillPage(selectedItem.dataset.skill);
            return;
        }

        // Case 0b: Guided-tour button
        if (selectedItem.id === 'guide-btn') {
            if (window.GuidedTour) window.GuidedTour.start();
            return;
        }

        // Case 0d: Unlocked CV entry
        if (selectedItem.id === 'cv-menu') {
            track('cv_menu_click');
            window.location.href = 'cv/';
            return;
        }

        // Case 1: Regular navigation link
        const targetPage = selectedItem.dataset.target;
        if (targetPage && pages[targetPage]) {
            navigateToPage(targetPage);
            currentScreen = targetPage;
            selectedItemIndex = 0;
            updateSelectableItems();
            return;
        }
        
        // Case 2: Project detail link
        const projectLink = selectedItem.querySelector('.project-link');
        if (projectLink) {
            window.location.href = projectLink.getAttribute('href');
            return;
        }
        
        // Case 3: Pagination button
        if (selectedItem.classList.contains('pagination-button')) {
            // Simulate a click on the pagination button
            selectedItem.click();
            return;
        }
        
        // Case 4: Direct link (like the Back button)
        if (selectedItem.hasAttribute('onclick')) {
            selectedItem.click();
            return;
        }
    }
}

// Helper function to reuse navigation logic
async function navigateToPage(targetPage) {
    if (!tourActive) track('nav', { to: targetPage });
    const loader = document.createElement('div');
    loader.className = 'loading-bar';
    document.body.appendChild(loader);
    loader.style.display = 'block';

    // Hide all pages during transition
    Object.values(pages).forEach(page => page.style.display = 'none');
    
    // Load page data if needed
    if (targetPage === 'skills') {
        try {
            await loadSkills();
        } catch (error) {
            console.error('Error loading skills:', error);
        }
    }
    if (targetPage === 'projects') {
        try {
            await loadProjects();
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }
    
    // Show the target page
    pages[targetPage].style.display = 'block';
    loader.remove();
    
    // Update window history
    window.history.pushState({ page: targetPage }, '', `#${targetPage}`);
}

// The missing loadMainPageProjects function - now defined in global scope
async function loadMainPageProjects() {
    try {
        // Get the main page project grid
        const mainProjectGrid = document.querySelector('#main-menu .project-grid');
        if (!mainProjectGrid) {
            console.error('Main page project grid not found');
            return;
        }
        
        // Fetch projects from the JSON file
        const response = await fetch('projects/index.json');
        if (!response.ok) {
            throw new Error('Failed to load projects');
        }
        
        const projects = await response.json();
        
        // Filter active projects
        const activeProjects = projects.filter(project => project.status === 'active');

        // Clear existing content
        mainProjectGrid.innerHTML = '';

        // Show the featured projects on the main page (up to 4); else the first 4 active
        const featured = activeProjects.filter(project => project.featured);
        const projectsToShow = (featured.length ? featured : activeProjects).slice(0, 4);
        
        // Add each active project
        projectsToShow.forEach(project => {
            // Get the primary tech category (first in the tech array)
            const primaryTech = project.tech[0];
            
            const projectElement = document.createElement('div');
            projectElement.className = 'menu-item';
            projectElement.innerHTML = `
                ${project.name}<br>
                <small>TYPE: ${primaryTech}</small>
            `;
            
            // Make the project item clickable to go to project details
            projectElement.addEventListener('click', () => {
                track('project_view', { project: project.slug });
                window.location.href = `projects/${project.slug}.html`;
            });
            
            mainProjectGrid.appendChild(projectElement);
        });
        
        // If we have more active projects than we're showing, add a "MORE" button
        if (activeProjects.length > projectsToShow.length) {
            const moreElement = document.createElement('div');
            moreElement.className = 'menu-item more-projects';
            moreElement.innerHTML = `
                <span class="more-text">+${activeProjects.length - projectsToShow.length} MORE</span>
                <small>VIEW ALL PROJECTS</small>
            `;
            
            // Navigate to projects page when clicked
            moreElement.addEventListener('click', () => {
                document.querySelector('.menu-item[data-target="projects"]').click();
            });
            
            mainProjectGrid.appendChild(moreElement);
        }
    } catch (error) {
        console.error('Error loading main page projects:', error);
        throw error; // Re-throw to signal the error to caller
    }
}

// Enhanced loadProjects function with pagination
async function loadProjects() {
    try {
        // Fetch projects from the JSON file
        const response = await fetch('projects/index.json');
        if (!response.ok) {
            throw new Error('Failed to load projects');
        }
        
        const projects = await response.json();

        // Get the projects container
        const projectsContainer = document.getElementById('projects');
        if (!projectsContainer) {
            console.error('Projects container not found');
            return;
        }

        // Get (or create) the project grid
        let projectGrid = projectsContainer.querySelector('.project-grid');
        if (!projectGrid) {
            // If no grid exists, create one
            projectGrid = document.createElement('div');
            projectGrid.className = 'project-grid';
            projectsContainer.appendChild(projectGrid);
        }

        // Pagination configuration
        const itemsPerPage = 6;
        
        // Get or initialize current page from data attribute
        let currentPage = parseInt(projectsContainer.getAttribute('data-current-page')) || 1;
        
        // Calculate total pages
        const totalPages = Math.ceil(projects.length / itemsPerPage);
        
        // Ensure current page is within bounds
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;
        
        // Store current page in data attribute
        projectsContainer.setAttribute('data-current-page', currentPage);
        
        // Calculate start and end indices for current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, projects.length);
        
        // Get current page projects
        const currentPageProjects = projects.slice(startIndex, endIndex);
        
        // Clear all existing content
        projectGrid.innerHTML = '';
        
        // Now add each project for the current page
        currentPageProjects.forEach(project => {
            const techString = project.tech.slice(0, 2).join(' + ');

            const projectElement = document.createElement('div');
            projectElement.className = 'menu-item' + (project.status === 'active' ? ' active-project' : '');
            projectElement.innerHTML = `
                <h3>${project.name}</h3>
                <p>${project.shortDescription}</p>
                <small>TECH: ${techString}</small>
                <a href="projects/${project.slug}.html" class="project-link">VIEW DETAILS</a>
            `;
            projectElement.addEventListener('click', (e) => {
                track('project_view', { project: project.slug });
                if (e.target.closest('.project-link')) return;
                window.location.href = `projects/${project.slug}.html`;
            });

            projectGrid.appendChild(projectElement);
        });
        
        // Only add pagination controls if needed (more than 6 items)
        if (projects.length > itemsPerPage) {
            // Create or update pagination container
            let paginationContainer = projectsContainer.querySelector('.pagination-controls');
            if (!paginationContainer) {
                paginationContainer = document.createElement('div');
                paginationContainer.className = 'pagination-controls';
                projectsContainer.appendChild(paginationContainer);
            } else {
                paginationContainer.innerHTML = '';
            }
            
            // Add pagination text showing current page / total pages
            const paginationText = document.createElement('div');
            paginationText.className = 'pagination-text';
            paginationText.textContent = `PAGE ${currentPage}/${totalPages}`;
            paginationContainer.appendChild(paginationText);
            
            // Add pagination buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'pagination-buttons';
            
            // Previous button
            const prevButton = document.createElement('div');
            prevButton.className = 'menu-item pagination-button' + (currentPage === 1 ? ' disabled' : '');
            prevButton.textContent = '← PREV';
            if (currentPage > 1) {
                prevButton.addEventListener('click', () => {
                    projectsContainer.setAttribute('data-current-page', currentPage - 1);
                    loadProjects();
                });
            }
            buttonContainer.appendChild(prevButton);
            
            // Next button
            const nextButton = document.createElement('div');
            nextButton.className = 'menu-item pagination-button' + (currentPage === totalPages ? ' disabled' : '');
            nextButton.textContent = 'NEXT →';
            if (currentPage < totalPages) {
                nextButton.addEventListener('click', () => {
                    projectsContainer.setAttribute('data-current-page', currentPage + 1);
                    loadProjects();
                });
            }
            buttonContainer.appendChild(nextButton);
            
            paginationContainer.appendChild(buttonContainer);
        }
        
        // Update keyboard navigation
        updateSelectableItems(); // This is now a global function
        
        return projects; // Return the loaded projects for possible use by caller
    } catch (error) {
        console.error('Error loading projects:', error);
        throw error; // Re-throw to signal the error to caller
    }
}

// Enhanced loadSkills function with pagination - with similar changes
async function loadSkills() {
    try {
        const response = await fetch('projects/index.json');
        if (!response.ok) {
            throw new Error('Failed to load projects data');
        }
        
        const projects = await response.json();

        // Build the skills map from all projects (active + archived) so the skill set
        // reflects the full breadth of experience.
        const skillMap = new Map();
        projects.forEach(project => {
            project.tech.forEach(skill => {
                skillMap.set(skill, (skillMap.get(skill) || 0) + 1);
            });
        });
        
        // Convert to array for pagination
        const skills = Array.from(skillMap).map(([skill, count]) => ({
            skill,
            count,
            maxValue: Math.max(...Array.from(skillMap.values()))
        }));
        
        // Get the skills container
        const skillsContainer = document.getElementById('skills');
        if (!skillsContainer) {
            console.error('Skills container not found');
            return;
        }
        
        // Get (or create) the skills grid
        const skillsGrid = skillsContainer.querySelector('.project-grid');
        if (!skillsGrid) {
            console.error('Skills grid not found');
            return;
        }
        
        // Pagination configuration
        const itemsPerPage = 6;
        
        // Get or initialize current page from data attribute
        let currentPage = parseInt(skillsContainer.getAttribute('data-current-page')) || 1;
        
        // Calculate total pages
        const totalPages = Math.ceil(skills.length / itemsPerPage);
        
        // Ensure current page is within bounds
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;
        
        // Store current page in data attribute
        skillsContainer.setAttribute('data-current-page', currentPage);
        
        // Calculate start and end indices for current page
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = Math.min(startIndex + itemsPerPage, skills.length);
        
        // Get current page skills
        const currentPageSkills = skills.slice(startIndex, endIndex);
        
        // Clear the skills grid
        skillsGrid.innerHTML = '';
        
        // Add each skill item (clickable: opens the projects screen filtered by this skill)
        currentPageSkills.forEach(({ skill, count, maxValue }) => {
            const skillElement = document.createElement('div');
            skillElement.className = 'menu-item';
            skillElement.dataset.skill = skill;
            skillElement.innerHTML = `
                <h3>${skill}</h3>
                <p>Used in ${count} project${count !== 1 ? 's' : ''}</p>
                <progress value="${count}" max="${maxValue}"></progress>
                <small class="skill-cta">VIEW PROJECTS →</small>
            `;
            skillElement.addEventListener('click', () => goToSkillPage(skill));
            skillsGrid.appendChild(skillElement);
        });
        
        // Only add pagination controls if needed (more than 6 items)
        if (skills.length > itemsPerPage) {
            // Create or update pagination container
            let paginationContainer = skillsContainer.querySelector('.pagination-controls');
            if (!paginationContainer) {
                paginationContainer = document.createElement('div');
                paginationContainer.className = 'pagination-controls';
                skillsContainer.appendChild(paginationContainer);
            } else {
                paginationContainer.innerHTML = '';
            }
            
            // Add pagination text showing current page / total pages
            const paginationText = document.createElement('div');
            paginationText.className = 'pagination-text';
            paginationText.textContent = `PAGE ${currentPage}/${totalPages}`;
            paginationContainer.appendChild(paginationText);
            
            // Add pagination buttons
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'pagination-buttons';
            
            // Previous button
            const prevButton = document.createElement('div');
            prevButton.className = 'menu-item pagination-button' + (currentPage === 1 ? ' disabled' : '');
            prevButton.textContent = '← PREV';
            if (currentPage > 1) {
                prevButton.addEventListener('click', () => {
                    skillsContainer.setAttribute('data-current-page', currentPage - 1);
                    loadSkills();
                });
            }
            buttonContainer.appendChild(prevButton);
            
            // Next button
            const nextButton = document.createElement('div');
            nextButton.className = 'menu-item pagination-button' + (currentPage === totalPages ? ' disabled' : '');
            nextButton.textContent = 'NEXT →';
            if (currentPage < totalPages) {
                nextButton.addEventListener('click', () => {
                    skillsContainer.setAttribute('data-current-page', currentPage + 1);
                    loadSkills();
                });
            }
            buttonContainer.appendChild(nextButton);
            
            paginationContainer.appendChild(buttonContainer);
        }
        
        // Update keyboard navigation
        updateSelectableItems(); // This is now a global function
        
        return skills; // Return skills data for possible use by caller
    } catch (error) {
        console.error('Error loading skills:', error);
        throw error; // Re-throw to signal the error to caller
    }
}

// Now include the main initialization code
document.addEventListener('DOMContentLoaded', async () => {
    // Show a loading indicator while we initialize
    const loader = document.createElement('div');
    loader.className = 'loading-bar';
    document.body.appendChild(loader);
    loader.style.display = 'block';
    
    // Define page references (now using the global pages variable)
    pages = {
        main: document.getElementById('main-menu'),
        projects: document.getElementById('projects'),
        skills: document.getElementById('skills'),
        contact: document.getElementById('contact'),
        about: document.getElementById('about')
    };

    // Initially hide all pages during loading
    Object.values(pages).forEach(page => {
        if(page) page.style.display = 'none';
    });
    
    // Preload the main page data
    try {
        // Wait for main page projects to load before showing the page
        await loadMainPageProjects();
        initialDataLoaded = true;
    } catch (error) {
        console.error('Error during initial data loading:', error);
    }
    
    // After data is loaded, show the main page by default
    // or the page specified in the URL hash
    let startingPage = 'main';
    
    if (window.location.hash) {
        const targetPage = window.location.hash.substring(1);
        if (pages[targetPage]) {
            startingPage = targetPage;
            
            // If starting on a different page, load its data
            if (targetPage === 'skills') {
                try {
                    await loadSkills();
                } catch (error) {
                    console.error('Error loading skills data:', error);
                }
            }
            if (targetPage === 'projects') {
                try {
                    await loadProjects();
                } catch (error) {
                    console.error('Error loading projects data:', error);
                }
            }
            
            window.history.replaceState({ page: targetPage }, '', `#${targetPage}`);
        }
    }
    
    // Show the starting page
    if (pages[startingPage]) {
        pages[startingPage].style.display = 'block';
    }
    
    // Remove the loading indicator
    loader.remove();
    
    // Set initial screen
    currentScreen = startingPage;
    
    // Navigation system
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', async () => {
            const targetPage = item.dataset.target;
            if (targetPage && pages[targetPage]) {
                const loader = document.createElement('div');
                loader.className = 'loading-bar';
                document.body.appendChild(loader);
                loader.style.display = 'block';

                // Hide all pages during transition (screens are already in memory: instant, no fake wait)
                Object.values(pages).forEach(page => page.style.display = 'none');
                
                // Load page-specific data if needed
                if (targetPage === 'skills') {
                    try {
                        await loadSkills();
                    } catch (error) {
                        console.error('Error loading skills:', error);
                    }
                }
                if (targetPage === 'projects') {
                    try {
                        await loadProjects();
                    } catch (error) {
                        console.error('Error loading projects:', error);
                    }
                }
                
                // Show the target page
                pages[targetPage].style.display = 'block';
                loader.remove();
                
                // Update screen tracking and history
                currentScreen = targetPage;
                selectedItemIndex = 0;
                updateSelectableItems();
                window.history.pushState({ page: targetPage }, '', `#${targetPage}`);
            }
        });
    });

    // Handle back/forward navigation
    window.addEventListener('popstate', async (event) => {
        const targetPage = event.state?.page || 'main';
        
        // Add loading indicator
        const loader = document.createElement('div');
        loader.className = 'loading-bar';
        document.body.appendChild(loader);
        loader.style.display = 'block';
        
        // Hide all pages during transition
        Object.values(pages).forEach(page => {
            if(page) page.style.display = 'none';
        });
        
        // Load page data if needed
        if (targetPage === 'skills') {
            try {
                await loadSkills();
            } catch (error) {
                console.error('Error loading skills:', error);
            }
        }
        if (targetPage === 'projects') {
            try {
                await loadProjects();
            } catch (error) {
                console.error('Error loading projects:', error);
            }
        }
        
        // Show the target page
        pages[targetPage].style.display = 'block';
        loader.remove();
        
        // Update screen tracking
        currentScreen = targetPage;
        selectedItemIndex = 0;
        updateSelectableItems();
    });
    
    // Handle keyboard navigation
    document.addEventListener('keydown', (event) => {
        if (tourActive) { toggleTourPause(); event.preventDefault(); return; }
        switch (event.key) {
            case 'ArrowUp':
                selectedItemIndex = (selectedItemIndex - 1 + menuItems.length) % menuItems.length;
                updateSelection();
                event.preventDefault();
                break;
                
            case 'ArrowDown':
                selectedItemIndex = (selectedItemIndex + 1) % menuItems.length;
                updateSelection();
                event.preventDefault();
                break;
                
            case 'Enter':
                navigateToSelected();
                event.preventDefault();
                break;

            case 's':
            case 'S':
                setSimpleView(!projectsSimpleView);
                event.preventDefault();
                break;
                
            // Optional: Add left/right arrow support for grid layouts
            case 'ArrowLeft':
                // If we're in a grid layout, move left
                if (menuItems.length > 0 && currentScreen !== 'main') {
                    const gridItems = document.querySelectorAll('.project-grid .menu-item');
                    if (gridItems.length > 0) {
                        // Logic for grid navigation left
                        // This is simplified - you might need to adjust based on your grid size
                        if (selectedItemIndex % 2 === 1) { // If on right column
                            selectedItemIndex--;
                            updateSelection();
                        }
                    }
                }
                event.preventDefault();
                break;
                
            case 'ArrowRight':
                // If we're in a grid layout, move right
                if (menuItems.length > 0 && currentScreen !== 'main') {
                    const gridItems = document.querySelectorAll('.project-grid .menu-item');
                    if (gridItems.length > 0) {
                        // Logic for grid navigation right
                        // This is simplified - you might need to adjust based on your grid size
                        if (selectedItemIndex % 2 === 0 && selectedItemIndex + 1 < menuItems.length) { // If on left column
                            selectedItemIndex++;
                            updateSelection();
                        }
                    }
                }
                event.preventDefault();
                break;
            
            case 'Escape':
            case 'Backspace':
                // Only handle these keys when NOT on the main screen
                if (currentScreen !== 'main') {
                    // Navigate back to main screen
                    navigateToPage('main');
                    currentScreen = 'main';
                    selectedItemIndex = 0;
                    updateSelectableItems();
                    event.preventDefault();
                }
                break;
        }           
    });
    
    // Initialize the selectable items for the main menu
    updateSelectableItems();

    // Guided tour + simple/full view controls
    const guideBtn = document.getElementById('guide-btn');
    if (guideBtn) guideBtn.addEventListener('click', (e) => { e.stopPropagation(); if (window.GuidedTour) window.GuidedTour.start(); });
    document.addEventListener('click', () => { if (tourActive) stopGuidedTour(); });

    // Floating SIMPLE/FULL control + arrow-key hint (bottom-right), replaces the old menu item
    const fab = document.createElement('div');
    fab.id = 'view-fab';
    fab.innerHTML = '<div class="vf-hint">◂ ▴ ▾ ▸ navigate</div><button class="vf-toggle" id="view-fab-btn">▦ FULL</button>';
    document.body.appendChild(fab);
    document.getElementById('view-fab-btn').addEventListener('click', () => setSimpleView(!projectsSimpleView));

    // Apply the saved SIMPLE/FULL preference (shared with project detail pages)
    try { if (localStorage.getItem('view-mode') === 'simple') applyViewMode(true); } catch (e) {}

    // Reveal a CV entry on the main menu for visitors who have already unlocked it
    try {
        if (localStorage.getItem('cv-access') === '1') {
            const menu = document.querySelector('#main-menu .pixel-border');
            if (menu && !document.getElementById('cv-menu')) {
                const cv = document.createElement('div');
                cv.className = 'menu-item';
                cv.id = 'cv-menu';
                cv.textContent = '★ CV (UNLOCKED)';
                cv.addEventListener('click', () => { track('cv_menu_click'); window.location.href = 'cv/'; });
                menu.insertBefore(cv, menu.firstChild);
                updateSelectableItems();
            }
        }
    } catch (e) {}

    // When page changes, update the selectable items
    function updateCurrentScreen() {
        for (const [name, page] of Object.entries(pages)) {
            if (page && page.style.display === 'block') {
                currentScreen = name;
                break;
            }
        }
        updateSelectableItems();
    }
    
    // Update the navigation when user clicks a menu item directly
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            setTimeout(updateCurrentScreen, 400); // After page transition
        });
    });
});

// Year updating for footer
document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
});
