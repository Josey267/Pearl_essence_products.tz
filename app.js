document.addEventListener('DOMContentLoaded', function() {
    // Select all necessary HTML elements
    const deliveryModal = document.getElementById('deliveryModal');
    const modalClose = document.getElementById('modalClose');
    const nextToStep2 = document.getElementById('nextToStep2');
    const backToStep1 = document.getElementById('backToStep1');
    const nextToStep3 = document.getElementById('nextToStep3');
    const finishBtn = document.getElementById('finishBtn');

    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const step1Content = document.getElementById('step1-content');
    const step2Content = document.getElementById('step2-content');
    const step3Content = document.getElementById('step3-content');
    const stepLines = document.querySelectorAll('.step-line');

    const locationSelect = document.getElementById('location');
    const agentList = document.getElementById('agentList');
    const confirmationText = document.getElementById('confirmationText');

    // Variables to store selected product and agent data
    let currentProduct = null;
    let selectedAgent = null;

    // Agent data for Dar es Salaam districts
    const agentsByLocation = {
        kinondoni: [
            { id: 1, name: "Rashid Mtali", distance: "1.2 km", rating: 4.8, available: true },
            { id: 2, name: "Fatuma Said", distance: "2.5 km", rating: 4.5, available: true }
        ],
        ilala: [
            { id: 3, name: "Peter Mushi", distance: "0.8 km", rating: 4.9, available: true },
            { id: 4, name: "Aisha Omar", distance: "3.1 km", rating: 4.2, available: true }
        ],
        temeke: [
            { id: 5, name: "Juma Hassan", distance: "1.5 km", rating: 4.7, available: true }
        ],
        ubungo: [
            { id: 6, name: "Neema Joseph", distance: "2.0 km", rating: 4.6, available: true }
        ],
        kigamboni: [
            { id: 7, name: "Hawa Suleiman", distance: "1.8 km", rating: 4.4, available: true }
        ]
    };

    // Attach click listeners to all "ADD TO CART" buttons
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Get product data from the button's data attributes
            currentProduct = {
                name: this.getAttribute('data-product'),
                price: this.getAttribute('data-price')
            };
            // Show the modal and reset it to the first step
            deliveryModal.classList.add('active');
            resetModalSteps();
        });
    });

    // Handle closing the modal
    modalClose.addEventListener('click', function() {
        deliveryModal.classList.remove('active');
        resetModal(); // Full reset on close
    });

    // Enable the "Next" button when a location is selected
    locationSelect.addEventListener('change', () => {
        nextToStep2.disabled = !locationSelect.value;
    });

    // Handle moving from step 1 (location) to step 2 (agents)
    nextToStep2.addEventListener('click', function() {
        if (!locationSelect.value) return;

        step1.classList.remove('active');
        step1.classList.add('completed');
        stepLines[0].classList.add('completed');
        step2.classList.add('active');
        step1Content.style.display = 'none';
        step2Content.style.display = 'block';

        loadAgents(locationSelect.value);
    });

    // Handle moving back from step 2 (agents) to step 1 (location)
    backToStep1.addEventListener('click', function() {
        step1.classList.add('active');
        step1.classList.remove('completed');
        stepLines[0].classList.remove('completed');
        step2.classList.remove('active');
        step2Content.style.display = 'none';
        step1Content.style.display = 'block';

        selectedAgent = null;
        nextToStep3.disabled = true;
    });

    // Handle moving from step 2 (agents) to step 3 (confirmation)
    nextToStep3.addEventListener('click', function() {
        if (!selectedAgent) return;

        step2.classList.remove('active');
        step2.classList.add('completed');
        stepLines[1].classList.add('completed');
        step3.classList.add('active');
        step2Content.style.display = 'none';
        step3Content.style.display = 'block';

        // Update the confirmation text with product and agent info
        confirmationText.textContent = `${currentProduct.name} ($${currentProduct.price}) has been assigned to agent ${selectedAgent.name}.`;

        // Here you would add the product to the user's cart in a real application
        console.log('Product and agent info:', {
            product: currentProduct,
            location: locationSelect.value,
            agent: selectedAgent
        });
    });

    // Handle the "Continue Shopping" button
    finishBtn.addEventListener('click', function() {
        deliveryModal.classList.remove('active');
        resetModal();
    });

    // Function to dynamically load and display agent cards
    function loadAgents(location) {
        const agents = agentsByLocation[location] || [];
        agentList.innerHTML = ''; // Clear previous agents

        if (agents.length === 0) {
            agentList.innerHTML = '<p>Hakuna ma-ajenti waliopo katika eneo hili.</p>'; // "No agents available in this area." in Swahili
            return;
        }

        agents.forEach(agent => {
            const agentCard = document.createElement('div');
            agentCard.className = `agent-card ${agent.available ? '' : 'unavailable'}`;
            if (!agent.available) {
                agentCard.style.opacity = '0.6';
            }

            agentCard.innerHTML = `
                <div class="agent-avatar">${agent.name.charAt(0)}</div>
                <div class="agent-details">
                    <h4 class="agent-name">${agent.name} ${agent.available ? '<span class="agent-availability available">Available</span>' : '<span class="agent-availability unavailable">Unavailable</span>'}</h4>
                    <p class="agent-info">
                        ${agent.distance} away • 
                        <span class="agent-rating">${agent.rating} ★</span>
                    </p>
                </div>
            `;

            if (agent.available) {
                agentCard.addEventListener('click', function() {
                    // Remove 'selected' class from all other cards
                    document.querySelectorAll('.agent-card').forEach(card => {
                        card.classList.remove('selected');
                    });
                    // Add 'selected' class to the clicked card
                    this.classList.add('selected');
                    selectedAgent = agent;
                    nextToStep3.disabled = false;
                });
            }

            agentList.appendChild(agentCard);
        });
    }

    // Function to fully reset the modal to its initial state
    function resetModal() {
        resetModalSteps();
        locationSelect.value = '';
        selectedAgent = null;
        currentProduct = null;
    }

    // Function to reset only the visual steps and temporary data
    function resetModalSteps() {
        step1.classList.add('active');
        step1.classList.remove('completed');
        step2.classList.remove('active');
        step2.classList.remove('completed');
        step3.classList.remove('active');
        step3.classList.remove('completed');

        stepLines[0].classList.remove('completed');
        stepLines[1].classList.remove('completed');

        step1Content.style.display = 'block';
        step2Content.style.display = 'none';
        step3Content.style.display = 'none';

        agentList.innerHTML = '';
        nextToStep2.disabled = true; // Ensure the Next button is disabled at the start
        nextToStep3.disabled = true;
        selectedAgent = null;
    }
});