// Global state for tracking loading state
let initialDataLoaded = false;

// Global variables for tracking navigation state
let currentScreen = 'main';
let selectedItemIndex = 0;
let menuItems = [];
let pages = {};

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

// Function to navigate to selected item
function navigateToSelected() {
    if (menuItems.length > 0) {
        const selectedItem = menuItems[selectedItemIndex];
        
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
        
        // Show only up to 2 active projects on the main page
        const projectsToShow = activeProjects.slice(0, 2);
        
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

        // Build the skills map
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
        
        // Add each skill item
        currentPageSkills.forEach(({ skill, count, maxValue }) => {
            const skillElement = document.createElement('div');
            skillElement.className = 'menu-item';
            skillElement.innerHTML = `
                <h3>${skill}</h3>
                <p>Used in ${count} project${count !== 1 ? 's' : ''}</p>
                <progress value="${count}" max="${maxValue}"></progress>
            `;
            
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

                await new Promise(resolve => setTimeout(resolve, 300)); // Shorter wait for better UX

                // Hide all pages during transition
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
