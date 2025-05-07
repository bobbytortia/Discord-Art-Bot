import { gsap } from 'https://cdn.skypack.dev/gsap@3.7.0';
import Draggable from 'https://cdn.skypack.dev/gsap@3.7.0/Draggable';
import ScrollTrigger from 'https://cdn.skypack.dev/gsap@3.7.0/ScrollTrigger';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://wyetkikeobakrcjfmbzj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind5ZXRraWtlb2Jha3JjamZtYnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY1MTUzMjgsImV4cCI6MjA2MjA5MTMyOH0.Nq7e6J2e_ls2zTDY0N_xFB86QaRtPUuYHTIindot66M';
const supabase = createClient(supabaseUrl, supabaseKey);

gsap.registerPlugin(Draggable, ScrollTrigger);

let loopTimeline;
let lastBoxIndex = 0; // Track the last box index that was centered

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

        const preloadPromises = data.map(submission => {
            return new Promise((resolve) => {
                const img = new Image();
                img.src = submission.image_url;
                img.onload = resolve;
                img.onerror = () => {
                    img.src = 'https://via.placeholder.com/280x380?text=Image+Not+Found';
                    resolve();
                };
            });
        });

        await Promise.all(preloadPromises);
        console.log('All images preloaded');

        data.forEach((submission, index) => {
            const box = document.createElement('div');
            box.classList.add('box');
            box.dataset.id = submission.id;
            box.dataset.index = index;
            box.innerHTML = `<img src="${submission.image_url}" alt="Art by ${submission.username}" loading="lazy" />`;
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
            const currentX = Math.abs(gsap.getProperty(boxesContainer, 'x'));
            if (currentX >= totalWidth) {
                gsap.set(boxesContainer, { x: 0 });
            }
            // Update lastBoxIndex based on the current position
            lastBoxIndex = Math.floor(currentX / boxWidth) % (boxes.length / 2);
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
        },
        onDrag: function() {
            // Update lastBoxIndex during drag
            const currentX = Math.abs(this.x);
            lastBoxIndex = Math.floor(currentX / boxWidth) % (boxes.length / 2);
        }
    });

    boxes.forEach((box, index) => {
        box.addEventListener('click', (e) => {
            e.stopPropagation();
            const isEnlarged = box.classList.contains('enlarged');
            boxes.forEach(b => {
                b.classList.remove('enlarged', 'winner');
                gsap.to(b, { scale: 1, duration: 0.3, ease: 'power2.out' });
            });
            if (!isEnlarged) {
                box.classList.add('enlarged');
                if (loopTimeline) loopTimeline.pause();

                const originalIndex = parseInt(box.dataset.index);
                const viewportWidth = window.innerWidth;
                const containerWidth = boxesContainer.offsetWidth;
                const centerOffset = (viewportWidth - boxWidth) / 2 - (containerWidth - viewportWidth) / 2;
                const containerX = -originalIndex * boxWidth + centerOffset;

                gsap.to(boxesContainer, {
                    x: containerX,
                    duration: 0.5,
                    ease: 'power2.out',
                    onComplete: () => {
                        const scale = window.innerWidth <= 768 ? (window.innerHeight <= 600 ? 1.2 : 1.5) : 2;
                        gsap.to(box, {
                            scale: scale,
                            duration: 0.5,
                            ease: 'elastic.out(1, 0.5)'
                        });
                        lastBoxIndex = originalIndex;
                    }
                });
            } else {
                gsap.to(box, { scale: 1, duration: 0.3, ease: 'power2.out' });
                if (loopTimeline) loopTimeline.play();
            }
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.box') && !e.target.classList.contains('spin-button')) {
            boxes.forEach(b => {
                b.classList.remove('enlarged', 'winner');
                gsap.to(b, { scale: 1, duration: 0.3, ease: 'power2.out' });
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
            gsap.to(box, { scale: 1, duration: 0.3, ease: 'power2.out' });
        });

        if (loopTimeline) loopTimeline.pause();

        const totalBoxes = boxes.length / 2;
        const boxWidth = boxes[0].offsetWidth + 20;
        const spinDuration = 5;
        const spins = 2;
        const viewportWidth = window.innerWidth;
        const containerWidth = boxesContainer.offsetWidth;

        // Calculate distance to spin (move forward only)
        const distanceToSpin = spins * totalBoxes * boxWidth;
        const currentX = gsap.getProperty(boxesContainer, 'x');
        const targetX = currentX - distanceToSpin;

        gsap.to(boxesContainer, {
            x: targetX,
            duration: spinDuration,
            ease: 'power2.inOut',
            onComplete: () => {
                // Snap to the nearest box
                const snapX = Math.round(targetX / boxWidth) * boxWidth;
                gsap.to(boxesContainer, {
                    x: snapX,
                    duration: 0.5,
                    ease: 'elastic.out(1, 0.5)',
                    onComplete: () => {
                        // Determine the winner based on the stopping position
                        const currentX = Math.abs(snapX);
                        const winnerIndex = Math.floor(currentX / boxWidth) % totalBoxes;
                        const winnerBox = document.querySelector(`.box:nth-child(${winnerIndex + 1})`);
                        winnerBox.classList.add('winner', 'enlarged');

                        // Center the winner
                        const centerOffset = (viewportWidth - boxWidth) / 2 - (containerWidth - viewportWidth) / 2;
                        const containerX = -winnerIndex * boxWidth + centerOffset;
                        gsap.to(boxesContainer, {
                            x: containerX,
                            duration: 0.5,
                            ease: 'power2.out',
                            onComplete: () => {
                                const scale = window.innerWidth <= 768 ? (window.innerHeight <= 600 ? 1.2 : 1.5) : 2;
                                gsap.to(winnerBox, {
                                    scale: scale,
                                    duration: 0.5,
                                    ease: 'elastic.out(1, 0.5)'
                                });
                                lastBoxIndex = winnerIndex;
                            }
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