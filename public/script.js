import { gsap } from 'https://cdn.skypack.dev/gsap@3.7.0';
import Draggable from 'https://cdn.skypack.dev/gsap@3.7.0/Draggable';
import ScrollTrigger from 'https://cdn.skypack.dev/gsap@3.7.0/ScrollTrigger';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://wyetkikeobakrcjfmbzj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZXRraWtlb2Jha3JjamZtYnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MTUzMjgsImV4cCI6MjA2MjA5MTMyOH0.Nq7e6J2e_ls2zTDY0N_xFB86QaRtPUuYHTIindot66M';
const supabase = createClient(supabaseUrl, supabaseKey);

gsap.registerPlugin(Draggable, ScrollTrigger);

let loopTimeline;

async function loadSubmissions() {
    const boxesContainer = document.querySelector('#boxes');
    boxesContainer.innerHTML = '<div class="loading">Loading art submissions...</div>';

    try {
        const { data, error } = await supabase
            .from('submissions')
            .select('id, image_url, username, timestamp')
            .order('timestamp', { ascending: false });

        console.log('Supabase response:', { data, error });

        if (error) {
            console.error('Error fetching submissions:', error);
            boxesContainer.innerHTML = '<div class="error">Failed to load submissions.</div>';
            return;
        }

        if (data.length === 0) {
            console.log('No submissions found');
            boxesContainer.innerHTML = '<div class="error">No art submissions available yet!</div>';
            return;
        }

        boxesContainer.innerHTML = '';
        const fragment = document.createDocumentFragment();
        data.forEach(submission => {
            const box = document.createElement('div');
            box.classList.add('box');
            box.dataset.id = submission.id;
            box.innerHTML = `<img src="${submission.image_url}" alt="Art by ${submission.username}" loading="lazy" onerror="this.src='https://via.placeholder.com/280x380?text=Image+Not+Found';" />`;
            fragment.appendChild(box);
        });

        fragment.appendChild(fragment.cloneNode(true));
        boxesContainer.appendChild(fragment);

        initializeSeamlessLoop();
        initializeInteractions();
    } catch (err) {
        console.error('Unexpected error:', err);
        boxesContainer.innerHTML = '<div class="error">An unexpected error occurred.</div>';
    }
}

function initializeSeamlessLoop() {
    const boxes = document.querySelectorAll('.box');
    const boxesContainer = document.querySelector('#boxes');
    const boxWidth = boxes[0].offsetWidth + 20;
    const totalWidth = boxes.length * boxWidth / 2;

    gsap.set(boxesContainer, { x: 0 });

    loopTimeline = gsap.timeline({ repeat: -1, paused: false });
    loopTimeline.to(boxesContainer, {
        x: -totalWidth,
        duration: boxes.length / 2,
        ease: 'none',
        onUpdate: function() {
            if (Math.abs(gsap.getProperty(boxesContainer, 'x')) >= totalWidth) {
                gsap.set(boxesContainer, { x: 0 });
            }
        }
    });
}

function initializeInteractions() {
    const boxes = document.querySelectorAll('.box');
    const boxesContainer = document.querySelector('#boxes');

    if (boxes.length === 0) return;

    const boxWidth = boxes[0].offsetWidth + 20;
    const totalWidth = boxes.length * boxWidth / 2;
    const maxX = 0;
    const minX = -totalWidth;

    Draggable.create(boxesContainer, {
        type: 'x',
        edgeResistance: 0.65,
        bounds: { minX, maxX },
        inertia: true,
        snap: {
            x: x => Math.round(x / boxWidth) * boxWidth
        }
    });

    boxes.forEach(box => {
        box.addEventListener('click', (e) => {
            e.stopPropagation();
            const isEnlarged = box.classList.contains('enlarged');
            boxes.forEach(b => {
                b.classList.remove('enlarged', 'winner');
                gsap.to(b, { x: 0, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
            });
            if (!isEnlarged) {
                box.classList.add('enlarged');
                // Center the box in viewport
                const rect = box.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const centerX = (viewportWidth - rect.width * 2) / 2 - rect.left; // Scale is 2
                const centerY = (viewportHeight - rect.height * 2) / 2 - rect.top;
                gsap.to(box, {
                    x: centerX,
                    y: centerY,
                    scale: window.innerWidth <= 768 ? 1.5 : 2, // Match CSS scale
                    duration: 0.5,
                    ease: 'elastic.out(1, 0.5)'
                });
                if (loopTimeline) loopTimeline.pause();
            } else {
                gsap.to(box, { x: 0, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
                if (loopTimeline) loopTimeline.play();
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.box') && !e.target.classList.contains('spin-button')) {
            boxes.forEach(b => {
                b.classList.remove('enlarged', 'winner');
                gsap.to(b, { x: 0, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
            });
            if (loopTimeline) loopTimeline.play();
        }
    });

    document.querySelector('.spin-button').addEventListener('click', () => {
        if (boxes.length === 0) {
            alert('No art submissions available to spin!');
            return;
        }

        boxes.forEach(box => {
            box.classList.remove('winner', 'enlarged');
            gsap.to(box, { x: 0, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' });
        });

        if (loopTimeline) loopTimeline.pause();

        const totalBoxes = boxes.length / 2;
        const spinDuration = 3;
        const spins = 3;
        const randomIndex = Math.floor(Math.random() * totalBoxes);
        const targetX = -(randomIndex * boxWidth + spins * totalBoxes * boxWidth);

        gsap.to(boxesContainer, {
            x: targetX,
            duration: spinDuration,
            ease: 'power2.inOut',
            onComplete: () => {
                const snapX = Math.round(targetX / boxWidth) * boxWidth;
                gsap.to(boxesContainer, {
                    x: snapX,
                    duration: 0.5,
                    ease: 'elastic.out(1, 0.5)',
                    onComplete: () => {
                        const winnerIndex = Math.abs(Math.round(snapX / boxWidth)) % totalBoxes;
                        const winnerBox = document.querySelector(`.box:nth-child(${winnerIndex + 1})`);
                        winnerBox.classList.add('winner', 'enlarged');
                        // Center the winner in viewport
                        const rect = winnerBox.getBoundingClientRect();
                        const viewportWidth = window.innerWidth;
                        const viewportHeight = window.innerHeight;
                        const scale = viewportWidth <= 768 ? 1.5 : 2;
                        const centerX = (viewportWidth - rect.width * scale) / 2 - rect.left;
                        const centerY = (viewportHeight - rect.height * scale) / 2 - rect.top;
                        gsap.to(winnerBox, {
                            x: centerX,
                            y: centerY,
                            scale: scale,
                            duration: 0.5,
                            ease: 'elastic.out(1, 0.5)'
                        });
                        // Center the container to show the winner
                        const winnerX = -winnerIndex * boxWidth + (boxesContainer.offsetWidth - boxWidth) / 2;
                        gsap.to(boxesContainer, {
                            x: winnerX,
                            duration: 0.5,
                            ease: 'power2.out'
                        });
                    }
                });
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    loadSubmissions();
});