// Delivery modal presentation helpers.
// Order logic (location search, agent selection, WhatsApp message) lives in the
// inline scripts of "main home page.html". This file only keeps the modal's
// visual state (".active" class and step indicators) in sync with it.
document.addEventListener('DOMContentLoaded', function () {
    const modal = document.getElementById('deliveryModal');
    if (!modal) return;

    const stepDots = ['step1', 'step2', 'step3'].map(id => document.getElementById(id));
    const stepPanels = ['step1-content', 'step2-content', 'step3-content'].map(id => document.getElementById(id));
    const stepLines = document.querySelectorAll('#deliveryModal .step-line');

    function currentStep() {
        const idx = stepPanels.findIndex(p => p && p.style.display === 'block');
        return idx === -1 ? 0 : idx;
    }

    function syncSteps() {
        const current = currentStep();
        stepDots.forEach((dot, i) => {
            if (!dot) return;
            dot.classList.toggle('active', i === current);
            dot.classList.toggle('completed', i < current);
        });
        stepLines.forEach((line, i) => line.classList.toggle('completed', i < current));
    }

    function syncModal() {
        const open = modal.style.display === 'flex';
        modal.classList.toggle('active', open);
        modal.setAttribute('aria-hidden', open ? 'false' : 'true');
        document.body.style.overflow = open ? 'hidden' : '';
        if (open) syncSteps();
    }

    // Close when clicking the dark backdrop or pressing Escape
    modal.addEventListener('click', function (e) {
        if (e.target === modal) modal.style.display = 'none';
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.style.display === 'flex') modal.style.display = 'none';
    });

    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
            if (m.target === modal) syncModal();
            else syncSteps();
        });
    });
    observer.observe(modal, { attributes: true, attributeFilter: ['style'] });
    stepPanels.forEach(p => p && observer.observe(p, { attributes: true, attributeFilter: ['style'] }));

    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    syncModal();
});
