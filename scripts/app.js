document.addEventListener('DOMContentLoaded', () => {
    const pages = {
        main: document.getElementById('main-menu'),
        projects: document.getElementById('projects'),
        skills: document.getElementById('skills'),
        contact: document.getElementById('contact'),
        about: document.getElementById('about')
    };

    // Initialize pages
    Object.values(pages).forEach(page => {
        if(page) page.style.display = 'none';
    });
    pages.main.style.display = 'block';

    // Navigation system
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', async () => {
            const targetPage = item.dataset.target;
            if(targetPage && pages[targetPage]) {
                const loader = document.createElement('div');
                loader.className = 'loading-bar';
                document.body.appendChild(loader);
                loader.style.display = 'block';

                await new Promise(resolve => setTimeout(resolve, 500));

                Object.values(pages).forEach(page => page.style.display = 'none');
                pages[targetPage].style.display = 'block';
                loader.remove();

                if(targetPage === 'skills') loadSkills();
            }
        });
    });

    // Handle back/forward navigation
    window.addEventListener('popstate', (event) => {
        const targetPage = event.state?.page || 'main';
        Object.values(pages).forEach(page => {
            if(page) page.style.display = 'none';
        });
        pages[targetPage].style.display = 'block';
    });

    // Initial page load from URL hash
    if(window.location.hash) {
        const targetPage = window.location.hash.substring(1);
        if(pages[targetPage]) {
            Object.values(pages).forEach(page => {
                if(page) page.style.display = 'none';
            });
            pages[targetPage].style.display = 'block';
            window.history.replaceState({ page: targetPage }, '', `#${targetPage}`);
        }
    }
    
    // Track the currently selected menu item
    let currentScreen = 'main';
    let selectedItemIndex = 0;
    let menuItems = [];
    
    // Function to update which menu items we're tracking based on current page
    function updateSelectableItems() {
        // Get all menu items in the current screen
        const currentPage = pages[currentScreen];
        if (!currentPage) return;
        
        menuItems = Array.from(currentPage.querySelectorAll('.menu-item'));
        
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
            const targetPage = selectedItem.dataset.target;
            
            if (targetPage && pages[targetPage]) {
                // Use your existing navigation code
                navigateToPage(targetPage);
                currentScreen = targetPage;
                selectedItemIndex = 0;
                updateSelectableItems();
            }
        }
    }
    
    // Helper function to reuse your existing navigation logic
    async function navigateToPage(targetPage) {
        const loader = document.createElement('div');
        loader.className = 'loading-bar';
        document.body.appendChild(loader);
        loader.style.display = 'block';

        await new Promise(resolve => setTimeout(resolve, 500));

        Object.values(pages).forEach(page => page.style.display = 'none');
        pages[targetPage].style.display = 'block';
        loader.remove();

        if (targetPage === 'skills') loadSkills();
        
        // Update window history
        window.history.pushState({ page: targetPage }, '', `#${targetPage}`);
    }
    
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
            setTimeout(updateCurrentScreen, 600); // After page transition
        });
    });
    
    // Handle back/forward navigation updates for arrow keys
    window.addEventListener('popstate', (event) => {
        const targetPage = event.state?.page || 'main';
        currentScreen = targetPage;
        selectedItemIndex = 0;
        setTimeout(updateSelectableItems, 100);
    });
    
    // Initial setup based on URL hash for arrow keys
    if (window.location.hash) {
        const targetPage = window.location.hash.substring(1);
        if (pages[targetPage]) {
            currentScreen = targetPage;
            setTimeout(updateSelectableItems, 100);
        }
    }
});

// For skills section
async function loadSkills() {
    const response = await fetch('projects/');
    const projects = await response.json();

    const skillMap = new Map();
    projects.forEach(project => {
        project.tech.forEach(skill => {
            skillMap.set(skill, (skillMap.get(skill) || 0) + 1);
        });
    });

    const skillsContainer = document.getElementById('skills-container');
    skillsContainer.innerHTML = '';

    skillMap.forEach((count, skill) => {
        skillsContainer.innerHTML += `
            <div class="menu-item">
                <h3>${skill}</h3>
                <p>Used in ${count} projects</p>
                <progress value="${count}" max="${Math.max(...skillMap.values())}"></progress>
            </div>
        `;
    });
}

document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
});
